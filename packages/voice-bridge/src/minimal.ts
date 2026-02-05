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
  service_area_zipcodes?: string[];
  agent_config?: {
    realtime_model?: string;
    realtime_voice?: string;
    realtime_instructions?: string;
  };
  service_template?: any;
  service_type?: string;
};

const fillerUtterances = new Set(['mhm', 'mm', 'uh', 'um', 'uh-huh', 'uh huh', 'hmm', 'hm', 'ok', 'okay', 'yeah', 'yep']);

function isFillerUtterance(text: string) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return false;
  if (normalized.length <= 3 && fillerUtterances.has(normalized)) return true;
  if (fillerUtterances.has(normalized)) return true;
  return normalized.split(' ').length <= 2 && fillerUtterances.has(normalized);
}

function isExplicitBargeIn(text: string) {
  const t = normalizeSpeech(text);
  if (!t) return false;
  return [
    'stop',
    'hold on',
    'wait',
    'one second',
    'give me a second',
    'pause',
    'actually',
  ].some((phrase) => t === phrase || t.startsWith(`${phrase} `) || t.includes(phrase));
}

function looksLikeIso(value?: string) {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return v.includes('T') && (v.endsWith('Z') || v.includes('+') || v.includes('-'));
}

function extractTimeNeedle(text?: string): { hour: number; minute: number; meridiem: 'am' | 'pm' } | null {
  if (!text) return null;
  const normalized = text
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;
  const hasNoon = normalized.includes('noon');
  if (hasNoon) return { hour: 12, minute: 0, meridiem: 'pm' };
  const hasMidnight = normalized.includes('midnight');
  if (hasMidnight) return { hour: 12, minute: 0, meridiem: 'am' };
  const meridiem =
    normalized.includes('am') || normalized.includes('morning')
      ? 'am'
      : normalized.includes('pm') || normalized.includes('afternoon') || normalized.includes('evening') || normalized.includes('night')
        ? 'pm'
        : null;
  const match = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\b/);
  if (!match || !meridiem) return null;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 1 || hour > 12) return null;
  const minute = match[2] ? Number(match[2]) : 0;
  return { hour, minute, meridiem };
}

function slotMatchesNeedle(slotIso: string, timeZone: string, needle: { hour: number; minute: number; meridiem: 'am' | 'pm' }) {
  try {
    const date = new Date(slotIso);
    if (!Number.isFinite(date.getTime())) return false;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    const minutePart = parts.find((p) => p.type === 'minute')?.value;
    const meridiemPart = parts.find((p) => p.type === 'dayPeriod')?.value?.toLowerCase();
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
    const meridiem = meridiemPart === 'am' || meridiemPart === 'pm' ? meridiemPart : '';
    return hour === needle.hour && minute === needle.minute && meridiem === needle.meridiem;
  } catch {
    return false;
  }
}

function selectAvailabilitySlot(requestedText: string | undefined, slots: string[], timeZone: string): string | null {
  if (!requestedText || !Array.isArray(slots) || slots.length === 0) return null;
  if (slots.length === 1) return slots[0] || null;
  const needle = extractTimeNeedle(requestedText);
  if (!needle) return null;
  for (const slot of slots) {
    if (slotMatchesNeedle(slot, timeZone, needle)) return slot;
  }
  return null;
}

