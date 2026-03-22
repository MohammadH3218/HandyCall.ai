#!/usr/bin/env bash
set -euo pipefail

API_BASE="${OPENAI_API_BASE:-https://api.openai.com/v1}"
DEFAULT_MODEL="${OPENAI_FINE_TUNE_MODEL:-gpt-4.1-mini-2025-04-14}"

require_api_key() {
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "OPENAI_API_KEY is required." >&2
    exit 1
  fi
}

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/openai/fine_tune.sh upload <jsonl_file>
  bash scripts/openai/fine_tune.sh create --training-file <file-id> [--validation-file <file-id>] [--model <model>] [--suffix <name>]
  bash scripts/openai/fine_tune.sh status <job-id>
  bash scripts/openai/fine_tune.sh events <job-id>
  bash scripts/openai/fine_tune.sh cancel <job-id>
  bash scripts/openai/fine_tune.sh list

Environment:
  OPENAI_API_KEY            Required
  OPENAI_API_BASE           Optional, defaults to https://api.openai.com/v1
  OPENAI_FINE_TUNE_MODEL    Optional default model, defaults to gpt-4.1-mini-2025-04-14
EOF
}

api_json() {
  local method="$1"
  local path="$2"
  local payload="${3:-}"

  require_api_key

  if [[ -n "$payload" ]]; then
    curl -sS -X "$method" "$API_BASE$path" \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$payload"
    return
  fi

  curl -sS -X "$method" "$API_BASE$path" \
    -H "Authorization: Bearer $OPENAI_API_KEY"
}

command="${1:-}"
if [[ -z "$command" ]]; then
  print_usage
  exit 1
fi
shift || true

case "$command" in
  upload)
    file_path="${1:-}"
    if [[ -z "$file_path" ]]; then
      print_usage
      exit 1
    fi
    require_api_key
    curl -sS "$API_BASE/files" \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -F "purpose=fine-tune" \
      -F "file=@$file_path"
    ;;

  create)
    training_file=""
    validation_file=""
    model="$DEFAULT_MODEL"
    suffix=""

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --training-file)
          training_file="${2:-}"
          shift 2
          ;;
        --validation-file)
          validation_file="${2:-}"
          shift 2
          ;;
        --model)
          model="${2:-}"
          shift 2
          ;;
        --suffix)
          suffix="${2:-}"
          shift 2
          ;;
        *)
          echo "Unknown argument: $1" >&2
          exit 1
          ;;
      esac
    done

    if [[ -z "$training_file" ]]; then
      echo "--training-file is required." >&2
      exit 1
    fi

    payload="{\"model\":\"$model\",\"training_file\":\"$training_file\",\"method\":{\"type\":\"supervised\"}"
    if [[ -n "$validation_file" ]]; then
      payload+=",\"validation_file\":\"$validation_file\""
    fi
    if [[ -n "$suffix" ]]; then
      payload+=",\"suffix\":\"$suffix\""
    fi
    payload+="}"
    api_json POST "/fine_tuning/jobs" "$payload"
    ;;

  status)
    job_id="${1:-}"
    if [[ -z "$job_id" ]]; then
      print_usage
      exit 1
    fi
    api_json GET "/fine_tuning/jobs/$job_id"
    ;;

  events)
    job_id="${1:-}"
    if [[ -z "$job_id" ]]; then
      print_usage
      exit 1
    fi
    api_json GET "/fine_tuning/jobs/$job_id/events"
    ;;

  cancel)
    job_id="${1:-}"
    if [[ -z "$job_id" ]]; then
      print_usage
      exit 1
    fi
    api_json POST "/fine_tuning/jobs/$job_id/cancel"
    ;;

  list)
    api_json GET "/fine_tuning/jobs"
    ;;

  help|--help|-h)
    print_usage
    ;;

  *)
    echo "Unknown command: $command" >&2
    print_usage
    exit 1
    ;;
esac
