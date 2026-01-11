import { Readable, PassThrough } from 'node:stream';

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { ConnectClient, DescribeContactCommand } from '@aws-sdk/client-connect';
import { KinesisVideoClient, GetDataEndpointCommand } from '@aws-sdk/client-kinesis-video';
import { KinesisVideoMediaClient, GetMediaCommand } from '@aws-sdk/client-kinesis-video-media';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from '@aws-sdk/client-transcribe-streaming';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Decoder as EbmlDecoder } from 'ebml';
import EbmlBlock from 'ebml-block';

type KickoffMessage = {
  contactId: string;
  streamArn: string;
  startFragmentNumber: string;
  systemPhoneNumber?: string;
  customerPhoneNumber?: string;
  receivedAt?: number;
};

const region = process.env.AWS_REGION || 'us-east-1';
const queueUrl = process.env.QUEUE_URL;
const connectInstanceId = process.env.CONNECT_INSTANCE_ID;
const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'handycall_prod_';
const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';

if (!queueUrl) throw new Error('QUEUE_URL is required');
if (!connectInstanceId) throw new Error('CONNECT_INSTANCE_ID is required');

const sqs = new SQSClient({ region });
const connect = new ConnectClient({ region });
const kv = new KinesisVideoClient({ region });
const bedrock = new BedrockRuntimeClient({ region });
const transcribe = new TranscribeStreamingClient({ region });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCompanyByConnectPhone(systemPhoneNumber: string): Promise<any | null> {
  const phone = systemPhoneNumber.trim();
  if (!phone) return null;

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: `${tablePrefix}companies`,
        IndexName: 'connect-phone-index',
        KeyConditionExpression: 'connect_phone_number = :phone',
        ExpressionAttributeValues: { ':phone': phone },
        Limit: 1,
      }),
    );
    return result.Items?.[0] ?? null;
  } catch {
    const result = await ddb.send(
      new ScanCommand({
        TableName: `${tablePrefix}companies`,
        FilterExpression: 'connect_phone_number = :phone',
        ExpressionAttributeValues: { ':phone': phone },
        Limit: 1,
      }),
    );
    return result.Items?.[0] ?? null;
  }
}

async function getAgentConfig(companyId: string): Promise<any | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: `${tablePrefix}agent_configs`,
      Key: { company_id: companyId },
    }),
  );
  return result.Item ?? null;
}

async function writeRealtimeCache(contactId: string, transcript: string, response: string) {
  const now = Date.now();
  await ddb.send(
    new PutCommand({
      TableName: `${tablePrefix}realtime_cache`,
      Item: {
        contact_id: contactId,
        transcript,
        response,
        updated_at: now,
        ttl: Math.floor(now / 1000) + 120,
      },
    }),
  );
}

async function generateResponse(companyName: string, agentConfig: any, userMessage: string): Promise<string> {
  const assistantName = agentConfig?.ai_assistant_name || 'the AI assistant';
  const system = `You are a receptionist for ${companyName}. Be fast and natural (1 short sentence).\n\nDO NOT:\n- Greet or introduce yourself\n- Say \"I'm ${assistantName}\" or similar\n\nDO:\n- Answer directly in 1 short sentence\n- If they want service/booking, ask for ONE detail: address/zip or preferred day/time\n- If unsure, offer to take a message and confirm the best callback number (don’t mention transferring)`;

  const response = await bedrock.send(
    new ConverseCommand({
      modelId: bedrockModelId,
      system: [{ text: system }],
      messages: [{ role: 'user', content: [{ text: userMessage }] }],
      inferenceConfig: { maxTokens: 120, temperature: 0.7 },
    }),
  );

  return (response.output?.message?.content || [])
    .map((c) => c.text || '')
    .join('')
    .trim();
}

