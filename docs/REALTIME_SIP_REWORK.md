# Realtime SIP (OpenAI) Architecture Rework

Goal: replace the current Connect/Lex “turn-based” voice path with OpenAI Realtime (`gpt-realtime-mini`) for more natural, low-latency speech-to-speech calls, while keeping HandyCall’s multi-tenant “business brain” in AWS.

Note: If you are using **Twilio phone numbers**, the working integration path is **Twilio Programmable Voice + Media Streams** (WebSocket) → `packages/voice-bridge`. Twilio SIP trunking → OpenAI is not a valid path.

## Components

1. **Telephony**: Twilio SIP trunking (or any SIP provider)
2. **Voice AI**: OpenAI Realtime SIP connector (`gpt-realtime-mini`)
3. **Controller**: `packages/realtime-controller` (ECS/Fargate-friendly)
4. **Tools API**: HandyCall backend (`packages/backend`) exposes server-to-server endpoints:
   - `POST /api/v1/tenant/resolve`
   - `POST /api/v1/tools/create_lead`
   - `POST /api/v1/tools/save_call`

## DynamoDB additions

To route by dialed number (DID), create the `handycall_{env}_company_numbers` table.

- Script: `scripts/create-company-numbers-table.sh`
- Backend service: `packages/backend/src/modules/company-numbers`

## Realtime controller endpoints

The exact OpenAI SIP “sideband” payload can vary by connector setup. The controller supports two patterns:

### 1) “Pull” config (SIP connector asks you for config)
`POST /v1/session-config`

Input:
```json
{ "call_id": "optional", "to_number": "+15551234567", "from_number": "+15557654321" }
```

Output includes a `session_update` event you can pass to the SIP connector.

### 2) “Push” config (SIP connector gives you a control websocket URL)
`POST /v1/control/connect`

Input:
```json
{
  "control_url": "wss://…",
  "call_id": "optional",
  "to_number": "+15551234567",
  "from_number": "+15557654321"
}
```

The controller connects to `control_url`, sends `session.update`, then relays tool calls back to your Tools API.

## Required environment variables

### Tools API (backend)
- `HANDYCALL_TOOLS_API_KEY` (required) — shared secret; requests must include header `x-handycall-tools-key`

### Realtime controller
- `OPENAI_API_KEY` (required for `/v1/control/connect`)
- `TOOLS_API_BASE_URL` (required) — e.g. `http://localhost:3000/api/v1`
- `TOOLS_API_KEY` (required) — must match `HANDYCALL_TOOLS_API_KEY`
- Optional: `REALTIME_MODEL` (default: `gpt-realtime-mini`)
- Optional: `REALTIME_VOICE` (default: `alloy`)

## Local development (no SIP)

Run backend:
```bash
npm run backend:dev
```

Run controller:
```bash
npm run dev -w handycall-realtime-controller
```

Then request a config payload:
```bash
curl -X POST http://localhost:8081/v1/session-config ^
  -H "Content-Type: application/json" ^
  -d "{\"to_number\":\"+15551234567\",\"from_number\":\"+15557654321\"}"
```

## Twilio numbers (recommended)

Use `docs/TWILIO_MEDIA_STREAMS_SETUP.md` and run `packages/voice-bridge` instead of SIP trunking.
