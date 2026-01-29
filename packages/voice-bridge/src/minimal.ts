import http from 'http';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import twilio from 'twilio';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { toolsSchema } from './toolsSchema';

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

type SecretName = 'OPENAI_API_KEY' | 'TWILIO_AUTH_TOKEN' | 'TWILIO_ACCOUNT_SID';

const ssmParamDefaults: Record<SecretName, string> = {
  OPENAI_API_KEY: '/handycall/prod/openai_api_key',
  TWILIO_AUTH_TOKEN: '/handycall/prod/twilio_auth_token',
  TWILIO_ACCOUNT_SID: '/handycall/prod/twilio_account_sid',
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
  company_name: string;
  timezone?: string;
  startedAt: number;
};

type TenantInfo = {
  company_id: string;
  company_name: string;
  timezone?: string;
  agent_config?: {
    realtime_model?: string;
    realtime_voice?: string;
    realtime_instructions?: string;
  };
  service_template?: any;
  service_type?: string;
};

function buildInstructions(tenant: TenantInfo) {
  const name = tenant.company_name || 'our company';
  const extra = tenant.agent_config?.realtime_instructions;
  const base = [
    `You are the phone receptionist for ${name}.`,
    `Greet the caller immediately and include the company name in the first sentence.`,
    `Be friendly, concise, and phone-like. Ask one question at a time.`,
    `You can answer FAQs and schedule/reschedule/cancel when asked.`,
    `Before booking, summarize details and ask "Is that correct?" then call create_booking with confirmed:true.`,
    `If you need company-specific info, use knowledge_search.`,
  ];
  if (extra && extra.trim()) base.push(extra.trim());
  return base.join('\n');
}

async function resolveTenant(toNumber: string) {
  const toolsBase = requireEnvFirst(['TOOLS_API_BASE_URL', 'HANDYCALL_BACKEND_BASE_URL']).replace(/\/$/, '');
  const toolsKey = requireEnvFirst(['TOOLS_API_KEY', 'HANDYCALL_TOOLS_API_KEY']);
  return postJson(`${toolsBase}/tenant/resolve`, { 'x-handycall-tools-key': toolsKey }, { to_number: toNumber });
}

