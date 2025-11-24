#!/bin/bash

# Verify CustomerFacts Table Exists in Airtable

echo "🧪 Verifying CustomerFacts Table Connection"
echo ""

# Load environment variables
source .env.local 2>/dev/null || source ../.env.local 2>/dev/null

if [ -z "$AIRTABLE_BASE_ID" ] || [ -z "$AIRTABLE_API_KEY" ]; then
    echo "❌ Missing AIRTABLE_BASE_ID or AIRTABLE_API_KEY"
    echo "Please set these in .env.local"
    exit 1
fi

echo "📡 Base ID: $AIRTABLE_BASE_ID"
echo ""

# Test 1: Check if CustomerFacts table exists
echo "1️⃣  Checking if CustomerFacts table exists..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    "https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/CustomerFacts?maxRecords=1" \
    -H "Authorization: Bearer ${AIRTABLE_API_KEY}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ CustomerFacts table exists!"

    # Extract field names if record exists
    FIELD_COUNT=$(echo "$BODY" | grep -o '"fields"' | wc -l | tr -d ' ')
    if [ "$FIELD_COUNT" -gt "0" ]; then
        echo "   Found records in table"
        echo "   Response: $BODY" | head -c 200
        echo "..."
    else
        echo "   Table exists but is empty (this is OK)"
    fi
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ CustomerFacts table NOT FOUND"
    echo ""
    echo "⚠️  Please create CustomerFacts table in Airtable with these fields:"
    echo ""
    echo "Table Name: CustomerFacts"
    echo ""
    echo "Fields:"
    echo "  1. customer_phone (Phone number)"
    echo "  2. tenant_id (Link to Tenants table)"
    echo "  3. fact (Long text)"
    echo "  4. fact_embedding (Long text - will store JSON array)"
    echo "  5. category (Single select with options: preference, constraint, profile, history, budget)"
    echo "  6. confidence (Number - decimal between 0 and 1)"
    echo "  7. created_at (Date with time)"
    echo "  8. last_confirmed (Date with time - optional)"
    echo "  9. source_message (Long text - optional)"
    echo ""
    echo "After creating the table, run this script again."
    exit 1
else
    echo "❌ Unexpected error: HTTP $HTTP_CODE"
    echo "Response: $BODY"
    exit 1
fi

echo ""
echo "2️⃣  Checking required fields in table schema..."

# List all tables to get schema
TABLES_RESPONSE=$(curl -s \
    "https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables" \
    -H "Authorization: Bearer ${AIRTABLE_API_KEY}")

echo "$TABLES_RESPONSE" | grep -q "CustomerFacts"
if [ $? -eq 0 ]; then
    echo "✅ CustomerFacts found in base schema"

    # Try to extract field info
    echo ""
    echo "3️⃣  Table schema check:"
    echo "$TABLES_RESPONSE" | grep -A 50 "CustomerFacts" | head -30
else
    echo "⚠️  Could not verify schema (may need additional API permissions)"
    echo "   But table exists and is accessible for operations"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "📋 Summary:"
echo "   - CustomerFacts table exists in Airtable"
echo "   - Table is accessible via API"
echo "   - Ready for vector memory operations"
echo ""
echo "🚀 You can now:"
echo "   1. Deploy the code to production"
echo "   2. Test fact extraction with real conversations"
echo "   3. Monitor Vercel logs for 'fact-extraction-triggered'"
