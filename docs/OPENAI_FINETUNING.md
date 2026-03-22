# OpenAI Fine-Tuning For HandyCall

This repo already stores call transcripts and recordings. The practical path is:

1. Keep `gpt-realtime` or `gpt-realtime-mini` for live voice calls
2. Export labeled transcript data from saved calls
3. Fine-tune a supported text model for downstream tasks like call outcome extraction
4. Use that fine-tuned model after the call or inside backend tools

Important: this does not fine-tune the live Realtime voice model itself. It fine-tunes a separate supported model around the call workflow.

## Current supported base model

Start with `gpt-4.1-mini-2025-04-14` unless you have a strong reason to use a different supported model.

## 1. Export training data

From the repo root:

```bash
export AWS_REGION=us-east-1
export DYNAMODB_TABLE_PREFIX=handycall_dev_
export STORAGE_PROVIDER=local
export LOCAL_STORAGE_DIR=.local/storage

npm run finetune:export -- \
  --company-id YOUR_COMPANY_ID \
  --limit 200 \
  --validation-split 0.15
```

Default outputs:

- `tmp/finetune/YOUR_COMPANY_ID.call-outcome.train.jsonl`
- `tmp/finetune/YOUR_COMPANY_ID.call-outcome.valid.jsonl`
- `tmp/finetune/YOUR_COMPANY_ID.call-outcome.train.jsonl.manifest.json`

If you are exporting from AWS-backed storage instead of local files:

```bash
export AWS_REGION=us-east-1
export DYNAMODB_TABLE_PREFIX=handycall_prod_
unset STORAGE_PROVIDER
export S3_BUCKET_TRANSCRIPTS=handycall-transcripts-prod

npm run finetune:export -- \
  --company-id YOUR_COMPANY_ID \
  --limit 500
```

## 2. Inspect the dataset

Make sure the labels are actually good before training:

```bash
sed -n '1,3p' tmp/finetune/YOUR_COMPANY_ID.call-outcome.train.jsonl
cat tmp/finetune/YOUR_COMPANY_ID.call-outcome.train.jsonl.manifest.json
wc -l tmp/finetune/YOUR_COMPANY_ID.call-outcome.train.jsonl
```

OpenAI recommends at least 10 examples, and suggests starting with about 50 good examples before scaling up.

## 3. Upload files

```bash
export OPENAI_API_KEY=sk-...

bash scripts/openai/fine_tune.sh upload tmp/finetune/YOUR_COMPANY_ID.call-outcome.train.jsonl
bash scripts/openai/fine_tune.sh upload tmp/finetune/YOUR_COMPANY_ID.call-outcome.valid.jsonl
```

If you have `jq`, capture the file ids:

```bash
TRAIN_FILE_ID=$(bash scripts/openai/fine_tune.sh upload tmp/finetune/YOUR_COMPANY_ID.call-outcome.train.jsonl | jq -r '.id')
VALID_FILE_ID=$(bash scripts/openai/fine_tune.sh upload tmp/finetune/YOUR_COMPANY_ID.call-outcome.valid.jsonl | jq -r '.id')
```

## 4. Create the fine-tuning job

```bash
bash scripts/openai/fine_tune.sh create \
  --training-file "$TRAIN_FILE_ID" \
  --validation-file "$VALID_FILE_ID" \
  --model gpt-4.1-mini-2025-04-14 \
  --suffix handycall-call-outcome
```

## 5. Track job progress

```bash
bash scripts/openai/fine_tune.sh list
bash scripts/openai/fine_tune.sh status ftjob_...
bash scripts/openai/fine_tune.sh events ftjob_...
```

When the job succeeds, the response includes a fine-tuned model id. Use that model id in your backend calls for the task you trained.

## 6. Where to use the fine-tuned model

Good first use cases:

- post-call structured extraction
- lead qualification
- call outcome classification
- follow-up drafting
- CRM note generation

Not the right first use case:

- replacing the live realtime speech model directly

## Notes

- The exporter redacts phone numbers, emails, and URLs by default.
- The current exporter builds a `call-outcome` dataset from transcripts plus existing call labels.
- If your summaries or outcomes are noisy, clean the labels before training more data.
- Keep evals separate from training. A bigger noisy dataset is usually worse than a smaller clean one.

## OpenAI docs used for this setup

- Supervised fine-tuning: https://platform.openai.com/docs/guides/supervised-fine-tuning
- Model optimization and supported SFT models: https://platform.openai.com/docs/guides/model-optimization
- Realtime prompting: https://developers.openai.com/api/docs/guides/realtime-models-prompting