async function callTool(ctx: CallContext, name: string, args: any) {
  const toolsBase = requireEnvFirst(['TOOLS_API_BASE_URL', 'HANDYCALL_BACKEND_BASE_URL']).replace(/\/$/, '');
  const toolsKey = requireEnvFirst(['TOOLS_API_KEY', 'HANDYCALL_TOOLS_API_KEY']);
  const headers = { 'x-handycall-tools-key': toolsKey };

  if (name === 'knowledge_search') {
    return postJson(`${toolsBase}/tools/knowledge_search`, headers, {
      company_id: ctx.company_id,
      query: args?.query ?? '',
      top_k: args?.top_k,
    });
  }

  if (name === 'check_service_area') {
    return postJson(`${toolsBase}/tools/check_service_area`, headers, {
      company_id: ctx.company_id,
      zip: args?.zip ?? '',
    });
  }

  if (name === 'get_availability') {
    return postJson(`${toolsBase}/tools/get_availability`, headers, {
      company_id: ctx.company_id,
      preferred_time: args?.preferred_time,
      window_start: args?.window_start,
      window_end: args?.window_end,
      duration_minutes: args?.duration_minutes,
      timezone: args?.timezone ?? ctx.timezone,
      limit: args?.limit,
    });
  }

  if (name === 'create_booking') {
    if (!args?.confirmed) {
      return {
        ok: false,
        error: 'BookingNotConfirmed',
        message: 'You must confirm booking details with the user first.',
      };
    }
    return postJson(`${toolsBase}/tools/create_booking`, headers, {
      company_id: ctx.company_id,
      from_phone: ctx.from,
      ...args,
    });
  }

  if (name === 'list_appointments_by_phone') {
    return postJson(`${toolsBase}/tools/list_appointments_by_phone`, headers, {
      company_id: ctx.company_id,
      phone: ctx.from,
      range_days: args?.range_days ?? 90,
    });
  }

  if (name === 'cancel_appointment') {
    return postJson(`${toolsBase}/tools/cancel_appointment`, headers, {
      company_id: ctx.company_id,
      appointment_id: args?.appointment_id,
      reason: args?.reason,
    });
  }

  if (name === 'reschedule_appointment') {
    return postJson(`${toolsBase}/tools/reschedule_appointment`, headers, {
      company_id: ctx.company_id,
      appointment_id: args?.appointment_id,
      new_start_time: args?.new_start_time,
      timezone: args?.timezone ?? ctx.timezone,
      duration_minutes: args?.duration_minutes,
    });
  }

  if (name === 'create_lead') {
    return postJson(`${toolsBase}/tools/create_lead`, headers, {
      company_id: ctx.company_id,
      from_phone: ctx.from,
    });
  }

  if (name === 'save_call') {
    return postJson(`${toolsBase}/tools/save_call`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      from_phone: ctx.from,
      to_phone: ctx.to,
      transcript: args?.transcript,
      summary: args?.summary,
    });
  }

  if (name === 'save_recording') {
    return postJson(`${toolsBase}/tools/save_recording`, headers, {
      company_id: ctx.company_id,
      recording_sid: args?.recording_sid,
      duration_seconds: args?.duration_seconds,
    });
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function startTwilioRecording(callSid: string) {
  const enabled = (process.env.TWILIO_RECORD_CALLS ?? 'true') !== 'false';
  if (!enabled) return;

  const publicBaseUrl = requireEnvFirst(['PUBLIC_BASE_URL', 'VOICE_BRIDGE_PUBLIC_BASE_URL']).replace(/\/$/, '');
  const accountSid = envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
  const authToken = await getSecret('TWILIO_AUTH_TOKEN');
  const client = twilio(accountSid, authToken);
  await client.calls(callSid).recordings.create({
    recordingStatusCallback: `${publicBaseUrl}/twilio/recording-status`,
    recordingStatusCallbackMethod: 'POST',
    recordingStatusCallbackEvent: ['completed'],
    recordingChannels: 'dual',
  });
}

function sendToOpenAI(ws: WebSocket, msg: any) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function sendToTwilio(ws: WebSocket, msg: any) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

const port = Number(process.env.PORT || 8080);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url?.startsWith('/twilio/recording-status')) {
      const raw = await readBody(req);
      const params = parseFormUrlEncoded(raw);
      const callSid = (params.CallSid || params.callSid || '').trim();
      const recordingSid = (params.RecordingSid || params.recordingSid || '').trim();
      const recordingStatus = (params.RecordingStatus || params.recordingStatus || '').trim().toLowerCase();
      const to = (params.To || params.to || '').trim();
      const from = (params.From || params.from || '').trim();
      const durationSeconds = Number.parseInt(params.RecordingDuration || params.recordingDuration || '', 10);

      if (callSid && recordingSid && recordingStatus === 'completed') {
        try {
          const tenant: TenantInfo = await resolveTenant(to);
          const ctx: CallContext = {
            callSid,
            streamSid: 'recording_callback',
            from,
            to,
            company_id: tenant.company_id,
            company_name: tenant.company_name,
            timezone: tenant.timezone,
            startedAt: Date.now(),
          };
          await callTool(ctx, 'save_recording', {
            recording_sid: recordingSid,
            duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
          });
        } catch (err: any) {
          console.warn('[twilio] save_recording failed', err?.message ?? String(err));
        }
      }

      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url?.startsWith('/twilio/stream-status')) {
      const raw = await readBody(req);
      const form = parseFormUrlEncoded(raw);
      console.log('[twilio] stream status', form);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url?.startsWith('/twilio/voice')) {
      const publicBaseUrl = requireEnvFirst(['PUBLIC_BASE_URL', 'VOICE_BRIDGE_PUBLIC_BASE_URL']).replace(/\/$/, '');
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
      const mediaToken = process.env.TWILIO_MEDIA_STREAM_TOKEN || crypto.randomBytes(16).toString('hex');
      const wsBase = toWsBaseUrl(publicBaseUrl);
      const mediaWsUrl = `${wsBase}/twilio/media`;
      const streamStatusUrl = `${publicBaseUrl}/twilio/stream-status`;
      const streamTrack = envFirst(['TWILIO_STREAM_TRACK']);
      const trackAttr = streamTrack ? ` track="${escapeXml(streamTrack)}"` : '';

      console.log('[twilio] voice webhook', { callSid, from, to, mediaWsUrl, streamTrack: streamTrack || 'default' });

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(mediaWsUrl)}"${trackAttr} statusCallback="${escapeXml(streamStatusUrl)}" statusCallbackEvent="start end">
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