function titleizeField(field: string) {
  return field
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatFieldList(fields?: any[]): string | null {
  if (!Array.isArray(fields)) return null;
  const cleaned = fields.map((field) => String(field || '').trim()).filter(Boolean);
  if (!cleaned.length) return null;
  return cleaned.map((field) => titleizeField(field)).join(', ');
}

function normalizeSpeech(text?: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text?: string) {
  const t = normalizeSpeech(text);
  if (!t) return 0;
  return t.split(' ').length;
}

function isNegativeResponse(text?: string) {
  const t = normalizeSpeech(text);
  if (!t) return false;
  if (['no', 'nope', 'nah', 'no thanks', 'no thank you', 'nothing', 'nothing else', 'that is all', "that's all"].includes(t)) {
    return true;
  }
  return /\b(no|nope|nah|nothing|nothing else|that is all|that's all|no thanks|no thank you)\b/.test(t);
}

function askedAnythingElse(text?: string) {
  const t = normalizeSpeech(text);
  if (!t) return false;
  return (
    t.includes('anything else') ||
    t.includes('anything i can help') ||
    t.includes('anything i can do') ||
    t.includes('help with today') ||
    t.includes('help you with today')
  );
}

function hasDayReference(text?: string) {
  const t = normalizeSpeech(text);
  if (!t) return false;
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'mon',
    'tue',
    'tues',
    'wed',
    'thu',
    'thur',
    'thurs',
    'fri',
    'sat',
    'sun',
  ];
  if (days.some((day) => t.includes(day))) return true;
  if (/\b(today|tomorrow|tonight|this week|next week|this weekend|next weekend)\b/.test(t)) return true;
  if (/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/.test(t)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/.test(t)) return true;
  return false;
}

function buildNotesFromDetails(details: any): string | undefined {
  if (!details || typeof details !== 'object') return undefined;
  const ignored = new Set(['name', 'full_name', 'zip', 'zipcode', 'preferred_time', 'email', 'phone', 'phone_number']);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    const normalized = String(key || '').toLowerCase();
    if (!key || ignored.has(normalized)) continue;
    if (value === undefined || value === null || String(value).trim() === '') continue;
    if (normalized === 'address' && typeof value === 'object') {
      const addrObj = value as { street?: string; city?: string; state?: string; zip?: string };
      const addr = [addrObj.street, addrObj.city, addrObj.state, addrObj.zip].filter(Boolean).join(', ');
      if (addr) lines.push(`Address: ${addr}`);
      continue;
    }
    lines.push(`${titleizeField(String(key))}: ${String(value).trim()}`);
  }
  return lines.length ? lines.join('\n') : undefined;
}

