#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# create-marketplace-tables.sh
#
# Creates all DynamoDB tables for the HandyCall Saudi marketplace.
# AWS region: me-central-1 (Riyadh) — required for Saudi PDPL data residency.
#
# Usage:
#   # Local dev (LocalStack / DynamoDB Local):
#   DYNAMODB_ENDPOINT=http://localhost:8000 DYNAMODB_TABLE_PREFIX=handycall_dev_ bash scripts/create-marketplace-tables.sh
#
#   # Production (AWS me-central-1):
#   AWS_REGION=me-central-1 DYNAMODB_TABLE_PREFIX=handycall_prod_ bash scripts/create-marketplace-tables.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

TABLE_PREFIX="${DYNAMODB_TABLE_PREFIX:-handycall_dev_}"
REGION="${AWS_REGION:-me-central-1}"
ENDPOINT_FLAG=""

if [ -n "${DYNAMODB_ENDPOINT:-}" ]; then
  ENDPOINT_FLAG="--endpoint-url ${DYNAMODB_ENDPOINT}"
fi

AWS="aws dynamodb $ENDPOINT_FLAG --region $REGION"

echo "Creating marketplace tables with prefix: $TABLE_PREFIX"
echo "Region: $REGION"
[ -n "$ENDPOINT_FLAG" ] && echo "Endpoint: $DYNAMODB_ENDPOINT"
echo ""

# ─── Helper ───────────────────────────────────────────────────────────────────

create_table() {
  local name="$1"
  shift
  echo "→ Creating ${TABLE_PREFIX}${name}..."
  $AWS create-table \
    --table-name "${TABLE_PREFIX}${name}" \
    "$@" \
    --billing-mode PAY_PER_REQUEST \
    2>&1 | grep -v "ResourceInUseException" || true
}

# ─── 1. customers ─────────────────────────────────────────────────────────────

