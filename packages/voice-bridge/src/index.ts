import http from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import twilio from 'twilio';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

function env(name: string): string | undefined {
  return process.env[name];
}

function envFirst(names: string[]): string | undefined {
  for (const name of names) {
    const value = env(name);
    if (value) return value;
  }
  return undefined;
}

function requireEnvFirst(names: string[]): string {
  const value = envFirst(names);
  if (!value) throw new Error(`Missing required env var (one of): ${names.join(', ')}`);
  return value;
}

const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const ssm = new SSMClient({ region: awsRegion });

type SecretName = 'OPENAI_API_KEY' | 'TWILIO_AUTH_TOKEN';

const ssmParamDefaults: Record<SecretName, string> = {
  OPENAI_API_KEY: '/handycall/prod/openai_api_key',
  TWILIO_AUTH_TOKEN: '/handycall/prod/twilio_auth_token',
};

const secretCache = new Map<SecretName, string>();

function isPlaceholderSecret(value: string) {
  const v = value.trim().toLowerCase();
  return v === 'changeme' || v === 'replace_me' || v === 'replace-me' || v === 'todo';
}

async function getSecret(name: SecretName): Promise<string> {
  const cached = secretCache.get(name);
  if (cached) return cached;

  const direct = env(name);
  if (direct && !isPlaceholderSecret(direct)) {
    secretCache.set(name, direct);
    return direct;
  }

  const overrideParam = env(`SSM_PARAM_${name}`);
  const paramName = overrideParam || ssmParamDefaults[name];
  const result = await ssm.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }));
  const value = result.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter missing/empty for ${name}: ${paramName}`);
  secretCache.set(name, value);
  return value;
}

function json(res: http.ServerResponse, status: number, body: any) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  });
  res.end(data);
}

function xml(res: http.ServerResponse, status: number, body: string) {
  const data = Buffer.from(body);
  res.writeHead(status, {
    'Content-Type': 'text/xml',
    'Content-Length': data.length,
  });
  res.end(data);
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function parseFormUrlEncoded(raw: Buffer): Record<string, string> {
  const params = new URLSearchParams(raw.toString('utf8'));
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toWsBaseUrl(publicBaseUrl: string) {
  if (publicBaseUrl.startsWith('https://')) return `wss://${publicBaseUrl.slice('https://'.length)}`;
  if (publicBaseUrl.startsWith('http://')) return `ws://${publicBaseUrl.slice('http://'.length)}`;
  return publicBaseUrl;
}

async function postJson(url: string, headers: Record<string, string>, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${url} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

type CallContext = {
  callSid: string;
  streamSid: string;
  from: string;
  to: string;
  company_id: string;
};

function toolsSchema() {
  const tools: any[] = [
    {
      type: 'function',
      name: 'create_lead',
      description: 'Create/update the caller contact and open a call record for this inbound call.',
      parameters: {
        type: 'object',
        properties: {
          collected_info: {
            type: 'object',
            description:
              'Structured intake fields you have collected so far (first_name, last_name, email, address, zip, service, issue, preferred_time, etc.).',
          },
        },
      },
    },
    {
      type: 'function',
      name: 'save_call',
      description: 'Persist transcript/summary + collected fields for the completed call.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Short 1-3 sentence summary of the call outcome.' },
          collected_info: { type: 'object', description: 'Final structured intake fields.' },
          transcript: { type: 'string', description: 'Full transcript text (if available).' },
          duration_seconds: { type: 'number', description: 'Call duration in seconds (if known).' },
        },
      },
    },
    {
      type: 'function',
      name: 'update_intake',
      description:
        'Update the structured intake fields you have collected so far (so you do not ask twice).',
      parameters: {
        type: 'object',
        properties: {
          intake: {
            type: 'object',
            description:
              'Partial intake object. Only include fields you are confident about.',
          },
        },
      },
    },
    {
      type: 'function',
      name: 'knowledge_search',
      description:
        "Search the company's knowledge base (RAG). Use this to answer questions about the business, services, hours, pricing policy, etc.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The natural language search query.' },
          top_k: { type: 'number', description: 'How many snippets to return (1-5 recommended).' },
        },
        required: ['query'],
      },
    },
  ];

  const canHangup = !!envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']);
  if (canHangup) {
    tools.push({
      type: 'function',
      name: 'end_call',
      description: 'Politely end and hang up the phone call after confirmation.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Short reason for ending the call.' },
        },
      },
    });
  }

  return tools;
}