async function startKvsGetMedia(streamArn: string, startFragmentNumber: string): Promise<Readable> {
  const endpoint = await kv.send(
    new GetDataEndpointCommand({
      APIName: 'GET_MEDIA',
      StreamARN: streamArn,
    }),
  );
  if (!endpoint.DataEndpoint) throw new Error('KVS DataEndpoint missing');

  const media = new KinesisVideoMediaClient({ region, endpoint: endpoint.DataEndpoint });
  const resp = await media.send(
    new GetMediaCommand({
      StreamARN: streamArn,
      StartSelector: {
        StartSelectorType: 'FRAGMENT_NUMBER',
        AfterFragmentNumber: startFragmentNumber,
      },
    }),
  );
  const payload = resp.Payload as any;
  if (!payload || typeof payload.pipe !== 'function') {
    throw new Error('KVS GetMedia payload is not a stream');
  }
  return payload as Readable;
}

function decodeMkvToPcm(mkvStream: Readable): Readable {
  const decoder = new EbmlDecoder();
  const pcm = new PassThrough();

  let audioTrackNumber: number | null = null;
  let inTrackEntry = false;
  let trackNumber: number | null = null;
  let trackType: number | null = null;
  let trackName: string | null = null;

  decoder.on('data', ([type, data]: any) => {
    if (type === 'start' && data?.name === 'TrackEntry') {
      inTrackEntry = true;
      trackNumber = null;
      trackType = null;
      trackName = null;
      return;
    }

    if (type === 'end' && data?.name === 'TrackEntry') {
      if (trackType === 2 && trackNumber != null) {
        if (audioTrackNumber == null) audioTrackNumber = trackNumber;
        if ((trackName || '').toUpperCase().includes('AUDIO_FROM_CUSTOMER')) {
          audioTrackNumber = trackNumber;
        }
      }
      inTrackEntry = false;
      return;
    }

    if (type !== 'tag') return;

    if (inTrackEntry) {
      if (data?.name === 'TrackNumber') trackNumber = Number(data.value);
      if (data?.name === 'TrackType') trackType = Number(data.value);
      if (data?.name === 'Name' || data?.name === 'TrackName' || data?.name === 'Title') {
        trackName = String(data.value || '');
      }
      return;
    }

    if (data?.name !== 'SimpleBlock' || !audioTrackNumber) return;

    try {
      const block = new EbmlBlock(data.data);
      if (block.trackNumber !== audioTrackNumber) return;
      for (const frame of block.frames || []) {
        pcm.write(frame);
      }
    } catch {
      // Ignore malformed blocks; Transcribe is best-effort.
    }
  });

  const abort = (err: any) => {
    if (!pcm.destroyed) pcm.destroy(err);
  };

  mkvStream.on('data', (chunk) => decoder.write(chunk));
  mkvStream.on('end', () => decoder.end());
  mkvStream.on('error', abort);
  decoder.on('error', abort);
  decoder.on('finish', () => pcm.end());

  return pcm;
}

async function* audioEventStream(pcmStream: Readable): AsyncIterable<any> {
  const frameBytes = 320; // 20ms @ 8kHz * 16-bit mono
  let buffer = Buffer.alloc(0);

  for await (const chunk of pcmStream) {
    buffer = Buffer.concat([buffer, chunk as Buffer]);
    while (buffer.length >= frameBytes) {
      const frame = buffer.subarray(0, frameBytes);
      buffer = buffer.subarray(frameBytes);
      yield { AudioEvent: { AudioChunk: frame } };
    }
  }
}