create_table customers \
  --attribute-definitions \
    AttributeName=customer_id,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=national_id,AttributeType=S \
    AttributeName=iqama_number,AttributeType=S \
  --key-schema \
    AttributeName=customer_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "email-index",
        "KeySchema": [{"AttributeName":"email","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "national-id-index",
        "KeySchema": [{"AttributeName":"national_id","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"KEYS_ONLY"}
      },
      {
        "IndexName": "iqama-index",
        "KeySchema": [{"AttributeName":"iqama_number","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"KEYS_ONLY"}
      }
    ]'

# ─── 2. pros ──────────────────────────────────────────────────────────────────

create_table pros \
  --attribute-definitions \
    AttributeName=pro_id,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=created_at,AttributeType=N \
    AttributeName=iqama_number,AttributeType=S \
  --key-schema \
    AttributeName=pro_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "email-index",
        "KeySchema": [{"AttributeName":"email","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "status-index",
        "KeySchema": [
          {"AttributeName":"status","KeyType":"HASH"},
          {"AttributeName":"created_at","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "iqama-index",
        "KeySchema": [{"AttributeName":"iqama_number","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"KEYS_ONLY"}
      }
    ]'

# ─── 3. services ──────────────────────────────────────────────────────────────

create_table services \
  --attribute-definitions \
    AttributeName=pro_id,AttributeType=S \
    AttributeName=service_id,AttributeType=S \
    AttributeName=category,AttributeType=S \
    AttributeName=is_active_created,AttributeType=S \
  --key-schema \
    AttributeName=pro_id,KeyType=HASH \
    AttributeName=service_id,KeyType=RANGE \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "category-active-index",
        "KeySchema": [
          {"AttributeName":"category","KeyType":"HASH"},
          {"AttributeName":"is_active_created","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"}
      }
    ]'

# Note: is_active_created is a composite key stored as "1#<created_at>" when active,
#       "0#<created_at>" when inactive — enables efficient active-service browsing.

# ─── 4. bookings ──────────────────────────────────────────────────────────────

create_table bookings \
  --attribute-definitions \
    AttributeName=booking_id,AttributeType=S \
    AttributeName=customer_id,AttributeType=S \
    AttributeName=pro_id,AttributeType=S \
    AttributeName=scheduled_start,AttributeType=N \
    AttributeName=status,AttributeType=S \
    AttributeName=payment_status,AttributeType=S \
    AttributeName=created_at,AttributeType=N \
  --key-schema \
    AttributeName=booking_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "customer-bookings-index",
        "KeySchema": [
          {"AttributeName":"customer_id","KeyType":"HASH"},
          {"AttributeName":"scheduled_start","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "pro-bookings-index",
        "KeySchema": [
          {"AttributeName":"pro_id","KeyType":"HASH"},
          {"AttributeName":"scheduled_start","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "status-date-index",
        "KeySchema": [
          {"AttributeName":"status","KeyType":"HASH"},
          {"AttributeName":"scheduled_start","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "payment-status-index",
        "KeySchema": [
          {"AttributeName":"payment_status","KeyType":"HASH"},
          {"AttributeName":"created_at","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"}
      }
    ]'

# ─── 5. reviews ───────────────────────────────────────────────────────────────

create_table reviews \
  --attribute-definitions \
    AttributeName=review_id,AttributeType=S \
    AttributeName=pro_id,AttributeType=S \
    AttributeName=created_at,AttributeType=N \
    AttributeName=booking_id,AttributeType=S \
  --key-schema \
    AttributeName=review_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "pro-reviews-index",
        "KeySchema": [
          {"AttributeName":"pro_id","KeyType":"HASH"},
          {"AttributeName":"created_at","KeyType":"RANGE"}
        ],
        "Projection": {"ProjectionType":"ALL"}
      },
      {
        "IndexName": "booking-review-index",
        "KeySchema": [{"AttributeName":"booking_id","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"KEYS_ONLY"}
      }
    ]'

# ─── 6. pro_availability ──────────────────────────────────────────────────────
# Friday (FRI) is the Saudi weekend — not included in default availability.
# SAT–THU are working days.

create_table pro_availability \
  --attribute-definitions \
    AttributeName=pro_id,AttributeType=S \
    AttributeName=day_of_week,AttributeType=S \
  --key-schema \
    AttributeName=pro_id,KeyType=HASH \
    AttributeName=day_of_week,KeyType=RANGE

# ─── 7. email_verifications ───────────────────────────────────────────────────

create_table email_verifications \
  --attribute-definitions \
    AttributeName=token,AttributeType=S \
  --key-schema \
    AttributeName=token,KeyType=HASH

# Enable TTL (expires_at attribute — auto-deletes expired tokens after 24h)
echo "  Enabling TTL on email_verifications..."
$AWS update-time-to-live \
  --table-name "${TABLE_PREFIX}email_verifications" \
  --time-to-live-specification "Enabled=true,AttributeName=expires_at" 2>/dev/null || true

# ─── 8. password_resets ───────────────────────────────────────────────────────

create_table password_resets \
  --attribute-definitions \
    AttributeName=token,AttributeType=S \
  --key-schema \
    AttributeName=token,KeyType=HASH

echo "  Enabling TTL on password_resets..."
$AWS update-time-to-live \
  --table-name "${TABLE_PREFIX}password_resets" \
  --time-to-live-specification "Enabled=true,AttributeName=expires_at" 2>/dev/null || true

# ─── 9. platform_config ───────────────────────────────────────────────────────

create_table platform_config \
  --attribute-definitions \
    AttributeName=config_key,AttributeType=S \
  --key-schema \
    AttributeName=config_key,KeyType=HASH

# ─── Seed platform_config ─────────────────────────────────────────────────────

echo ""
echo "Seeding platform_config..."
NOW=$(date +%s000)
ADMIN_ID="system"

seed_config() {
  local key="$1"
  local value="$2"
  $AWS put-item \
    --table-name "${TABLE_PREFIX}platform_config" \
    --item "{
      \"config_key\": {\"S\": \"$key\"},
      \"config_value\": {\"S\": \"$value\"},
      \"updated_at\": {\"N\": \"$NOW\"},
      \"updated_by\": {\"S\": \"$ADMIN_ID\"}
    }" 2>/dev/null || true
}

seed_config "platform_fee_rate" "0.15"
seed_config "vat_rate" "0.15"

seed_config "supported_districts" '[
  "Al Olaya","Al Malaz","Al Murabbah","Al Rawdah","Al Sulaymaniyah",
  "Al Nakheel","Al Hamra","Al Sahafa","Al Shuhada","Al Wizarat",
  "Al Madinah","Al Aziziyah","Al Batha","Al Dirah","Al Faisaliyah",
  "Al Ghadir","Al Jazirah","Al Malqa","Al Mansourah","Al Murabba",
  "Al Naseem","Al Qirawan","Al Rabwah","Al Uraija","Al Yasmin",
  "Hittin","Ishbiliyah","King Fahd","Qurtubah","Salam"
]'

seed_config "supported_categories" '[
  "AC_HVAC","PLUMBING","ELECTRICAL","PAINTING","CLEANING",
  "PEST_CONTROL","CARPENTRY","MOVING","APPLIANCE_REPAIR",
  "SATELLITE_DISH","LANDSCAPING","GENERAL_HANDYMAN"
]'

echo ""
echo "✓ All marketplace tables created and seeded."
echo ""
echo "Tables created:"
for t in customers pros services bookings reviews pro_availability email_verifications password_resets platform_config; do
  echo "  ${TABLE_PREFIX}${t}"
done
