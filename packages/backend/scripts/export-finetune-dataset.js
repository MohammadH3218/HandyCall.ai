#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [rawKey, inlineValue] = token.split('=');
    const key = rawKey.slice(2);
    if (inlineValue !== undefined) {
      out[key] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = 'true';
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function toBool(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function toInt(value, defaultValue) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function usage() {
  console.log(`Usage:
  node packages/backend/scripts/export-finetune-dataset.js --company-id COMPANY_ID [options]

Options:
  --out PATH                  Training JSONL output path
  --validation-out PATH       Validation JSONL output path
  --validation-split 0.15     Fraction reserved for validation
  --limit 200                 Max calls to export
  --min-transcript-chars 80   Skip very short transcripts
  --task call-outcome         Export task type (currently only call-outcome)
  --redact true               Redact phone numbers, emails, and URLs
  --help                      Show this help
`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function redactText(input) {
  return String(input || '')
    .replace(/\+?\d[\d()\-\s]{7,}\d/g, '[REDACTED_PHONE]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/https?:\/\/\S+/gi, '[REDACTED_URL]');
}

function redactDeep(value) {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactDeep(item));
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, item]) => [key, redactDeep(item)]);
  return Object.fromEntries(entries);
}

function normalizeTranscriptPayload(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed ? { text: trimmed } : null;
  }
  if (typeof raw === 'object') {
    const text =
      typeof raw.text === 'string'
        ? raw.text.trim()
        : typeof raw.full_text === 'string'
          ? raw.full_text.trim()
          : '';
    if (!text) return null;
    return {
      text,
      collected_info:
        raw.collected_info && typeof raw.collected_info === 'object' ? raw.collected_info : undefined,
    };
  }
  return null;
}

async function readJsonFile(filePath) {
  const body = await fs.readFile(filePath, 'utf8');
  return JSON.parse(body);
}

function stableBucket(value) {
  const hash = crypto.createHash('sha256').update(String(value)).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}

function buildOutputPath(companyId, suffix) {
  return path.join('tmp', 'finetune', `${companyId}.${suffix}.jsonl`);
}

async function listCallsByCompany({ tableName, companyId, limit, region, dynamoEndpoint }) {
  const items = [];
  let exclusiveStartKey = null;

  while (items.length < limit) {
    const pageLimit = Math.min(100, limit - items.length);
    const args = [
      'dynamodb',
      'scan',
      '--table-name',
      tableName,
      '--region',
      region,
      '--filter-expression',
      '#company_id = :company_id',
      '--expression-attribute-names',
      JSON.stringify({ '#company_id': 'company_id' }),
      '--expression-attribute-values',
      JSON.stringify({ ':company_id': { S: companyId } }),
      '--limit',
      String(pageLimit),
      '--output',
      'json',
    ];
    if (dynamoEndpoint) {
      args.push('--endpoint-url', dynamoEndpoint);
    }
    if (exclusiveStartKey) {
      args.push('--exclusive-start-key', JSON.stringify(exclusiveStartKey));
    }

    const result = runJsonCommand('aws', args);
    items.push(...((result.Items || []).map((item) => unmarshallAttribute(item))));
    exclusiveStartKey = result.LastEvaluatedKey || null;
    if (!exclusiveStartKey) break;
  }

  return items;
}

async function loadTranscriptForCall({ call, companyId, region, transcriptsBucket, localStorageDir, storageProvider }) {
  if (storageProvider === 'local') {
    const filePath = path.join(localStorageDir, 'transcripts', companyId, `${call.call_id}.json`);
    try {
      return normalizeTranscriptPayload(await readJsonFile(filePath));
    } catch (error) {
      if (error && error.code === 'ENOENT') return null;
      throw error;
    }
  }

  const key = `transcripts/${companyId}/${call.call_id}.json`;
  try {
    const body = execFileSync(
      'aws',
      ['s3', 'cp', `s3://${transcriptsBucket}/${key}`, '-', '--region', region],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return normalizeTranscriptPayload(JSON.parse(body));
  } catch (error) {
    const stderr = String(error?.stderr || error?.message || '');
    if (stderr.includes('Not Found') || stderr.includes('404')) return null;
    throw error;
  }
}

function buildAssistantLabel(call, transcriptPayload, shouldRedact) {
  const label = {
    outcome: call.outcome || 'unknown',
    lead_captured: Boolean(call.lead_captured),
    appointment_created: Boolean(call.appointment_id || call.appointment_created),
    lead_progress_stage: call.lead_progress_stage || null,
    lead_reason: call.lead_reason || null,
    summary: typeof call.summary === 'string' && call.summary.trim() ? call.summary.trim() : null,
    collected_info:
      (call.collected_info && typeof call.collected_info === 'object' && Object.keys(call.collected_info).length > 0
        ? call.collected_info
        : transcriptPayload.collected_info) || {},
  };
  return shouldRedact ? redactDeep(label) : label;
}

function buildTrainingExample(call, transcriptPayload, shouldRedact) {
  const transcriptText = shouldRedact ? redactText(transcriptPayload.text) : transcriptPayload.text;
  const assistantLabel = buildAssistantLabel(call, transcriptPayload, shouldRedact);
  const userPayload = {
    call_id: call.call_id,
    direction: call.direction || 'inbound',
    transcript: transcriptText,
  };

  return {
    messages: [
      {
        role: 'system',
        content:
          'You extract the final structured outcome of a HandyCall receptionist call. Return exactly one JSON object and do not include markdown.',
      },
      {
        role: 'user',
        content: JSON.stringify(userPayload),
      },
      {
        role: 'assistant',
        content: JSON.stringify(assistantLabel),
      },
    ],
  };
}

function runJsonCommand(command, args) {
  const output = execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output);
}