async function processKickoffMessage(job: KickoffMessage) {
  const contactId = job.contactId?.trim();
  const streamArn = job.streamArn?.trim();
  const startFragmentNumber = job.startFragmentNumber?.trim();
  if (!contactId || !streamArn || !startFragmentNumber) {
    throw new Error('Kickoff message missing contactId/streamArn/startFragmentNumber');
  }

  let systemPhoneNumber = job.systemPhoneNumber?.trim() || '';
  let customerPhoneNumber = job.customerPhoneNumber?.trim() || '';

  if (!systemPhoneNumber || !customerPhoneNumber) {
    const described = await connect.send(
      new DescribeContactCommand({
        InstanceId: connectInstanceId,
        ContactId: contactId,
      }),
    );
    systemPhoneNumber = described.Contact?.SystemEndpoint?.Address || systemPhoneNumber;
    customerPhoneNumber = described.Contact?.CustomerEndpoint?.Address || customerPhoneNumber;
  }

  const company = systemPhoneNumber ? await getCompanyByConnectPhone(systemPhoneNumber) : null;
  if (!company) throw new Error(`Company not found for system phone: ${systemPhoneNumber || '(missing)'}`);
  const agentConfig = await getAgentConfig(company.company_id);
  if (!agentConfig) throw new Error(`Agent config not found for company: ${company.company_id}`);

  const mkv = await startKvsGetMedia(streamArn, startFragmentNumber);
  const pcm = decodeMkvToPcm(mkv);

  let latestTranscript = '';
  let lastWriteAt = 0;

  const cmd = new StartStreamTranscriptionCommand({
    LanguageCode: 'en-US',
    MediaEncoding: 'pcm',
    MediaSampleRateHertz: 8000,
    AudioStream: audioEventStream(pcm),
  });

  const resp = await transcribe.send(cmd);
  const stream = resp.TranscriptResultStream;
  if (!stream) throw new Error('Transcribe TranscriptResultStream missing');

  for await (const event of stream) {
    const transcriptEvent: any = (event as any).TranscriptEvent;
    const results: any[] = transcriptEvent?.Transcript?.Results || [];
    for (const result of results) {
      const alt = result?.Alternatives?.[0];
      const text = (alt?.Transcript || '').trim();
      if (!text) continue;

      if (result.IsPartial === false) {
        latestTranscript = text;
      } else {
        // Keep partial if we have nothing finalized yet.
        if (!latestTranscript) latestTranscript = text;
      }

      const now = Date.now();
      if (now - lastWriteAt < 750) continue;
      if (latestTranscript.length < 3) continue;

      const responseText = await generateResponse(company.company_name, agentConfig, latestTranscript);
      if (!responseText) continue;
      await writeRealtimeCache(contactId, latestTranscript, responseText);
      lastWriteAt = now;
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          contactId,
          systemPhoneNumber,
          customerPhoneNumber,
          transcript: latestTranscript,
          response: responseText,
        }),
      );
    }
  }
}

async function mainLoop() {
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      region,
      queueUrl,
      connectInstanceId,
    }),
  );

  while (true) {
    const resp = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 60,
      }),
    );

    const msg = resp.Messages?.[0];
    if (!msg) continue;

    try {
      const body = msg.Body ? (JSON.parse(msg.Body) as KickoffMessage) : null;
      if (!body) throw new Error('Empty SQS message body');

      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          event: 'kickoff_received',
          contactId: body.contactId,
          hasStreamArn: Boolean(body.streamArn),
          hasStartFragmentNumber: Boolean(body.startFragmentNumber),
          systemPhoneNumber: body.systemPhoneNumber,
          customerPhoneNumber: body.customerPhoneNumber,
        }),
      );

      if (!body.contactId || !body.streamArn || !body.startFragmentNumber) {
        console.error(
          JSON.stringify({
            at: new Date().toISOString(),
            event: 'kickoff_invalid',
            contactId: body.contactId,
            streamArn: body.streamArn,
            startFragmentNumber: body.startFragmentNumber,
          }),
        );
        if (msg.ReceiptHandle) {
          await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: msg.ReceiptHandle }));
        }
        continue;
      }

      // Delete immediately; the stream job is best-effort and long-running.
      if (msg.ReceiptHandle) {
        await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: msg.ReceiptHandle }));
      }

      await processKickoffMessage(body);
    } catch (err: any) {
      console.error(
        JSON.stringify({
          at: new Date().toISOString(),
          error: err?.message || String(err),
          stack: err?.stack,
        }),
      );
      // Let SQS redrive handle retries if we didn't delete.
      await sleep(1000);
    }
  }
}

mainLoop().catch((err) => {
  console.error(err);
  process.exit(1);
});
