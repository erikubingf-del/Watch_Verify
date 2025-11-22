#!/bin/bash

# Load environment variables
set -a
source .env.local
set +a

TENANT_ID="recduwNrt9qNPH07h"
BASE_URL="https://api.airtable.com/v0/${AIRTABLE_BASE_ID}"

echo "🔍 Checking Settings table..."

# First, check if Settings table has records
SETTINGS_RESPONSE=$(curl -s "$BASE_URL/Settings?filterByFormula=RECORD_ID()='${TENANT_ID}'" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}")

echo "$SETTINGS_RESPONSE" | jq '.'

# Check if record exists
RECORD_COUNT=$(echo "$SETTINGS_RESPONSE" | jq '.records | length')

if [ "$RECORD_COUNT" -eq "0" ]; then
  echo ""
  echo "⚠️  No Settings record found for tenant ${TENANT_ID}"
  echo ""
  echo "Creating Settings record with verification enabled..."

  # Create new Settings record
  curl -X POST "$BASE_URL/Settings" \
    -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
    -H "Content-Type: application/json" \
    --data '{
      "records": [{
        "fields": {
          "tenant_id": ["'$TENANT_ID'"],
          "verification_enabled": true,
          "offers_purchase": true
        }
      }]
    }' | jq '.'

  echo ""
  echo "✅ Settings record created with verification enabled!"
else
  echo ""
  echo "✅ Settings record exists"
  echo ""
  echo "Updating to enable verification..."

  # Get the record ID
  SETTINGS_RECORD_ID=$(echo "$SETTINGS_RESPONSE" | jq -r '.records[0].id')

  # Update the record
  curl -X PATCH "$BASE_URL/Settings" \
    -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
    -H "Content-Type: application/json" \
    --data '{
      "records": [{
        "id": "'$SETTINGS_RECORD_ID'",
        "fields": {
          "verification_enabled": true,
          "offers_purchase": true
        }
      }]
    }' | jq '.'

  echo ""
  echo "✅ Verification enabled!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Watch Verification Service is now ACTIVE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test it by sending WhatsApp message:"
echo "   To: +1 762-372-7247"
echo "   Message: Quero vender meu Rolex"
echo ""
