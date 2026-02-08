import http from 'http';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import twilio from 'twilio';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { toolsSchema } from './toolsSchema';
import { Readable } from 'stream';
import { spawn } from 'child_process';

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

type SecretName =
  | 'OPENAI_API_KEY'
  | 'TWILIO_AUTH_TOKEN'
  | 'TWILIO_ACCOUNT_SID'
  | 'ELEVENLABS_API_KEY';

const ssmParamDefaults: Record<SecretName, string> = {
  OPENAI_API_KEY: '/handycall/prod/openai_api_key',
  TWILIO_AUTH_TOKEN: '/handycall/prod/twilio_auth_token',
  TWILIO_ACCOUNT_SID: '/handycall/prod/twilio_account_sid',
  ELEVENLABS_API_KEY: '/handycall/prod/elevenlabs_api_key',
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

async function resolveElevenLabsConfig() {
  let apiKey = envFirst(['ELEVENLABS_API_KEY', 'ELEVENLABS_KEY', 'ELEVEN_LABS_API_KEY']) || '';
  if (apiKey && isPlaceholderSecret(apiKey)) {
    apiKey = '';
  }
  if (!apiKey) {
    try {
      apiKey = await getSecret('ELEVENLABS_API_KEY');
    } catch (err: any) {
      console.warn('[elevenlabs] secret lookup failed', err?.message ?? String(err));
    }
  }
  const voiceId = envFirst(['ELEVENLABS_VOICE_ID', 'ELEVEN_LABS_VOICE_ID']) || '';
  const modelId = envFirst(['ELEVENLABS_MODEL_ID', 'ELEVEN_LABS_MODEL_ID']) || 'eleven_multilingual_v2';
  if (!apiKey || !voiceId) return null;
  return { apiKey, voiceId, modelId };
}

async function elevenLabsStreamTts(
  params: { apiKey: string; voiceId: string; modelId: string; text: string }
): Promise<Readable> {
  const { apiKey, voiceId, modelId, text } = params;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
    }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${msg}`);
  }
  return Readable.fromWeb(res.body as any);
}

function transcodeToMulaw8k(input: Readable, abortSignal?: AbortSignal) {
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    'pipe:0',
    '-ac',
    '1',
    '-ar',
    '8000',
    '-f',
    'mulaw',
    'pipe:1',
  ]);

  input.pipe(ffmpeg.stdin);

  const onAbort = () => {
    try {
      ffmpeg.kill('SIGKILL');
    } catch {
      // ignore
    }
    try {
      input.destroy();
    } catch {
      // ignore
    }
  };

  if (abortSignal) {
    abortSignal.addEventListener('abort', onAbort, { once: true });
  }

  ffmpeg.on('exit', () => {
    if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
  });

  return ffmpeg.stdout;
}

type CallContext = {
  callSid: string;
  streamSid: string;
  from: string;
  to: string;
  company_id: string;
  company_name: string;
  timezone?: string;
  transfer_enabled?: boolean;
  transfer_number?: string;
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
  transfer_enabled?: boolean;
  transfer_number?: string;
};

type ActiveCallState = {
  ctx: CallContext;
  getTranscript: () => string;
  getDetails?: () => Record<string, any>;
  ended: boolean;
};

const activeCalls = new Map<string, ActiveCallState>();

const fillerUtterances = new Set(['mhm', 'mm', 'uh', 'um', 'uh-huh', 'uh huh', 'hmm', 'hm', 'ok', 'okay', 'yeah', 'yep']);
const shortIntentKeywords = new Set([
  'yes',
  'no',
  'book',
  'booking',
  'appointment',
  'schedule',
  'reschedule',
  'cancel',
  'question',
  'help',
  'pricing',
  'price',
  'support',
  'agent',
  'human',
  'operator',
]);

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

function resolveTransferTarget(queue?: string): string | null {
  const raw = typeof queue === 'string' ? queue.trim() : '';
  const key = raw ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '_') : '';
  const candidates = [
    key ? `TRANSFER_${key}_NUMBER` : null,
    key ? `TRANSFER_${key}` : null,
    key ? `TRANSFER_QUEUE_${key}` : null,
    raw ? `TRANSFER_${raw}` : null,
    'TRANSFER_DEFAULT_NUMBER',
    'TRANSFER_NUMBER',
  ].filter(Boolean) as string[];
  return envFirst(candidates) || null;
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
  // Prefer HH:MM patterns (e.g. "10:30") over bare numbers (e.g. "10") to avoid
  // matching day-of-month numbers like the "10" in "February 10 at 10:30 AM".
  const colonMatch = normalized.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colonMatch && meridiem) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    if (Number.isFinite(hour) && hour >= 1 && hour <= 12) {
      return { hour, minute, meridiem };
    }
  }
  const bareMatch = normalized.match(/\b(\d{1,2})\b\s*(?:am|pm)/);
  if (!bareMatch && !colonMatch) {
    const fallback = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\b/);
    if (!fallback || !meridiem) return null;
    const hour = Number(fallback[1]);
    if (!Number.isFinite(hour) || hour < 1 || hour > 12) return null;
    return { hour, minute: fallback[2] ? Number(fallback[2]) : 0, meridiem };
  }
  if (bareMatch && meridiem) {
    const hour = Number(bareMatch[1]);
    if (Number.isFinite(hour) && hour >= 1 && hour <= 12) {
      return { hour, minute: 0, meridiem };
    }
  }
  return null;
}

function hasDateTokens(text?: string): boolean {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  if (/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t)) return true;
  if (/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/.test(t)) return true;
  if (/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(t)) return true;
  if (/\b\d{4}\b/.test(t)) return true;
  if (/\b(today|tomorrow|tonight|next|this)\b/.test(t)) return true;
  return false;
}

function isTimeOnlyText(text?: string): boolean {
  if (!text) return false;
  return !!extractTimeNeedle(text) && !hasDateTokens(text);
}

function isoToLocalNaive(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return value;
  return `${match[1]} ${match[2]}:${match[3]}`;
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

function slotMatchesDate(slotIso: string, timeZone: string, dateKey: string): boolean {
  try {
    const date = new Date(slotIso);
    if (!Number.isFinite(date.getTime())) return false;
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    return localDate === dateKey;
  } catch {
    return false;
  }
}

function extractDateKey(text?: string): string | null {
  if (!text) return null;
  const match = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return match?.[1] ?? null;
}

function selectAvailabilitySlot(requestedText: string | undefined, slots: string[], timeZone: string): string | null {
  if (!requestedText || !Array.isArray(slots) || slots.length === 0) return null;
  if (slots.length === 1) return slots[0] || null;
  const dateKey = extractDateKey(requestedText);
  const needle = extractTimeNeedle(requestedText);
  if (!needle) return null;
  for (const slot of slots) {
    if (dateKey && !slotMatchesDate(slot, timeZone, dateKey)) continue;
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
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text?: string) {
  const t = normalizeSpeech(text);
  if (!t) return 0;
  return t.split(' ').length;
}

function isActionableShortUtterance(text?: string) {
  const t = normalizeSpeech(text);
  if (!t) return false;
  const words = t.split(' ').filter(Boolean);
  if (words.length > 3) return true;
  if (shortIntentKeywords.has(t)) return true;
  return words.some((w) => shortIntentKeywords.has(w));
}

function looksLikeFalseStart(text?: string) {
  const t = normalizeSpeech(text);
  if (!t) return false;
  if (/^(i|im|i'm|i am|we|we're|we are|my|this|that|it)$/i.test(t)) return true;
  if (/^(i|im|i'm|i am)\s+(a|an|the)$/i.test(t)) return true;
  if (/^(i|im|i'm|i am)\s+(need|want|have)$/i.test(t)) return true;
  if (/^i m$/i.test(t) || /^i m a$/i.test(t)) return true;
  return false;
}

function isLowSignalTranscript(text?: string) {
  const raw = String(text || '').trim();
  if (!raw) return true;
  if (raw.length < 3) return true;
  if (/^[\W_]+$/.test(raw)) return true;
  const nonLatin = (raw.match(/[^\u0000-\u024F\s]/g) || []).length;
  if (nonLatin / Math.max(1, raw.length) > 0.25) return true;
  if (looksLikeFalseStart(raw)) return true;
  if (wordCount(raw) <= 3 && !isActionableShortUtterance(raw)) return true;
  return false;
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
    if (normalized === 'address' && typeof value === 'string') {
      lines.push(`Address: ${value.trim()}`);
      continue;
    }
    lines.push(`${titleizeField(String(key))}: ${String(value).trim()}`);
  }
  return lines.length ? lines.join('\n') : undefined;
}

function normalizeFieldKey(field: string): string {
  return String(field || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

// Universal aliases that apply across ALL company types
const UNIVERSAL_ALIASES: Record<string, string[]> = {
  full_name: ['name', 'customer_name', 'caller_name'],
  address: ['service_address', 'location_address', 'street_address', 'service_location', 'home_address'],
  zip: ['zipcode', 'zip_code', 'postal_code'],
  preferred_time: ['time', 'appointment_time', 'schedule_time', 'preferred_date'],
};

// Split a snake_case key into meaningful words, dropping connectors like "or", "and", "of"
const FILLER_WORDS = new Set(['or', 'and', 'of', 'the', 'a', 'an', 'is', 'in', 'for', 'to']);
function keyWords(key: string): string[] {
  return key.split('_').filter((w) => w.length > 0 && !FILLER_WORDS.has(w));
}

// Check if detailKey is a likely match for requiredKey using word overlap.
// E.g. required="pest_type_or_symptoms", detail="pest_type" → words [pest,type] ⊆ [pest,type,symptoms] → match
function fuzzyFieldMatch(requiredKey: string, detailKey: string): boolean {
  const reqWords = keyWords(requiredKey);
  const detWords = keyWords(detailKey);
  if (reqWords.length === 0 || detWords.length === 0) return false;
  // All words in the shorter key must appear in the longer key
  const [shorter, longer] = detWords.length <= reqWords.length ? [detWords, reqWords] : [reqWords, detWords];
  return shorter.length >= 1 && shorter.every((w) => longer.includes(w));
}

function isFieldPresent(field: string, args: any): boolean {
  const details = args?.details && typeof args.details === 'object' ? args.details : {};
  const key = normalizeFieldKey(field);
  const read = (k: string) => {
    const v = details?.[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  };

  // Universal special cases (apply to every company type)
  if (key === 'preferred_time') {
    return !!(args?.start_time || args?.preferred_time || details?.preferred_time || details?.time);
  }
  if (key === 'full_name') {
    return !!(args?.customer_name || details?.full_name || details?.name || details?.customer_name);
  }
  if (key === 'zip' || key === 'zipcode') {
    return !!(details?.zip || details?.zipcode || details?.zip_code || args?.zip);
  }

  // 1. Exact match
  if (read(key)) return true;

  // 2. Universal aliases
  const aliases = UNIVERSAL_ALIASES[key];
  if (aliases) {
    for (const alias of aliases) {
      if (read(alias)) return true;
    }
  }

  // 3. Generic word-overlap: scan all detail keys for a fuzzy match
  for (const detailKey of Object.keys(details)) {
    if (read(detailKey) && fuzzyFieldMatch(key, detailKey)) return true;
  }

  return false;
}

// Find the best matching detail key for a required field, using the same logic as isFieldPresent
function findMatchingDetailKey(requiredField: string, details: Record<string, any>): string | null {
  const key = normalizeFieldKey(requiredField);
  if (details[key] && String(details[key]).trim()) return key;
  const aliases = UNIVERSAL_ALIASES[key];
  if (aliases) {
    for (const alias of aliases) {
      if (details[alias] && String(details[alias]).trim()) return alias;
    }
  }
  for (const detailKey of Object.keys(details)) {
    if (details[detailKey] && String(details[detailKey]).trim() && fuzzyFieldMatch(key, detailKey)) return detailKey;
  }
  return null;
}

function findMissingRequired(fields: string[], args: any): string[] {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return fields.filter((field) => !isFieldPresent(field, args));
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
    `You MUST collect EVERY required intake field before asking about scheduling. Do not skip any. Go through each required field one at a time. Do not move to preferred time until all other required fields have been collected.`,
    `Ask for preferred day/time, call get_availability, then offer available slots.`,
    `Never claim a time is available unless get_availability returns it. If a requested time is unavailable, say so and offer available slots from get_availability.`,
    `If get_availability returns closed_day=true, tell the caller that day is closed and ask for another day.`,
    `If get_availability includes suggested_time_only, ONLY offer those times (max 3). Do not invent times.`,
    `If a requested time is available, acknowledge it and continue (do not ask to confirm the time).`,
    `Only provide ONE summary, after ALL required intake fields (including address if required) AND a specific time slot have been collected. Do not summarize early or multiple times.`,
    `Before booking, summarize the details and ask for confirmation. Only then call create_booking with confirmed=true.`,
    `When calling create_booking, you MUST include ALL collected intake fields in the details object—not just the most recent ones. Include every field you gathered during the conversation (name, address, zip, service details, etc.).`,
    `If create_booking returns a MissingRequiredFields error, ask ONLY for the specific fields listed in missing_fields. Do NOT re-ask for information you already collected. Then retry create_booking with ALL collected fields (old and new) in the details object.`,
    `After create_booking succeeds, ask for the best email to send the confirmation link.`,
    `Only send the confirmation link after the booking is created. The link is for managing the booking, not scheduling.`,
    `If the caller declines email, confirm the booking without a link.`,
    `Do not repeat questions or confirm details except for the email address. Confirm the email once; do not spell it out unless the caller asks.`,
    `Never read or say the booking link/URL aloud. After send_booking_link succeeds, just say the email was sent.`,
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
      timezone: ctx.timezone ?? args?.timezone,
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
    return postJson(`${toolsBase}/tools/create_booking`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      ...args,
      ...(customerName ? { customer_name: customerName } : {}),
      start_time: startTime,
      end_time: args?.end_time,
      timezone: ctx.timezone ?? args?.timezone,
      confirmed,
    });
  }

  if (name === 'hold_slot') {
    return postJson(`${toolsBase}/tools/hold_slot`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      slot: args?.slot ?? args?.start_time ?? '',
      timezone: ctx.timezone ?? args?.timezone,
      hold_minutes: args?.hold_minutes,
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
      timezone: ctx.timezone ?? args?.timezone,
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

  if (name === 'request_callback') {
    return postJson(`${toolsBase}/tools/create_lead`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      from_number: ctx.from,
      to_number: ctx.to,
      collected_info: {
        callback_request: {
          name: args?.name,
          callback_number: args?.callback_number,
          reason: args?.reason,
          preferred_time: args?.preferred_time,
        },
      },
    });
  }

  if (name === 'transfer_call') {
    if (!ctx.transfer_enabled) {
      return { ok: false, error: 'Transfer is disabled for this account.' };
    }
    const queue = typeof args?.queue === 'string' ? args.queue : '';
    const configuredNumber = typeof ctx.transfer_number === 'string' ? ctx.transfer_number.trim() : '';
    const target = configuredNumber || resolveTransferTarget(queue);
    if (!target) {
      return { ok: false, error: 'No transfer target configured for this queue.' };
    }
    const accountSid = envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
    const authToken = await getSecret('TWILIO_AUTH_TOKEN');
    const client = twilio(accountSid, authToken);
    const twiml = `<Response><Dial>${escapeXml(target)}</Dial></Response>`;
    await client.calls(ctx.callSid).update({ twiml });
    return { ok: true, target };
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
      recordingChannels: 'mono',
    });
  } catch (err: any) {
    console.warn('[twilio] start recording failed', err?.message ?? String(err));
  }
}

async function fetchLatestCompletedRecordingSid(callSid: string): Promise<string | null> {
  const accountSid = envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
  const authToken = await getSecret('TWILIO_AUTH_TOKEN');
  const client = twilio(accountSid, authToken);
  const recordings = await client.recordings.list({ callSid, limit: 20 });
  if (!recordings.length) return null;
  const completed = recordings.find((r) => String((r as any)?.status || '').toLowerCase() === 'completed');
  return completed?.sid || null;
}

async function fetchTwilioCallDetails(callSid: string): Promise<{ to?: string; from?: string } | null> {
  try {
    const accountSid = envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
    const authToken = await getSecret('TWILIO_AUTH_TOKEN');
    const client = twilio(accountSid, authToken);
    const call = await client.calls(callSid).fetch();
    return { to: call.to || undefined, from: call.from || undefined };
  } catch (err: any) {
    console.warn('[twilio] fetch call failed', err?.message ?? String(err));
    return null;
  }
}

async function finalizeCallFromStatus(callSid: string, reason: string) {
  const cached = activeCalls.get(callSid);
  if (cached?.ended) return;

  let ctx = cached?.ctx;
  if (!ctx) {
    const details = await fetchTwilioCallDetails(callSid);
    const to = details?.to || '';
    const from = details?.from || '';
    if (to) {
      try {
        const tenant: TenantInfo = await resolveTenant(to);
        ctx = {
          callSid,
          streamSid: 'stream_status',
          from,
          to,
          company_id: tenant.company_id,
          company_name: tenant.company_name,
          timezone: tenant.timezone,
          transfer_enabled: tenant.transfer_enabled,
          transfer_number: tenant.transfer_number,
          startedAt: Date.now(),
        };
      } catch (err: any) {
        console.warn('[bridge] resolveTenant failed in stream status', err?.message ?? String(err));
      }
    }
  }

  if (!ctx) return;

  const transcriptText = cached?.getTranscript ? cached.getTranscript() : '';
  const collectedInfoRaw = cached?.getDetails ? cached.getDetails() : {};
  const collectedInfo =
    collectedInfoRaw && Object.keys(collectedInfoRaw).some((key) => `${(collectedInfoRaw as any)[key] ?? ''}`.trim() !== '')
      ? collectedInfoRaw
      : undefined;
  const durationSeconds = Math.max(1, Math.ceil((Date.now() - ctx.startedAt) / 1000));
  try {
    await callTool(ctx, 'save_call', {
      transcript: transcriptText || undefined,
      summary: reason || 'Call ended.',
      duration_seconds: durationSeconds,
      collected_info: collectedInfo,
      skip_contact_update: !transcriptText && !collectedInfo,
    });
  } catch (err: any) {
    console.warn('[bridge] save_call (stream status) failed', err?.message ?? String(err));
  }
  if ((process.env.TWILIO_RECORD_CALLS ?? 'true') !== 'false') {
    try {
      const recordingSid = await fetchLatestCompletedRecordingSid(callSid);
      if (recordingSid) {
        await callTool(ctx, 'save_recording', { recording_sid: recordingSid });
      }
    } catch (err: any) {
      console.warn('[bridge] save_recording (stream status) failed', err?.message ?? String(err));
    }
  }

  if (cached) {
    cached.ended = true;
  }
  if (cached) {
    setTimeout(() => activeCalls.delete(callSid), 10 * 60_000);
  } else {
    activeCalls.delete(callSid);
  }
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
      const event = String(form.StreamEvent || form.StreamStatus || '').toLowerCase();
      const callSid = String(form.CallSid || '').trim();
      if (callSid && (event === 'stream-stopped' || event === 'stream-ended' || event === 'ended' || event === 'stop')) {
        finalizeCallFromStatus(callSid, 'Call ended (stream status)').catch((err: any) =>
          console.warn('[bridge] finalizeCallFromStatus failed', err?.message ?? String(err))
        );
      }
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
  let elevenLabsConfig: { apiKey: string; voiceId: string; modelId: string } | null = null;
  let useElevenLabs = false;
  let openaiReady = false;
  let openaiResponding = false;
  let twilioReady = false;
  let greeted = false;
  let assistantSpeaking = false;
  let lastAssistantAudioAt = 0;
  let ttsAbort: AbortController | null = null;
  let assistantTextBuffer = '';
  let recordingSynced = false;
  let recordingSyncScheduled = false;
  let serviceAreaRequired = false;
  let serviceAreaEligible: boolean | null = null;
  let lastAvailabilitySlots: string[] = [];
  let lastAvailabilityTimezone: string | null = null;
  let lastAvailabilityAt = 0;
  let lastRequestedSlot: string | null = null;
  let lastAvailabilityDateKey: string | null = null;
  let pendingHangup = false;
  let waitingForHangupMark = false;
  let hangupFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let appointmentCreated = false;
  let hasExistingAppointments = false;
  let existingAppointmentsChecked = false;
  let lastAssistantAskedFollowUp = false;
  let lowSignalAttempts = 0;
  let lastSpeechStartAt = 0;
  let requiredIntakeFields: string[] = [];
  let collectedDetails: Record<string, any> = {};
  let lastCallerUtterance: string | null = null;

  function tryGreet() {
    if (!openaiWs || !openaiReady || !twilioReady || greeted) return;
    const name = ctx?.company_name || 'our company';
    const greeting = hasExistingAppointments
      ? `Hi there, thanks for calling ${name}. Would you like to manage an existing booking, or book a new appointment?`
      : `Hi there, thanks for calling ${name}. How can I help you today?`;
    createResponse(`Say exactly: "${greeting}" Then stop. Do not add any follow-up question.`);
    greeted = true;
  }

  function reprompt(attempt: number) {
    if (!openaiWs || !openaiReady) return;
    const msg =
      attempt <= 1
        ? "Sorry, didn't catch that. Are you calling to book an appointment, or do you have a quick question?"
        : "I'm still having trouble hearing you. If you'd like, I can take a message for a callback - what's your name?";
    sendToOpenAI(openaiWs, { type: 'response.cancel' });
    createResponse(`Say: "${msg}"`);
  }

  function buildModalities() {
    return useElevenLabs ? ['text'] : ['audio', 'text'];
  }

  function createResponse(instructions?: string) {
    if (!openaiWs) return;
    assistantTextBuffer = '';
    const response: any = { modalities: buildModalities() };
    if (instructions) response.instructions = instructions;
    sendToOpenAI(openaiWs, { type: 'response.create', response });
    openaiResponding = true;
  }

  async function speakWithElevenLabs(text: string) {
    if (!ctx?.streamSid || !elevenLabsConfig) return;
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    if (ttsAbort) {
      try {
        ttsAbort.abort();
      } catch {
        // ignore
      }
    }
    const controller = new AbortController();
    ttsAbort = controller;
    assistantSpeaking = true;
    lastAssistantAudioAt = Date.now();
    try {
      const ttsStream = await elevenLabsStreamTts({
        apiKey: elevenLabsConfig.apiKey,
        voiceId: elevenLabsConfig.voiceId,
        modelId: elevenLabsConfig.modelId,
        text: trimmed,
      });
      const mulaw = transcodeToMulaw8k(ttsStream, controller.signal);
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          if (ctx?.streamSid) {
            sendToTwilio(twilioWs, { event: 'clear', streamSid: ctx.streamSid });
          }
          try {
            mulaw.destroy();
          } catch {
            // ignore
          }
        };
        controller.signal.addEventListener('abort', onAbort, { once: true });
        mulaw.on('data', (chunk: Buffer) => {
          if (controller.signal.aborted || !ctx?.streamSid) return;
          lastAssistantAudioAt = Date.now();
          sendToTwilio(twilioWs, {
            event: 'media',
            streamSid: ctx.streamSid,
            media: { payload: chunk.toString('base64') },
          });
        });
        mulaw.on('end', () => {
          controller.signal.removeEventListener('abort', onAbort);
          resolve();
        });
        mulaw.on('error', (err) => {
          controller.signal.removeEventListener('abort', onAbort);
          reject(err);
        });
      });
    } catch (err: any) {
      console.warn('[elevenlabs] TTS failed', err?.message ?? String(err));
    } finally {
      if (ttsAbort === controller) {
        ttsAbort = null;
      }
      assistantSpeaking = false;
      if (pendingHangup && !waitingForHangupMark && !controller.signal.aborted) {
        setTimeout(() => {
          if (pendingHangup && !waitingForHangupMark) queueHangupMark();
        }, 1500);
      }
    }
  }

  function appendAssistantText(delta: string) {
    if (!delta) return;
    assistantTextBuffer += delta;
  }

  function flushAssistantText(textOverride?: string) {
    const text = String(textOverride ?? assistantTextBuffer).trim();
    assistantTextBuffer = '';
    if (!text) return;
    transcript.push(`Assistant: ${text}`);
    lastAssistantAskedFollowUp = askedAnythingElse(text);
    void speakWithElevenLabs(text);
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

  function scheduleRecordingSync(reason: string) {
    if (recordingSynced || recordingSyncScheduled) return;
    if (!ctx || (process.env.TWILIO_RECORD_CALLS ?? 'true') === 'false') return;
    recordingSyncScheduled = true;
    const delays = [5000, 15000, 30000, 60000, 120000];
    for (const delay of delays) {
      setTimeout(async () => {
        if (!ctx || recordingSynced) return;
        try {
          const recordingSid = await fetchLatestCompletedRecordingSid(ctx.callSid);
          if (!recordingSid) return;
          await callTool(ctx, 'save_recording', { recording_sid: recordingSid });
          recordingSynced = true;
          console.log('[bridge] recording synced', { reason, recordingSid });
        } catch (err: any) {
          console.warn('[bridge] recording sync failed', err?.message ?? String(err));
        }
      }, delay);
    }
  }

  function queueHangupMark() {
    if (!ctx?.streamSid || waitingForHangupMark) return;
    scheduleRecordingSync('hangup_mark');
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
          tools: toolsSchema({ intakeFields: requiredIntakeFields }),
          tool_choice: 'auto',
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
          turn_detection: {
            type: 'semantic_vad',
            create_response: false,
            interrupt_response: true,
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
        if (useElevenLabs) return;
        const payload = msg?.delta;
        if (payload && ctx?.streamSid) {
          sendToTwilio(twilioWs, { event: 'media', streamSid: ctx.streamSid, media: { payload } });
          assistantSpeaking = true;
          lastAssistantAudioAt = Date.now();
        }
        return;
      }

      if (msg?.type === 'response.audio_transcript.done') {
        if (useElevenLabs) return;
        const text = msg?.transcript;
        if (text) {
          transcript.push(`Assistant: ${text}`);
          lastAssistantAskedFollowUp = askedAnythingElse(text);
        }
        return;
      }

      if (
        useElevenLabs &&
        (msg?.type === 'response.text.delta' || msg?.type === 'response.output_text.delta')
      ) {
        const delta = msg?.delta || msg?.text;
        if (delta) appendAssistantText(String(delta));
        return;
      }

      if (
        useElevenLabs &&
        (msg?.type === 'response.text.done' || msg?.type === 'response.output_text.done')
      ) {
        const text = msg?.text || msg?.output_text || assistantTextBuffer;
        flushAssistantText(text);
        return;
      }

      if (msg?.type === 'conversation.item.input_audio_transcription.completed') {
        const text = msg?.transcript || msg?.text;
        if (!text || !String(text).trim()) {
          return;
        }

        const trimmed = String(text).trim();
        const recentSpeech = lastSpeechStartAt && Date.now() - lastSpeechStartAt < 3500;
        if (!recentSpeech && trimmed.length < 6) {
          return;
        }

        if (isLowSignalTranscript(trimmed) || isFillerUtterance(trimmed)) {
          lowSignalAttempts += 1;
          reprompt(lowSignalAttempts);
          return;
        }

        transcript.push(`Caller: ${trimmed}`);
        lastCallerUtterance = trimmed;
        lowSignalAttempts = 0;
        if (assistantSpeaking && Date.now() - lastAssistantAudioAt < 1500) {
          if (wordCount(trimmed) < 3 && !isExplicitBargeIn(trimmed)) {
            sendToOpenAI(openaiWs, { type: 'response.cancel' });
            return;
          }
        }

        if (appointmentCreated && lastAssistantAskedFollowUp && isNegativeResponse(trimmed) && ctx) {
          lastAssistantAskedFollowUp = false;
          pendingHangup = true;
          const farewell = `Thanks for calling ${ctx.company_name || 'HandyCall'}. Have a great day.`;
          createResponse(`Say: "${farewell}"`);
          return;
        }

        if (openaiWs && openaiReady) {
          if (openaiResponding) {
            sendToOpenAI(openaiWs, { type: 'response.cancel' });
          }
          createResponse();
        }
        return;
      }

      if (msg?.type === 'response.done') {
        openaiResponding = false;
        if (useElevenLabs && assistantTextBuffer.trim()) {
          flushAssistantText();
        }
        return;
      }

      if (msg?.type === 'response.audio.done') {
        if (useElevenLabs) return;
        assistantSpeaking = false;
        openaiResponding = false;
        if (pendingHangup && !waitingForHangupMark) {
          setTimeout(() => {
            if (pendingHangup && !waitingForHangupMark) queueHangupMark();
          }, 1500);
        }
        return;
      }

      if (msg?.type === 'input_audio_buffer.speech_started') {
        lastSpeechStartAt = Date.now();
        const now = Date.now();
        const wasSpeaking = assistantSpeaking;
        if (useElevenLabs && ttsAbort) {
          try {
            ttsAbort.abort();
          } catch {
            // ignore
          }
          if (ctx?.streamSid) sendToTwilio(twilioWs, { event: 'clear', streamSid: ctx.streamSid });
        }
        if (wasSpeaking && now - lastAssistantAudioAt < 5000) {
          if (ctx?.streamSid) sendToTwilio(twilioWs, { event: 'clear', streamSid: ctx.streamSid });
          sendToOpenAI(openaiWs, { type: 'response.cancel' });
          openaiResponding = false;
        }
        if (useElevenLabs && ttsAbort) {
          assistantSpeaking = false;
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

        openaiResponding = false;
        let result: any;
        try {
          if (!ctx) throw new Error('Missing call context');
          const normalizedTimezone = ctx.timezone || lastAvailabilityTimezone || 'UTC';

          if (toolName === 'get_availability') {
            let startTime = args?.start_time ?? args?.preferred_time ?? args?.window_start;
            if (typeof startTime === 'string') {
              const callerHasDate = Boolean(lastCallerUtterance && hasDateTokens(lastCallerUtterance));
              const callerHasTime = Boolean(lastCallerUtterance && extractTimeNeedle(lastCallerUtterance));
              if (callerHasDate && callerHasTime && (!hasDateTokens(startTime) || isTimeOnlyText(startTime))) {
                startTime = lastCallerUtterance;
              }
              if (isTimeOnlyText(startTime) && lastAvailabilityDateKey) {
                startTime = `${lastAvailabilityDateKey} ${startTime}`;
              } else if (isTimeOnlyText(startTime) && lastCallerUtterance && hasDateTokens(lastCallerUtterance)) {
                startTime = lastCallerUtterance;
              }
              if (looksLikeIso(startTime) && !lastAvailabilitySlots.includes(startTime)) {
                startTime = isoToLocalNaive(startTime);
              }
            }
            args = { ...args, start_time: startTime, timezone: normalizedTimezone };
          }

          if (toolName === 'create_booking') {
            // Accumulate details across multiple create_booking attempts
            if (args?.details && typeof args.details === 'object') {
              collectedDetails = { ...collectedDetails, ...args.details };
            }
            // Also capture top-level fields the AI might pass outside details
            if (args?.customer_name) collectedDetails.full_name = collectedDetails.full_name || args.customer_name;
            if (args?.full_name) collectedDetails.full_name = args.full_name;
            if (args?.zip) collectedDetails.zip = collectedDetails.zip || args.zip;

            // Normalize aliased/fuzzy keys to canonical required field names
            for (const reqField of requiredIntakeFields) {
              const canonical = normalizeFieldKey(reqField);
              if (collectedDetails[canonical] && String(collectedDetails[canonical]).trim()) continue;
              const matchKey = findMatchingDetailKey(canonical, collectedDetails);
              if (matchKey && matchKey !== canonical) {
                collectedDetails[canonical] = collectedDetails[matchKey];
              }
            }

            // Replace args.details with the accumulated state
            args = { ...args, details: { ...collectedDetails } };

            const requestedText =
              typeof args?.start_time === 'string'
                ? args.start_time
                : typeof args?.preferred_time === 'string'
                  ? args.preferred_time
                  : '';
            const availabilityFresh = Date.now() - lastAvailabilityAt < 5 * 60_000;
            const tz = normalizedTimezone;
            const missingFields = findMissingRequired(requiredIntakeFields, args);
            if (missingFields.length) {
              const presentFields = requiredIntakeFields.filter((f) => !missingFields.includes(f));
              result = {
                ok: false,
                error: 'MissingRequiredFields',
                missing_fields: missingFields,
                already_collected: presentFields,
                message: `The details object is missing: ${missingFields.map((f) => titleizeField(f)).join(', ')}. Ask the caller ONLY for these missing fields. Do NOT re-ask for fields you already have (${presentFields.map((f) => titleizeField(f)).join(', ')}). When you retry create_booking, include ALL fields in the details object.`,
              };
            }
            let resolvedSlot: string | null = null;
            if (availabilityFresh && Array.isArray(lastAvailabilitySlots) && lastAvailabilitySlots.length) {
              if (requestedText && looksLikeIso(requestedText) && lastAvailabilitySlots.includes(requestedText)) {
                resolvedSlot = requestedText;
              } else if (lastRequestedSlot) {
                resolvedSlot = lastRequestedSlot;
              } else if (requestedText) {
                let needleText = looksLikeIso(requestedText) ? isoToLocalNaive(requestedText) : requestedText;
                if (isTimeOnlyText(needleText) && lastAvailabilityDateKey) {
                  needleText = `${lastAvailabilityDateKey} ${needleText}`;
                }
                const match = selectAvailabilitySlot(needleText, lastAvailabilitySlots, tz);
                if (match) resolvedSlot = match;
              }
            } else if (requestedText && looksLikeIso(requestedText)) {
              resolvedSlot = isoToLocalNaive(requestedText);
            }
            if (!resolvedSlot && requestedText) {
              try {
                let lookupText = looksLikeIso(requestedText) ? isoToLocalNaive(requestedText) : requestedText;
                if (isTimeOnlyText(lookupText) && lastAvailabilityDateKey) {
                  lookupText = `${lastAvailabilityDateKey} ${lookupText}`;
                }
                const availability = await callTool(ctx, 'get_availability', {
                  start_time: lookupText,
                  timezone: tz,
                });
                if (Array.isArray((availability as any)?.slots)) {
                  lastAvailabilitySlots = (availability as any).slots.filter((slot: any) => typeof slot === 'string');
                  lastAvailabilityTimezone =
                    typeof (availability as any)?.timezone === 'string' ? (availability as any).timezone : tz;
                  lastAvailabilityAt = Date.now();
                  lastRequestedSlot =
                    typeof (availability as any)?.requested_slot === 'string' ? (availability as any).requested_slot : null;
                  if (lastAvailabilitySlots.length && lastAvailabilityTimezone) {
                    try {
                      lastAvailabilityDateKey = new Intl.DateTimeFormat('en-CA', {
                        timeZone: lastAvailabilityTimezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }).format(new Date(lastAvailabilitySlots[0]));
                    } catch {
                      lastAvailabilityDateKey = null;
                    }
                  }
                }
                if ((availability as any)?.requested_slot) {
                  resolvedSlot = (availability as any).requested_slot;
                } else if (Array.isArray(lastAvailabilitySlots) && lastAvailabilitySlots.length) {
                  const match = selectAvailabilitySlot(lookupText, lastAvailabilitySlots, tz);
                  if (match) resolvedSlot = match;
                }
              } catch (err: any) {
                result = { ok: false, error: err?.message ?? String(err) };
              }
            }
            if (resolvedSlot) {
              args = { ...args, start_time: resolvedSlot, timezone: tz };
            } else {
              args = { ...args, timezone: tz };
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
            if (!result && toolName === 'create_booking') {
              const slot = typeof args?.start_time === 'string' ? args.start_time : '';
              const tz =
                typeof args?.timezone === 'string'
                  ? args.timezone
                  : lastAvailabilityTimezone || ctx.timezone || 'UTC';
              if (slot && looksLikeIso(slot)) {
                try {
                  const hold = await callTool(ctx, 'hold_slot', { slot, timezone: tz, hold_minutes: 5 });
                  if ((hold as any)?.ok !== true) {
                    result = hold;
                  }
                } catch (err: any) {
                  result = { ok: false, error: err?.message ?? String(err) };
                }
              }
            }
            if (!result) {
              result = await callTool(ctx, toolName, args);
            }
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
              // Capture zip in collectedDetails so create_booking doesn't need to re-collect it
              if (args?.zip) {
                collectedDetails.zip = args.zip;
              }
            }
            if (toolName === 'get_availability') {
              if (Array.isArray((result as any)?.slots)) {
                lastAvailabilitySlots = (result as any).slots.filter((slot: any) => typeof slot === 'string');
                lastAvailabilityTimezone =
                  typeof (result as any)?.timezone === 'string' ? (result as any).timezone : ctx.timezone || null;
                lastAvailabilityAt = Date.now();
                lastRequestedSlot =
                  typeof (result as any)?.requested_slot === 'string' ? (result as any).requested_slot : null;
                if (lastAvailabilitySlots.length && lastAvailabilityTimezone) {
                  try {
                    lastAvailabilityDateKey = new Intl.DateTimeFormat('en-CA', {
                      timeZone: lastAvailabilityTimezone,
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    }).format(new Date(lastAvailabilitySlots[0]));
                  } catch {
                    lastAvailabilityDateKey = null;
                  }
                } else {
                  lastAvailabilityDateKey = null;
                }
              } else {
                lastAvailabilitySlots = [];
                lastAvailabilityAt = Date.now();
                lastRequestedSlot = null;
                lastAvailabilityDateKey = null;
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
          createResponse();
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
      requiredIntakeFields = Array.isArray(resolvedTenant?.service_template?.intake_schema?.required)
        ? resolvedTenant.service_template.intake_schema.required
            .map((field: any) => String(field || '').trim())
            .filter(Boolean)
        : [];

      ctx = {
        callSid,
        streamSid,
        from,
        to,
        company_id: resolvedTenant.company_id,
        company_name: resolvedTenant.company_name,
        timezone: resolvedTenant.timezone,
        transfer_enabled: resolvedTenant.transfer_enabled,
        transfer_number: resolvedTenant.transfer_number,
        startedAt: Date.now(),
      };

      activeCalls.set(callSid, {
        ctx,
        getTranscript: () => transcript.join('\n'),
        getDetails: () => ({ ...collectedDetails }),
        ended: false,
      });

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
      elevenLabsConfig = await resolveElevenLabsConfig();
      useElevenLabs = Boolean(elevenLabsConfig);
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
        const collectedInfo =
          Object.keys(collectedDetails).some((key) => `${(collectedDetails as any)[key] ?? ''}`.trim() !== '')
            ? { ...collectedDetails }
            : undefined;
        callTool(ctx, 'save_call', {
          transcript: merged || undefined,
          summary: 'Call ended.',
          duration_seconds: durationSeconds,
          collected_info: collectedInfo,
          skip_contact_update: !merged && !collectedInfo,
        }).catch((err: any) => console.warn('[bridge] save_call failed', err?.message ?? String(err)));

        scheduleRecordingSync('twilio_stop');
      }
      const endedCallSid = ctx?.callSid;
      if (endedCallSid) {
        const cached = activeCalls.get(endedCallSid);
        if (cached) {
          cached.ended = true;
          setTimeout(() => activeCalls.delete(endedCallSid), 10 * 60_000);
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
