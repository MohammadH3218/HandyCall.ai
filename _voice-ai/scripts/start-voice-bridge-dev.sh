#!/usr/bin/env bash
# Starts the voice-bridge dev server with a public tunnel so Twilio can reach it.
#
# Priority order for PUBLIC_BASE_URL:
#   1. Already set in environment or packages/voice-bridge/.env  → use it as-is
#   2. NGROK_DOMAIN set                                          → start ngrok with static domain
#   3. ngrok available                                           → start ngrok (dynamic URL)
#   4. cloudflared available                                     → start cloudflare tunnel
#   5. Nothing available                                         → print instructions and exit

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VB_DIR="$REPO_ROOT/packages/voice-bridge"
PORT="${PORT:-8082}"
TUNNEL_PROVIDER="${TUNNEL_PROVIDER:-auto}" # auto | ngrok | cloudflared

# Load voice-bridge .env if it exists
if [ -f "$VB_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$VB_DIR/.env"
  set +a
fi

# Kill any stale process already holding the port
EXISTING_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo "[voice-bridge] Killing stale process on port $PORT (pid=$EXISTING_PID)"
  kill "$EXISTING_PID" 2>/dev/null || true
  sleep 1
fi

TUNNEL_PID=""
cleanup() {
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait_for_ngrok_url() {
  local tries=0
  until curl -sf http://127.0.0.1:4040/api/tunnels > /tmp/ngrok-vb-tunnels.json 2>/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -ge 30 ]; then
      echo "[voice-bridge] Timed out waiting for ngrok to start" >&2
      return 1
    fi
    sleep 0.5
  done
  jq -r '[.tunnels[] | select(.proto=="https")] | .[0].public_url' /tmp/ngrok-vb-tunnels.json
}

wait_for_cloudflared_url() {
  local tries=0
  while [ "$tries" -lt 40 ]; do
    local url
    url=$(awk 'match($0,/https:\/\/[a-z0-9-]+\.trycloudflare\.com/){print substr($0,RSTART,RLENGTH); exit}' /tmp/cloudflared-vb.log 2>/dev/null || true)
    if [ -n "$url" ]; then
      echo "$url"
      return 0
    fi
    tries=$((tries + 1))
    sleep 0.5
  done
  return 1
}

# --- 1. ngrok with static domain (preferred when NGROK_DOMAIN is set unless provider is cloudflared) ---
if [ "$TUNNEL_PROVIDER" != "cloudflared" ] && [ -n "${NGROK_DOMAIN:-}" ] && command -v ngrok >/dev/null 2>&1; then
  echo "[voice-bridge] Starting ngrok with static domain: $NGROK_DOMAIN"
  ngrok http "$PORT" --domain="$NGROK_DOMAIN" --log=stdout > /tmp/ngrok-vb.log 2>&1 &
  TUNNEL_PID=$!
  PUBLIC_BASE_URL="https://$NGROK_DOMAIN"
  echo "[voice-bridge] Tunnel: $PUBLIC_BASE_URL"

# --- 2. PUBLIC_BASE_URL set but no ngrok domain — use as-is, no tunnel ---
elif [ -n "${PUBLIC_BASE_URL:-}" ] && [ "$TUNNEL_PROVIDER" = "auto" ]; then
  echo "[voice-bridge] Using pre-set PUBLIC_BASE_URL=$PUBLIC_BASE_URL (no tunnel started)"

# --- 3. ngrok (dynamic URL) ---
elif [ "$TUNNEL_PROVIDER" != "cloudflared" ] && command -v ngrok >/dev/null 2>&1; then
  echo "[voice-bridge] Starting ngrok on port $PORT..."
  ngrok http "$PORT" --log=stdout > /tmp/ngrok-vb.log 2>&1 &
  TUNNEL_PID=$!
  echo "[voice-bridge] Waiting for ngrok URL..."
  PUBLIC_BASE_URL=$(wait_for_ngrok_url)
  if [ -z "$PUBLIC_BASE_URL" ] || [ "$PUBLIC_BASE_URL" = "null" ]; then
    echo "[voice-bridge] Failed to get ngrok URL" >&2
    exit 1
  fi
  echo "[voice-bridge] Tunnel: $PUBLIC_BASE_URL"

# --- 4. cloudflared ---
elif [ "$TUNNEL_PROVIDER" != "ngrok" ] && command -v cloudflared >/dev/null 2>&1; then
  echo "[voice-bridge] Starting cloudflare tunnel on port $PORT..."
  cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate > /tmp/cloudflared-vb.log 2>&1 &
  TUNNEL_PID=$!
  echo "[voice-bridge] Waiting for cloudflared URL..."
  PUBLIC_BASE_URL=$(wait_for_cloudflared_url || true)
  if [ -z "$PUBLIC_BASE_URL" ]; then
    echo "[voice-bridge] Failed to get cloudflared URL" >&2
    cat /tmp/cloudflared-vb.log >&2
    exit 1
  fi
  echo "[voice-bridge] Tunnel: $PUBLIC_BASE_URL"

# --- 5. Nothing available ---
else
  echo ""
  echo "================================================================"
  echo "[voice-bridge] ERROR: No tunnel tool found."
  echo ""
  echo "Twilio needs a public HTTPS URL to reach the voice-bridge."
  echo "Choose one of:"
  echo ""
  echo "  Option A — Set PUBLIC_BASE_URL in packages/voice-bridge/.env:"
  echo "    PUBLIC_BASE_URL=https://your-static-ngrok-or-tunnel-url.app"
  echo ""
  echo "  Option B — Install ngrok:  https://ngrok.com/download"
  echo "    Then optionally set NGROK_DOMAIN=your-static-domain.ngrok-free.app"
  echo ""
  echo "  Option C — Install cloudflared:  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo ""
  echo "================================================================"
  exit 1
fi

WEBHOOK_URL="$PUBLIC_BASE_URL/twilio/voice"
echo "[voice-bridge] Twilio voice webhook URL → $WEBHOOK_URL"

# Auto-update Twilio webhook via CLI if credentials are available
if command -v twilio >/dev/null 2>&1 && [ -n "${TWILIO_ACCOUNT_SID:-}" ] && [ -n "${TWILIO_AUTH_TOKEN:-}" ]; then
  PHONE_SID=$(TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID" TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN" \
    twilio phone-numbers:list --properties="sid" 2>/dev/null | awk 'NR==2{print $1}')
  if [ -n "$PHONE_SID" ]; then
    TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID" TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN" \
      twilio phone-numbers:update "$PHONE_SID" --voice-url="$WEBHOOK_URL" --voice-fallback-url="" 2>/dev/null \
      && echo "[voice-bridge] Twilio webhook updated automatically" \
      || echo "[voice-bridge] Warning: could not auto-update Twilio webhook"
  fi
fi
echo ""

cd "$VB_DIR"
exec env PUBLIC_BASE_URL="$PUBLIC_BASE_URL" npm run dev