function buildInstructions(input: {
  company_name: string;
  service_type?: string;
  timezone?: string;
  extra?: string;
}) {
  const { company_name, service_type, timezone, extra } = input;
  const lines = [
    `You are a warm, natural-sounding human receptionist for ${company_name}.`,
    `Your job: quickly understand the caller's need, capture details, and either schedule or create a lead.`,
    `Do NOT follow a rigid script. Be conversational, adaptive, and helpful while still collecting what’s needed.`,
    `Style: 1–2 short sentences max per turn, then a question. No monologues. No "thinking out loud".`,
    `Confirm critical fields (name, phone, address/zip, preferred time) before ending, but do NOT repeat the caller word-for-word.`,
    `When confirming, paraphrase naturally and group info: e.g., "Got it—plumbing help in 77441, aiming for Monday around 11. Is that right?"`,
    `Confirmation policy (very important): confirm EACH field immediately when it is first provided, then mark it confirmed in update_intake. Example flow: ask name → confirm name → ask zip/address → confirm zip/address → ask preferred time → confirm time. Once confirmed, do NOT confirm that same field again unless the caller corrects it. Do NOT do a full end-of-call recap of every detail.`,
    `If the caller already told you the issue/service details, do NOT ask again. Summarize briefly and move forward.`,
    `Use update_intake any time you learn a detail (name, zip, address, service, issue, preferred time) so you don’t ask twice.`,
    `Zip codes: confirm digits explicitly (e.g., "Just to confirm, that's 7-7-4-4-1?").`,
    `If the caller asks about the business, use knowledge_search to answer accurately.`,
    `If the caller talks over you, stop immediately and listen (barge-in).`,
    `If you are unsure, ask one clarifying question.`,
    `Always be truthful; never invent availability.`,
    `End-of-call policy: once the caller confirms the details are correct, ask: "Is there anything else I can help with today?"`,
    `If they say no, say one short friendly goodbye (e.g., "Thanks for calling — if you need anything else, just give us a call back."), then call save_call with a concise summary + collected fields, then call end_call.`,
    `If they say yes, continue helping and do NOT end the call.`,
    timezone ? `Timezone: ${timezone}.` : null,
    service_type ? `Business type: ${service_type}.` : null,
    '',
    `Tools policy:`,
    `- Call create_lead early, once you know the caller's phone number and intent.`,
    `- Call save_call near the end with a concise summary + collected fields (not a verbatim transcript).`,
    extra ? `Extra instructions: ${extra}` : null,
  ].filter(Boolean) as string[];
  return lines.join('\n');
}

async function resolveTenant(toNumber: string) {
  const toolsBase = requireEnvFirst(['TOOLS_API_BASE_URL', 'HANDYCALL_BACKEND_BASE_URL']).replace(
    /\/$/,
    ''
  );
  const toolsKey = requireEnvFirst(['TOOLS_API_KEY', 'HANDYCALL_TOOLS_API_KEY']);
  return postJson(
    `${toolsBase}/tenant/resolve`,
    { 'x-handycall-tools-key': toolsKey },
    { to_number: toNumber }
  );
}

