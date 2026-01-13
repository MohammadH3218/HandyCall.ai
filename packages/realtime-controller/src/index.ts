import http from 'http';
import { WebSocket } from 'ws';

type Json = Record<string, any>;

function json(res: http.ServerResponse, status: number, body: any) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  });
  res.end(data);
}

async function readJson(req: http.IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function asE164(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim();
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
    `Style: 1–2 short sentences max per turn, then a question. No monologues. No "thinking out loud".`,
    `Confirm critical fields (name, phone, address/zip, preferred time) before ending.`,
    `If the caller talks over you, stop immediately and listen (barge-in).`,
    `If you are unsure, ask a single clarifying question.`,
    `Always be truthful; never invent availability.`,
    timezone ? `Timezone: ${timezone}.` : null,
    service_type ? `Business type: ${service_type}.` : null,
    '',
    `Tools policy:`,
    `- Call create_lead as soon as you have the caller's phone number and basic intent.`,
    `- Call save_call at the end with a concise summary + collected fields.`,
    extra ? `Extra instructions: ${extra}` : null,
  ].filter(Boolean) as string[];
  return lines.join('\n');
}

function toolsSchema() {
  return [
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
  ];
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
  call_id: string;
  company_id: string;
  from_number: string;
  to_number: string;
};

const sessions = new Map<string, { ws: WebSocket; ctx: CallContext }>();

async function resolveTenant(toNumber: string) {
  const toolsBase = requireEnv('TOOLS_API_BASE_URL');
  const toolsKey = requireEnv('TOOLS_API_KEY');
  return postJson(
    `${toolsBase.replace(/\/$/, '')}/tenant/resolve`,
    { 'x-handycall-tools-key': toolsKey },
    { to_number: toNumber }
  );
}

async function invokeTool(ctx: CallContext, name: string, args: any) {
  const toolsBase = requireEnv('TOOLS_API_BASE_URL');
  const toolsKey = requireEnv('TOOLS_API_KEY');

  if (name === 'create_lead') {
    return postJson(
      `${toolsBase.replace(/\/$/, '')}/tools/create_lead`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        call_id: ctx.call_id,
        from_number: ctx.from_number,
        to_number: ctx.to_number,
        collected_info: args?.collected_info ?? args ?? {},
      }
    );
  }

  if (name === 'save_call') {
    return postJson(
      `${toolsBase.replace(/\/$/, '')}/tools/save_call`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        call_id: ctx.call_id,
        summary: args?.summary,
        transcript: args?.transcript,
        duration_seconds: args?.duration_seconds,
        collected_info: args?.collected_info,
      }
    );
  }

  throw new Error(`Unknown tool: ${name}`);
}

function connectControlWebSocket(controlUrl: string, ctx: CallContext, sessionUpdate: any) {
  const openaiKey = requireEnv('OPENAI_API_KEY');

  const ws = new WebSocket(controlUrl, {
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  ws.on('open', () => {
    ws.send(JSON.stringify(sessionUpdate));
  });

  ws.on('message', async (data) => {
    let event: any;
    try {
      event = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (event?.type === 'response.function_call_arguments.done') {
      const toolName = event?.name;
      const toolCallId = event?.call_id;
      const rawArgs = event?.arguments ?? '{}';

      let args: any = {};
      try {
        args = JSON.parse(rawArgs);
      } catch {
        args = {};
      }

      try {
        const result = await invokeTool(ctx, toolName, args);
        ws.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: toolCallId,
              output: JSON.stringify(result),
            },
          })
        );
        ws.send(JSON.stringify({ type: 'response.create' }));
      } catch (err: any) {
        ws.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: toolCallId,
              output: JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
            },
          })
        );
        ws.send(JSON.stringify({ type: 'response.create' }));
      }
    }
  });

  ws.on('close', () => {
    sessions.delete(ctx.call_id);
  });

  ws.on('error', () => {
    sessions.delete(ctx.call_id);
  });

  sessions.set(ctx.call_id, { ws, ctx });
}

const port = Number(process.env.PORT || 8081);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url === '/v1/session-config') {
      const body = await readJson(req);
      const call_id = typeof body.call_id === 'string' ? body.call_id.trim() : cryptoRandomId();
      const to_number = asE164(body.to_number);
      const from_number = asE164(body.from_number);
      if (!to_number) return json(res, 400, { ok: false, error: 'to_number is required' });

      const tenant = await resolveTenant(to_number);
      const model = tenant?.agent_config?.realtime_model || process.env.REALTIME_MODEL || 'gpt-realtime-mini';
      const voice = tenant?.agent_config?.realtime_voice || process.env.REALTIME_VOICE || 'alloy';

      const instructions = buildInstructions({
        company_name: tenant.company_name,
        service_type: tenant.service_type,
        timezone: tenant.timezone,
        extra: tenant?.agent_config?.realtime_instructions,
      });

      const sessionUpdate = {
        type: 'session.update',
        session: {
          model,
          voice,
          instructions,
          tools: toolsSchema(),
          tool_choice: 'auto',
          turn_detection: { type: 'server_vad', silence_duration_ms: 550 },
        },
      };

      return json(res, 200, {
        ok: true,
        call_id,
        company_id: tenant.company_id,
        to_number,
        from_number,
        session_update: sessionUpdate,
      });
    }

    if (req.method === 'POST' && req.url === '/v1/control/connect') {
      const body = await readJson(req);
      const control_url = typeof body.control_url === 'string' ? body.control_url : '';
      const call_id = typeof body.call_id === 'string' ? body.call_id : cryptoRandomId();
      const to_number = asE164(body.to_number);
      const from_number = asE164(body.from_number);

      if (!control_url) return json(res, 400, { ok: false, error: 'control_url is required' });
      if (!to_number || !from_number) {
        return json(res, 400, { ok: false, error: 'to_number and from_number are required' });
      }

      const tenant = await resolveTenant(to_number);
      const model = tenant?.agent_config?.realtime_model || process.env.REALTIME_MODEL || 'gpt-realtime-mini';
      const voice = tenant?.agent_config?.realtime_voice || process.env.REALTIME_VOICE || 'alloy';
      const instructions = buildInstructions({
        company_name: tenant.company_name,
        service_type: tenant.service_type,
        timezone: tenant.timezone,
        extra: tenant?.agent_config?.realtime_instructions,
      });

      const sessionUpdate = {
        type: 'session.update',
        session: {
          model,
          voice,
          instructions,
          tools: toolsSchema(),
          tool_choice: 'auto',
          turn_detection: { type: 'server_vad', silence_duration_ms: 550 },
        },
      };

      const ctx: CallContext = {
        call_id,
        company_id: tenant.company_id,
        from_number,
        to_number,
      };

      connectControlWebSocket(control_url, ctx, sessionUpdate);
      return json(res, 200, { ok: true, call_id, company_id: tenant.company_id });
    }

    if (req.method === 'POST' && req.url === '/v1/control/disconnect') {
      const body = await readJson(req);
      const call_id = typeof body.call_id === 'string' ? body.call_id : '';
      const session = sessions.get(call_id);
      if (session) {
        session.ws.close();
        sessions.delete(call_id);
      }
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: err?.message ?? String(err) });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`handycall-realtime-controller listening on :${port}`);
});

function cryptoRandomId(): string {
  // Avoid pulling in uuid dependency; good enough as a correlation id.
  return `call_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
