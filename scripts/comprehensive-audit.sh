#!/bin/bash

set -a
source .env.local
set +a

BASE_URL="https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 COMPREHENSIVE AIRTABLE SCHEMA AUDIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Fetching schema from Airtable..."
echo ""

# Fetch schema
SCHEMA=$(curl -s "$BASE_URL" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}")

# Save to file
echo "$SCHEMA" > airtable-schema-full.json

# Extract table names
echo "$SCHEMA" | jq -r '.tables[] | .name' > airtable-tables.txt

echo "✅ Found tables:"
cat airtable-tables.txt | while read table; do
  echo "   - $table"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DETAILED FIELD ANALYSIS PER TABLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# For each table, show fields
cat airtable-tables.txt | while read table; do
  echo "📁 $table"
  echo "$SCHEMA" | jq -r ".tables[] | select(.name==\"$table\") | .fields[] | \"   - \\(.name) (\\(.type))\""
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Full schema saved to: airtable-schema-full.json"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