async function invokeTool(ctx: CallContext, name: string, args: any) {
  const toolsBase = requireEnvFirst(['TOOLS_API_BASE_URL', 'HANDYCALL_BACKEND_BASE_URL']).replace(
    /\/$/,
    ''
  );
  const toolsKey = requireEnvFirst(['TOOLS_API_KEY', 'HANDYCALL_TOOLS_API_KEY']);

  if (name === 'create_lead') {
    return postJson(
      `${toolsBase}/tools/create_lead`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        call_id: ctx.callSid,
        from_number: ctx.from,
        to_number: ctx.to,
        collected_info: args?.collected_info ?? args ?? {},
      }
    );
  }

  if (name === 'save_call') {
    return postJson(
      `${toolsBase}/tools/save_call`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        call_id: ctx.callSid,
        summary: args?.summary,
        transcript: args?.transcript,
        duration_seconds: args?.duration_seconds,
        collected_info: args?.collected_info,
      }
    );
  }

  if (name === 'knowledge_search') {
    return postJson(
      `${toolsBase}/tools/knowledge_search`,
      { 'x-handycall-tools-key': toolsKey },
      { company_id: ctx.company_id, query: args?.query ?? '', top_k: args?.top_k }
    );
  }

  if (name === 'update_intake') {
    // Handled locally in the WS loop because it is per-call state.
    return { ok: true };
  }

  if (name === 'end_call') {
    const accountSid = envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']);
    if (!accountSid) {
      throw new Error('Missing TWILIO_ACCOUNT_SID (required to hang up via Twilio REST API)');
    }
    const authToken = await getSecret('TWILIO_AUTH_TOKEN');
    const client = twilio(accountSid, authToken);
    await client.calls(ctx.callSid).update({ status: 'completed' });
    return { ok: true };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function sendToTwilio(ws: WebSocket, msg: any) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function sendToOpenAI(ws: WebSocket, msg: any) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

const port = Number(process.env.PORT || 8082);

const server = http.createServer(async (req, res) => {
  try {
    // EB/ALB health checks often default to `/` unless configured otherwise.
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url?.startsWith('/twilio/voice')) {
      const publicBaseUrl = requireEnvFirst(['PUBLIC_BASE_URL', 'VOICE_BRIDGE_PUBLIC_BASE_URL']).replace(
        /\/$/,
        ''
      );
      const raw = await readBody(req);
      const form = parseFormUrlEncoded(raw);

      const validate = (process.env.TWILIO_VALIDATE_SIGNATURE ?? 'true') === 'true';
      if (validate) {
        const authToken = await getSecret('TWILIO_AUTH_TOKEN');
        const signature = (req.headers['x-twilio-signature'] as string | undefined) ?? '';
        const url = `${publicBaseUrl}/twilio/voice`;
        const ok = twilio.validateRequest(authToken, signature, url, form);
        if (!ok) {
          return json(res, 401, { ok: false, error: 'Invalid Twilio signature' });
        }
      }

      const to = form.To || '';
      const from = form.From || '';
      const callSid = form.CallSid || '';

      const wsBase = toWsBaseUrl(publicBaseUrl);
      const mediaWsUrl = `${wsBase}/twilio/media`;
      const mediaToken = process.env.TWILIO_MEDIA_STREAM_TOKEN || '';

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(mediaWsUrl)}" track="inbound_track">
      <Parameter name="callSid" value="${escapeXml(callSid)}" />
      <Parameter name="to" value="${escapeXml(to)}" />
      <Parameter name="from" value="${escapeXml(from)}" />
      <Parameter name="token" value="${escapeXml(mediaToken)}" />
    </Stream>
  </Connect>
</Response>`;

      return xml(res, 200, twiml);
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: err?.message ?? String(err) });
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  try {
    const url = req.url || '';
    if (!url.startsWith('/twilio/media')) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } catch {
    socket.destroy();
  }
});

wss.on('connection', (twilioWs: WebSocket) => {
  let openaiWs: WebSocket | null = null;
  let ctx: CallContext | null = null;
  let transcript: string[] = [];
  let assistantText: string[] = [];
  let callSaved = false;
  let intake: Record<string, any> = {};
  let lastAssistantAskedAnythingElseAt: number | null = null;
  let pendingAutoHangup = false;
  let pendingHangupMarkName: string | null = null;
  let pendingHangupTimer: NodeJS.Timeout | null = null;
  let assistantAudioActiveUntil = 0;
  let pendingBargeInTimer: NodeJS.Timeout | null = null;

  function log(msg: string, extra?: any) {
    const prefix = ctx ? `[callSid=${ctx.callSid} streamSid=${ctx.streamSid}]` : '[twilio]';
    if (extra !== undefined) console.log(prefix, msg, extra);
    else console.log(prefix, msg);
  }

  function mergedTranscriptText(): string {
    const finalTranscript = transcript.join('\n').trim();
    const finalAssistant = assistantText.join('').trim();
    return [finalTranscript, finalAssistant].filter(Boolean).join('\n').trim();
  }

  async function performHangup(reason: string) {
    if (!ctx) return;
    if (pendingHangupTimer) {
      clearTimeout(pendingHangupTimer);
      pendingHangupTimer = null;
    }
    pendingAutoHangup = false;
    pendingHangupMarkName = null;

    try {
      // Ensure we persist at least something if the model didn't.
      if (!callSaved) {
        await invokeTool(ctx, 'save_call', {
          summary: 'Caller confirmed details and ended the call.',
          transcript: mergedTranscriptText() || undefined,
          collected_info: intake,
        });
        callSaved = true;
      }
      log('Hanging up call', { reason });
      await invokeTool(ctx, 'end_call', { reason });
    } catch (e: any) {
      log('performHangup failed (non-fatal)', e?.message ?? String(e));
    }
  }

  const handleTwilioMessage = async (data: RawData) => {
    let event: any;
    try {
      event = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (event?.event === 'start') {
      const streamSid = event?.start?.streamSid as string;
      const callSid = event?.start?.callSid as string;
      const custom = (event?.start?.customParameters ?? {}) as Record<string, string>;
      const to = custom.to || '';
      const from = custom.from || '';
      const token = custom.token || '';

      const expectedToken = process.env.TWILIO_MEDIA_STREAM_TOKEN || '';
      if (expectedToken && token !== expectedToken) {
        log('Rejecting media stream: invalid token');
        twilioWs.close();
        return;
      }

      if (!streamSid || !callSid || !to || !from) {
        log('Missing start metadata', { streamSid, callSid, to, from });
        twilioWs.close();
        return;
      }

      let tenant: any;
      try {
        tenant = await resolveTenant(to);
      } catch (err: any) {
        log('resolveTenant failed', err?.message ?? String(err));
        twilioWs.close();
        return;
      }
      ctx = { callSid, streamSid, from, to, company_id: tenant.company_id };
      log('Media stream started', { to, from, company_id: tenant.company_id });

      const model =
        tenant?.agent_config?.realtime_model ||
        envFirst(['OPENAI_REALTIME_MODEL', 'REALTIME_MODEL']) ||
        'gpt-realtime-mini';
      const voice =
        tenant?.agent_config?.realtime_voice ||
        envFirst(['OPENAI_REALTIME_VOICE', 'REALTIME_VOICE']) ||
        'alloy';
      const instructions = buildInstructions({
        company_name: tenant.company_name,
        service_type: tenant.service_type,
        timezone: tenant.timezone,
        extra: tenant?.agent_config?.realtime_instructions,
      });

      const openaiKey = await getSecret('OPENAI_API_KEY');
      const openaiUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
      openaiWs = new WebSocket(openaiUrl, {
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      openaiWs.on('open', async () => {
        if (!ctx || !openaiWs) return;

        sendToOpenAI(openaiWs, {
          type: 'session.update',
          session: {
            voice,
            instructions,
            tools: toolsSchema(),
            tool_choice: 'auto',
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw',
            input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
            // Lower silence threshold reduces perceived latency between user stop → assistant start.
            // Too low can cause interruptions; tune if you notice cutoffs.
            turn_detection: { type: 'server_vad', silence_duration_ms: 300 },
          },
        });

        // Kick off an initial greeting ASAP (don't block on backend/tool latency).
        sendToOpenAI(openaiWs, {
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: 'Start with a very short greeting and ask how you can help.',
          },
        });

        // Create lead/call record in the background (so greeting isn't delayed).
        invokeTool(ctx, 'create_lead', { collected_info: {} }).catch((e: any) =>
          log('create_lead failed (non-fatal)', e?.message ?? String(e))
        );
      });

        openaiWs.on('message', async (raw) => {
        if (!ctx || !openaiWs) return;
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (msg?.type === 'session.created') {
          log('OpenAI session created', { id: msg?.session?.id });
        }

        // Barge-in: cancel assistant output when user starts talking.
        // Debounced to avoid background noise triggering constant interruptions.
        if (msg?.type === 'input_audio_buffer.speech_started') {
          const assistantSpeaking = Date.now() < assistantAudioActiveUntil;
          if (!assistantSpeaking) return;

          if (pendingBargeInTimer) clearTimeout(pendingBargeInTimer);
          pendingBargeInTimer = setTimeout(() => {
            pendingBargeInTimer = null;
            sendToOpenAI(openaiWs!, { type: 'response.cancel' });
            sendToTwilio(twilioWs, { event: 'clear', streamSid: ctx!.streamSid });
          }, 250);
        }

        if (msg?.type === 'input_audio_buffer.speech_stopped') {
          if (pendingBargeInTimer) {
            clearTimeout(pendingBargeInTimer);
            pendingBargeInTimer = null;
          }
          sendToOpenAI(openaiWs, { type: 'response.create' });
        }

        if (msg?.type === 'response.audio.delta' && typeof msg?.delta === 'string') {
          assistantAudioActiveUntil = Date.now() + 350;
          sendToTwilio(twilioWs, {
            event: 'media',
            streamSid: ctx.streamSid,
            media: { payload: msg.delta },
          });
        }

        if (msg?.type === 'response.output_text.delta' && typeof msg?.delta === 'string') {
          assistantText.push(msg.delta);
          const recent = assistantText.slice(-20).join('').toLowerCase();
          if (
            recent.includes('anything else i can help') ||
            recent.includes('anything else i can do') ||
            recent.includes('anything else') ||
            recent.includes('any other question') ||
            recent.includes('anything more')
          ) {
            lastAssistantAskedAnythingElseAt = Date.now();
          }
        }

        if (msg?.type === 'conversation.item.input_audio_transcription.completed') {
          const t = msg?.transcript;
          if (typeof t === 'string' && t.trim()) transcript.push(t.trim());

          // Fallback end-of-call: if we recently asked "anything else", and the user says "no", hang up.
          if (lastAssistantAskedAnythingElseAt && Date.now() - lastAssistantAskedAnythingElseAt < 20000) {
            const normalized = t.trim().toLowerCase();
            const isNo =
              normalized === 'no' ||
              normalized === 'nope' ||
              normalized === 'nah' ||
              normalized === 'im good' ||
              normalized === "i'm good" ||
              normalized.includes('no that') ||
              normalized.includes("that's all") ||
              normalized.includes("that's it") ||
              normalized.includes('that is it') ||
              normalized.includes('that is all') ||
              normalized.includes('nothing else') ||
              normalized.includes('no i') ||
              normalized.includes('no thank');
            if (isNo) {
              if (!pendingAutoHangup) {
                pendingAutoHangup = true;
                pendingHangupMarkName = `goodbye_${Date.now()}`;
                log('Auto-hangup triggered; generating goodbye', { mark: pendingHangupMarkName });
                // Cancel any in-flight response and force a short goodbye before ending.
                sendToOpenAI(openaiWs, { type: 'response.cancel' });
                sendToOpenAI(openaiWs, {
                  type: 'response.create',
                  response: {
                    modalities: ['audio', 'text'],
                    instructions:
                      'The caller said that is all. Say ONE short friendly goodbye sentence (thank them and invite them to call back if needed). Do not ask another question.',
                  },
                });
              }
            }
          }
        }

        if (msg?.type === 'response.function_call_arguments.done') {
          const toolName = msg?.name;
          const toolCallId = msg?.call_id;
          const rawArgs = msg?.arguments ?? '{}';

          let args: any = {};
          try {
            args = JSON.parse(rawArgs);
          } catch {
            args = {};
          }

          try {
            if (toolName === 'update_intake') {
              const patch = args?.intake ?? args ?? {};
              if (patch && typeof patch === 'object') {
                intake = { ...intake, ...patch };
              }
              // Tell the model what we have so it stops asking twice.
              sendToOpenAI(openaiWs, {
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'system',
                  content: [
                    {
                      type: 'input_text',
                      text: `Current intake (authoritative, do not re-ask unless missing): ${JSON.stringify(intake)}`,
                    },
                  ],
                },
              });
              sendToOpenAI(openaiWs, {
                type: 'conversation.item.create',
                item: { type: 'function_call_output', call_id: toolCallId, output: JSON.stringify({ ok: true, intake }) },
              });
              sendToOpenAI(openaiWs, { type: 'response.create' });
              return;
            }

            if (toolName === 'end_call') {
              // Don't hang up immediately inside the tool call (it can cut off the final audio).
              // Acknowledge the tool, then hang up after the response audio finishes (response.done → mark/timer).
              if (!pendingAutoHangup) {
                pendingAutoHangup = true;
                pendingHangupMarkName = `model_end_${Date.now()}`;
              }
              log('Model requested end_call; deferring until response finishes', { mark: pendingHangupMarkName });
              sendToOpenAI(openaiWs, {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: toolCallId,
                  output: JSON.stringify({ ok: true }),
                },
              });
              sendToOpenAI(openaiWs, { type: 'response.create' });
              return;
            }

            const toolArgs =
              toolName === 'save_call'
                ? {
                    ...args,
                    transcript:
                      typeof args?.transcript === 'string' && args.transcript.trim()
                        ? args.transcript
                        : mergedTranscriptText() || undefined,
                    collected_info:
                      args?.collected_info && typeof args.collected_info === 'object'
                        ? args.collected_info
                        : intake,
                  }
                : args;

            const result = await invokeTool(ctx, toolName, toolArgs);
            if (toolName === 'save_call') {
              callSaved = true;
              log('save_call succeeded', { transcript_len: (toolArgs?.transcript || '').length });
            }
            sendToOpenAI(openaiWs, {
              type: 'conversation.item.create',
              item: { type: 'function_call_output', call_id: toolCallId, output: JSON.stringify(result) },
            });
            sendToOpenAI(openaiWs, { type: 'response.create' });
          } catch (err: any) {
            sendToOpenAI(openaiWs, {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: toolCallId,
                output: JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
              },
            });
            sendToOpenAI(openaiWs, { type: 'response.create' });
          }
        }

        if (msg?.type === 'response.done' && pendingAutoHangup && pendingHangupMarkName) {
          // Twilio may still be playing queued audio when the model is done generating.
          // Use a Twilio `mark` as a best-effort sync point before hanging up, with a short fallback delay.
          log('Goodbye generation done; sending mark before hangup', { mark: pendingHangupMarkName });
          sendToTwilio(twilioWs, {
            event: 'mark',
            streamSid: ctx.streamSid,
            mark: { name: pendingHangupMarkName },
          });

          if (pendingHangupTimer) clearTimeout(pendingHangupTimer);
          pendingHangupTimer = setTimeout(() => {
            void performHangup('Goodbye finished (fallback timer)');
          }, 2000);
        }
      });

      openaiWs.on('close', () => {
        log('OpenAI websocket closed');
        openaiWs = null;
        twilioWs.close();
      });

      openaiWs.on('error', (err) => {
        log('OpenAI websocket error', (err as any)?.message ?? String(err));
        openaiWs = null;
        twilioWs.close();
      });

      return;
    }

    if (event?.event === 'media') {
      if (!openaiWs) return;
      const payload = event?.media?.payload;
      if (typeof payload !== 'string') return;

      sendToOpenAI(openaiWs, { type: 'input_audio_buffer.append', audio: payload });
      return;
    }

    if (event?.event === 'stop') {
      if (ctx) log('Media stream stopped');
      if (openaiWs) {
        // Best-effort: persist if the model didn't already call save_call.
        if (!callSaved) {
          try {
            const merged = mergedTranscriptText();
            await invokeTool(ctx!, 'save_call', {
              summary: 'Call ended.',
              transcript: merged || undefined,
              collected_info: intake,
            });
            callSaved = true;
          } catch (e: any) {
            log('save_call failed (non-fatal)', e?.message ?? String(e));
          }
        }

        openaiWs.close();
        openaiWs = null;
      }
      twilioWs.close();
      return;
    }

    if (event?.event === 'mark') {
      const name = event?.mark?.name as string | undefined;
      if (pendingAutoHangup && pendingHangupMarkName && name === pendingHangupMarkName) {
        log('Received hangup mark; ending call now', { mark: name });
        await performHangup('Goodbye finished (mark received)');
      }
      return;
    }

    if (event?.event === 'dtmf') {
      return;
    }

    if (event?.event === 'connected') {
      return;
    }

    if (event?.event === 'close') {
      return;
    }

    // ignore unknown events
  };

  twilioWs.on('message', (data) => {
    handleTwilioMessage(data).catch((err: any) => {
      const prefix = ctx ? `[callSid=${ctx.callSid} streamSid=${ctx.streamSid}]` : '[twilio]';
      console.error(prefix, 'Unhandled error in Twilio message handler', err?.message ?? String(err));
      try {
        twilioWs.close();
      } catch {
        // ignore
      }
      try {
        if (openaiWs) openaiWs.close();
      } catch {
        // ignore
      }
      openaiWs = null;
      ctx = null;
    });
  });

  twilioWs.on('close', () => {
    if (ctx) log('Twilio websocket closed');
    if (openaiWs) openaiWs.close();
    openaiWs = null;
    ctx = null;
  });

  twilioWs.on('error', (err) => {
    if (ctx) log('Twilio websocket error', (err as any)?.message ?? String(err));
    if (openaiWs) openaiWs.close();
    openaiWs = null;
    ctx = null;
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`handycall-voice-bridge listening on :${port}`);
});
