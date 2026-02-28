import http from 'http';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import twilio from 'twilio';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { toolsSchema } from './toolsSchema';
import { PassThrough, Readable } from 'stream';
import { spawn } from 'child_process';
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly') as {
  PollyClient: new (config: { region: string }) => any;
  SynthesizeSpeechCommand: new (input: Record<string, any>) => any;
};

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

function envFlag(name: string, defaultValue = false): boolean {
  const raw = env(name);
  if (raw === undefined) return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

const safeDiagEnabled = envFlag('VOICE_BRIDGE_SAFE_DIAG', false);
const verboseVoiceDebug = envFlag('VOICE_BRIDGE_VERBOSE_DEBUG', false);

function diag(event: string, payload?: Record<string, unknown>) {
  if (!safeDiagEnabled) return;
  if (payload) {
    console.log('[diag]', event, payload);
    return;
  }
  console.log('[diag]', event);
}

function diagVerbose(event: string, payload?: Record<string, unknown>) {
  if (!safeDiagEnabled || !verboseVoiceDebug) return;
  diag(event, payload);
}

function headHex(data: Buffer, size = 16): string {
  return data.subarray(0, size).toString('hex');
}

function detectAudioMagic(data: Buffer): string {
  if (data.length >= 4 && data.subarray(0, 4).toString('ascii') === 'RIFF') return 'riff_wav';
  if (data.length >= 3 && data.subarray(0, 3).toString('ascii') === 'ID3') return 'id3';
  if (
    data.length >= 2 &&
    data[0] === 0xff &&
    (data[1] === 0xfb || data[1] === 0xf3 || data[1] === 0xf2 || (data[1] & 0xe0) === 0xe0)
  ) {
    return 'mp3_frame';
  }
  if (data.length >= 4 && data.subarray(0, 4).toString('ascii') === 'OggS') return 'ogg';
  if (data.length >= 4 && data.subarray(0, 4).toString('ascii') === 'fLaC') return 'flac';
  return 'unknown_or_raw';
}

function base64ByteLength(value: string): number {
  const clean = String(value || '').trim();
  if (!clean) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

type PollyTtsConfig = {
  voiceId: string;
  engine: 'standard' | 'neural' | 'long-form' | 'generative';
  languageCode?: string;
  sampleRate: string;
  outputFormat: 'mp3' | 'ogg_vorbis' | 'pcm';
  textType: 'text' | 'ssml';
};

type DeepgramSttConfig = {
  model: string;
  language: string;
  endpointingMs: number;
  utteranceEndMs: number;
  interimResults: boolean;
  punctuate: boolean;
  smartFormat: boolean;
};

const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const ssm = new SSMClient({ region: awsRegion });
const pollyClient = new PollyClient({ region: awsRegion });

type SecretName =
  | 'OPENAI_API_KEY'
  | 'TWILIO_AUTH_TOKEN'
  | 'TWILIO_ACCOUNT_SID'
  | 'DEEPGRAM_API_KEY';

const ssmParamDefaults: Record<SecretName, string> = {
  OPENAI_API_KEY: '/handycall/prod/openai_api_key',
  TWILIO_AUTH_TOKEN: '/handycall/prod/twilio_auth_token',
  TWILIO_ACCOUNT_SID: '/handycall/prod/twilio_account_sid',
  DEEPGRAM_API_KEY: '/handycall/prod/deepgram_api_key',
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

type DaySchedule = {
  open?: string;
  close?: string;
  closed?: boolean;
  segments?: Array<{ open: string; close: string }>;
};

type BusinessHours = Record<string, DaySchedule | undefined>;

function parseTimeToMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getLocalTimeParts(now: Date, timeZone: string): { weekday: string; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const weekday = (parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase();
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');
    if (!weekday || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { weekday, minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}

function resolveScheduleForDay(hours: BusinessHours | undefined, weekday: string): DaySchedule | null {
  if (!hours || typeof hours !== 'object') return null;
  const direct = hours[weekday];
  if (direct) return direct;
  const shortMap: Record<string, string> = {
    monday: 'mon',
    tuesday: 'tue',
    wednesday: 'wed',
    thursday: 'thu',
    friday: 'fri',
    saturday: 'sat',
    sunday: 'sun',
  };
  const shortKey = shortMap[weekday];
  return shortKey ? hours[shortKey] ?? null : null;
}

function normalizeTimeZone(input: string | undefined, fallback = 'UTC'): string {
  const candidate = String(input || '').trim();
  if (!candidate) return fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

function isWithinBusinessHours(
  hours: BusinessHours | undefined,
  timeZone: string | undefined,
  now: Date = new Date()
): boolean | null {
  if (!hours) return null;
  const tz = normalizeTimeZone(timeZone, 'UTC');
  const parts = getLocalTimeParts(now, tz);
  if (!parts) return null;

  const schedule = resolveScheduleForDay(hours, parts.weekday);
  if (!schedule) return null;
  if (schedule.closed) return false;

  const segments =
    Array.isArray(schedule.segments) && schedule.segments.length > 0
      ? schedule.segments
      : schedule.open && schedule.close
        ? [{ open: schedule.open, close: schedule.close }]
        : [];

  let hasValidSegment = false;
  for (const segment of segments) {
    const open = parseTimeToMinutes(segment.open);
    const close = parseTimeToMinutes(segment.close);
    if (open === null || close === null) continue;
    hasValidSegment = true;
    if (open <= close) {
      if (parts.minutes >= open && parts.minutes < close) return true;
    } else {
      if (parts.minutes >= open || parts.minutes < close) return true;
    }
  }

  if (!hasValidSegment) return null;
  return false;
}

function normalizeSpeechText(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/([!?.,])\1{2,}/g, '$1$1')
    .trim();
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

function shouldUsePollyTts(): boolean {
  const provider = (envFirst(['VOICE_TTS_PROVIDER', 'TTS_PROVIDER']) || 'openai').toLowerCase();
  if (provider === 'openai') return false;
  return envFlag('POLLY_TTS_ENABLED', true);
}

function shouldAllowPollyOpenAiFallback(): boolean {
  return envFlag('POLLY_FALLBACK_TO_OPENAI', false);
}

function resolvePollyTtsConfig(): PollyTtsConfig {
  const engineRaw = (envFirst(['POLLY_ENGINE']) || 'neural').toLowerCase();
  const engine: PollyTtsConfig['engine'] =
    engineRaw === 'standard' || engineRaw === 'neural' || engineRaw === 'long-form' || engineRaw === 'generative'
      ? engineRaw
      : 'neural';

  const outputRaw = (envFirst(['POLLY_OUTPUT_FORMAT']) || 'mp3').toLowerCase();
  const outputFormat: PollyTtsConfig['outputFormat'] =
    outputRaw === 'pcm' || outputRaw === 'ogg_vorbis' || outputRaw === 'mp3' ? outputRaw : 'mp3';

  const textTypeRaw = (envFirst(['POLLY_TEXT_TYPE']) || 'text').toLowerCase();
  const textType: PollyTtsConfig['textType'] = textTypeRaw === 'ssml' ? 'ssml' : 'text';

  const languageCode = envFirst(['POLLY_LANGUAGE_CODE']) || 'en-US';
  const voiceId = envFirst(['POLLY_VOICE_ID']) || 'Joanna';
  const sampleRate = envFirst(['POLLY_SAMPLE_RATE']) || (outputFormat === 'pcm' ? '8000' : '16000');

  return { voiceId, engine, languageCode, sampleRate, outputFormat, textType };
}

function shouldUseDeepgramStt(): boolean {
  const provider = (envFirst(['VOICE_STT_PROVIDER', 'STT_PROVIDER']) || 'openai').toLowerCase();
  if (provider === 'deepgram') return true;
  if (provider === 'openai') return false;
  return Boolean(env('DEEPGRAM_API_KEY'));
}

function resolveDeepgramSttConfig(): DeepgramSttConfig {
  const model = envFirst(['DEEPGRAM_MODEL']) || 'nova-2-phonecall';
  const language = envFirst(['DEEPGRAM_LANGUAGE']) || 'en-US';
  const endpointingMs = Math.max(100, Math.min(1000, Number(envFirst(['DEEPGRAM_ENDPOINTING_MS']) || 300)));
  // Deepgram requires utterance_end_ms >= 1000 for public endpoints.
  const utteranceEndMs = Math.max(1000, Math.min(5000, Number(envFirst(['DEEPGRAM_UTTERANCE_END_MS']) || 1000)));
  const interimResults = envFlag('DEEPGRAM_INTERIM_RESULTS', true);
  const punctuate = envFlag('DEEPGRAM_PUNCTUATE', true);
  const smartFormat = envFlag('DEEPGRAM_SMART_FORMAT', true);
  return { model, language, endpointingMs, utteranceEndMs, interimResults, punctuate, smartFormat };
}

async function pollyStreamTts(
  params: {
    text: string;
    voiceId: string;
    engine: PollyTtsConfig['engine'];
    languageCode?: string;
    sampleRate: string;
    outputFormat: PollyTtsConfig['outputFormat'];
    textType: PollyTtsConfig['textType'];
  },
  abortSignal?: AbortSignal
): Promise<Readable> {
  const { text, voiceId, engine, languageCode, sampleRate, outputFormat, textType } = params;
  diag('polly.request', {
    voiceId,
    engine,
    languageCode,
    sampleRate,
    outputFormat,
    textType,
    textChars: text.length,
  });

  const attempt = async (attemptEngine: PollyTtsConfig['engine']) => {
    return pollyClient.send(
      new SynthesizeSpeechCommand({
        Text: text,
        TextType: textType,
        VoiceId: voiceId,
        Engine: attemptEngine,
        LanguageCode: languageCode,
        OutputFormat: outputFormat,
        SampleRate: sampleRate,
      }),
      abortSignal ? { abortSignal } : undefined
    );
  };

  let response;
  try {
    response = await attempt(engine);
  } catch (err: any) {
    const message = String(err?.message ?? err);
    if (engine !== 'standard' && /engine|voice|not supported|invalid/i.test(message)) {
      response = await attempt('standard');
    } else {
      throw err;
    }
  }

  const stream = response.AudioStream as any;
  if (!stream) throw new Error('Polly returned no audio stream');

  diag('polly.response', {
    requestCharacters: response.RequestCharacters,
    contentType: response.ContentType,
    sampleRate: response.SampleRate,
  });

  if (typeof stream.pipe === 'function') return stream as Readable;
  if (typeof stream.transformToWebStream === 'function') {
    return Readable.fromWeb(stream.transformToWebStream());
  }
  if (Symbol.asyncIterator in stream) {
    return Readable.from(stream as AsyncIterable<Buffer>);
  }
  throw new Error('Unsupported Polly audio stream type');
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
  let ffmpegStderr = '';
  ffmpeg.stderr.on('data', (chunk: Buffer | string) => {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    ffmpegStderr = (ffmpegStderr + text).slice(-2000);
  });

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

  ffmpeg.on('exit', (code, signal) => {
    if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
    if (code !== 0 && !abortSignal?.aborted) {
      console.warn('[diag] ffmpeg.exit', { code, signal, stderr: ffmpegStderr });
    }
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
  phone_number?: string;
  business_hours?: BusinessHours;
  calls_enabled?: boolean;
  account_status?: string;
  call_handling_mode?: 'ALWAYS' | 'MISSED' | 'AFTER_HOURS' | string;
  service_area_zipcodes?: string[];
  pricing_profile?: {
    model?: string;
    currency?: string;
    summary?: string;
    starting_price?: number;
    service_call_fee?: number;
    hourly_rate?: number;
    minimum_charge?: number;
    emergency_surcharge?: number;
    estimate_policy?: string;
    prices_start_at_only?: boolean;
    financing_available?: boolean;
    warranty_summary?: string;
    plan_highlights?: string[];
    tiers?: Array<{ name: string; price_label?: string; details?: string }>;
    add_ons?: Array<{ name: string; price_label?: string; details?: string }>;
    notes?: string;
  };
  agent_config?: {
    realtime_model?: string;
    realtime_voice?: string;
    model?: string;
    voice?: string;
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
const shortAcknowledgements = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'ok',
  'okay',
  'correct',
  'right',
  'sure',
  'sounds good',
]);
const shortIntentKeywords = new Set([
  'yes',
  'no',
  'yeah',
  'yep',
  'yup',
  'ok',
  'okay',
  'sure',
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

function normalizeShortAck(text?: string): string {
  return normalizeSpeech(text);
}

function isShortAcknowledgement(text?: string): boolean {
  const normalized = normalizeShortAck(text);
  if (!normalized) return false;
  if (shortAcknowledgements.has(normalized)) return true;
  const words = normalized.split(' ').filter(Boolean);
  return words.length <= 2 && words.every((word) => shortAcknowledgements.has(word));
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
  if (extractTimeNeedle(t)) return true;
  if (/\b\d{1,2}(?::\d{2})?\b/.test(t)) return true;
  if (/\b(first|second|third|last)\b/.test(t)) return true;
  if (/\b(monthly|quarterly|weekly|annual|yearly)\b/.test(t)) return true;
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
  if (raw.length < 3 && !isActionableShortUtterance(raw)) return true;
  if (/^[\W_]+$/.test(raw)) return true;
  const nonLatin = (raw.match(/[^\u0000-\u024F\s]/g) || []).length;
  if (nonLatin / Math.max(1, raw.length) > 0.25) return true;
  if (isActionableShortUtterance(raw)) return false;
  if (looksLikeFalseStart(raw)) return true;
  if (wordCount(raw) <= 3) return true;
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

function formatPricingProfileForPrompt(profile: TenantInfo['pricing_profile']): string | null {
  if (!profile || typeof profile !== 'object') return null;
  const lines: string[] = [];
  const model = typeof profile.model === 'string' ? profile.model.replace(/_/g, ' ').toLowerCase() : '';
  if (model) lines.push(`model=${model}`);
  if (typeof profile.summary === 'string' && profile.summary.trim()) lines.push(`summary=${profile.summary.trim()}`);
  if (typeof profile.starting_price === 'number') lines.push(`starting_price=${profile.starting_price}`);
  if (typeof profile.service_call_fee === 'number') lines.push(`service_call_fee=${profile.service_call_fee}`);
  if (typeof profile.hourly_rate === 'number') lines.push(`hourly_rate=${profile.hourly_rate}`);
  if (typeof profile.minimum_charge === 'number') lines.push(`minimum_charge=${profile.minimum_charge}`);
  if (typeof profile.emergency_surcharge === 'number') lines.push(`emergency_surcharge=${profile.emergency_surcharge}`);
  if (typeof profile.estimate_policy === 'string' && profile.estimate_policy.trim()) {
    lines.push(`estimate_policy=${profile.estimate_policy.trim()}`);
  }
  if (typeof profile.warranty_summary === 'string' && profile.warranty_summary.trim()) {
    lines.push(`warranty=${profile.warranty_summary.trim()}`);
  }
  if (profile.financing_available === true) lines.push('financing_available=true');
  if (profile.prices_start_at_only === true) lines.push('prices_start_at_only=true');

  if (Array.isArray(profile.tiers) && profile.tiers.length > 0) {
    const tierSummary = profile.tiers
      .slice(0, 4)
      .map((tier) => {
        const name = tier?.name ? String(tier.name).trim() : '';
        const price = tier?.price_label ? String(tier.price_label).trim() : '';
        const details = tier?.details ? String(tier.details).trim() : '';
        return [name, price, details].filter(Boolean).join(' - ');
      })
      .filter(Boolean)
      .join(' | ');
    if (tierSummary) lines.push(`tiers=${tierSummary}`);
  }

  if (Array.isArray(profile.add_ons) && profile.add_ons.length > 0) {
    const addOnSummary = profile.add_ons
      .slice(0, 4)
      .map((item) => {
        const name = item?.name ? String(item.name).trim() : '';
        const price = item?.price_label ? String(item.price_label).trim() : '';
        const details = item?.details ? String(item.details).trim() : '';
        return [name, price, details].filter(Boolean).join(' - ');
      })
      .filter(Boolean)
      .join(' | ');
    if (addOnSummary) lines.push(`add_ons=${addOnSummary}`);
  }

  if (Array.isArray(profile.plan_highlights) && profile.plan_highlights.length > 0) {
    const highlights = profile.plan_highlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5);
    if (highlights.length > 0) lines.push(`highlights=${highlights.join(' | ')}`);
  }

  if (typeof profile.notes === 'string' && profile.notes.trim()) lines.push(`notes=${profile.notes.trim()}`);
  return lines.length > 0 ? lines.join('; ') : null;
}

function buildInstructions(tenant: TenantInfo, options: { serviceAreaRequired: boolean }) {
  const name = tenant.company_name || 'our company';
  const serviceType = String(tenant.service_type || '').trim().toUpperCase();
  const serviceTypeLabel =
    serviceType === 'PEST_CONTROL'
      ? 'pest control'
      : serviceType
        ? serviceType.toLowerCase().replace(/_/g, ' ')
        : 'the company\'s core services';
  const extra = tenant.agent_config?.realtime_instructions;
  const templatePrompt = typeof tenant.service_template?.base_system_prompt === 'string'
    ? tenant.service_template.base_system_prompt
    : null;
  const renderedTemplatePrompt = templatePrompt ? templatePrompt.replace(/\{company_name\}/g, name) : null;
  const pricingProfileSummary = formatPricingProfileForPrompt(tenant.pricing_profile);
  const serviceAreaRequired = options.serviceAreaRequired;
  const requiredFields = formatFieldList(tenant.service_template?.intake_schema?.required);
  const optionalFields = formatFieldList(tenant.service_template?.intake_schema?.optional);
  const lines = [
    renderedTemplatePrompt || `You are the phone receptionist for ${name}.`,
    `Greet the caller immediately and include the company name in the first sentence.`,
    `Be friendly, concise, and phone-like. Ask one question at a time.`,
    `You are handling calls for a ${serviceTypeLabel} business. Do not mention unrelated industries or services unless the caller explicitly asks about them.`,
    `Keep responses short by default. Use a brief filler phrase only when waiting on a tool call.`,
    `Default to one short sentence per turn. Only expand if the caller asks for more detail.`,
    `Do not add extra explanations, marketing language, or repeated confirmations.`,
    `If explaining service options, give a very short summary and ask which option they want.`,
    `You can answer FAQs and help callers book appointments directly.`,
    `Never ask for the caller's phone number. Use the caller ID.`,
    serviceAreaRequired
      ? `If the caller wants to book, ask for their 5-digit ZIP code first and call check_service_area(zip) before anything else.`
      : `If service-area checks are enabled or the caller provides a ZIP, call check_service_area(zip) before booking.`,
    `If the ZIP is not serviced, apologize and end the call politely.`,
    requiredFields ? `Required intake fields to collect before booking: ${requiredFields}.` : null,
    optionalFields ? `Optional fields (collect only if relevant): ${optionalFields}.` : null,
    pricingProfileSummary
      ? `Company pricing context: ${pricingProfileSummary}. Use this for pricing questions first. If unsure, use knowledge_search and never invent rates or guarantees.`
      : null,
    `You MUST collect EVERY required intake field before asking about scheduling. Do not skip any. Ask one missing field at a time.`,
    `Do NOT ask for preferred date/time until all non-time required fields are collected (including address when required).`,
    `After all non-time required fields are collected, give ONE short natural recap in 1-2 sentences (no labels), then ask for preferred day/time.`,
    `Never use checklist labels like "Name:" or "Address:" when recapping details.`,
    `Then call get_availability and offer available slots.`,
    `Never claim a time is available unless get_availability returns it. If a requested time is unavailable, say so and offer available slots from get_availability.`,
    `If get_availability returns closed_day=true, tell the caller that day is closed and ask for another day.`,
    `If get_availability includes suggested_time_only, ONLY offer those times (max 3). Do not invent times.`,
    `If a requested time is available, say exactly: "That time is available. Let me book it for you." Then continue.`,
    `If the caller shares a time early, acknowledge it briefly and continue collecting missing required fields first.`,
    `Do not give another recap after availability. Keep moving forward.`,
    `Never provide more than one summary per call.`,
    `If the caller says yes after your recap, call create_booking immediately. Do not repeat the same recap or confirmation question.`,
    `Before booking, ask for confirmation once, then call create_booking with confirmed=true.`,
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
  const timed = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    const startedAt = Date.now();
    try {
      const result = await fn();
      const output: any = result as any;
      const payload: Record<string, unknown> = {
        callSid: ctx.callSid,
        tool: name,
        ms: Date.now() - startedAt,
      };
      if (typeof output?.ok === 'boolean') payload.ok = output.ok;
      if (typeof output?.error === 'string') payload.error = output.error;
      if (name === 'get_availability' && Array.isArray(output?.slots)) payload.slot_count = output.slots.length;
      diag('tool.result', payload);
      return result;
    } catch (err: any) {
      diag('tool.error', {
        callSid: ctx.callSid,
        tool: name,
        ms: Date.now() - startedAt,
        error: err?.message ?? String(err),
      });
      throw err;
    }
  };

  if (name === 'knowledge_search') {
    return timed(() => postJson(`${toolsBase}/tools/knowledge_search`, headers, {
      company_id: ctx.company_id,
      query: args?.query ?? '',
      top_k: args?.top_k,
    }));
  }

  if (name === 'check_service_area') {
    return timed(() => postJson(`${toolsBase}/tools/check_service_area`, headers, {
      company_id: ctx.company_id,
      zip: args?.zip ?? '',
    }));
  }

  if (name === 'get_availability') {
    const startTime = args?.start_time ?? args?.preferred_time ?? args?.window_start;
    const endTime = args?.end_time ?? args?.window_end;
    if (!startTime) {
      return timed(() => ({ ok: false, error: 'MissingStartTime', message: 'start_time is required' }));
    }
    return timed(() => postJson(`${toolsBase}/tools/get_availability`, headers, {
      company_id: ctx.company_id,
      start_time: startTime,
      end_time: endTime,
      timezone: ctx.timezone ?? args?.timezone,
    }));
  }

  if (name === 'create_booking') {
    const confirmed = typeof args?.confirmed === 'boolean' ? args.confirmed : true;
    if (!confirmed) {
      return timed(() => ({
        ok: false,
        error: 'BookingNotConfirmed',
        message: 'You must confirm booking details with the user first.',
      }));
    }
    const startTime = args?.start_time ?? args?.preferred_time;
    if (!startTime) {
      return timed(() => ({ ok: false, error: 'MissingStartTime', message: 'start_time is required' }));
    }
    const customerName =
      typeof args?.customer_name === 'string'
        ? args.customer_name
        : typeof args?.full_name === 'string'
          ? args.full_name
          : undefined;
    return timed(() => postJson(`${toolsBase}/tools/create_booking`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      ...args,
      ...(customerName ? { customer_name: customerName } : {}),
      start_time: startTime,
      end_time: args?.end_time,
      timezone: ctx.timezone ?? args?.timezone,
      confirmed,
    }));
  }

  if (name === 'hold_slot') {
    return timed(() => postJson(`${toolsBase}/tools/hold_slot`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      slot: args?.slot ?? args?.start_time ?? '',
      timezone: ctx.timezone ?? args?.timezone,
      hold_minutes: args?.hold_minutes,
    }));
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
    return timed(() => postJson(`${toolsBase}/tools/start_call`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      from_number: ctx.from,
      to_number: ctx.to,
    }));
  }

  if (name === 'save_call') {
    return timed(() => postJson(`${toolsBase}/tools/save_call`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      transcript: args?.transcript,
      summary: args?.summary,
      duration_seconds: args?.duration_seconds,
      collected_info: args?.collected_info,
      skip_contact_update: args?.skip_contact_update,
    }));
  }

  if (name === 'save_recording') {
    return timed(() => postJson(`${toolsBase}/tools/save_recording`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      recording_sid: args?.recording_sid,
      duration_seconds: args?.duration_seconds,
    }));
  }

  if (name === 'send_booking_link') {
    return timed(() => postJson(`${toolsBase}/tools/send_booking_link`, headers, {
      company_id: ctx.company_id,
      call_id: ctx.callSid,
      email: args?.email ?? '',
    }));
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
      let to = (params.To || params.to || '').trim();
      let from = (params.From || params.from || '').trim();
      const durationSeconds = Number.parseInt(params.RecordingDuration || params.recordingDuration || '', 10);

      if (callSid && recordingSid && recordingStatus === 'completed') {
        try {
          if (!to) {
            const details = await fetchTwilioCallDetails(callSid);
            to = (details?.to || '').trim();
            if (!from) from = (details?.from || '').trim();
          }
          if (!to) throw new Error('Missing destination number on recording callback');
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
      const streamTrack = envFirst(['TWILIO_STREAM_TRACK']) || 'inbound_track';
      const trackAttr = streamTrack ? ` track="${escapeXml(streamTrack)}"` : '';

      console.log('[twilio] voice webhook', { callSid, from, to, mediaWsUrl, streamTrack });

      let tenant: TenantInfo | null = null;
      if (to) {
        try {
          tenant = await resolveTenant(to);
        } catch (err: any) {
          console.warn('[twilio] resolveTenant failed for call handling check', err?.message ?? String(err));
        }
      }

      const configuredTransfer = typeof tenant?.transfer_number === 'string' ? tenant.transfer_number.trim() : '';
      const businessNumber = typeof tenant?.phone_number === 'string' ? tenant.phone_number.trim() : '';
      const fallbackTransfer = resolveTransferTarget() || '';
      const routingTarget = configuredTransfer || businessNumber || fallbackTransfer;
      const mode = String(tenant?.call_handling_mode || 'ALWAYS').toUpperCase();

      if (tenant?.calls_enabled === false) {
        if (routingTarget) {
          const disabledTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${escapeXml(routingTarget)}</Dial>
</Response>`;
          return xml(res, 200, disabledTwiml);
        }
        const unavailableTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this service is temporarily unavailable. Please try again later.</Say>
  <Hangup/>
</Response>`;
        return xml(res, 200, unavailableTwiml);
      }

      const aiTwiml = `<?xml version="1.0" encoding="UTF-8"?>
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

      if (mode === 'AFTER_HOURS') {
        const isOpen = isWithinBusinessHours(tenant?.business_hours, tenant?.timezone, new Date());
        if (isOpen === true && routingTarget) {
          const afterHoursTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${escapeXml(routingTarget)}</Dial>
</Response>`;
          return xml(res, 200, afterHoursTwiml);
        }
      }

      if (mode === 'MISSED' && routingTarget) {
        const timeoutSeconds = Number(process.env.MISSED_MODE_RING_SECONDS || 18);
        const safeTimeout = Number.isFinite(timeoutSeconds) ? Math.min(Math.max(Math.round(timeoutSeconds), 8), 45) : 18;
        const missedTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${safeTimeout}">${escapeXml(routingTarget)}</Dial>
  <Connect>
    <Stream url="${escapeXml(mediaWsUrl)}"${trackAttr} statusCallback="${escapeXml(streamStatusUrl)}" statusCallbackEvent="start end">
      <Parameter name="callSid" value="${escapeXml(callSid)}" />
      <Parameter name="to" value="${escapeXml(to)}" />
      <Parameter name="from" value="${escapeXml(from)}" />
      <Parameter name="token" value="${escapeXml(mediaToken)}" />
    </Stream>
  </Connect>
</Response>`;
        return xml(res, 200, missedTwiml);
      }

      return xml(res, 200, aiTwiml);
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: err?.message ?? String(err) });
  }
});

const wss = new WebSocketServer({ server, path: '/twilio/media' });

wss.on('connection', (twilioWs: WebSocket) => {
  let openaiWs: WebSocket | null = null;
  let deepgramWs: WebSocket | null = null;
  let ctx: CallContext | null = null;
  let transcript: string[] = [];
  let pollyConfig: PollyTtsConfig | null = null;
  let usePollyTts = false;
  let useDeepgramStt = false;
  let deepgramReady = false;
  let deepgramOpenedOnce = false;
  let deepgramBufferedFinal = '';
  let deepgramKeepAliveTimer: ReturnType<typeof setInterval> | null = null;
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
  let speechActive = false;
  let speechActiveStartedAt = 0;
  let pendingInterruptTimer: ReturnType<typeof setTimeout> | null = null;
  let requiredIntakeFields: string[] = [];
  let collectedDetails: Record<string, any> = {};
  let lastCallerUtterance: string | null = null;
  let lastShortAckNormalized = '';
  let lastShortAckAt = 0;
  let diagTtsSeq = 0;
  let diagTwilioInboundLogged = false;
  let diagOpenAIAudioLogged = false;
  let diagTwilioInboundChunks = 0;
  let diagTwilioInboundBytes = 0;
  let diagOpenAIAudioChunks = 0;
  let diagOpenAIAudioBytes = 0;
  let diagShutdownLogged = false;
  let outboundAudioQueue: string[] = [];
  let outboundAudioTimer: ReturnType<typeof setTimeout> | null = null;
  let outboundNextSendAt = 0;
  let outboundFramesSent = 0;
  let pollyTtsStreaming = false;
  let activePollyTtsSeq = 0;

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

  async function handleCallerTranscript(trimmed: string, source: 'openai' | 'deepgram') {
    const now = Date.now();
    const normalizedShortAck = normalizeShortAck(trimmed);
    if (
      isShortAcknowledgement(trimmed) &&
      normalizedShortAck &&
      normalizedShortAck === lastShortAckNormalized &&
      now - lastShortAckAt < 2500
    ) {
      diag('caller.duplicate_short_ack_ignored', {
        callSid: ctx?.callSid || '',
        text: normalizedShortAck,
        elapsed_ms: now - lastShortAckAt,
      });
      return;
    }
    if (isShortAcknowledgement(trimmed) && normalizedShortAck) {
      lastShortAckNormalized = normalizedShortAck;
      lastShortAckAt = now;
    }

    const recentSpeech = lastSpeechStartAt && Date.now() - lastSpeechStartAt < 3500;
    const actionableShort = isActionableShortUtterance(trimmed);
    if (!recentSpeech && trimmed.length < 6 && !actionableShort) {
      return;
    }

    if (isLowSignalTranscript(trimmed) || (isFillerUtterance(trimmed) && !actionableShort)) {
      if (assistantSpeaking && Date.now() - lastAssistantAudioAt < 2500) {
        diag('caller.low_signal_ignored_while_assistant', {
          callSid: ctx?.callSid || '',
          source,
          chars: trimmed.length,
        });
        return;
      }
      lowSignalAttempts += 1;
      reprompt(lowSignalAttempts);
      return;
    }

    transcript.push(`Caller: ${trimmed}`);
    lastCallerUtterance = trimmed;
    lowSignalAttempts = 0;

    if (source === 'deepgram' && openaiWs && openaiReady) {
      sendToOpenAI(openaiWs, {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: trimmed }],
        },
      });
    }

    if (assistantSpeaking && Date.now() - lastAssistantAudioAt < 1500) {
      const explicitInterrupt = isExplicitBargeIn(trimmed) || wordCount(trimmed) >= 3 || actionableShort;
      if (explicitInterrupt) {
        interruptAssistant('transcript_explicit_interrupt');
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
  }

  function buildModalities() {
    return usePollyTts ? ['text'] : ['audio', 'text'];
  }

  function createResponse(instructions?: string) {
    if (!openaiWs) return;
    assistantTextBuffer = '';
    const response: any = { modalities: buildModalities() };
    if (instructions) response.instructions = instructions;
    sendToOpenAI(openaiWs, { type: 'response.create', response });
    openaiResponding = true;
  }

  function enqueueTwilioAudio(payloadBase64: string) {
    if (twilioWs.readyState !== twilioWs.OPEN) return;
    let audio: Buffer;
    try {
      audio = Buffer.from(payloadBase64, 'base64');
    } catch {
      return;
    }
    const frameSize = 160; // 20ms @ 8kHz mu-law
    const silenceByte = 0xff;
    for (let i = 0; i < audio.length; i += frameSize) {
      let frame = audio.subarray(i, i + frameSize);
      if (frame.length < frameSize) {
        const padded = Buffer.alloc(frameSize, silenceByte);
        frame.copy(padded, 0, 0, frame.length);
        frame = padded;
      }
      outboundAudioQueue.push(frame.toString('base64'));
    }
    if (outboundAudioQueue.length % 100 === 0) {
      diag('twilio.outbound.queue_progress', {
        callSid: ctx?.callSid || '',
        queuedFrames: outboundAudioQueue.length,
        framesSent: outboundFramesSent,
      });
    }
    if (!outboundNextSendAt) outboundNextSendAt = Date.now();
    if (!outboundAudioTimer) scheduleTwilioAudioDrain();
  }

  function scheduleTwilioAudioDrain() {
    if (outboundAudioTimer) return;
    const delay = Math.max(0, outboundNextSendAt - Date.now());
    outboundAudioTimer = setTimeout(drainTwilioAudio, delay);
  }

  function drainTwilioAudio() {
    outboundAudioTimer = null;
    if (twilioWs.readyState !== twilioWs.OPEN) {
      outboundAudioQueue = [];
      outboundNextSendAt = 0;
      return;
    }
    const payload = outboundAudioQueue.shift();
    if (!payload || !ctx?.streamSid) {
      outboundNextSendAt = 0;
      return;
    }
    sendToTwilio(twilioWs, {
      event: 'media',
      streamSid: ctx.streamSid,
      media: { payload },
    });
    outboundFramesSent += 1;
    lastAssistantAudioAt = Date.now();
    outboundNextSendAt = Math.max(outboundNextSendAt + 20, Date.now() + 20);
    if (outboundAudioQueue.length > 0) {
      scheduleTwilioAudioDrain();
      return;
    }
    if (!pollyTtsStreaming) {
      assistantSpeaking = false;
      diag('assistant.playback_complete', {
        callSid: ctx?.callSid || '',
        framesSent: outboundFramesSent,
      });
    }
  }

  function clearTwilioAudioBuffer() {
    const droppedFrames = outboundAudioQueue.length;
    outboundAudioQueue = [];
    outboundNextSendAt = 0;
    if (outboundAudioTimer) {
      clearTimeout(outboundAudioTimer);
      outboundAudioTimer = null;
    }
    if (droppedFrames > 0) {
      diag('twilio.outbound.cleared', {
        callSid: ctx?.callSid || '',
        droppedFrames,
      });
    }
    if (ctx?.streamSid) {
      sendToTwilio(twilioWs, { event: 'clear', streamSid: ctx.streamSid });
    }
  }

  function cancelPendingInterruptTimer() {
    if (!pendingInterruptTimer) return;
    clearTimeout(pendingInterruptTimer);
    pendingInterruptTimer = null;
  }

  function interruptAssistant(reason: string) {
    if (!assistantSpeaking) {
      diag('barge_in.skip_not_speaking', {
        callSid: ctx?.callSid || '',
        reason,
      });
      return;
    }
    const now = Date.now();
    if (now - lastAssistantAudioAt > 5000) {
      diag('barge_in.skip_stale_audio', {
        callSid: ctx?.callSid || '',
        reason,
        msSinceAssistantAudio: now - lastAssistantAudioAt,
      });
      return;
    }

    if (usePollyTts && ttsAbort) {
      try {
        ttsAbort.abort();
      } catch {
        // ignore
      }
    }
    clearTwilioAudioBuffer();
    if (openaiWs) sendToOpenAI(openaiWs, { type: 'response.cancel' });
    assistantSpeaking = false;
    openaiResponding = false;
    diag('barge_in.interrupt', {
      callSid: ctx?.callSid || '',
      reason,
      speechMs: speechActiveStartedAt ? now - speechActiveStartedAt : undefined,
    });
  }

  function callerLikelyProvidedAddress(): boolean {
    const streetPattern = /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|way|circle|cir|trail|trl)\b/i;
    for (let i = transcript.length - 1; i >= 0; i -= 1) {
      const line = transcript[i];
      if (!line.startsWith('Caller:')) continue;
      const text = line.replace(/^Caller:\s*/, '');
      if (/my address/i.test(text)) return true;
      if (/\d{2,}/.test(text) && streetPattern.test(text)) return true;
    }
    return false;
  }

  async function speakWithPolly(text: string) {
    if (!ctx?.streamSid || !pollyConfig) return;
    const trimmed = normalizeSpeechText(text);
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
    pollyTtsStreaming = true;
    lastAssistantAudioAt = Date.now();
    const ttsSeq = ++diagTtsSeq;
    activePollyTtsSeq = ttsSeq;
    let emittedAudio = false;
    diag('tts.start', {
      callSid: ctx.callSid,
      ttsSeq,
      textChars: trimmed.length,
    });
    try {
      const ttsStream = await pollyStreamTts(
        {
          text: trimmed,
          voiceId: pollyConfig.voiceId,
          engine: pollyConfig.engine,
          languageCode: pollyConfig.languageCode,
          outputFormat: pollyConfig.outputFormat,
          sampleRate: pollyConfig.sampleRate,
          textType: pollyConfig.textType,
        },
        controller.signal
      );
      const ttsProbe = new PassThrough();
      let pollyBytes = 0;
      let pollyChunks = 0;
      let pollyHeadLogged = false;
      ttsProbe.on('data', (chunk: Buffer) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        pollyChunks += 1;
        pollyBytes += data.length;
        if (!pollyHeadLogged && data.length) {
          pollyHeadLogged = true;
          diag('tts.polly_head', {
            callSid: ctx?.callSid || '',
            ttsSeq,
            bytes: data.length,
            magic: detectAudioMagic(data),
            headHex: headHex(data),
          });
        }
      });
      ttsProbe.on('end', () => {
        diag('tts.polly_done', {
          callSid: ctx?.callSid || '',
          ttsSeq,
          chunks: pollyChunks,
          bytes: pollyBytes,
        });
      });

      const mulaw = transcodeToMulaw8k(ttsStream.pipe(ttsProbe), controller.signal);
      await new Promise<void>((resolve, reject) => {
        let mulawBytes = 0;
        let mulawChunks = 0;
        let mulawHeadLogged = false;
        const onAbort = () => {
          clearTwilioAudioBuffer();
          try {
            mulaw.destroy();
          } catch {
            // ignore
          }
        };
        controller.signal.addEventListener('abort', onAbort, { once: true });
        mulaw.on('data', (chunk: Buffer) => {
          if (controller.signal.aborted || !ctx?.streamSid) return;
          emittedAudio = true;
          mulawChunks += 1;
          mulawBytes += chunk.length;
          if (!mulawHeadLogged && chunk.length) {
            mulawHeadLogged = true;
            diag('tts.mulaw_head', {
              callSid: ctx.callSid,
              ttsSeq,
              bytes: chunk.length,
              headHex: headHex(chunk),
            });
          }
          if (mulawChunks % 50 === 0) {
            diag('tts.mulaw_progress', {
              callSid: ctx.callSid,
              ttsSeq,
              chunks: mulawChunks,
              bytes: mulawBytes,
            });
          }
          lastAssistantAudioAt = Date.now();
          enqueueTwilioAudio(chunk.toString('base64'));
        });
        mulaw.on('end', () => {
          controller.signal.removeEventListener('abort', onAbort);
          diag('tts.mulaw_done', {
            callSid: ctx?.callSid || '',
            ttsSeq,
            chunks: mulawChunks,
            bytes: mulawBytes,
          });
          resolve();
        });
        mulaw.on('error', (err) => {
          controller.signal.removeEventListener('abort', onAbort);
          reject(err);
        });
      });
    } catch (err: any) {
      console.warn('[polly] TTS failed', err?.message ?? String(err));
      if (!controller.signal.aborted && !emittedAudio && openaiWs && shouldAllowPollyOpenAiFallback()) {
        usePollyTts = false;
        console.warn('[polly] Falling back to OpenAI TTS because POLLY_FALLBACK_TO_OPENAI is enabled');
        createResponse(`Say this naturally in one short sentence: ${trimmed}`);
      }
    } finally {
      if (ttsAbort === controller) {
        ttsAbort = null;
      }
      if (activePollyTtsSeq === ttsSeq) {
        pollyTtsStreaming = false;
        if (outboundAudioQueue.length === 0 && !outboundAudioTimer) {
          assistantSpeaking = false;
        } else {
          diag('tts.waiting_for_playback_drain', {
            callSid: ctx?.callSid || '',
            ttsSeq,
            queuedFrames: outboundAudioQueue.length,
          });
        }
      }
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
    void speakWithPolly(text);
  }

  function shutdown(reason: string) {
    cancelPendingInterruptTimer();
    if (outboundAudioTimer) {
      clearTimeout(outboundAudioTimer);
      outboundAudioTimer = null;
    }
    outboundAudioQueue = [];
    outboundNextSendAt = 0;
    if (deepgramKeepAliveTimer) {
      clearInterval(deepgramKeepAliveTimer);
      deepgramKeepAliveTimer = null;
    }
    if (!diagShutdownLogged) {
      diagShutdownLogged = true;
      diag('call.shutdown', {
        reason,
        callSid: ctx?.callSid || '',
        streamSid: ctx?.streamSid || '',
        usePollyTts,
        twilioInboundChunks: diagTwilioInboundChunks,
        twilioInboundBytes: diagTwilioInboundBytes,
        openaiAudioChunks: diagOpenAIAudioChunks,
        openaiAudioBytes: diagOpenAIAudioBytes,
        transcriptLines: transcript.length,
      });
    }
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
    try {
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
      }
      deepgramWs?.close();
    } catch {
      // ignore
    }
    openaiWs = null;
    deepgramWs = null;
  }

  function enableOpenAiSttFallback(reason: string) {
    if (!useDeepgramStt) return;

    useDeepgramStt = false;
    deepgramReady = false;
    deepgramBufferedFinal = '';

    if (deepgramKeepAliveTimer) {
      clearInterval(deepgramKeepAliveTimer);
      deepgramKeepAliveTimer = null;
    }

    try {
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
      }
      deepgramWs?.close();
    } catch {
      // ignore
    }
    deepgramWs = null;

    diag('stt.fallback_to_openai', { callSid: ctx?.callSid || '', reason });

    if (openaiWs && openaiReady) {
      sendToOpenAI(openaiWs, {
        type: 'session.update',
        session: {
          input_audio_format: 'g711_ulaw',
          input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
          turn_detection: {
            type: 'semantic_vad',
            create_response: false,
            interrupt_response: true,
          },
        },
      });
    }
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

  async function flushDeepgramBuffered(source: string) {
    cancelPendingInterruptTimer();
    const text = normalizeSpeechText(deepgramBufferedFinal);
    deepgramBufferedFinal = '';
    if (!text) return;
    diagVerbose('deepgram.flush_text', {
      callSid: ctx?.callSid || '',
      source,
      text,
    });
    speechActive = false;
    await handleCallerTranscript(text, 'deepgram');
    diag('deepgram.flush', { callSid: ctx?.callSid || '', source, chars: text.length });
  }

  async function connectDeepgram() {
    const deepgramApiKey = await getSecret('DEEPGRAM_API_KEY');
    deepgramOpenedOnce = false;
    const cfg = resolveDeepgramSttConfig();
    const query = new URLSearchParams({
      encoding: 'mulaw',
      sample_rate: '8000',
      channels: '1',
      model: cfg.model,
      language: cfg.language,
      interim_results: String(cfg.interimResults),
      punctuate: String(cfg.punctuate),
      smart_format: String(cfg.smartFormat),
      endpointing: String(cfg.endpointingMs),
      utterance_end_ms: String(cfg.utteranceEndMs),
      vad_events: 'true',
    });
    const wsUrl = `wss://api.deepgram.com/v1/listen?${query.toString()}`;
    deepgramWs = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
      },
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Deepgram connect timeout'));
      }, 7000);

      const onOpen = () => {
        clearTimeout(timeout);
        deepgramReady = true;
        deepgramOpenedOnce = true;
        if (deepgramKeepAliveTimer) clearInterval(deepgramKeepAliveTimer);
        deepgramKeepAliveTimer = setInterval(() => {
          if (!deepgramWs || deepgramWs.readyState !== WebSocket.OPEN) return;
          try {
            deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
          } catch {
            // ignore keepalive errors
          }
        }, 8000);
        diag('deepgram.open', {
          callSid: ctx?.callSid || '',
          model: cfg.model,
          endpointingMs: cfg.endpointingMs,
          utteranceEndMs: cfg.utteranceEndMs,
        });
        resolve();
      };

      const onError = (err: any) => {
        clearTimeout(timeout);
        reject(new Error(err?.message ?? 'Deepgram websocket error'));
      };

      const onCloseBeforeOpen = () => {
        clearTimeout(timeout);
        if (!deepgramOpenedOnce) {
          reject(new Error('Deepgram websocket closed before ready'));
        }
      };

      deepgramWs!.once('open', onOpen);
      deepgramWs!.once('error', onError);
      deepgramWs!.once('close', onCloseBeforeOpen);
    });

    deepgramWs.on('message', async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg?.type === 'Results') {
        const alt = msg?.channel?.alternatives?.[0];
        const transcriptText = normalizeSpeechText(alt?.transcript || '');
        const confidence = Number(alt?.confidence ?? 0);
        const isFinal = msg?.is_final === true;
        const speechFinal = msg?.speech_final === true;

        if (transcriptText) {
          const wc = wordCount(transcriptText);
          const containsDigit = /\d/.test(transcriptText);
          const hasTimeNeedle = Boolean(extractTimeNeedle(transcriptText));
          const lowConfidenceNoise = confidence > 0 && confidence < 0.45 && wc <= 2 && !containsDigit && !hasTimeNeedle;
          if (lowConfidenceNoise) {
            return;
          }

          lastSpeechStartAt = Date.now();
          if (!speechActive) {
            speechActive = true;
            speechActiveStartedAt = Date.now();
          }

          if (assistantSpeaking) {
            const explicitInterrupt =
              isExplicitBargeIn(transcriptText) ||
              wordCount(transcriptText) >= 3 ||
              isActionableShortUtterance(transcriptText);
            if (explicitInterrupt) interruptAssistant('deepgram_transcript_interrupt');
          }

          if (isFinal) {
            deepgramBufferedFinal = normalizeSpeechText(
              `${deepgramBufferedFinal}${deepgramBufferedFinal ? ' ' : ''}${transcriptText}`
            );
          }
        }

        if (speechFinal) {
          await flushDeepgramBuffered('speech_final');
        }
        return;
      }

      if (msg?.type === 'UtteranceEnd') {
        await flushDeepgramBuffered('utterance_end');
        return;
      }

      if (msg?.type === 'SpeechStarted') {
        lastSpeechStartAt = Date.now();
        if (!speechActive) {
          speechActive = true;
          speechActiveStartedAt = Date.now();
        }
        diag('deepgram.speech_started', {
          callSid: ctx?.callSid || '',
          assistantSpeaking,
          queuedFrames: outboundAudioQueue.length,
          msSinceAssistantAudio: Date.now() - lastAssistantAudioAt,
        });
        cancelPendingInterruptTimer();
        pendingInterruptTimer = setTimeout(() => {
          if (!speechActive) return;
          if (!assistantSpeaking) return;
          interruptAssistant('deepgram_speech_started_debounced');
        }, 220);
        return;
      }

      if (msg?.type === 'Error') {
        console.error('[deepgram] error', msg);
      }
    });

    deepgramWs.on('close', () => {
      deepgramReady = false;
      speechActive = false;
      if (deepgramKeepAliveTimer) {
        clearInterval(deepgramKeepAliveTimer);
        deepgramKeepAliveTimer = null;
      }
      deepgramWs = null;
      diag('deepgram.close', { callSid: ctx?.callSid || '' });
      if (useDeepgramStt) {
        enableOpenAiSttFallback('deepgram_closed');
      }
    });

    deepgramWs.on('error', (err) => {
      console.error('[deepgram] ws error', (err as any)?.message ?? String(err));
      deepgramReady = false;
      if (useDeepgramStt) {
        enableOpenAiSttFallback('deepgram_error');
      }
    });
  }

  async function connectOpenAI(tenant: TenantInfo) {
    const model =
      tenant?.agent_config?.realtime_model ||
      tenant?.agent_config?.model ||
      envFirst(['OPENAI_REALTIME_MODEL', 'REALTIME_MODEL']) ||
      'gpt-realtime';
    const voice =
      tenant?.agent_config?.realtime_voice ||
      tenant?.agent_config?.voice ||
      envFirst(['OPENAI_REALTIME_VOICE', 'REALTIME_VOICE']) ||
      'marin';
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
          ...(useDeepgramStt ? {} : { input_audio_format: 'g711_ulaw' }),
          ...(usePollyTts ? {} : { output_audio_format: 'g711_ulaw' }),
          ...(useDeepgramStt ? {} : { input_audio_transcription: { model: 'gpt-4o-mini-transcribe' } }),
          ...(useDeepgramStt
            ? {}
            : {
                turn_detection: {
                  type: 'semantic_vad',
                  create_response: false,
                  interrupt_response: true,
                },
              }),
        },
      });
      openaiReady = true;
      diag('openai.session_ready', {
        callSid: ctx?.callSid || '',
        model,
        voice,
        usePollyTts,
      });
      diagVerbose('openai.instructions_preview', {
        callSid: ctx?.callSid || '',
        company: tenant.company_name,
        serviceType: tenant.service_type,
        firstLines: instructions.split('\n').slice(0, 6).join(' | '),
      });
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
        if (usePollyTts) return;
        const payload = msg?.delta;
        if (payload && ctx?.streamSid) {
          const payloadStr = String(payload);
          diagOpenAIAudioChunks += 1;
          diagOpenAIAudioBytes += base64ByteLength(payloadStr);
          if (!diagOpenAIAudioLogged) {
            diagOpenAIAudioLogged = true;
            try {
              const frame = Buffer.from(payloadStr, 'base64');
              diag('openai.audio.first_delta', {
                callSid: ctx.callSid,
                bytes: frame.length,
                magic: detectAudioMagic(frame),
                headHex: headHex(frame),
              });
            } catch (err: any) {
              diag('openai.audio.first_delta_decode_error', {
                callSid: ctx.callSid,
                error: err?.message ?? String(err),
              });
            }
          }
          if (diagOpenAIAudioChunks % 100 === 0) {
            diag('openai.audio.progress', {
              callSid: ctx.callSid,
              chunks: diagOpenAIAudioChunks,
              bytes: diagOpenAIAudioBytes,
            });
          }
          enqueueTwilioAudio(payload);
          assistantSpeaking = true;
          lastAssistantAudioAt = Date.now();
        }
        return;
      }

      if (msg?.type === 'response.audio_transcript.done') {
        if (usePollyTts) return;
        const text = msg?.transcript;
        if (text) {
          transcript.push(`Assistant: ${text}`);
          lastAssistantAskedFollowUp = askedAnythingElse(text);
        }
        return;
      }

      if (
        usePollyTts &&
        (msg?.type === 'response.text.delta' || msg?.type === 'response.output_text.delta')
      ) {
        const delta = msg?.delta || msg?.text;
        if (delta) appendAssistantText(String(delta));
        return;
      }

      if (
        usePollyTts &&
        (msg?.type === 'response.text.done' || msg?.type === 'response.output_text.done')
      ) {
        const text = msg?.text || msg?.output_text || assistantTextBuffer;
        flushAssistantText(text);
        return;
      }

      if (msg?.type === 'conversation.item.input_audio_transcription.completed') {
        if (useDeepgramStt) return;
        const text = msg?.transcript || msg?.text;
        if (!text || !String(text).trim()) {
          return;
        }
        await handleCallerTranscript(String(text).trim(), 'openai');
        return;
      }

      if (msg?.type === 'response.done') {
        openaiResponding = false;
        if (usePollyTts && assistantTextBuffer.trim()) {
          flushAssistantText();
        }
        return;
      }

      if (msg?.type === 'response.audio.done') {
        if (usePollyTts) return;
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
        speechActive = true;
        speechActiveStartedAt = Date.now();
        cancelPendingInterruptTimer();
        pendingInterruptTimer = setTimeout(() => {
          if (!speechActive) return;
          interruptAssistant('speech_started_debounced');
        }, 280);
        return;
      }

      if (msg?.type === 'input_audio_buffer.speech_stopped') {
        const now = Date.now();
        const startedAt = speechActiveStartedAt;
        const speechMs = startedAt ? now - startedAt : 0;
        speechActive = false;
        cancelPendingInterruptTimer();
        if (speechMs >= 280) {
          interruptAssistant('speech_stopped');
        } else {
          diag('barge_in.ignored_short_speech', {
            callSid: ctx?.callSid || '',
            speechMs,
          });
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

            const requiresAddress = requiredIntakeFields.some((field) => normalizeFieldKey(field) === 'address');
            const hasAddressInState = isFieldPresent('address', { details: collectedDetails });
            const hasAddressInArgs = isFieldPresent('address', args);
            if (requiresAddress && !hasAddressInState && !hasAddressInArgs && !callerLikelyProvidedAddress()) {
              result = {
                ok: false,
                error: 'AddressRequiredBeforeScheduling',
                missing_fields: ['address'],
                message:
                  'Before checking availability, ask ONLY for the service address. Do not recap details yet. After collecting address, then check availability.',
              };
            }
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
                message: `The details object is missing: ${missingFields.map((f) => titleizeField(f)).join(', ')}. Ask ONLY for these missing fields in one short sentence. Do NOT recap or summarize yet. Do NOT use label-style wording like "Name:" or "Address:". Do NOT re-ask fields already collected (${presentFields.map((f) => titleizeField(f)).join(', ')}). When retrying create_booking, include ALL collected fields in details.`,
              };
            }
            let resolvedSlot: string | null = null;
            if (availabilityFresh && Array.isArray(lastAvailabilitySlots) && lastAvailabilitySlots.length) {
              if (requestedText && looksLikeIso(requestedText) && lastAvailabilitySlots.includes(requestedText)) {
                resolvedSlot = requestedText;
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
              if (
                !requestedText &&
                availabilityFresh &&
                Array.isArray(lastAvailabilitySlots) &&
                lastAvailabilitySlots.length > 1
              ) {
                result = {
                  ok: false,
                  error: 'MissingSelectedSlot',
                  message:
                    'Ask the caller to choose one of the offered times, then call create_booking again with that exact start_time.',
                };
              }
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
              if ((result as any)?.requested_time_available === true) {
                (result as any).spoken_availability = 'That time is available. Let me book it for you.';
              }
              if (Array.isArray((result as any)?.slots)) {
                lastAvailabilitySlots = (result as any).slots.filter((slot: any) => typeof slot === 'string');
                lastAvailabilityTimezone =
                  typeof (result as any)?.timezone === 'string' ? (result as any).timezone : ctx.timezone || null;
                lastAvailabilityAt = Date.now();
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
      diag('call.start', {
        callSid,
        streamSid,
        from,
        to,
        companyId: resolvedTenant.company_id,
      });

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
      pollyConfig = shouldUsePollyTts() ? resolvePollyTtsConfig() : null;
      usePollyTts = Boolean(pollyConfig);
      useDeepgramStt = shouldUseDeepgramStt();
      if (useDeepgramStt) {
        try {
          await getSecret('DEEPGRAM_API_KEY');
        } catch (err: any) {
          console.warn('[deepgram] api key unavailable, falling back to OpenAI STT', err?.message ?? String(err));
          useDeepgramStt = false;
        }
      }
      diag('call.audio_path', {
        callSid,
        provider: usePollyTts ? 'aws_polly' : 'openai_realtime',
        usePollyTts,
        sttProvider: useDeepgramStt ? 'deepgram' : 'openai',
        pollyVoiceId: pollyConfig?.voiceId ?? null,
        pollyEngine: pollyConfig?.engine ?? null,
      });
      await connectOpenAI(resolvedTenant);
      if (useDeepgramStt) {
        await connectDeepgram().catch((err: any) => {
          console.warn('[deepgram] connect failed, falling back to OpenAI STT', err?.message ?? String(err));
          useDeepgramStt = false;
        });
      }

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
      const mediaTrack = String(msg?.media?.track || '').toLowerCase();
      if (mediaTrack && mediaTrack.includes('outbound')) {
        return;
      }
      if (payload && openaiWs && openaiReady) {
        const payloadStr = String(payload);
        diagTwilioInboundChunks += 1;
        diagTwilioInboundBytes += base64ByteLength(payloadStr);
        if (!diagTwilioInboundLogged) {
          diagTwilioInboundLogged = true;
          try {
            const frame = Buffer.from(payloadStr, 'base64');
            diag('twilio.inbound.first_media', {
              callSid: ctx?.callSid || '',
              bytes: frame.length,
              magic: detectAudioMagic(frame),
              headHex: headHex(frame),
            });
          } catch (err: any) {
            diag('twilio.inbound.first_media_decode_error', {
              callSid: ctx?.callSid || '',
              error: err?.message ?? String(err),
            });
          }
        }
        if (diagTwilioInboundChunks % 100 === 0) {
          diag('twilio.inbound.progress', {
            callSid: ctx?.callSid || '',
            chunks: diagTwilioInboundChunks,
            bytes: diagTwilioInboundBytes,
          });
        }
        if (useDeepgramStt) {
          if (deepgramWs && deepgramReady && deepgramWs.readyState === WebSocket.OPEN) {
            try {
              deepgramWs.send(Buffer.from(payloadStr, 'base64'));
            } catch (err: any) {
              console.warn('[deepgram] media send failed', err?.message ?? String(err));
              sendToOpenAI(openaiWs, { type: 'input_audio_buffer.append', audio: payload });
            }
          } else {
            // Deepgram unavailable: do not drop caller audio.
            sendToOpenAI(openaiWs, { type: 'input_audio_buffer.append', audio: payload });
          }
        } else {
          sendToOpenAI(openaiWs, { type: 'input_audio_buffer.append', audio: payload });
        }
      }
      return;
    }

    if (msg?.event === 'stop') {
      if (useDeepgramStt) {
        await flushDeepgramBuffered('twilio_stop');
      }
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