function unmarshallAttribute(attribute) {
  if (attribute === null || attribute === undefined) return attribute;
  if (typeof attribute !== 'object' || Array.isArray(attribute)) return attribute;
  if (Object.prototype.hasOwnProperty.call(attribute, 'S')) return attribute.S;
  if (Object.prototype.hasOwnProperty.call(attribute, 'N')) {
    const numeric = Number(attribute.N);
    return Number.isFinite(numeric) ? numeric : attribute.N;
  }
  if (Object.prototype.hasOwnProperty.call(attribute, 'BOOL')) return Boolean(attribute.BOOL);
  if (Object.prototype.hasOwnProperty.call(attribute, 'NULL')) return null;
  if (Object.prototype.hasOwnProperty.call(attribute, 'SS')) return attribute.SS;
  if (Object.prototype.hasOwnProperty.call(attribute, 'NS')) {
    return attribute.NS.map((value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    });
  }
  if (Object.prototype.hasOwnProperty.call(attribute, 'L')) {
    return attribute.L.map((value) => unmarshallAttribute(value));
  }
  if (Object.prototype.hasOwnProperty.call(attribute, 'M')) {
    return Object.fromEntries(
      Object.entries(attribute.M).map(([key, value]) => [key, unmarshallAttribute(value)])
    );
  }
  return Object.fromEntries(Object.entries(attribute).map(([key, value]) => [key, unmarshallAttribute(value)]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (toBool(args.help)) {
    usage();
    return;
  }

  const companyId = args['company-id'];
  if (!companyId) {
    usage();
    process.exitCode = 1;
    return;
  }

  const task = String(args.task || 'call-outcome').trim().toLowerCase();
  if (task !== 'call-outcome') {
    throw new Error(`Unsupported task "${task}". Supported tasks: call-outcome`);
  }

  const limit = toInt(args.limit, 200);
  const minTranscriptChars = toInt(args['min-transcript-chars'], 80);
  const validationSplit = Number.parseFloat(String(args['validation-split'] ?? '0.15'));
  const shouldRedact = toBool(args.redact, true);

  const trainOut = args.out || buildOutputPath(companyId, `${task}.train`);
  const validationOut =
    validationSplit > 0 ? args['validation-out'] || buildOutputPath(companyId, `${task}.valid`) : undefined;

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || '';
  const dynamoEndpoint = process.env.DYNAMODB_ENDPOINT;
  const storageProvider = String(process.env.STORAGE_PROVIDER || 's3').trim().toLowerCase();
  const localStorageDir = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), '.local', 'storage');
  const transcriptsBucket = storageProvider === 'local' ? '' : requireEnv('S3_BUCKET_TRANSCRIPTS');
  const tableName = `${tablePrefix}calls`;

  const calls = await listCallsByCompany({ tableName, companyId, limit, region, dynamoEndpoint });

  const trainLines = [];
  const validationLines = [];
  let skippedNoTranscript = 0;
  let skippedShortTranscript = 0;
  let skippedNoLabels = 0;

  for (const call of calls) {
    if (!call || !call.call_id) continue;
    const transcriptPayload = await loadTranscriptForCall({
      call,
      companyId,
      region,
      transcriptsBucket,
      localStorageDir,
      storageProvider,
    });

    if (!transcriptPayload || !transcriptPayload.text) {
      skippedNoTranscript += 1;
      continue;
    }

    if (transcriptPayload.text.trim().length < minTranscriptChars) {
      skippedShortTranscript += 1;
      continue;
    }

    const hasUsefulLabel =
      Boolean(call.outcome) ||
      Boolean(call.summary) ||
      Boolean(call.lead_reason) ||
      Boolean(call.lead_progress_stage) ||
      Boolean(call.lead_captured) ||
      Boolean(call.appointment_id) ||
      Boolean(call.appointment_created) ||
      (call.collected_info && Object.keys(call.collected_info).length > 0) ||
      (transcriptPayload.collected_info && Object.keys(transcriptPayload.collected_info).length > 0);

    if (!hasUsefulLabel) {
      skippedNoLabels += 1;
      continue;
    }

    const example = buildTrainingExample(call, transcriptPayload, shouldRedact);
    const line = JSON.stringify(example);
    if (validationOut && stableBucket(call.call_id) < validationSplit) {
      validationLines.push(line);
    } else {
      trainLines.push(line);
    }
  }

  await fs.mkdir(path.dirname(trainOut), { recursive: true });
  await fs.writeFile(trainOut, `${trainLines.join('\n')}${trainLines.length ? '\n' : ''}`, 'utf8');

  if (validationOut) {
    await fs.mkdir(path.dirname(validationOut), { recursive: true });
    await fs.writeFile(
      validationOut,
      `${validationLines.join('\n')}${validationLines.length ? '\n' : ''}`,
      'utf8'
    );
  }

  const manifest = {
    company_id: companyId,
    task,
    table: tableName,
    storage_provider: storageProvider,
    train_output: trainOut,
    validation_output: validationOut || null,
    requested_limit: limit,
    exported_train_examples: trainLines.length,
    exported_validation_examples: validationLines.length,
    skipped_no_transcript: skippedNoTranscript,
    skipped_short_transcript: skippedShortTranscript,
    skipped_no_labels: skippedNoLabels,
    min_transcript_chars: minTranscriptChars,
    redacted: shouldRedact,
    generated_at: new Date().toISOString(),
  };

  const manifestPath = `${trainOut}.manifest.json`;
  await fs.writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
