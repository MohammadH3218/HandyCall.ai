# Voice Bridge Runbook

This service terminates Twilio Media Streams, handles VAD/Speech using OpenAI Realtime, and tools.
Runs on port **8082**. Requires a public HTTPS tunnel (ngrok) so Twilio can reach it.

## Local Development

### Prerequisites
- Node.js 18+
- ngrok installed (`brew install ngrok/ngrok/ngrok`) with auth token configured

### One-Time ngrok Setup
```bash
brew install ngrok/ngrok/ngrok
ngrok config add-authtoken <your-auth-token>   # from dashboard.ngrok.com/authtokens
```
Your free static domain is shown at dashboard.ngrok.com/domains.

### Environment Variables
`packages/voice-bridge/.env` is already populated with real credentials. Key variables:
```env
PORT=8082
OPENAI_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
HANDYCALL_TOOLS_API_KEY=dev-tools-key
BACKEND_URL=http://localhost:3000
NGROK_DOMAIN=consuelo-harmful-cathy.ngrok-free.dev   # static domain, never changes
PUBLIC_BASE_URL=https://consuelo-harmful-cathy.ngrok-free.dev
TWILIO_VALIDATE_SIGNATURE=false
```

### Run (via monorepo — recommended)
The voice bridge is included in the root `npm run dev`. Do not run it separately.
```bash
# from repo root
npm run dev
```
The startup script `scripts/local/start-voice-bridge-dev.sh` will:
1. Load `.env` from `packages/voice-bridge/`
2. Start ngrok with the static domain
3. Auto-update the Twilio webhook via Twilio CLI
4. Start the voice-bridge dev server

### Twilio Webhook
Phone number `+18324605974` webhook is auto-updated on every `npm run dev`.
Permanent URL: `https://consuelo-harmful-cathy.ngrok-free.dev/twilio/voice`

## Tuning for Noise

If callers complain about interruptions:
1. **Increase VAD Threshold**: Set `REALTIME_VAD_THRESHOLD=0.8` (0.0-1.0). Higher means harder to interrupt.
2. **Increase Silence Duration**: Set `REALTIME_SILENCE_MS=600`. Higher means wait longer before responding.
3. **Increase Noise Gate**: Set `NOISE_GATE_THRESHOLD=1000`. Filters out louder background fuzz.

## Logs
Logs are printed to stdout prefixed with `[voice]` when running via `npm run dev`.
Search for `[callSid=...]` to trace a specific call.
