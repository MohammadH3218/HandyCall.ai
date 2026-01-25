import http from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
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

function extractEmail(input: string): string | null {
  const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function extractPhone(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function normalizeNameCandidate(input: string): string | null {
  const cleaned = input.replace(/[^A-Za-z\\s'-]/g, ' ').replace(/\\s+/g, ' ').trim();
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (['yes', 'yeah', 'yep', 'no', 'nope', 'nah', 'ok', 'okay'].includes(lower)) return null;
  const bannedPhrases = [
    'my focus',
    'my issue',
    'my problem',
    'my question',
    'my address',
    'my zip',
    'my number',
    'my time',
    'my date',
    'booking',
    'appointment',
    'schedule',
    'pest',
    'bug',
    'service',
  ];
  if (bannedPhrases.some((p) => lower.includes(p))) return null;
  if (cleaned.length > 60) return null;
  const wordCount = cleaned.split(/\\s+/).filter(Boolean).length;
  if (wordCount > 4) return null;
  return cleaned;
}

function looksLikeAddress(input: string): boolean {
  const text = input.trim().toLowerCase();
  if (!text) return false;
  const hasNumber = /\\d/.test(text);
  const hasLetter = /[a-z]/i.test(text);
  if (!hasNumber || !hasLetter) return false;
  const keywords = [
    ' street',
    ' st',
    ' road',
    ' rd',
    ' drive',
    ' dr',
    ' avenue',
    ' ave',
    ' lane',
    ' ln',
    ' boulevard',
    ' blvd',
    ' court',
    ' ct',
    ' circle',
    ' cir',
    ' way',
    ' parkway',
    ' pkwy',
    ' place',
    ' pl',
    ' trail',
    ' trl',
  ];
  return keywords.some((k) => text.includes(k));
}

function extractInlineIntake(lastPrompt: string, userText: string): Record<string, any> {
  const prompt = (lastPrompt || '').toLowerCase();
  const text = userText.trim();
  const out: Record<string, any> = {};

  if (!text) return out;

  if (prompt.includes('name')) {
    const match = text.match(/(?:my name is|my full name is|this is)\\s+([A-Za-z][A-Za-z\\s'-]{1,60})/i);
    const name = normalizeNameCandidate(match?.[1] || text);
    if (name) out.name = name;
  } else if (prompt.includes('zip')) {
    const zipMatch = text.match(/\\b\\d{5}\\b/);
    if (zipMatch) out.zip = zipMatch[0];
    else if (looksLikeAddress(text)) out.address = text;
  } else if (prompt.includes('phone') || prompt.includes('number')) {
    const phone = extractPhone(text);
    if (phone) out.phone = phone;
  } else if (prompt.includes('email')) {
    const email = extractEmail(text);
    if (email) out.email = email;
  } else if (prompt.includes('address')) {
    out.address = text;
  } else if (prompt.includes('time') || prompt.includes('date') || prompt.includes('appointment')) {
    out.preferred_time = text;
  } else if (prompt.includes('issue') || prompt.includes('problem') || prompt.includes('pest')) {
    out.issue = text;
  }

  return out;
}



function normalizeForEcho(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const fillerTokens = new Set([
  'uh',
  'um',
  'uhh',
  'umm',
  'okay',
  'ok',
  'yeah',
  'yep',
  'right',
  'hmm',
  'mm',
]);

function isFillerUtterance(text: string): boolean {
  const normalized = normalizeForEcho(text);
  if (!normalized) return true;
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return wordCount <= 2 && fillerTokens.has(normalized);
}

function isExplicitBargeIn(text: string): boolean {
  const t = normalizeForEcho(text);
  if (!t) return false;
  return [
    'stop',
    'hold on',
    'wait',
    'one second',
    'give me a second',
    'pause',
    'cancel',
    'actually',
  ].some((phrase) => t === phrase || t.startsWith(`${phrase} `) || t.includes(phrase));
}

function isLikelyEcho(userText: string, assistantText: string): boolean {
  const user = normalizeForEcho(userText);
  const assistant = normalizeForEcho(assistantText);
  if (!user || !assistant) return false;
  if (user.length < 6) return false;
  if (assistant.includes(user) || user.includes(assistant)) return true;
  const userTokens = user.split(' ').filter(Boolean);
  if (userTokens.length < 4) return false;
  const assistantTokens = new Set(assistant.split(' ').filter(Boolean));
  const overlap = userTokens.filter((t) => assistantTokens.has(t)).length;
  return overlap / userTokens.length >= 0.75;
}

function formatSlotForPrompt(slotIso: string, timeZone: string): string {
  const d = new Date(slotIso);
  if (!Number.isFinite(d.getTime())) return slotIso;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return fmt.format(d);
  } catch {
    return slotIso;
  }
}

type BookingStep =
  | 'idle'
  | 'ask_name'
  | 'confirm_name'
  | 'ask_zip'
  | 'confirm_zip'
  | 'ask_time'
  | 'confirm_time'
  | 'offer_slots'
  | 'done';

type BookingSlotOption = {
  iso: string;
  label: string;
  timeLabel: string;
};

type ConversationState =
  | 'GREETING'
  | 'ASK_NAME'
  | 'CONFIRM_NAME'
  | 'ASK_ZIP'
  | 'CONFIRM_ZIP'
  | 'ASK_TIME'
  | 'OFFER_SLOTS'
  | 'CONFIRM_BOOKING'
  | 'ANSWERING'
  | 'FOLLOW_UP'
  | 'CLOSING';

type SessionContext = {
  state: ConversationState;
  intent?: 'booking' | 'question' | 'unknown';
  customerName?: string;
  zipCode?: string;
  proposedTime?: string;
};

function hasBookingIntent(text: string): boolean {
  const t = String(text || '').toLowerCase();
  if (
    /\b(book|booking|schedule|appointment|appt|reschedule|availability|available|time\s+slot|time\s+slots|timeslot|visit)\b/.test(
      t
    )
  ) {
    return true;
  }
  return /\b(set\s+up|set-up|come\s+out|come\s+by|send\s+someone|send\s+somebody)\b/.test(t);
}

function looksLikeQuestion(text: string): boolean {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  if (t.endsWith('?')) return true;
  return /^(what|why|how|when|where|who|can you|do you|is it|are you|does it|could you|would you)\b/.test(t);
}

function extractNameValue(text: string): string | null {
  const match = text.match(
    /(?:my name is|my full name is|this is|it's|it is|i am|i'm|im)\s+([A-Za-z][A-Za-z\s'-]{1,60})/i
  );
  const candidate = match?.[1] || text;
  return normalizeNameCandidate(candidate);
}

function extractZipValue(text: string): string | null {
  const match = text.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

type ParsedTimeNeedle = {
  hour: number;
  minute: string;
  meridiem: 'am' | 'pm';
};

function extractTimeNeedle(text: string): ParsedTimeNeedle | null {
  const raw = normalizeTimeLabel(text).replace(/\./g, '');
  if (!raw) return null;
  const normalized = raw.replace(/\b(a\s*m|p\s*m)\b/g, (match) => match.replace(/\s+/g, ''));
  if (normalized.includes('noon')) {
    return { hour: 12, minute: '00', meridiem: 'pm' };
  }
  if (normalized.includes('midnight')) {
    return { hour: 12, minute: '00', meridiem: 'am' };
  }
  let meridiem: 'am' | 'pm' | null = null;
  if (normalized.includes('am') || normalized.includes('morning')) meridiem = 'am';
  if (normalized.includes('pm') || normalized.includes('afternoon') || normalized.includes('evening') || normalized.includes('night')) {
    meridiem = meridiem ?? 'pm';
  }
  if (!meridiem) return null;
  const match = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\b/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 1 || hour > 12) return null;
  const minute = match[2] ? match[2].padStart(2, '0') : '00';
  return { hour, minute, meridiem };
}

function looksLikeTimeRequest(text: string): boolean {
  const t = String(text || '').toLowerCase();
  if (/\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t)) {
    return true;
  }
  if (/\b(today|tomorrow|next|this|week|weekend|morning|afternoon|evening|night)\b/.test(t)) return true;
  if (extractTimeNeedle(t)) return true;
  if (/\b(at|around|about|for)\s+\d{1,2}(?::\d{2})?\b/.test(t)) return true;
  return false;
}

function formatSlotTimeOnly(slotIso: string, timeZone: string): string {
  const d = new Date(slotIso);
  if (!Number.isFinite(d.getTime())) return slotIso;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return slotIso;
  }
}

function normalizeTimeLabel(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTimeFromText(text: string): string {
  return String(text || '')
    .replace(/\b(?:at|around|about|for)\s+\d{1,2}(?::\d{2})?\b/gi, ' ')
    .replace(/\b(at|around|about|for)\b/gi, ' ')
    .replace(/\b(noon|midnight)\b/gi, ' ')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(a\s*\.?\s*m\.?|p\s*\.?\s*m\.?)\b/gi, ' ')
    .replace(/\b\d{1,2}\s*o'?clock\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasDayReference(text: string): boolean {
  return /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next|this)\b/i.test(
    text
  );
}

function pickSlotFromResponse(text: string, slots: BookingSlotOption[]): BookingSlotOption | null {
  if (!slots.length) return null;
  const t = normalizeTimeLabel(text);
  if (!t) return null;
  if (t.includes('first')) return slots[0] || null;
  if (t.includes('second')) return slots[1] || null;
  if (t.includes('third')) return slots[2] || null;
  if (t.includes('fourth')) return slots[3] || null;
  if (t.includes('earliest') || t.includes('first available') || t.includes('next available')) {
    return slots[0] || null;
  }
  if (t.includes('latest')) return slots[slots.length - 1] || null;

  const timeNeedle = extractTimeNeedle(text);
  if (timeNeedle) {
    const needle = normalizeTimeLabel(`${timeNeedle.hour}:${timeNeedle.minute} ${timeNeedle.meridiem}`);
    const matched = slots.find((slot) => slot.timeLabel === needle);
    if (matched) return matched;
  }
  if (!/\b\d{5}\b/.test(t)) {
    const hourOnly = t.match(/\b(\d{1,2})\b/);
    if (hourOnly) {
      const hour = Number(hourOnly[1]);
      if (Number.isFinite(hour) && hour >= 1 && hour <= 12) {
        const matches = slots.filter((slot) => slot.timeLabel.startsWith(`${hour}:`));
        if (matches.length === 1) return matches[0];
      }
    }
  }

  return null;
}

function zipToSpoken(zip: string): string {
  return zip.split('').join('-');
}

function isAffirmative(text: string): boolean {
  const t = normalizeForEcho(text);
  if (!t) return false;
  return [
    'yes',
    'yeah',
    'yep',
    'yup',
    'correct',
    'right',
    'that is right',
    'thats right',
    'that is correct',
    'sounds good',
    'ok',
    'okay',
    'sure',
  ].some((phrase) => t === phrase || t.includes(phrase));
}

function isNegative(text: string): boolean {
  const t = normalizeForEcho(text);
  if (!t) return false;
  return [
    'no',
    'nope',
    'nah',
    'incorrect',
    'wrong',
    'not correct',
    'thats wrong',
    'that is wrong',
  ].some((phrase) => t === phrase || t.includes(phrase));
}

// function isLikelyNonAnswer(lastPrompt: string, userText: string): boolean {
function isLikelyNonAnswer(): boolean {
  // Completely disable this heuristic for now to prevent dropping valid short answers.
  // The LLM is smart enough to handle "ok" or "hi" if it's contextually relevant.
  return false;
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
  startedAt: number;
};

type ActiveCallMeta = {
  company_id: string;
  from: string;
  to: string;
  startedAt: number;
  service_area_zipcodes?: string[];
};

const activeCalls = new Map<string, ActiveCallMeta>();


function buildInstructions(input: {
  company_name: string;
  service_type?: string;
  timezone?: string;
  language?: string;
  extra?: string;
}) {
  const { company_name, service_type, timezone, language, extra } = input;
  const lang = (language || 'english').toLowerCase();
  const isArabic = lang.includes('arabic') || lang.includes('ar');

  const isPestControl = (service_type || '').toUpperCase() === 'PEST_CONTROL';


  const lines = [
    `You are a friendly, natural-sounding receptionist for ${company_name}.`,
    isArabic ? `Speak predominantly in Arabic (Gulf/GCC dialect preferred) but can switch to English if the user speaks English.` : `Speak in English.`,
    `Your job: quickly understand the caller's need, capture details, and either schedule or create a lead.`,
    `CRITICAL RULE: If the caller wants to book a service or appointment, you MUST ask for their 5-digit Zip Code FIRST, before asking for their name, address, or details.`,
    `Once you get the Zip Code, IMMEDIATELY call check_service_area(zip).`,
    `- If it returns false (not serviced): Apologize, explain you only serve specific areas, and politely end the call (do NOT ask for name).`,
    `- If it returns true (serviced): Confirm the zip code, then proceed to ask for their Name and Service needs.`,
    isPestControl ? `Pest Control Flow: 1. Zip Code -> 2. Pest Type (ants, roaches, etc.) -> 3. Name -> 4. Address -> 5. Schedule.` : `General Flow: 1. Zip Code -> 2. Problem Description -> 3. Name -> 4. Address -> 5. Schedule.`,
    `Be conversational and adaptive while still collecting what is needed.`,
    `Ask only ONE question per turn. Never ask a second question until the caller answers.`,
    `Sound like a real person on the phone: use contractions, vary phrasing, and avoid repeating a sentence in the same turn.`,
    `Style: 1-2 short sentences max per turn, then a question. No monologues. No "thinking out loud".`,
    `Ask only ONE question per turn. Never ask a second question until the caller answers.`,
    `Confirm critical fields (name, phone, address/zip, preferred time) before ending, but do NOT repeat the caller word-for-word.`,
    `When confirming, paraphrase naturally and group info: e.g., "Got it - plumbing help in 77441, aiming for Monday around 11. Is that right?"`,
    `Confirmation policy (very important): confirm EACH field immediately when it is first provided, then mark it confirmed in update_intake. Example flow: ask name -> confirm name -> ask zip/address -> confirm zip/address -> ask preferred time -> confirm time. Once confirmed, do NOT confirm that same field again unless the caller corrects it. If the caller says a field is wrong, ask for the correct value and THEN confirm the corrected value again before moving on. Do NOT do a full end-of-call recap of every detail.`,
    `After you ask a confirmation question, STOP. Do not answer your own confirmation or continue to the next question until the caller responds.`,
    `If the caller already told you the issue/service details, do NOT ask again. Summarize briefly and move forward.`,
    `Use update_intake any time you learn a detail (name, zip, address, phone, service, issue, preferred time) so you do not ask twice. After the caller confirms a field (e.g., says "yes"), immediately call update_intake to lock it in.`,
    `Zip codes: confirm digits explicitly (e.g., "Just to confirm, that's 7-7-4-4-1?").`,
    `Knowledge policy: use knowledge_search for business-specific facts (services, products/solutions used, pricing, plans, what's included, policies). Answer naturally in 1-2 sentences. Do NOT ask "Does that help?" or "Is that what you were looking for?" after every answer. Only ask a follow-up if it helps move the task forward.`,
    `If you can't find it in knowledge_search or you're not sure, do NOT guess; say you'll note it and have the team follow up.`,
    `If the caller asks about the business, use knowledge_search to answer accurately.`,
    `Scheduling policy: the caller can request a specific date/time or ask what times are available on a day.`,
    `- If they request a time: say "Let me check availability", then call get_availability for a 2-3 hour window around that time. If available, call create_booking to book it and confirm the booked time. If not, call get_availability for that day and offer the 2-3 closest available times.`,
    `- If they ask "what times are available on Monday": call get_availability for that day and offer a small set of options (e.g., 3-5).`,
    `If get_availability returns no slots, expand the window once before telling the caller there are no openings.`,
    `Always keep scheduling within the business hours. Never invent availability.`,
    `If get_availability returns readable_slots, read those times exactly as written. Do NOT convert timezones or say "UTC".`,
    `Do NOT confirm or announce a booking until after create_booking succeeds.`,
    `If the caller talks over you, stop immediately and listen (barge-in).`,
    `If you are unsure, ask one clarifying question.`,
    `Always be truthful; never invent availability.`,
    `Never invent caller details (name, address, zip, phone, appointment time). If you do not have it, ask.`,
    `End-of-call policy: once the caller confirms the details are correct, ask: "Is there anything else I can help with today?"`,
    `If they say no, say one short friendly goodbye (e.g., "Thanks for calling - if you need anything else, just give us a call back."), then call save_call with a concise summary + collected fields, then call end_call.`,
    `If they say yes, continue helping and do NOT end the call.`,
    timezone ? `Timezone: ${timezone}.` : null,
    service_type ? `Business type: ${service_type}.` : null,
    '',
    `Tools policy:`,
    `- Call create_lead early, once you know the caller's phone number and intent.`,
    `- Call save_call near the end with a concise summary + collected fields (not a verbatim transcript).`,
    `- Use get_availability + create_booking for scheduling; never guess availability.`,
    `- Always call check_service_area(zip) as the FIRST step of booking.`,
    `- Before calling get_availability, collect name and zip (or address) and verify service area.`,
    `- Never present specific available times unless they came from get_availability in the current turn.`,
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
  console.log(`[invokeTool] calling ${name} for ${ctx.callSid}`, { args });

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

  if (name === 'save_recording') {
    return postJson(
      `${toolsBase}/tools/save_recording`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        call_id: ctx.callSid,
        recording_sid: args?.recording_sid,
        duration_seconds: args?.duration_seconds,
      }
    );
  }

  if (name === 'check_service_area') {
    return postJson(
      `${toolsBase}/tools/check_service_area`,
      { 'x-handycall-tools-key': toolsKey },
      { company_id: ctx.company_id, zip: args.zip }
    );
  }

  if (name === 'knowledge_search') {
    return postJson(
      `${toolsBase}/tools/knowledge_search`,
      { 'x-handycall-tools-key': toolsKey },
      { company_id: ctx.company_id, query: args?.query ?? '', top_k: args?.top_k }
    );
  }

  if (name === 'get_availability') {
    return postJson(
      `${toolsBase}/tools/get_availability`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        start_time: args.preferred_time || args.start_time || args.window_start,
        end_time: args.window_end || args.end_time || '',
        timezone: args.timezone || '',
        duration_minutes: args.duration_minutes || 60,
      }
    );
  }

  if (name === 'create_booking') {
    // Basic gate: ensure model is sending confirmed=true
    if (args.confirmed !== true) {
      return { error: 'You must confirm with the user before booking.' };
    }
    return postJson(
      `${toolsBase}/tools/create_booking`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        call_id: ctx.callSid,
        from_phone: ctx.from,
        full_name: args.full_name || args.customer_name,
        service_type: args.service_type || 'General',
        details: args.details || {},
        start_time: args.start_time,
        end_time: args.end_time,
        timezone: args.timezone,
        confirmed: true,
      }
    );
  }

  if (name === 'list_appointments_by_phone') {
    return postJson(
      `${toolsBase}/tools/list_appointments_by_phone`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        phone: ctx.from,
        range_days: args.range_days || 90,
      }
    );
  }

  if (name === 'cancel_appointment') {
    return postJson(
      `${toolsBase}/tools/cancel_appointment`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        appointment_id: args.appointment_id,
        reason: args.reason || '',
      }
    );
  }

  if (name === 'reschedule_appointment') {
    return postJson(
      `${toolsBase}/tools/reschedule_appointment`,
      { 'x-handycall-tools-key': toolsKey },
      {
        company_id: ctx.company_id,
        appointment_id: args.appointment_id,
        new_start_time: args.new_start_time,
        timezone: args.timezone,
      }
    );
  }

  if (name === 'update_intake') {
    // Handled locally in the WS loop because it is per-call state.
    return { ok: true };
  }

  if (name === 'check_service_availability') {
    const zip = String(args.zip_code || '').trim();
    if (!zip) return { serviced: false, message: 'Zip code is required' };

    const call = activeCalls.get(ctx.callSid);
    const allowed = call?.service_area_zipcodes;

    // If no restricted areas defined, assume open.
    if (!allowed || !allowed.length) {
      return { serviced: true, message: 'Service available (open territory).' };
    }

    const serviced = allowed.includes(zip);
    if (!serviced) {
      return { serviced: false, message: 'Sorry, we do not service this zip code area.' };
    }
    return { serviced: true, message: 'Great! We service that area.' };
  }

  if (name === 'end_call') {
    const accountSid =
      envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
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

function responseCreate(
  modalities: Array<'audio' | 'text'> = ['audio', 'text'],
  instructions?: string,
  options?: { temperature?: number; max_output_tokens?: number; tool_choice?: 'none' | 'auto' }
) {
  return {
    type: 'response.create',
    ...(instructions
      ? { response: { modalities, instructions, ...(options ?? {}) } }
      : { response: { modalities } }),
  };
}

const port = Number(process.env.PORT || 8082);

const server = http.createServer(async (req, res) => {
  try {
    // EB/ALB health checks often default to `/` unless configured otherwise.
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

      // Best-effort validate Twilio signature if we can (don't block recording save on mismatch).
      try {
        const signature = req.headers['x-twilio-signature'];
        const authToken = await getSecret('TWILIO_AUTH_TOKEN');
        const publicBaseUrl = requireEnvFirst(['PUBLIC_BASE_URL', 'VOICE_BRIDGE_PUBLIC_BASE_URL']).replace(/\/$/, '');
        const url = `${publicBaseUrl}${req.url?.split('?')[0] || ''}`;
        if (typeof signature === 'string') {
          const ok = twilio.validateRequest(authToken, signature, url, params);
          if (!ok) {
            console.warn('[twilio] recording-status signature validation failed', { callSid, recordingSid });
          }
        }
      } catch (e: any) {
        console.warn('[twilio] recording-status signature check skipped/failed', e?.message ?? String(e));
      }

      if (callSid && recordingSid && recordingStatus === 'completed') {
        // Resolve company_id using in-memory map first, then fall back to tenant resolve via To number.
        let meta = activeCalls.get(callSid);
        if (!meta && to) {
          try {
            const tenant: any = await resolveTenant(to);
            meta = { company_id: tenant.company_id, from: from || '', to, startedAt: Date.now() };
          } catch (e: any) {
            console.warn('[twilio] resolveTenant failed for recording callback', e?.message ?? String(e));
          }
        }

        if (meta?.company_id) {
          const ctx: CallContext = {
            callSid,
            streamSid: 'recording_callback',
            from: meta.from || from,
            to: meta.to || to,
            company_id: meta.company_id,
            startedAt: meta.startedAt || Date.now(),
          };

          // Fire-and-forget: persist recording to S3 via backend tools API.
          invokeTool(ctx, 'save_recording', {
            recording_sid: recordingSid,
            duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
          }).catch((e: any) => console.error('[twilio] save_recording failed', e?.message ?? String(e)));
        }

        activeCalls.delete(callSid);
      }

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
  let conversation: Array<{ role: 'caller' | 'assistant'; text: string }> = [];
  let pendingAssistantText = '';
  let pendingAssistantHeuristicText = '';
  let assistantTranscriptSource: 'audio' | 'output_audio' | null = null;
  let callSaved = false;
  let intake: Record<string, any> = {};
  let lastAssistantAskedAnythingElseAt: number | null = null;
  let pendingAutoHangup = false;
  let pendingHangupMarkName: string | null = null;
  let pendingHangupTimer: NodeJS.Timeout | null = null;
  let forcedHangupTimer: NodeJS.Timeout | null = null;
  let assistantAudioActiveUntil = 0;
  let noResponseTimer: NodeJS.Timeout | null = null;
  let noResponseStage: 0 | 1 = 0;
  let recordingStartAttempted = false;
  let pendingResponseTimer: NodeJS.Timeout | null = null;
  let lastUserTranscriptAt = 0;
  let userSpeechActive = false;
  let pendingUserTranscript = '';
  let pendingResponseAfterSpeech = false;
  let openaiOutputAudioFormat: string = 'pcm16';
  let audioDeltaDebugCount = 0;
  let lastAssistantText = '';
  let lastAssistantAt = 0;
  let lastResponseId: string | null = null;
  let tenant: any = null;
  let lastCallerText = '';
  let lastCallerAt = 0;
  let lastAssistantQuestionAt = 0;
  let lastUserSpeechStartedAt = 0;
  let lastUserSpeechStoppedAt = 0;
  // let lastUserSpeechDurationMs = 0;
  let isProcessingTool = false;
  const fsmEnabled = false;
  let sessionContext: SessionContext = { state: 'GREETING', intent: 'unknown' };
  let lastFsmPrompt: string | null = null;
  let pendingAnswerFollowUp = false;
  let bookingStep: BookingStep = 'idle';
  let bookingSlots: BookingSlotOption[] = [];
  let pendingName: string | null = null;
  let pendingZip: string | null = null;
  let pendingSlot: BookingSlotOption | null = null;
  let lastBookingPrompt: string | null = null;
  // let lastBookingPromptAt = 0; // Unused
  let bookingPromptActive = false;
  let lastAvailabilitySlots: string[] = [];
  let lastAvailabilityTimezone: string | null = null;
  let initialGreetingSent = false;
  let openaiSessionReady = false;
  let twilioStreamReady = false;

  function log(msg: string, extra?: any) {
    const prefix = ctx ? `[callSid=${ctx.callSid} streamSid=${ctx.streamSid}]` : '[twilio]';
    if (extra !== undefined) console.log(prefix, msg, extra);
    else console.log(prefix, msg);
  }

  function linearPcm16ToMuLawSample(sample: number): number {
    // G.711 mu-law encode (8-bit) from 16-bit linear PCM with volume boost
    const BIAS = 0x84; // 132
    const VOLUME_BOOST = 1.5; // Boost volume by 50%

    let sign = 0;
    let pcm = Math.round(sample * VOLUME_BOOST);

    if (pcm < 0) {
      sign = 0x80;
      pcm = -pcm;
    }

    // Clamp to prevent clipping
    if (pcm > 32635) pcm = 32635;

    pcm = pcm + BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }
    const mantissa = (pcm >> (exponent + 3)) & 0x0f;
    const ulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
    if (ulawByte === 0) return 0x02;
    if (ulawByte === 0xff) return 0x7f;
    return ulawByte;
  }

  function calculateRmsFromBase64(b64: string): number {
    try {
      const buf = Buffer.from(b64, 'base64');
      if (buf.length === 0) return 0;
      let sumSq = 0;
      // Mu-law to linear expansion approximation or just treating as raw 8-bit for rough energy check
      // Mu-law roughly: s = sign(m) * (1/255) * ((1+255)^|m| - 1)
      // For a simple noise gate, raw byte variance is often enough, but let's do a quick lookup-based expansion if needed.
      // Actually, simple sum of squares of bytes is a rough proxy for energy in mu-law but very non-linear.
      // Better: expand mu-law to linear 14-bit.
      for (const byte of buf) {
        // Simple mu-law expansion
        const sign = (byte & 0x80) ? -1 : 1;
        const exponent = (byte >> 4) & 0x07;
        const mantissa = byte & 0x0F;
        const sample = sign * ((((mantissa << 3) + 0x84) << exponent) - 0x84);
        sumSq += sample * sample;
      }
      return Math.sqrt(sumSq / buf.length);
    } catch {
      return 0;
    }
  }

  function pcm16BytesToG711UlawBytesAdaptive(pcmBytes: Buffer): Buffer {
    const sampleCount = Math.floor(pcmBytes.length / 2);
    if (sampleCount <= 0) return Buffer.alloc(0);

    // Downsample from 24kHz (OpenAI) to 8kHz (Twilio) using 3:1 ratio
    // Use averaging to preserve quality during sample rate conversion
    const downsampleFactor = 3;
    const outSamples = Math.floor(sampleCount / downsampleFactor);
    if (outSamples <= 0) return Buffer.alloc(0);

    const out = Buffer.allocUnsafe(outSamples);
    for (let i = 0; i < outSamples; i++) {
      const base = i * downsampleFactor;
      let sum = 0;
      for (let k = 0; k < downsampleFactor; k++) {
        const idx = (base + k) * 2;
        if (idx + 1 < pcmBytes.length) {
          sum += pcmBytes.readInt16LE(idx);
        }
      }
      const avg = Math.max(-32768, Math.min(32767, Math.round(sum / downsampleFactor)));
      out[i] = linearPcm16ToMuLawSample(avg);
    }
    return out;
  }

  function pcm16BytesToG711UlawBase64Adaptive(pcmBytes: Buffer): string {
    const ulawBytes = pcm16BytesToG711UlawBytesAdaptive(pcmBytes);
    return ulawBytes.toString('base64');
  }

  function decodeBase64Safe(data: string): Buffer | null {
    try {
      return Buffer.from(data, 'base64');
    } catch {
      return null;
    }
  }

  function shouldTreatDeltaAsPcm16(deltaBase64: string): boolean {
    if (openaiOutputAudioFormat === 'pcm16') return true;
    void deltaBase64;
    return false;
  }

  function mergedTranscriptText(): string {
    const lines = conversation
      .map((item) => {
        const label = item.role === 'caller' ? 'Caller' : 'Assistant';
        return `${label}: ${item.text}`.trim();
      })
      .filter(Boolean);
    return lines.join('\n').trim();
  }

  async function startTwilioRecording(callSid: string) {
    if (recordingStartAttempted) return;
    recordingStartAttempted = true;

    const enabled = (process.env.TWILIO_RECORD_CALLS ?? 'true') !== 'false';
    if (!enabled) return;

    try {
      const publicBaseUrl = requireEnvFirst(['PUBLIC_BASE_URL', 'VOICE_BRIDGE_PUBLIC_BASE_URL']).replace(/\/$/, '');
      const accountSid =
        envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
      const authToken = await getSecret('TWILIO_AUTH_TOKEN');
      const client = twilio(accountSid, authToken);

      await client.calls(callSid).recordings.create({
        recordingStatusCallback: `${publicBaseUrl}/twilio/recording-status`,
        recordingStatusCallbackMethod: 'POST',
        recordingStatusCallbackEvent: ['completed'],
        recordingChannels: 'dual',
      });
    } catch (e: any) {
      log('startTwilioRecording failed (non-fatal)', e?.message ?? String(e));
    }
  }

  function clearNoResponseTimer() {
    if (noResponseTimer) {
      clearTimeout(noResponseTimer);
      noResponseTimer = null;
    }
  }

  function clearPendingResponseTimer() {
    if (pendingResponseTimer) {
      clearTimeout(pendingResponseTimer);
      pendingResponseTimer = null;
    }
  }

  function scheduleAssistantResponse() {
    if (!openaiWs || pendingAutoHangup) return;
    if (!fsmEnabled && bookingStep !== 'idle') return;
    clearPendingResponseTimer();
    if (!pendingUserTranscript.trim()) {
      if (!pendingAutoHangup) armNoResponseTimer();
      return;
    }
    if (lastUserSpeechStoppedAt && Date.now() - lastUserSpeechStoppedAt < 250) {
      pendingResponseAfterSpeech = true;
      return;
    }
    const wordCount = pendingUserTranscript.trim().split(/\s+/).filter(Boolean).length;
    const delayMs = wordCount <= 2 ? 900 : 650;
    const minSilenceMs = 750;
    pendingResponseTimer = setTimeout(async () => {
      pendingResponseTimer = null;
      if (!openaiWs || pendingAutoHangup) return;
      if (userSpeechActive) {
        pendingResponseAfterSpeech = true;
        return;
      }
      if (Date.now() - lastUserTranscriptAt < minSilenceMs) {
        pendingResponseAfterSpeech = true;
        scheduleAssistantResponse();
        return;
      }
      if (!pendingUserTranscript.trim()) return;
      const bufferedText = pendingUserTranscript;
      if (fsmEnabled) {
        try {
          const handled = await handleFsmTurn(bufferedText);
          pendingUserTranscript = '';
          if (handled) {
            noResponseStage = 0;
            return;
          }
          sendPrompt("Sorry, I didn't catch that. Could you repeat?");
          return;
        } catch (err: any) {
          log('handleFsmTurn failed (deferred)', err?.message ?? String(err));
          pendingUserTranscript = '';
          sendPrompt("Sorry, I ran into a hiccup. Could you say that again?");
          return;
        }
      } else if (bookingStep === 'idle') {
        try {
          const handledBooking = await handleBookingTurn(bufferedText);
          if (handledBooking) {
            noResponseStage = 0;
            pendingUserTranscript = '';
            return;
          }
        } catch (err: any) {
          log('handleBookingTurn failed (deferred)', err?.message ?? String(err));
        }
      }
      pendingUserTranscript = '';
      sendToOpenAI(openaiWs!, responseCreate());
    }, delayMs);
  }

  function tryInitialGreeting() {
    if (initialGreetingSent) return;
    if (!openaiSessionReady || !twilioStreamReady) return;
    if (!ctx || !openaiWs || pendingAutoHangup) return;

    initialGreetingSent = true;
    log('Sending initial greeting', { openaiReady: openaiSessionReady, twilioReady: twilioStreamReady });

    // Longer delay to ensure Twilio stream is fully ready to play audio to caller
    // Twilio needs time to establish the audio path even after sending media
    setTimeout(() => {
      if (!ctx || !openaiWs) return;
      log('Playing initial greeting now');

      // Add greeting as a conversation item, then trigger response
      // This works better with server VAD enabled
      const companyName = tenant?.company_name || 'HandyCall';
      const greetingText = `Hi, thanks for calling ${companyName}. How can I help you today?`;

      if (fsmEnabled) {
        sessionContext.state = 'GREETING';

        // Add the greeting to conversation history
        sendToOpenAI(openaiWs, {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'input_text', text: greetingText }],
          },
        });

        // Trigger response to speak it
        sendToOpenAI(openaiWs, {
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: `Say exactly: "${greetingText}"`,
          },
        });
      } else {
        sendToOpenAI(openaiWs, {
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: 'Give one short greeting (do not repeat it) and ask how you can help.',
          },
        });
      }
      noResponseStage = 0;
      armNoResponseTimer();
    }, 1500);
  }

  function sendPrompt(text: string, options?: { max_output_tokens?: number }) {
    if (!openaiWs || pendingAutoHangup) return;
    clearPendingResponseTimer();
    if (lastResponseId) {
      sendToOpenAI(openaiWs, { type: 'response.cancel' });
    }
    const safe = text.replace(/"/g, '\\"');
    if (fsmEnabled) {
      lastFsmPrompt = text;
    } else if (bookingStep !== 'idle') {
      lastBookingPrompt = text;
      // lastBookingPromptAt = Date.now();
      bookingPromptActive = true;
    }
    const maxTokens = options?.max_output_tokens ?? 120;
    sendToOpenAI(
      openaiWs,
      responseCreate(
        ['audio', 'text'],
        `Read the following sentence verbatim. Do not add, remove, or paraphrase any words: "${safe}"`,
        {
          temperature: 0,
          max_output_tokens: maxTokens,
          ...(fsmEnabled ? { tool_choice: 'none' } : {}),
        }
      )
    );
  }

  // function getRecentSpeechDurationMs() {
  //   if (lastUserSpeechDurationMs > 0) return lastUserSpeechDurationMs;
  //   if (
  //     lastUserSpeechStoppedAt > 0 &&
  //     lastUserSpeechStartedAt > 0 &&
  //     lastUserSpeechStoppedAt >= lastUserSpeechStartedAt
  //   ) {
  //     return lastUserSpeechStoppedAt - lastUserSpeechStartedAt;
  //   }
  //   return 0;
  // }

  function shouldIgnoreBookingTranscript(): boolean {
    // Disable client-side filtering of transcripts during booking.
    // Let the LLM (or FSM) decide if the input is useful.
    return false;
  }

  function syncIntakeToModel() {
    if (!openaiWs) return;
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
  }

  function buildBookingSlotOptions(slots: string[], readableSlots: string[], timeZone: string): BookingSlotOption[] {
    return slots.map((iso, idx) => {
      const rawLabel = readableSlots[idx];
      const label =
        typeof rawLabel === 'string' && rawLabel.trim()
          ? rawLabel.trim()
          : formatSlotForPrompt(iso, timeZone);
      const timeLabel = normalizeTimeLabel(formatSlotTimeOnly(iso, timeZone));
      return { iso, label, timeLabel };
    });
  }

  async function handleBookingTurn(text: string): Promise<boolean> {
    if (!ctx || !openaiWs) return false;
    if (bookingStep === 'idle') {
      if (!hasBookingIntent(text)) return false;
      bookingSlots = [];
      pendingName = null;
      pendingZip = null;
      pendingSlot = null;
      lastBookingPrompt = null;
      bookingStep = 'ask_name';
      sendPrompt("Sure, what's your full name?");
      return true;
    }

    if (bookingStep === 'ask_name') {
      const name = extractNameValue(text);
      if (!name) {
        sendPrompt("Sorry, I didn't catch the name. What name should I use?");
        return true;
      }
      pendingName = name;
      bookingStep = 'confirm_name';
      sendPrompt(`Just to confirm, is the name ${name}?`);
      return true;
    }

    if (bookingStep === 'confirm_name') {
      if (isAffirmative(text)) {
        if (pendingName) {
          intake.name = pendingName;
          syncIntakeToModel();
        }
        bookingStep = 'ask_zip';
        sendPrompt("Thanks. What's your zip code?");
        return true;
      }
      if (isNegative(text)) {
        pendingName = null;
        bookingStep = 'ask_name';
        sendPrompt('No problem. What name should I use?');
        return true;
      }
      const fallbackName = pendingName || 'that name';
      sendPrompt(`Sorry, I just need a yes or no. Is the name ${fallbackName}?`);
      return true;
    }

    if (bookingStep === 'ask_zip') {
      const zip = extractZipValue(text);
      if (!zip) {
        sendPrompt("What's your 5-digit zip code?");
        return true;
      }
      pendingZip = zip;
      bookingStep = 'confirm_zip';
      sendPrompt(`Got it, that's ${zipToSpoken(zip)}, right?`);
      return true;
    }

    if (bookingStep === 'confirm_zip') {
      if (isAffirmative(text)) {
        if (pendingZip) {
          intake.zip = pendingZip;
          syncIntakeToModel();
        }
        bookingStep = 'ask_time';
        sendPrompt('What day and time would you prefer?');
        return true;
      }
      if (isNegative(text)) {
        pendingZip = null;
        bookingStep = 'ask_zip';
        sendPrompt('Okay, what is the correct zip code?');
        return true;
      }
      const fallbackZip = pendingZip ? zipToSpoken(pendingZip) : 'that zip code';
      sendPrompt(`Sorry, just a yes or no - is that ${fallbackZip}?`);
      return true;
    }

    if (bookingStep === 'ask_time') {
      if (!looksLikeTimeRequest(text)) {
        sendPrompt('What day and time would you prefer?');
        return true;
      }
      const tz = tenant?.timezone || 'UTC';
      const explicitTime = extractTimeNeedle(text);
      const ambiguousHour =
        !explicitTime && /\b(at|around|about|for)\s+\d{1,2}(?::\d{2})?\b/i.test(text);
      const hasExplicitTime = !!explicitTime || ambiguousHour;
      const hasDay = hasDayReference(text);
      if (hasExplicitTime && !hasDay) {
        sendPrompt('What day would you like to book that time for?');
        return true;
      }
      const dayQuery = hasExplicitTime ? stripTimeFromText(text) : text;
      const query = dayQuery || text;
      let result: any;
      try {
        result = await invokeTool(ctx, 'get_availability', {
          start_time: query,
          timezone: tz,
        });
      } catch (err: any) {
        log('get_availability failed (booking flow)', err?.message ?? String(err));
        sendPrompt("I couldn't check availability right now. What day or time works instead?");
        bookingStep = 'ask_time';
        return true;
      }
      const slots = Array.isArray(result?.slots) ? result.slots : [];
      const readable = Array.isArray(result?.readable_slots) ? result.readable_slots : [];
      if (!slots.length) {
        sendPrompt("I don't see openings around that time. What day or time works instead?");
        bookingStep = 'ask_time';
        return true;
      }
      bookingSlots = buildBookingSlotOptions(slots, readable, tz);
      const spokenAvailability =
        typeof result?.spoken_availability === 'string' ? result.spoken_availability.trim() : '';
      if (hasExplicitTime) {
        const match = pickSlotFromResponse(text, bookingSlots);
        if (match) {
          pendingSlot = match;
          sendPrompt(`I can do ${match.label}. Want me to book that?`);
          bookingStep = 'confirm_time';
          return true;
        }
      }
      const maxSlotsToSpeak = 12;
      if (bookingSlots.length > maxSlotsToSpeak) {
        if (spokenAvailability) {
          sendPrompt(spokenAvailability);
          bookingStep = 'offer_slots';
          return true;
        }
        const first = bookingSlots[0];
        const last = bookingSlots[bookingSlots.length - 1];
        const startLabel = formatSlotTimeOnly(first.iso, tz);
        const endLabel = formatSlotTimeOnly(last.iso, tz);
        sendPrompt(`That day has wide availability from ${startLabel} to ${endLabel}. What time works best?`);
        bookingStep = 'offer_slots';
        return true;
      }
      const labels = bookingSlots.map((slot) => slot.label).join(', ');
      const maxTokens = labels.length > 180 ? 240 : 160;
      sendPrompt(`I have these times: ${labels}. Which works best?`, { max_output_tokens: maxTokens });
      bookingStep = 'offer_slots';
      return true;
    }

    if (bookingStep === 'confirm_time') {
      if (!pendingSlot) {
        bookingStep = 'ask_time';
        sendPrompt('What day and time would you prefer?');
        return true;
      }
      if (isAffirmative(text)) {
        const tz = tenant?.timezone || 'UTC';
        const customerName = pendingName || (typeof intake.name === 'string' ? intake.name : '') || 'Caller';
        try {
          const notes =
            typeof intake.issue === 'string' && intake.issue.trim()
              ? `Issue: ${intake.issue.trim()}`
              : undefined;
          await invokeTool(ctx, 'create_booking', {
            start_time: pendingSlot.iso,
            timezone: tz,
            customer_name: customerName,
            notes,
          });
          intake.preferred_time = pendingSlot.label;
          syncIntakeToModel();
          sendPrompt(`You're booked for ${pendingSlot.label}. Is there anything else I can help with today?`);
          bookingStep = 'done';
          pendingSlot = null;
          return true;
        } catch (err: any) {
          log('create_booking failed (booking flow)', err?.message ?? String(err));
          pendingSlot = null;
          bookingStep = 'offer_slots';
          if (bookingSlots.length > 12) {
            const first = bookingSlots[0];
            const last = bookingSlots[bookingSlots.length - 1];
            const startLabel = formatSlotTimeOnly(first.iso, tz);
            const endLabel = formatSlotTimeOnly(last.iso, tz);
            sendPrompt(
              `That time just got taken. I still have availability from ${startLabel} to ${endLabel}. What time works best?`
            );
          } else {
            const remaining = bookingSlots.map((slot) => slot.label).join(', ');
            const maxTokens = remaining.length > 180 ? 240 : 160;
            sendPrompt(`That time just got taken. I still have ${remaining}. Which works best?`, {
              max_output_tokens: maxTokens,
            });
          }
          return true;
        }
      }
      if (isNegative(text)) {
        pendingSlot = null;
        bookingStep = 'ask_time';
        sendPrompt('Okay. What day and time would you prefer instead?');
        return true;
      }
      sendPrompt('Just to confirm, should I book that time?');
      return true;
    }

    if (bookingStep === 'offer_slots') {
      const tz = tenant?.timezone || 'UTC';
      const chosen = pickSlotFromResponse(text, bookingSlots);
      if (chosen) {
        const customerName = pendingName || (typeof intake.name === 'string' ? intake.name : '') || 'Caller';
        try {
          const notes =
            typeof intake.issue === 'string' && intake.issue.trim()
              ? `Issue: ${intake.issue.trim()}`
              : undefined;
          await invokeTool(ctx, 'create_booking', {
            start_time: chosen.iso,
            timezone: tz,
            customer_name: customerName,
            notes,
          });
          intake.preferred_time = chosen.label;
          syncIntakeToModel();
          sendPrompt(`You're booked for ${chosen.label}. Is there anything else I can help with today?`);
          bookingStep = 'done';
          return true;
        } catch (err: any) {
          log('create_booking failed (booking flow)', err?.message ?? String(err));
          bookingSlots = bookingSlots.filter((slot) => slot.iso !== chosen.iso);
          if (bookingSlots.length) {
            if (bookingSlots.length > 12) {
              const first = bookingSlots[0];
              const last = bookingSlots[bookingSlots.length - 1];
              const startLabel = formatSlotTimeOnly(first.iso, tz);
              const endLabel = formatSlotTimeOnly(last.iso, tz);
              sendPrompt(
                `That time just got taken. I still have availability from ${startLabel} to ${endLabel}. What time works best?`
              );
            } else {
              const remaining = bookingSlots.map((slot) => slot.label).join(', ');
              const maxTokens = remaining.length > 180 ? 240 : 160;
              sendPrompt(`That time just got taken. I still have ${remaining}. Which works best?`, {
                max_output_tokens: maxTokens,
              });
            }
            bookingStep = 'offer_slots';
            return true;
          }
          bookingStep = 'ask_time';
          sendPrompt('That time just got taken. What day or time works instead?');
          return true;
        }
      }

      if (looksLikeTimeRequest(text)) {
        bookingStep = 'ask_time';
        return await handleBookingTurn(text);
      }

      sendPrompt('Which of those times would you like?');
      return true;
    }

    if (bookingStep === 'done') {
      if (isNegative(text)) {
        const summary = intake.preferred_time
          ? `Booked appointment for ${intake.preferred_time}.`
          : 'Booked an appointment.';
        try {
          await invokeTool(ctx, 'save_call', {
            summary,
            collected_info: intake,
          });
        } catch (err: any) {
          log('save_call failed (booking flow)', err?.message ?? String(err));
        }
        sendPrompt("Thanks for calling - if you need anything else, just give us a call back.");
        if (!pendingAutoHangup) {
          pendingAutoHangup = true;
          pendingHangupMarkName = `booking_done_${Date.now()}`;
        }
        scheduleForcedHangup('booking complete');
        bookingStep = 'idle';
        return true;
      }
      if (isAffirmative(text)) {
        bookingStep = 'idle';
        sendPrompt('Sure. How else can I help?');
        return true;
      }
      sendPrompt('Is there anything else I can help with today?');
      return true;
    }

    return false;
  }

  function resetFsmBookingContext() {
    bookingSlots = [];
    pendingName = null;
    pendingZip = null;
    pendingSlot = null;
    sessionContext.customerName = undefined;
    sessionContext.zipCode = undefined;
    sessionContext.proposedTime = undefined;
  }

  async function answerWithKnowledge(question: string): Promise<boolean> {
    if (!ctx || !openaiWs) return false;
    sessionContext.state = 'ANSWERING';
    pendingAnswerFollowUp = true;
    let results: any[] = [];
    try {
      isProcessingTool = true;
      results = await invokeTool(ctx, 'knowledge_search', { query: question, top_k: 3 });
    } catch (err: any) {
      log('knowledge_search failed', err?.message ?? String(err));
      results = [];
    } finally {
      isProcessingTool = false;
    }
    if (!results.length) {
      sendPrompt("I don't have that information on hand, but I'll have the team follow up.");
      return true;
    }
    const snippets = results
      .map((item, idx) => {
        const title = item?.title || item?.type || `Info ${idx + 1}`;
        const text = String(item?.text || '').trim();
        return text ? `(${idx + 1}) ${title}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n');
    const instructions = `Use only the information below to answer in 1-2 sentences. Do not ask a question.\n\n${snippets}`;
    sendToOpenAI(openaiWs, responseCreate(['audio', 'text'], instructions, { temperature: 0.2, max_output_tokens: 200, tool_choice: 'none' }));
    return true;
  }

  async function handleFsmTurn(text: string): Promise<boolean> {
    if (!ctx || !openaiWs) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    log('handleFsmTurn processing', { text: trimmed, state: sessionContext.state });

    const isGreeting = /^(hi|hello|hey)\b/i.test(trimmed) && trimmed.split(/\s+/).length <= 3;
    const bookingIntent = hasBookingIntent(trimmed);
    const questionIntent = looksLikeQuestion(trimmed);

    if (sessionContext.state === 'GREETING') {
      if (isGreeting && !bookingIntent && !questionIntent) {
        sendPrompt('How can I help you today?');
        return true;
      }
      if (questionIntent && !bookingIntent) {
        return await answerWithKnowledge(trimmed);
      }
      sessionContext.intent = 'booking';
      resetFsmBookingContext();
      const name = extractNameValue(trimmed);
      if (name) {
        pendingName = name;
        sessionContext.customerName = name;
        sessionContext.state = 'CONFIRM_NAME';
        sendPrompt(`Just to confirm, is the name ${name}?`);
        return true;
      }
      sessionContext.state = 'ASK_NAME';
      sendPrompt("Sure, what's your full name?");
      return true;
    }

    if (sessionContext.state === 'ASK_NAME') {
      const name = extractNameValue(trimmed);
      if (!name) {
        sendPrompt("Sorry, I didn't catch the name. What name should I use?");
        return true;
      }
      pendingName = name;
      sessionContext.customerName = name;
      sessionContext.state = 'CONFIRM_NAME';
      sendPrompt(`Just to confirm, is the name ${name}?`);
      return true;
    }

    if (sessionContext.state === 'CONFIRM_NAME') {
      if (isAffirmative(trimmed)) {
        if (pendingName) {
          intake.name = pendingName;
          syncIntakeToModel();
        }
        sessionContext.state = 'ASK_ZIP';
        sendPrompt("Thanks. What's your 5-digit zip code?");
        return true;
      }
      if (isNegative(trimmed)) {
        pendingName = null;
        sessionContext.customerName = undefined;
        sessionContext.state = 'ASK_NAME';
        sendPrompt('No problem. What name should I use?');
        return true;
      }
      sendPrompt(`Sorry, I just need a yes or no. Is the name ${pendingName || 'that name'}?`);
      return true;
    }

    if (sessionContext.state === 'ASK_ZIP') {
      const zip = extractZipValue(trimmed);
      if (!zip) {
        if (looksLikeAddress(trimmed)) {
          intake.address = trimmed;
          syncIntakeToModel();
        }
        sendPrompt("What's your 5-digit zip code?");
        return true;
      }
      pendingZip = zip;
      sessionContext.zipCode = zip;
      sessionContext.state = 'CONFIRM_ZIP';
      sendPrompt(`Got it, that's ${zipToSpoken(zip)}, right?`);
      return true;
    }

    if (sessionContext.state === 'CONFIRM_ZIP') {
      if (isAffirmative(trimmed)) {
        if (pendingZip) {
          intake.zip = pendingZip;
          syncIntakeToModel();
        }
        sessionContext.state = 'ASK_TIME';
        sendPrompt('What day and time would you prefer?');
        return true;
      }
      if (isNegative(trimmed)) {
        pendingZip = null;
        sessionContext.zipCode = undefined;
        sessionContext.state = 'ASK_ZIP';
        sendPrompt('Okay, what is the correct zip code?');
        return true;
      }
      sendPrompt(`Sorry, just a yes or no - is that ${pendingZip ? zipToSpoken(pendingZip) : 'that zip'}?`);
      return true;
    }

    if (sessionContext.state === 'ASK_TIME') {
      if (!looksLikeTimeRequest(trimmed)) {
        sendPrompt('What day and time would you prefer?');
        return true;
      }
      const tz = tenant?.timezone || 'UTC';
      const explicitTime = extractTimeNeedle(trimmed);
      const ambiguousHour =
        !explicitTime && /\b(at|around|about|for)\s+\d{1,2}(?::\d{2})?\b/i.test(trimmed);
      const hasExplicitTime = !!explicitTime || ambiguousHour;
      const hasDay = hasDayReference(trimmed);
      if (hasExplicitTime && !hasDay) {
        sendPrompt('What day would you like to book that time for?');
        return true;
      }
      const dayQuery = hasExplicitTime ? stripTimeFromText(trimmed) : trimmed;
      const query = dayQuery || trimmed;
      let result: any;
      try {
        isProcessingTool = true;
        sendPrompt('Let me check the schedule for you. One moment.');
        result = await invokeTool(ctx, 'get_availability', {
          start_time: query,
          timezone: tz,
        });
      } catch (err: any) {
        log('get_availability failed (fsm)', err?.message ?? String(err));
        sendPrompt("I couldn't check availability right now. What day or time works instead?");
        sessionContext.state = 'ASK_TIME';
        isProcessingTool = false;
        return true;
      } finally {
        isProcessingTool = false;
      }
      const slots = Array.isArray(result?.slots) ? result.slots : [];
      const readable = Array.isArray(result?.readable_slots) ? result.readable_slots : [];
      const spokenAvailability =
        typeof result?.spoken_availability === 'string' ? result.spoken_availability.trim() : '';
      if (!slots.length) {
        sendPrompt("I don't see openings around that time. What day or time works instead?");
        sessionContext.state = 'ASK_TIME';
        return true;
      }
      bookingSlots = buildBookingSlotOptions(slots, readable, tz);
      if (hasExplicitTime) {
        const match = pickSlotFromResponse(trimmed, bookingSlots);
        if (match) {
          pendingSlot = match;
          sessionContext.proposedTime = match.label;
          sessionContext.state = 'CONFIRM_BOOKING';
          sendPrompt(`I can do ${match.label}. Want me to book that?`);
          return true;
        }
      }
      if (bookingSlots.length > 12) {
        sendPrompt(spokenAvailability || 'That day has wide availability. What time works best?');
        sessionContext.state = 'OFFER_SLOTS';
        return true;
      }
      const labels = bookingSlots.map((slot) => slot.label).join(', ');
      const maxTokens = labels.length > 180 ? 240 : 160;
      sendPrompt(`I have these times: ${labels}. Which works best?`, { max_output_tokens: maxTokens });
      sessionContext.state = 'OFFER_SLOTS';
      return true;
    }

    if (sessionContext.state === 'OFFER_SLOTS') {
      const chosen = pickSlotFromResponse(trimmed, bookingSlots);
      if (chosen) {
        pendingSlot = chosen;
        sessionContext.proposedTime = chosen.label;
        sessionContext.state = 'CONFIRM_BOOKING';
        sendPrompt(`Great. Want me to book ${chosen.label}?`);
        return true;
      }
      if (looksLikeTimeRequest(trimmed)) {
        sessionContext.state = 'ASK_TIME';
        return await handleFsmTurn(trimmed);
      }
      sendPrompt('Which of those times would you like?');
      return true;
    }

    if (sessionContext.state === 'CONFIRM_BOOKING') {
      if (!pendingSlot) {
        sessionContext.state = 'ASK_TIME';
        sendPrompt('What day and time would you prefer?');
        return true;
      }
      if (isAffirmative(trimmed)) {
        const tz = tenant?.timezone || 'UTC';
        const customerName = pendingName || (typeof intake.name === 'string' ? intake.name : '') || 'Caller';
        try {
          isProcessingTool = true;
          sendPrompt('Great. Booking that now.');
          const notes =
            typeof intake.issue === 'string' && intake.issue.trim()
              ? `Issue: ${intake.issue.trim()}`
              : undefined;
          await invokeTool(ctx, 'create_booking', {
            start_time: pendingSlot.iso,
            timezone: tz,
            customer_name: customerName,
            notes,
          });
          intake.preferred_time = pendingSlot.label;
          syncIntakeToModel();
          sendPrompt(`You're booked for ${pendingSlot.label}. Is there anything else I can help with today?`);
          sessionContext.state = 'FOLLOW_UP';
          pendingSlot = null;
          return true;
        } catch (err: any) {
          log('create_booking failed (fsm)', err?.message ?? String(err));
          pendingSlot = null;
          sessionContext.state = 'OFFER_SLOTS';
          if (bookingSlots.length > 12) {
            sendPrompt('That time just got taken. What time works best instead?');
          } else {
            const remaining = bookingSlots.map((slot) => slot.label).join(', ');
            const maxTokens = remaining.length > 180 ? 240 : 160;
            sendPrompt(`That time just got taken. I still have ${remaining}. Which works best?`, {
              max_output_tokens: maxTokens,
            });
          }
          return true;
        } finally {
          isProcessingTool = false;
        }
      }
      if (isNegative(trimmed)) {
        pendingSlot = null;
        sessionContext.state = 'ASK_TIME';
        sendPrompt('Okay. What day and time would you prefer instead?');
        return true;
      }
      sendPrompt('Just to confirm, should I book that time?');
      return true;
    }

    if (sessionContext.state === 'ANSWERING') {
      if (bookingIntent) {
        sessionContext.state = 'ASK_NAME';
        sendPrompt("Sure, what's your full name?");
        return true;
      }
      return await answerWithKnowledge(trimmed);
    }

    if (sessionContext.state === 'FOLLOW_UP') {
      if (isNegative(trimmed)) {
        const summary = intake.preferred_time
          ? `Booked appointment for ${intake.preferred_time}.`
          : 'Caller inquiry handled.';
        try {
          await invokeTool(ctx, 'save_call', { summary, collected_info: intake });
        } catch (err: any) {
          log('save_call failed (fsm)', err?.message ?? String(err));
        }
        sendPrompt('Thanks for calling - if you need anything else, just give us a call back.');
        if (!pendingAutoHangup) {
          pendingAutoHangup = true;
          pendingHangupMarkName = `fsm_done_${Date.now()}`;
        }
        scheduleForcedHangup('fsm complete');
        sessionContext.state = 'CLOSING';
        return true;
      }
      if (isAffirmative(trimmed)) {
        sessionContext.state = 'GREETING';
        sendPrompt('Sure. How else can I help?');
        return true;
      }
      if (bookingIntent) {
        sessionContext.state = 'ASK_NAME';
        sendPrompt("Sure, what's your full name?");
        return true;
      }
      if (questionIntent) {
        return await answerWithKnowledge(trimmed);
      }
      sendPrompt('Is there anything else I can help with today?');
      return true;
    }

    if (sessionContext.state === 'CLOSING') {
      return true;
    }

    return false;
  }

  function armNoResponseTimer() {
    clearNoResponseTimer();
    const delayMs = noResponseStage === 0 ? 8000 : 7000;
    noResponseTimer = setTimeout(() => {
      noResponseTimer = null;
      if (!ctx || !openaiWs) return;
      // Don't interrupt if the assistant is actively speaking.
      if (Date.now() < assistantAudioActiveUntil) {
        armNoResponseTimer();
        return;
      }

      if (fsmEnabled && lastFsmPrompt) {
        if (noResponseStage === 0) {
          noResponseStage = 1;
          sendPrompt(lastFsmPrompt);
          armNoResponseTimer();
          return;
        }
        sendPrompt('No problem. Feel free to call back if you still need help.');
        if (!pendingAutoHangup) {
          pendingAutoHangup = true;
          pendingHangupMarkName = `no_response_${Date.now()}`;
        }
        scheduleForcedHangup('no response after two prompts');
        return;
      }
      if (!fsmEnabled && bookingStep !== 'idle' && lastBookingPrompt) {
        if (noResponseStage === 0) {
          noResponseStage = 1;
          sendPrompt(lastBookingPrompt);
          armNoResponseTimer();
          return;
        }
        // Second failure: say goodbye and end the call.
        sendPrompt('No problem. Feel free to call back if you still need help.');
        if (!pendingAutoHangup) {
          pendingAutoHangup = true;
          pendingHangupMarkName = `no_response_${Date.now()}`;
        }
        scheduleForcedHangup('no response after two prompts');
        return;
      }

      if (noResponseStage === 0) {
        noResponseStage = 1;
        if (fsmEnabled) {
          sendPrompt("Sorry, I didn't catch that. How can I help you today?");
        } else {
          sendToOpenAI(openaiWs, {
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              instructions:
                "Sorry, I didn't catch that. How can I help you today? Keep it to one short question.",
            },
          });
        }
        armNoResponseTimer();
        return;
      }

      // Second failure: say goodbye and end the call.
      if (!pendingAutoHangup) {
        pendingAutoHangup = true;
        pendingHangupMarkName = `no_response_${Date.now()}`;
      }
      scheduleForcedHangup('no response after two prompts');
      sendToOpenAI(openaiWs, { type: 'response.cancel' });
      sendToOpenAI(openaiWs, {
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          instructions:
            'No response from the caller. Say ONE short friendly goodbye sentence and end the call. Do not ask another question.',
        },
      });
    }, delayMs);
  }

  function extractAssistantTextFromDone(msg: any): string {
    const textPieces: string[] = [];
    const output = msg?.response?.output;
    if (Array.isArray(output)) {
      for (const item of output) {
        const content = item?.content;
        if (!Array.isArray(content)) continue;
        for (const c of content) {
          if (typeof c?.text === 'string' && c.text.trim()) textPieces.push(c.text.trim());
        }
      }
    }
    return textPieces.join(' ').trim();
  }

  function dedupeAssistantText(text: string): string {
    const trimmed = (text || '').trim();
    if (!trimmed) return '';
    const collapsed = trimmed.replace(/\s+/g, ' ');
    const words = collapsed.split(' ');
    if (words.length >= 2 && words.length % 2 === 0) {
      const half = words.length / 2;
      const first = words.slice(0, half).join(' ');
      const second = words.slice(half).join(' ');
      if (first === second) return first;
    }
    const mid = Math.floor(collapsed.length / 2);
    if (collapsed.length >= 4 && collapsed.length % 2 === 0) {
      const first = collapsed.slice(0, mid).trim();
      const second = collapsed.slice(mid).trim();
      if (first && second && first === second) return first;
    }
    return collapsed;
  }

  async function performHangup(reason: string) {
    if (!ctx) return;
    if (pendingHangupTimer) {
      clearTimeout(pendingHangupTimer);
      pendingHangupTimer = null;
    }
    if (forcedHangupTimer) {
      clearTimeout(forcedHangupTimer);
      forcedHangupTimer = null;
    }
    pendingAutoHangup = false;
    pendingHangupMarkName = null;

    try {
      // Persist final call state (even if already saved) so duration/ended_at reflect the actual hangup time.
      try {
        const duration_seconds = ctx.startedAt ? Math.max(1, Math.ceil((Date.now() - ctx.startedAt) / 1000)) : undefined;
        await invokeTool(ctx, 'save_call', {
          transcript: mergedTranscriptText() || undefined,
          duration_seconds,
          collected_info: intake,
        });
        callSaved = true;
      } catch (e: any) {
        log('final save_call failed (non-fatal)', e?.message ?? String(e));
      }

      // Best-effort: if the recording callback didn't arrive, try to fetch a completed recording for this call.
      try {
        const accountSid =
          envFirst(['TWILIO_ACCOUNT_SID', 'TWILIO_SID']) || (await getSecret('TWILIO_ACCOUNT_SID'));
        const authToken = await getSecret('TWILIO_AUTH_TOKEN');
        const client = twilio(accountSid, authToken);
        const recordings = await client.recordings.list({ callSid: ctx.callSid, limit: 20 });
        const completed = recordings.find((r: any) => String(r?.status || '').toLowerCase() === 'completed');
        if (completed?.sid) {
          await invokeTool(ctx, 'save_recording', {
            recording_sid: completed.sid,
            duration_seconds:
              typeof completed.duration === 'string'
                ? Number.parseInt(completed.duration, 10)
                : undefined,
          });
        }
      } catch (e: any) {
        log('recording fallback failed (non-fatal)', e?.message ?? String(e));
      }

      log('Hanging up call', { reason });
      await invokeTool(ctx, 'end_call', { reason });
    } catch (e: any) {
      log('performHangup failed (non-fatal)', e?.message ?? String(e));
    }
  }

  function scheduleForcedHangup(reason: string) {
    if (!ctx) return;
    if (forcedHangupTimer) {
      log('Hangup already scheduled, ignoring new schedule request', { reason });
      return;
    }
    log('Scheduling forced hangup in 8 seconds', { reason, noResponseStage });
    forcedHangupTimer = setTimeout(() => {
      forcedHangupTimer = null;
      log('Executing forced hangup', { reason });
      void performHangup(`Forced hangup timeout: ${reason}`);
    }, 8000);
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

      try {
        tenant = await resolveTenant(to);
      } catch (err: any) {
        log('resolveTenant failed', err?.message ?? String(err));
        twilioWs.close();
        return;
      }
      const startedAt = Date.now();
      ctx = { callSid, streamSid, from, to, company_id: tenant.company_id, startedAt };
      log('Media stream started', { to, from, company_id: tenant.company_id });

      activeCalls.set(callSid, {
        company_id: tenant.company_id,
        from,
        to,
        startedAt,
        service_area_zipcodes: tenant.service_area_zipcodes
      });

      void startTwilioRecording(callSid);

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
        language: tenant.language || tenant.agent_config?.language,
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
            tools: fsmEnabled ? [] : toolsSchema(),
            tool_choice: fsmEnabled ? 'none' : 'auto',
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
            // Lower silence threshold reduces perceived latency between user stop -> assistant start.
            // Too low can cause interruptions; tune if you notice cutoffs.
            turn_detection: {
              type: 'server_vad',
              threshold: Number(envFirst(['REALTIME_VAD_THRESHOLD']) || 0.75),
              prefix_padding_ms: 300,
              silence_duration_ms: Number(envFirst(['REALTIME_SILENCE_MS']) || 400),
            },
          },
        });
        openaiOutputAudioFormat = 'pcm16';

        // Create lead/call record in the background (so greeting isn't delayed).
        invokeTool(ctx, 'create_lead', { collected_info: {} }).catch((e: any) =>
          log('create_lead failed (non-fatal)', e?.message ?? String(e))
        );

        // Recording is started earlier on stream start (best-effort).
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

        if (msg?.type === 'session.updated') {
          const fmt = msg?.session?.output_audio_format;
          if (typeof fmt === 'string' && fmt) openaiOutputAudioFormat = fmt;
          log('OpenAI session updated', { output_audio_format: openaiOutputAudioFormat });

          openaiSessionReady = true;
          tryInitialGreeting();
        }

        // Barge-in: cancel assistant output when user starts talking.
        // Debounced to avoid background noise triggering constant interruptions.
        if (msg?.type === 'input_audio_buffer.speech_started') {
          userSpeechActive = true;
          lastUserSpeechStartedAt = Date.now();
          // lastUserSpeechDurationMs = 0;
          clearNoResponseTimer();
          clearPendingResponseTimer();
        }

        if (msg?.type === 'input_audio_buffer.speech_stopped') {
          userSpeechActive = false;
          lastUserSpeechStoppedAt = Date.now();
          if (lastUserSpeechStartedAt > 0) {
            // lastUserSpeechDurationMs = Math.max(0, lastUserSpeechStoppedAt - lastUserSpeechStartedAt);
          }
          if (pendingResponseAfterSpeech && !pendingAutoHangup) {
            pendingResponseAfterSpeech = false;
            scheduleAssistantResponse();
          }
        }

        if (msg?.type === 'response.audio.delta' && typeof msg?.delta === 'string') {
          const now = Date.now();
          assistantAudioActiveUntil = now + 350;
          const asPcm16 = shouldTreatDeltaAsPcm16(msg.delta);
          const bytes = asPcm16 ? decodeBase64Safe(msg.delta) : null;
          const payload = asPcm16 && bytes ? pcm16BytesToG711UlawBase64Adaptive(bytes) : msg.delta;

          if (audioDeltaDebugCount < 3) {
            audioDeltaDebugCount++;
            log('audio.delta', {
              output_audio_format: openaiOutputAudioFormat,
              raw_bytes: decodeBase64Safe(msg.delta)?.length,
              converted: asPcm16,
              payload_bytes: decodeBase64Safe(payload)?.length,
            });
          }
          sendToTwilio(twilioWs, {
            event: 'media',
            streamSid: ctx.streamSid,
            media: { payload },
          });
        }

        if (
          (msg?.type === 'response.output_text.delta' || msg?.type === 'response.text.delta') &&
          (typeof msg?.delta === 'string' || typeof msg?.text === 'string')
        ) {
          pendingAssistantHeuristicText += (msg.delta ?? msg.text) as string;
          const recent = pendingAssistantHeuristicText.slice(-250).toLowerCase();
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

        // Prefer capturing what the assistant actually said (audio transcript) so the call log includes both sides.
        const isAudioTranscriptDelta = msg?.type === 'response.audio_transcript.delta';
        const isOutputAudioTranscriptDelta = msg?.type === 'response.output_audio_transcript.delta';
        if (
          (isAudioTranscriptDelta || isOutputAudioTranscriptDelta) &&
          (typeof msg?.delta === 'string' || typeof msg?.text === 'string')
        ) {
          const source = isOutputAudioTranscriptDelta ? 'output_audio' : 'audio';
          if (!assistantTranscriptSource) assistantTranscriptSource = source;
          if (assistantTranscriptSource === source) {
            pendingAssistantText += (msg.delta ?? msg.text) as string;
          }
        }

        const isAudioTranscriptDone = msg?.type === 'response.audio_transcript.done';
        const isOutputAudioTranscriptDone = msg?.type === 'response.output_audio_transcript.done';
        if (
          (isAudioTranscriptDone || isOutputAudioTranscriptDone) &&
          typeof (msg?.transcript ?? msg?.text) === 'string'
        ) {
          const source = isOutputAudioTranscriptDone ? 'output_audio' : 'audio';
          if (!assistantTranscriptSource) assistantTranscriptSource = source;
          if (assistantTranscriptSource === source) {
            const t = (msg.transcript ?? msg.text).trim();
            if (t) pendingAssistantText = `${pendingAssistantText}${pendingAssistantText ? ' ' : ''}${t}`;
          }
        }

        if (msg?.type === 'conversation.item.input_audio_transcription.completed') {
          const t = msg?.transcript;
          if (typeof t === 'string' && t.trim()) {
            clearNoResponseTimer();
            lastUserTranscriptAt = Date.now();
            const text = t.trim();
            const normalizedText = text.toLowerCase();
            if (isProcessingTool && !isExplicitBargeIn(text)) {
              // DISABLED: filtering filler utterance while tool in flight often drops the actual answer if it starts with "uh" or "well"
              // if (isFillerUtterance(text)) {
              //   log('Ignoring filler while tool in flight', { text });
              //   armNoResponseTimer();
              //   return;
              // }
            }
            if (normalizedText === lastCallerText && Date.now() - lastCallerAt < 1500) {
              log('Skipping duplicate transcript', { text });
              return;
            }
            const assistantSnapshot =
              pendingAssistantText.trim() || pendingAssistantHeuristicText.trim() || lastAssistantText;
            const msSinceAssistant = Date.now() - lastAssistantAt;
            const assistantRecentlySpoke = Date.now() < assistantAudioActiveUntil + 500;
            const isEcho =
              assistantSnapshot &&
              (assistantRecentlySpoke || msSinceAssistant < 5000) &&
              isLikelyEcho(text, assistantSnapshot);
            if (isEcho) {
              log('Ignoring echo transcript', { text });
              armNoResponseTimer();
              return;
            }
            const recentSpeechStart = lastUserSpeechStartedAt > 0 && Date.now() - lastUserSpeechStartedAt < 4000;
            if (assistantRecentlySpoke && !recentSpeechStart) {
              log('Ignoring transcript without speech start', { text });
              armNoResponseTimer();
              return;
            }
            if (Date.now() < assistantAudioActiveUntil && !isFillerUtterance(text)) {
              sendToOpenAI(openaiWs, { type: 'response.cancel' });
              sendToTwilio(twilioWs, { event: 'clear', streamSid: ctx.streamSid });
              assistantAudioActiveUntil = 0;
            }
            if (!fsmEnabled && bookingStep !== 'idle' && shouldIgnoreBookingTranscript()) {
              log('Ignoring short booking response', { text, bookingStep });
              armNoResponseTimer();
              return;
            }
            lastCallerText = normalizedText;
            lastCallerAt = Date.now();
            conversation.push({ role: 'caller', text });
            pendingUserTranscript = pendingUserTranscript
              ? `${pendingUserTranscript} ${text}`
              : text;
            if (!fsmEnabled) {
              let handledBooking = false;
              if (bookingStep !== 'idle') {
                handledBooking = await handleBookingTurn(text);
              }
              if (handledBooking) {
                noResponseStage = 0;
                pendingUserTranscript = '';
                return;
              }
            }
            const inlinePatch = extractInlineIntake(lastAssistantText, text);
            if (Object.keys(inlinePatch).length) {
              intake = { ...intake, ...inlinePatch };
              if (openaiWs) {
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
              }
            }
            if (isLikelyNonAnswer() && !Object.keys(inlinePatch).length) {
              const sinceQuestionMs = lastAssistantQuestionAt ? Date.now() - lastAssistantQuestionAt : null;
              log('Ignoring non-answer transcript', { text, sinceQuestionMs });
              if (!pendingAutoHangup) armNoResponseTimer();
              return;
            }
            // Any user response resets the no-response sequence.
            noResponseStage = 0;
          }

          // Fallback end-of-call: if we recently asked "anything else", and the user says "no", hang up.
          if (!fsmEnabled && lastAssistantAskedAnythingElseAt && Date.now() - lastAssistantAskedAnythingElseAt < 20000) {
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
                scheduleForcedHangup('caller said no (anything else)');
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

          // Only generate a response after we have an actual transcription.
          // Trigger IMMEDIATELY without delay for snappy feel, unless speech is currently active.
          if (typeof t === 'string' && t.trim() && openaiWs && !pendingAutoHangup) {
            if (userSpeechActive) {
              pendingResponseAfterSpeech = true;
            } else {
              // Execute turn logic immediately (deterministic response)
              const bufferedText = pendingUserTranscript.trim();
              if (bufferedText) {
                // Immediate execution
                (async () => {
                  if (fsmEnabled) {
                    try {
                      const handled = await handleFsmTurn(bufferedText);
                      pendingUserTranscript = '';
                      if (handled) {
                        noResponseStage = 0;
                        return;
                      }
                      // If not handled, fall through? FSM should handle everything or return false.
                      // Use a generic fallback if FSM returned false (shouldn't happen if properly covered).
                      sendPrompt("Sorry, I didn't catch that. Could you repeat?");
                    } catch (err: any) {
                      log('handleFsmTurn immediate failed', err?.message);
                      sendPrompt("Sorry, I had a glitch. One more time?");
                    }
                  } else if (bookingStep !== 'idle') {
                    // Legacy booking flow
                    try {
                      const handled = await handleBookingTurn(bufferedText);
                      if (handled) {
                        noResponseStage = 0;
                        pendingUserTranscript = '';
                        return;
                      }
                    } catch (e) { }
                  }

                  // Fallback / Default conversation
                  if (pendingUserTranscript) { // if not consumed
                    pendingUserTranscript = '';
                    sendToOpenAI(openaiWs!, responseCreate());
                  }
                })();
              }
            }
          } else if (!pendingAutoHangup) {
            // Silence/incomprehensible: (re)arm the no-response timer.
            armNoResponseTimer();
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
            isProcessingTool = true;
            if (toolName === 'get_availability' || toolName === 'create_booking') {
              const calendarBlocked = tenant?.calendar_setup_completed === false;
              const scheduleBlocked = tenant?.schedule_setup_completed === false;
              if (calendarBlocked || scheduleBlocked) {
                sendToOpenAI(openaiWs, {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: toolCallId,
                    output: JSON.stringify({
                      ok: false,
                      error: 'Scheduling is not fully configured for this account.',
                    }),
                  },
                });
                isProcessingTool = false;
                sendToOpenAI(
                  openaiWs,
                  responseCreate(
                    ['audio', 'text'],
                    'Our scheduling calendar is not fully set up yet. Apologize briefly and offer to take details so the team can follow up.'
                  )
                );
                return;
              }
              if (tenant?.timezone && (!args?.timezone || typeof args.timezone !== 'string')) {
                args = { ...args, timezone: tenant.timezone };
              }
            }

            if (toolName === 'update_intake') {
              if (bookingStep !== 'idle') {
                sendToOpenAI(openaiWs, {
                  type: 'conversation.item.create',
                  item: { type: 'function_call_output', call_id: toolCallId, output: JSON.stringify({ ok: true }) },
                });
                isProcessingTool = false;
                return;
              }
              const patch = args?.intake ?? args ?? {};
              if (patch && typeof patch === 'object') {
                intake = { ...intake, ...patch };
              }
              const recentAssistantPrompt = (pendingAssistantText.trim() || pendingAssistantHeuristicText.trim()).slice(0, 240);
              const assistantAskedQuestion = recentAssistantPrompt.includes('?');
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
              isProcessingTool = false;
              const patchKeys = patch && typeof patch === 'object' ? Object.keys(patch) : [];
              if (patchKeys.length === 0) {
                return;
              }
              if (!assistantAskedQuestion) {
                sendToOpenAI(openaiWs, responseCreate());
              }
              return;
            }

            if (toolName === 'end_call') {
              // Don't hang up immediately inside the tool call (it can cut off the final audio).
              // Acknowledge the tool, then hang up after the response audio finishes (response.done -> mark/timer).
              if (!pendingAutoHangup) {
                pendingAutoHangup = true;
                pendingHangupMarkName = `model_end_${Date.now()}`;
              }
              scheduleForcedHangup('model requested end_call');
              log('Model requested end_call; deferring until response finishes', { mark: pendingHangupMarkName });
              sendToOpenAI(openaiWs, {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: toolCallId,
                  output: JSON.stringify({ ok: true }),
                },
              });
              isProcessingTool = false;
              sendToOpenAI(openaiWs, responseCreate());
              return;
            }

            if (toolName === 'create_booking') {
              const currentName =
                (typeof intake?.name === 'string' && intake.name.trim()) ||
                [intake?.first_name, intake?.last_name].filter(Boolean).join(' ').trim();
              if (currentName && (!args?.customer_name || !String(args.customer_name).trim())) {
                args = { ...args, customer_name: currentName };
              }
            }

            const toolArgs =
              toolName === 'save_call'
                ? {
                  ...args,
                  transcript:
                    typeof args?.transcript === 'string' && args.transcript.trim()
                      ? args.transcript
                      : mergedTranscriptText() || undefined,
                  duration_seconds:
                    typeof args?.duration_seconds === 'number'
                      ? args.duration_seconds
                      : ctx.startedAt
                        ? Math.max(1, Math.ceil((Date.now() - ctx.startedAt) / 1000))
                        : undefined,
                  collected_info:
                    args?.collected_info && typeof args.collected_info === 'object'
                      ? args.collected_info
                      : intake,
                }
                : args;

            const result = await invokeTool(ctx, toolName, toolArgs);
            if (toolName === 'get_availability') {
              const count = Array.isArray((result as any)?.slots) ? result.slots.length : 0;
              lastAvailabilitySlots = Array.isArray((result as any)?.slots) ? result.slots : [];
              lastAvailabilityTimezone = typeof args?.timezone === 'string' ? args.timezone : null;
              log('get_availability result', {
                start_time: args?.start_time,
                end_time: args?.end_time,
                timezone: args?.timezone,
                slots: count,
              });
            }
            if (toolName === 'create_booking') {
              log('create_booking result', {
                start_time: args?.start_time,
                end_time: args?.end_time,
                timezone: args?.timezone,
                ok: (result as any)?.ok,
                appointment_id: (result as any)?.appointment_id,
              });
            }
            if (toolName === 'save_call') {
              callSaved = true;
              log('save_call succeeded', { transcript_len: (toolArgs?.transcript || '').length });

              if (!pendingAutoHangup) {
                pendingAutoHangup = true;
                pendingHangupMarkName = `save_call_${Date.now()}`;
              }
              scheduleForcedHangup('save_call completed');

              sendToOpenAI(openaiWs, {
                type: 'conversation.item.create',
                item: { type: 'function_call_output', call_id: toolCallId, output: JSON.stringify(result) },
              });
              isProcessingTool = false;
              sendToOpenAI(openaiWs, {
                type: 'response.create',
                response: {
                  modalities: ['audio', 'text'],
                  instructions:
                    'Say ONE short friendly goodbye sentence (thank them and invite them to call back if needed). Do not mention saving. Do not ask another question.',
                },
              });
              return;
            }
            sendToOpenAI(openaiWs, {
              type: 'conversation.item.create',
              item: { type: 'function_call_output', call_id: toolCallId, output: JSON.stringify(result) },
            });
            if (toolName === 'get_availability') {
              isProcessingTool = false;
              const slots = Array.isArray((result as any)?.slots) ? result.slots : [];
              const spokenAvailability =
                typeof (result as any)?.spoken_availability === 'string' ? (result as any).spoken_availability.trim() : '';
              if (slots.length) {
                const tz =
                  (typeof (result as any)?.timezone === 'string' && (result as any).timezone) ||
                  (typeof args?.timezone === 'string' ? args.timezone : '') ||
                  tenant?.timezone ||
                  'UTC';
                if (spokenAvailability) {
                  sendToOpenAI(
                    openaiWs,
                    responseCreate(['audio', 'text'], spokenAvailability)
                  );
                } else {
                  const readableSlots = Array.isArray((result as any)?.readable_slots)
                    ? (result as any).readable_slots
                    : slots.map((slot: string) => formatSlotForPrompt(slot, tz));
                  sendToOpenAI(
                    openaiWs,
                    responseCreate(
                      ['audio', 'text'],
                      `Offer only these available times in ${tz} (no other times): ${readableSlots.join(
                        ', '
                      )}. Ask which one they want. Do not confirm a time until they choose one.`
                    )
                  );
                }
              } else {
                sendToOpenAI(
                  openaiWs,
                  responseCreate(
                    ['audio', 'text'],
                    'There are no openings in that window. Ask for another day or a different time range.'
                  )
                );
              }
              return;
            }
            isProcessingTool = false;
            sendToOpenAI(openaiWs, responseCreate());
          } catch (err: any) {
            // Keep the caller experience smooth: save_call failures should never be spoken back to the caller.
            // We'll retry on stop/hangup as best-effort.
            if (toolName === 'save_call') {
              log('save_call failed (non-fatal)', err?.message ?? String(err));
              if (!pendingAutoHangup) {
                pendingAutoHangup = true;
                pendingHangupMarkName = `save_call_${Date.now()}`;
              }
              scheduleForcedHangup('save_call failed');
              sendToOpenAI(openaiWs, {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: toolCallId,
                  output: JSON.stringify({ ok: true }),
                },
              });
              isProcessingTool = false;
              sendToOpenAI(openaiWs, {
                type: 'response.create',
                response: {
                  modalities: ['audio', 'text'],
                  instructions:
                    'Say ONE short friendly goodbye sentence (thank them and invite them to call back if needed). Do not mention saving. Do not ask another question.',
                },
              });
              return;
            }
            if (toolName === 'get_availability' || toolName === 'create_booking') {
              log(`${toolName} failed`, { error: err?.message ?? String(err), args });
            }
            const requestedStart = typeof args?.start_time === 'string' ? args.start_time : '';
            const filteredSlots = lastAvailabilitySlots.filter((s) => s !== requestedStart);
            sendToOpenAI(openaiWs, {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: toolCallId,
                output: JSON.stringify({
                  ok: false,
                  error: err?.message ?? String(err),
                  slots: toolName === 'create_booking' ? filteredSlots : undefined,
                  timezone: toolName === 'create_booking' ? lastAvailabilityTimezone : undefined,
                }),
              },
            });
            if (toolName === 'create_booking' && filteredSlots.length) {
              sendToOpenAI(
                openaiWs,
                responseCreate(
                  ['audio', 'text'],
                  `The requested time is unavailable. Offer only these available slots: ${filteredSlots.join(
                    ', '
                  )}.`
                )
              );
            } else {
              sendToOpenAI(openaiWs, responseCreate());
            }
            isProcessingTool = false;
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

        if (msg?.type === 'response.done') {
          if (bookingPromptActive) bookingPromptActive = false;
          const extracted = extractAssistantTextFromDone(msg);
          const candidate =
            pendingAssistantText.trim() || pendingAssistantHeuristicText.trim() || extracted;
          const finalAssistant = dedupeAssistantText(candidate);
          const responseId = msg?.response?.id as string | undefined;
          const now = Date.now();
          const isDuplicateResponse = responseId && responseId === lastResponseId;
          const isDuplicateText =
            finalAssistant &&
            finalAssistant === lastAssistantText &&
            now - lastAssistantAt < 4000;
          if (!isDuplicateResponse && finalAssistant && !isDuplicateText) {
            conversation.push({ role: 'assistant', text: finalAssistant });
            lastAssistantText = finalAssistant;
            lastAssistantAt = now;
            if (finalAssistant.includes('?')) {
              lastAssistantQuestionAt = now;
              noResponseStage = 0;
              if (!pendingAutoHangup) armNoResponseTimer();
            }
          }
          if (responseId) lastResponseId = responseId;
          pendingAssistantText = '';
          pendingAssistantHeuristicText = '';
          assistantTranscriptSource = null;
          if (fsmEnabled && pendingAnswerFollowUp) {
            pendingAnswerFollowUp = false;
            sessionContext.state = 'FOLLOW_UP';
            if (!pendingAutoHangup) {
              sendPrompt('Is there anything else I can help with today?');
            }
          }
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

      // Mark Twilio stream as ready when we receive first media chunk
      if (!twilioStreamReady) {
        twilioStreamReady = true;
        tryInitialGreeting();
      }

      // NOISE GATE: RMS-based filtering
      const gateThreshold = Number(envFirst(['NOISE_GATE_THRESHOLD']) || 500); // 14-bit PCM scale max 8192 approx
      const rms = calculateRmsFromBase64(payload);
      if (rms < gateThreshold) {
        // Send silence frame or skip?
        // Skipping completely might cause VAD issues if it expects continuous stream?
        // OpenAI Realtime VAD handles silence gaps fine, but sending strict silence is safer.
        // For now, let's just skip sending to OpenAI if it's pure noise, effectively "muting" the line.
        // But we must be careful not to cut off soft speech.
        return;
      }

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
            const duration_seconds = ctx?.startedAt ? Math.max(1, Math.ceil((Date.now() - ctx.startedAt) / 1000)) : undefined;
            await invokeTool(ctx!, 'save_call', {
              summary: 'Call ended.',
              transcript: merged || undefined,
              duration_seconds,
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
      log('Twilio stream connected');
      twilioStreamReady = true;
      tryInitialGreeting();
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