function buildInstructions(tenant: TenantInfo, options: { serviceAreaRequired: boolean }) {
  const name = tenant.company_name || 'our company';
  const extra = tenant.agent_config?.realtime_instructions;
  const templatePrompt = typeof tenant.service_template?.base_system_prompt === 'string'
    ? tenant.service_template.base_system_prompt
    : null;
  const renderedTemplatePrompt = templatePrompt ? templatePrompt.replace(/\{company_name\}/g, name) : null;
  const serviceAreaRequired = options.serviceAreaRequired;
  const requiredFields = formatFieldList(tenant.service_template?.intake_schema?.required);
  const optionalFields = formatFieldList(tenant.service_template?.intake_schema?.optional);
  const lines = [
    renderedTemplatePrompt || `You are the phone receptionist for ${name}.`,
    `Greet the caller immediately and include the company name in the first sentence.`,
    `Be friendly, concise, and phone-like. Ask one question at a time.`,
    `You can answer FAQs and help callers book appointments directly.`,
    `Never ask for the caller's phone number. Use the caller ID.`,
    serviceAreaRequired
      ? `If the caller wants to book, ask for their 5-digit ZIP code first and call check_service_area(zip) before anything else.`
      : `If service-area checks are enabled or the caller provides a ZIP, call check_service_area(zip) before booking.`,
    `If the ZIP is not serviced, apologize and end the call politely.`,
    requiredFields ? `Required intake fields to collect before booking: ${requiredFields}.` : null,
    optionalFields ? `Optional fields (collect only if relevant): ${optionalFields}.` : null,
    `Collect required intake details first (based on the service template) before scheduling.`,
    `Ask for preferred day/time, call get_availability, then offer available slots.`,
    `Never claim a time is available unless get_availability returns it. If a requested time is unavailable, say so and offer available slots from get_availability.`,
    `If get_availability returns closed_day=true, tell the caller that day is closed and ask for another day.`,
    `If a requested time is available, acknowledge it and continue (do not ask to confirm the time).`,
    `Before booking, summarize the details and ask for confirmation. Only then call create_booking with confirmed=true.`,
    `When calling create_booking, include the collected intake fields in the details object.`,
    `After create_booking succeeds, ask for the best email to send the confirmation link.`,
    `Only send the confirmation link after the booking is created. The link is for managing the booking, not scheduling.`,
    `If the caller declines email, confirm the booking without a link.`,
    `Do not repeat questions or confirm details except for the email address. Only repeat email by spelling it out.`,
    `If the caller is an existing customer, ask if they want to manage an existing booking or create a new booking.`,
    `If they want to manage an existing booking: explain they can use the confirmation link, or you can help by phone. Ask if they want to reschedule or cancel, then use list_appointments_by_phone and reschedule_appointment/cancel_appointment.`,
    `If the caller asks about prior appointments, use list_appointments_by_phone.`,
    `Use knowledge_search for company-specific questions (services, pricing, policies, service areas).`,
    `After finishing the main task, ask: "Is there anything else I can help with today?"`,
    `If the caller says no, give a short friendly goodbye, then call end_call immediately.`,
    extra && extra.trim() ? extra.trim() : null,
  ].filter(Boolean) as string[];

  return lines.join('\n');
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
    const startTime = args?.start_time ?? args?.preferred_time ?? args?.window_start;
    const endTime = args?.end_time ?? args?.window_end;
    if (!startTime) {
      return { ok: false, error: 'MissingStartTime', message: 'start_time is required' };
    }
    return postJson(`${toolsBase}/tools/get_availability`, headers, {
      company_id: ctx.company_id,
      start_time: startTime,
      end_time: endTime,
      timezone: args?.timezone ?? ctx.timezone,
    });
  }

  if (name === 'create_booking') {
    const confirmed = typeof args?.confirmed === 'boolean' ? args.confirmed : true;
    if (!confirmed) {
      return {
        ok: false,
        error: 'BookingNotConfirmed',
        message: 'You must confirm booking details with the user first.',
      };
    }
    const startTime = args?.start_time ?? args?.preferred_time;
    if (!startTime) {
      return { ok: false, error: 'MissingStartTime', message: 'start_time is required' };
    }
    const customerName =
      typeof args?.customer_name === 'string'
        ? args.customer_name
        : typeof args?.full_name === 'string'
          ? args.full_name
          : undefined;
    let endTime = args?.end_time;
    if (startTime && !endTime) {
      const parsed = Date.parse(startTime);
      if (Number.isFinite(parsed)) {
        const minutes = Number(envFirst(['DEFAULT_APPOINTMENT_MINUTES']) || 120);
        endTime = new Date(parsed + minutes * 60_000).toISOString();
      }
    }
    return postJson(`${toolsBase}/tools/create_booking`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      ...(customerName ? { customer_name: customerName } : {}),
      start_time: startTime,
      end_time: endTime,
      confirmed,
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
      from_number: ctx.from,
      to_number: ctx.to,
      call_id: ctx.callSid,
      collected_info: args?.collected_info ?? args ?? {},
    });
  }

  if (name === 'start_call') {
    return postJson(`${toolsBase}/tools/start_call`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      from_number: ctx.from,
      to_number: ctx.to,
    });
  }

  if (name === 'save_call') {
    return postJson(`${toolsBase}/tools/save_call`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      transcript: args?.transcript,
      summary: args?.summary,
      duration_seconds: args?.duration_seconds,
      collected_info: args?.collected_info,
      skip_contact_update: args?.skip_contact_update,
    });
  }

  if (name === 'save_recording') {
    return postJson(`${toolsBase}/tools/save_recording`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      recording_sid: args?.recording_sid,
      duration_seconds: args?.duration_seconds,
    });
  }

  if (name === 'send_booking_link') {
    return postJson(`${toolsBase}/tools/send_booking_link`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      email: args?.email ?? '',
    });
  }

  if (name === 'end_call') {
    const accountSid = envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
    const authToken = await getSecret('TWILIO_AUTH_TOKEN');
    const client = twilio(accountSid, authToken);
    await client.calls(ctx.callSid).update({ status: 'completed' });
    return { ok: true };
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function startTwilioRecording(callSid: string) {
  const enabled = (process.env.TWILIO_RECORD_CALLS ?? 'true') !== 'false';
  if (!enabled) return;

  try {
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
  } catch (err: any) {
    console.warn('[twilio] start recording failed', err?.message ?? String(err));
  }
}

async function fetchLatestRecordingSid(callSid: string): Promise<string | null> {
  const accountSid = envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
  const authToken = await getSecret('TWILIO_AUTH_TOKEN');
  const client = twilio(accountSid, authToken);
  const recordings = await client.recordings.list({ callSid, limit: 1 });
  if (!recordings.length) return null;
  return recordings[0]?.sid || null;
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
  let recordingSynced = false;
  let serviceAreaRequired = false;
  let serviceAreaEligible: boolean | null = null;
  let lastAvailabilitySlots: string[] = [];
  let lastAvailabilityTimezone: string | null = null;
  let lastAvailabilityAt = 0;
  let pendingHangup = false;
  let waitingForHangupMark = false;
  let hangupFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let appointmentCreated = false;
  let hasExistingAppointments = false;
  let existingAppointmentsChecked = false;
  let lastAssistantAskedFollowUp = false;

  function tryGreet() {
    if (!openaiWs || !openaiReady || !twilioReady || greeted) return;
    const name = ctx?.company_name || 'our company';
    const greeting = hasExistingAppointments
      ? `Hi there, thanks for calling ${name}. Would you like to manage an existing booking, or book a new appointment?`
      : `Hi there, thanks for calling ${name}. How can I help you today?`;
    sendToOpenAI(openaiWs, {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: `Greet the caller now. Say: "${greeting}"`,
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

  function queueHangupMark() {
    if (!ctx?.streamSid || waitingForHangupMark) return;
    sendToTwilio(twilioWs, { event: 'mark', streamSid: ctx.streamSid, mark: { name: 'hangup_now' } });
    waitingForHangupMark = true;
    if (hangupFallbackTimer) clearTimeout(hangupFallbackTimer);
    hangupFallbackTimer = setTimeout(() => {
      if (!ctx) return;
      callTool(ctx, 'end_call', {}).catch((err: any) =>
        console.warn('[bridge] end_call fallback failed', err?.message ?? String(err))
      );
      shutdown('hangup_fallback');
    }, 2500);
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
    const instructions = buildInstructions(tenant, {
      serviceAreaRequired,
    });
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
        if (text) {
          transcript.push(`Assistant: ${text}`);
          lastAssistantAskedFollowUp = askedAnythingElse(text);
        }
        return;
      }

      if (msg?.type === 'conversation.item.input_audio_transcription.completed') {
        const text = msg?.transcript || msg?.text;
        if (text) {
          transcript.push(`Caller: ${text}`);
          if (isFillerUtterance(text)) {
            sendToOpenAI(openaiWs, { type: 'response.cancel' });
            return;
          }
          if (assistantSpeaking && Date.now() - lastAssistantAudioAt < 1500) {
            if (wordCount(text) < 3 && !isExplicitBargeIn(text)) {
              sendToOpenAI(openaiWs, { type: 'response.cancel' });
              return;
            }
          }
          if (appointmentCreated && lastAssistantAskedFollowUp && isNegativeResponse(text) && ctx) {
            lastAssistantAskedFollowUp = false;
            pendingHangup = true;
            const farewell = `Thanks for calling ${ctx.company_name || 'HandyCall'}. Have a great day.`;
            sendToOpenAI(openaiWs, {
              type: 'response.create',
              response: {
                modalities: ['audio', 'text'],
                instructions: `Say: "${farewell}"`,
              },
            });
            return;
          }
        }
        return;
      }

      if (msg?.type === 'response.done' || msg?.type === 'response.audio.done') {
        assistantSpeaking = false;
        if (pendingHangup && !waitingForHangupMark) {
          queueHangupMark();
        }
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
          if (toolName === 'create_booking') {
            const requestedText =
              typeof args?.start_time === 'string'
                ? args.start_time
                : typeof args?.preferred_time === 'string'
                  ? args.preferred_time
                  : '';
            const availabilityFresh = Date.now() - lastAvailabilityAt < 5 * 60_000;
            const tz =
              typeof args?.timezone === 'string'
                ? args.timezone
                : lastAvailabilityTimezone || ctx.timezone || 'UTC';
            if (availabilityFresh && requestedText && Array.isArray(lastAvailabilitySlots) && lastAvailabilitySlots.length) {
              if (!looksLikeIso(requestedText) && !hasDayReference(requestedText)) {
                const match = selectAvailabilitySlot(requestedText, lastAvailabilitySlots, tz);
                if (match) {
                  args = { ...args, start_time: match, timezone: tz };
                }
              }
            }
            if (typeof args?.confirmed !== 'boolean') {
              args = { ...args, confirmed: true };
            }
            if (args?.details && !args?.notes) {
              const notes = buildNotesFromDetails(args.details);
              if (notes) args = { ...args, notes };
            }
          }
          if (toolName === 'end_call') {
            pendingHangup = true;
            result = { ok: true, status: 'pending_hangup' };
            if (!assistantSpeaking) queueHangupMark();
          } else if (toolName === 'send_booking_link' && !appointmentCreated) {
            result = {
              ok: false,
              error: 'BookingNotCreated',
              message: 'Create the booking first, then ask for the email and send the confirmation link.',
            };
          } else if (
            (toolName === 'get_availability' || toolName === 'create_booking' || toolName === 'send_booking_link') &&
            serviceAreaRequired &&
            serviceAreaEligible !== true
          ) {
            result = {
              ok: false,
              error: 'ServiceAreaNotConfirmed',
              message: 'Ask for the 5-digit ZIP code and call check_service_area before booking.',
            };
          } else {
            result = await callTool(ctx, toolName, args);
            if (toolName === 'create_booking') {
              if ((result as any)?.ok === true || (result as any)?.appointment_id) {
                appointmentCreated = true;
                if (args?.details) {
                  callTool(ctx, 'save_call', {
                    collected_info: args.details,
                    summary: 'Booked appointment.',
                  }).catch((err: any) => console.warn('[bridge] save_call after booking failed', err?.message ?? String(err)));
                }
              }
            }
            if (toolName === 'check_service_area') {
              if (typeof (result as any)?.eligible === 'boolean') {
                serviceAreaEligible = (result as any).eligible;
              }
            }
            if (toolName === 'get_availability') {
              if (Array.isArray((result as any)?.slots)) {
                lastAvailabilitySlots = (result as any).slots.filter((slot: any) => typeof slot === 'string');
                lastAvailabilityTimezone =
                  typeof (result as any)?.timezone === 'string' ? (result as any).timezone : ctx.timezone || null;
                lastAvailabilityAt = Date.now();
              } else {
                lastAvailabilitySlots = [];
                lastAvailabilityAt = Date.now();
              }
            }
          }
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
        if (toolName !== 'end_call') {
          sendToOpenAI(openaiWs, { type: 'response.create' });
        }
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

      let resolvedTenant: TenantInfo;
      try {
        resolvedTenant = await resolveTenant(to);
      } catch (err: any) {
        console.error('[twilio] resolveTenant failed', err?.message ?? String(err));
        return shutdown('tenant_resolve_failed');
      }

      const templateRequiresZip = resolvedTenant?.service_template?.tool_policy?.require_zip_check === true;
      const hasServiceZips =
        Array.isArray(resolvedTenant?.service_area_zipcodes) && resolvedTenant.service_area_zipcodes.length > 0;
      serviceAreaRequired = templateRequiresZip || hasServiceZips;
      serviceAreaEligible = null;

      ctx = {
        callSid,
        streamSid,
        from,
        to,
        company_id: resolvedTenant.company_id,
        company_name: resolvedTenant.company_name,
        timezone: resolvedTenant.timezone,
        startedAt: Date.now(),
      };

      if (!existingAppointmentsChecked) {
        existingAppointmentsChecked = true;
        try {
          const existing = await callTool(ctx, 'list_appointments_by_phone', { range_days: 365 });
          const appts = Array.isArray((existing as any)?.appointments) ? (existing as any).appointments : [];
          hasExistingAppointments = appts.length > 0;
        } catch (err: any) {
          console.warn('[bridge] list_appointments_by_phone failed', err?.message ?? String(err));
        }
      }

      twilioReady = true;
      await connectOpenAI(resolvedTenant);

      callTool(ctx, 'start_call', {}).catch((err: any) =>
        console.warn('[bridge] start_call failed', err?.message ?? String(err))
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
      if (ctx) {
        const merged = transcript.join('\n');
        const durationSeconds = Math.max(1, Math.ceil((Date.now() - ctx.startedAt) / 1000));
        callTool(ctx, 'save_call', {
          transcript: merged || undefined,
          summary: 'Call ended.',
          duration_seconds: durationSeconds,
          skip_contact_update: true,
        }).catch((err: any) => console.warn('[bridge] save_call failed', err?.message ?? String(err)));

        if ((process.env.TWILIO_RECORD_CALLS ?? 'true') !== 'false') {
          const delays = [5000, 15000, 30000];
          for (const delay of delays) {
            setTimeout(async () => {
              if (!ctx || recordingSynced) return;
              try {
                const recordingSid = await fetchLatestRecordingSid(ctx.callSid);
                if (!recordingSid) return;
                await callTool(ctx, 'save_recording', { recording_sid: recordingSid });
                recordingSynced = true;
              } catch (err: any) {
                console.warn('[bridge] recording sync failed', err?.message ?? String(err));
              }
            }, delay);
          }
        }
      }
      return shutdown('twilio_stop');
    }

    if (msg?.event === 'mark') {
      const name = msg?.mark?.name || '';
      if (name === 'hangup_now' && ctx) {
        if (hangupFallbackTimer) clearTimeout(hangupFallbackTimer);
        callTool(ctx, 'end_call', {}).catch((err: any) =>
          console.warn('[bridge] end_call (mark) failed', err?.message ?? String(err))
        );
        return shutdown('hangup_mark');
      }
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