const wss = new WebSocketServer({ server, path: '/twilio/media' });

wss.on('connection', (twilioWs: WebSocket) => {
  let openaiWs: WebSocket | null = null;
  let ctx: CallContext | null = null;
  let transcript: string[] = [];
  let openaiReady = false;
  let twilioReady = false;
  let greeted = false;
  let assistantSpeaking = false;
  let lastAssistantAudioAt = 0;

  function tryGreet() {
    if (!openaiWs || !openaiReady || !twilioReady || greeted) return;
    const name = ctx?.company_name || 'our company';
    sendToOpenAI(openaiWs, {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: `Greet the caller now. Say: "Hi there, thanks for calling ${name}. How can I help you today?"`,
      },
    });
    greeted = true;
  }

  function shutdown(reason: string) {
    console.log('[bridge] shutdown', reason);
    try {
      twilioWs.close();
    } catch {
      // ignore
    }
    try {
      openaiWs?.close();
    } catch {
      // ignore
    }
    openaiWs = null;
  }

  async function connectOpenAI(tenant: TenantInfo) {
    const model =
      tenant?.agent_config?.realtime_model ||
      envFirst(['OPENAI_REALTIME_MODEL', 'REALTIME_MODEL']) ||
      'gpt-realtime-mini';
    const voice =
      tenant?.agent_config?.realtime_voice ||
      envFirst(['OPENAI_REALTIME_VOICE', 'REALTIME_VOICE']) ||
      'alloy';
    const instructions = buildInstructions(tenant);
    const openaiKey = await getSecret('OPENAI_API_KEY');
    const openaiUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

    openaiWs = new WebSocket(openaiUrl, {
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    openaiWs.on('open', () => {
      sendToOpenAI(openaiWs!, {
        type: 'session.update',
        session: {
          voice,
          instructions,
          tools: toolsSchema(),
          tool_choice: 'auto',
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
          turn_detection: {
            type: 'server_vad',
            threshold: Number(envFirst(['REALTIME_VAD_THRESHOLD']) || 0.75),
            prefix_padding_ms: 300,
            silence_duration_ms: Number(envFirst(['REALTIME_SILENCE_MS']) || 450),
          },
        },
      });
      openaiReady = true;
      tryGreet();
    });

    openaiWs.on('message', async (raw) => {
      if (!openaiWs) return;
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg?.type === 'response.audio.delta') {
        const payload = msg?.delta;
        if (payload && ctx?.streamSid) {
          sendToTwilio(twilioWs, { event: 'media', streamSid: ctx.streamSid, media: { payload } });
          assistantSpeaking = true;
          lastAssistantAudioAt = Date.now();
        }
        return;
      }

      if (msg?.type === 'response.audio_transcript.done') {
        const text = msg?.transcript;
        if (text) transcript.push(`Assistant: ${text}`);
        return;
      }

      if (msg?.type === 'conversation.item.input_audio_transcription.completed') {
        const text = msg?.transcript || msg?.text;
        if (text) transcript.push(`Caller: ${text}`);
        return;
      }

      if (msg?.type === 'response.done' || msg?.type === 'response.audio.done') {
        assistantSpeaking = false;
        return;
      }

      if (msg?.type === 'input_audio_buffer.speech_started') {
        const now = Date.now();
        if (assistantSpeaking && now - lastAssistantAudioAt < 5000) {
          if (ctx?.streamSid) sendToTwilio(twilioWs, { event: 'clear', streamSid: ctx.streamSid });
          sendToOpenAI(openaiWs, { type: 'response.cancel' });
        }
        return;
      }

      if (msg?.type === 'response.function_call_arguments.done') {
        const toolName = msg?.name;
        const callId = msg?.call_id;
        let args: any = {};
        try {
          args = JSON.parse(msg?.arguments || '{}');
        } catch {
          args = {};
        }

        let result: any;
        try {
          if (!ctx) throw new Error('Missing call context');
          result = await callTool(ctx, toolName, args);
        } catch (err: any) {
          result = { ok: false, error: err?.message ?? String(err) };
        }

        sendToOpenAI(openaiWs, {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(result),
          },
        });
        sendToOpenAI(openaiWs, { type: 'response.create' });
      }

      if (msg?.type === 'error') {
        console.error('[openai] error', msg);
      }
    });

    openaiWs.on('close', () => shutdown('openai_closed'));
    openaiWs.on('error', (err) => {
      console.error('[openai] ws error', (err as any)?.message ?? String(err));
      shutdown('openai_error');
    });
  }

  twilioWs.on('message', async (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg?.event === 'start') {
      const streamSid = msg?.start?.streamSid || '';
      const params = msg?.start?.customParameters || {};
      const callSid = params.callSid || '';
      const to = params.to || '';
      const from = params.from || '';
      const token = params.token || '';
      const tokenExpected = process.env.TWILIO_MEDIA_STREAM_TOKEN || '';

      if (tokenExpected && token !== tokenExpected) {
        console.warn('[twilio] media token mismatch');
        return shutdown('token_mismatch');
      }

      let tenant: TenantInfo;
      try {
        tenant = await resolveTenant(to);
      } catch (err: any) {
        console.error('[twilio] resolveTenant failed', err?.message ?? String(err));
        return shutdown('tenant_resolve_failed');
      }

      ctx = {
        callSid,
        streamSid,
        from,
        to,
        company_id: tenant.company_id,
        company_name: tenant.company_name,
        timezone: tenant.timezone,
        startedAt: Date.now(),
      };

      twilioReady = true;
      await connectOpenAI(tenant);

      callTool(ctx, 'create_lead', { collected_info: {} }).catch((err: any) =>
        console.warn('[bridge] create_lead failed', err?.message ?? String(err))
      );

      startTwilioRecording(callSid).catch((err: any) =>
        console.warn('[twilio] start recording failed', err?.message ?? String(err))
      );

      return;
    }

    if (msg?.event === 'media') {
      const payload = msg?.media?.payload;
      if (payload && openaiWs && openaiReady) {
        sendToOpenAI(openaiWs, { type: 'input_audio_buffer.append', audio: payload });
      }
      return;
    }

    if (msg?.event === 'stop') {
      if (ctx && openaiWs) {
        const merged = transcript.join('\n');
        callTool(ctx, 'save_call', {
          transcript: merged || undefined,
          summary: 'Call ended.',
        }).catch((err: any) => console.warn('[bridge] save_call failed', err?.message ?? String(err)));
      }
      return shutdown('twilio_stop');
    }
  });

  twilioWs.on('close', () => shutdown('twilio_close'));
  twilioWs.on('error', (err) => {
    console.error('[twilio] ws error', (err as any)?.message ?? String(err));
    shutdown('twilio_error');
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`handycall-voice-bridge (minimal) listening on :${port}`);
});
