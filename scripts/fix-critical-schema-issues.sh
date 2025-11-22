#!/bin/bash

set -a
source .env.local
set +a

TENANT_ID="recduwNrt9qNPH07h"
BASE_URL="https://api.airtable.com/v0/${AIRTABLE_BASE_ID}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 FIXING CRITICAL AIRTABLE SCHEMA ISSUES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  WARNING: This script will add missing fields to your Airtable tables."
echo "    Make sure you have a backup of your base before proceeding!"
echo ""
echo "📋 Issues to fix:"
echo "   1. Customers: Add interests_all, last_interaction fields"
echo "   2. Catalog: Ensure embedding, brand, tags, delivery_options fields exist"
echo "   3. Store Numbers: Verify field names match code expectations"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 AUDIT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Note: The Airtable Metadata API (for adding fields) requires a different approach
# We can't add fields via the standard API - we need to use the Schema API
# or do it manually in the Airtable UI

echo "⚠️  IMPORTANT: Field creation must be done via Airtable UI"
echo ""
echo "The Airtable REST API does not support adding fields."
echo "You must add the following fields manually:"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CUSTOMERS TABLE - REQUIRED FIELDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. interests_all"
echo "   Type: Long text"
echo "   Description: Complete historical interests (all products ever)"
echo ""
echo "2. last_interaction"
echo "   Type: Date & time"
echo "   Description: Timestamp of most recent message"
echo ""
echo "3. city"
echo "   Type: Single line text"
echo "   Description: Customer city for salesperson feedback"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CATALOG TABLE - VERIFY THESE EXIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ embedding (Long text) - for semantic search"
echo "✓ brand (Single line text) - product brand"
echo "✓ tags (Multiple select) - product tags"
echo "✓ delivery_options (Single select) - store_only, delivery_only, both"
echo "✓ active (Checkbox) - whether product is available"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STORE NUMBERS TABLE - CHECK FIELD NAMES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Required field names (case-sensitive):"
echo "  - Phone Number (NOT 'phone')"
echo "  - Tenant (NOT 'tenant_id')"
echo ""
echo "If your fields are named differently, rename them to match."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 APPOINTMENTS TABLE - VERIFY FIELD NAMES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Required field names:"
echo "  - appointment_date (NOT 'date')"
echo "  - appointment_time (NOT 'time')"
echo "  - salesperson_id (Link to Salespeople, NOT text)"
echo "  - scheduled_at (Date & time, computed or formula)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 TESTING AFTER FIXES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After adding fields, test:"
echo "  1. Send WhatsApp: 'Quero um Rolex' → Check Customers.interests_all"
echo "  2. Book appointment → Verify salesperson_id is linked"
echo "  3. Check Vercel logs for field errors"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 DETAILED REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Full analysis: AIRTABLE_SCHEMA_ISSUES.md"
echo ""
