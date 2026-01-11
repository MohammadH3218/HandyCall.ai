# Real-Time Voice Acceleration (Connect Media Streams + Cache)

This repo is currently optimized for fastest responses on Amazon Connect by **precomputing** the next AI response while the caller is still talking, then serving it from a **DynamoDB real-time cache** when Lex triggers the normal Lambda turn.

## What Was Provisioned

- Connect **MEDIA_STREAMS** storage config (Kinesis Video Streams) on instance `e55edc1b-5259-45ce-bb2c-1b3248c6031b`
- DynamoDB: `handycall_prod_realtime_cache` (PK: `contact_id`, TTL: `ttl`)
- SQS: `handycall-prod-media-stream-kickoff` (+ DLQ `handycall-prod-media-stream-kickoff-dlq`)
- Lambda kickoff: `handycall-media-stream-kickoff` (Connect -> SQS)
- ECS/Fargate service: `handycall-stream-processor-prod` (SQS -> KVS -> Transcribe -> Bedrock -> DynamoDB)
- Lambda warmup rule (reduces cold starts): EventBridge rule `handycall-warm-call-orchestrator` invoking `handycall-call-orchestrator` with `{"warm":true}`

## Required Contact Flow Change (Manual in Console)

In the Amazon Connect flow you use for inbound calls, add these blocks:

1. **Start media streaming**
   - Configure **From the customer** (recommended for this implementation).
2. Immediately after, **Invoke AWS Lambda function**
   - Function: `handycall-media-stream-kickoff`
   - Add invocation attributes:
     - `contactId` = `$.ContactId`
     - `streamArn` = `$.MediaStreams.Customer.Audio.StreamARN`
     - `startFragmentNumber` = `$.MediaStreams.Customer.Audio.StartFragmentNumber`
     - `systemPhoneNumber` = `$.SystemEndpoint.Address`
     - `customerPhoneNumber` = `$.CustomerEndpoint.Address`
3. Near the end of the flow, add **Stop media streaming**

Then **Save** and **Publish** the flow.

## How It Works

- The flow starts streaming audio to Kinesis Video Streams and passes the stream metadata to `handycall-media-stream-kickoff`.
- The kickoff Lambda enqueues a job into SQS.
- The ECS service consumes the job, runs streaming transcription and speculative Bedrock generation, and continuously writes the latest `{ transcript, response }` into `handycall_prod_realtime_cache` keyed by `contactId`.
- When Lex triggers `handycall-call-orchestrator`, it checks the cache and immediately returns the cached response if it matches and is fresh.

## Debugging

- ECS logs: CloudWatch log group `/ecs/handycall-stream-processor-prod`
- DynamoDB cache: `handycall_prod_realtime_cache`
- SQS backlog: `handycall-prod-media-stream-kickoff`

