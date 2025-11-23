#!/bin/bash

# Watch Verify - Conversation Quality Analysis Script
# Fetches messages from Airtable and analyzes conversation quality

AIRTABLE_BASE_ID="appig3KRYD5neBJqV"
AIRTABLE_API_KEY="patX7MHBsdYeVd3zi.41425ee08ed6caa07b4b81ab1960f7b6375073dca879f631524049e5fd553678"
TABLE_NAME="Messages"

echo "🔍 Watch Verify - Conversation Quality Analysis"
echo "================================================================"

# Fetch messages from Airtable
echo ""
echo "Fetching messages from Airtable..."

# URL encode the filter formula
FILTER="deleted_at=BLANK()"
URL="https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}?filterByFormula=${FILTER}&maxRecords=100&sort%5B0%5D%5Bfield%5D=created_at&sort%5B0%5D%5Bdirection%5D=desc"

# Fetch data
RESPONSE=$(curl -s -H "Authorization: Bearer ${AIRTABLE_API_KEY}" "${URL}")

# Save to temp file for analysis
echo "$RESPONSE" > /tmp/messages.json

# Count total records
TOTAL_MESSAGES=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
echo "Fetched ${TOTAL_MESSAGES} messages"

# Extract and save to a readable format
echo ""
echo "Parsing messages..."
echo "$RESPONSE" | jq -r '.records[] | "\(.id)|\(.fields.phone // "unknown")|\(.fields.direction // "unknown")|\(.fields.created_at // "unknown")|\(.fields.body // "[empty]")"' > /tmp/messages.txt

echo ""
echo "Messages saved to /tmp/messages.txt"
echo "Raw JSON saved to /tmp/messages.json"
echo ""
echo "================================================================"
echo "📊 BASIC STATISTICS"
echo "================================================================"

# Basic stats
OUTBOUND=$(grep -c '|outbound|' /tmp/messages.txt || echo "0")
INBOUND=$(grep -c '|inbound|' /tmp/messages.txt || echo "0")

echo "Total Messages: ${TOTAL_MESSAGES}"
echo "Outbound (AI): ${OUTBOUND}"
echo "Inbound (Customer): ${INBOUND}"

# Group by phone
echo ""
echo "Unique phone numbers:"
cut -d'|' -f2 /tmp/messages.txt | sort | uniq -c | sort -rn

echo ""
echo "================================================================"
echo "🔍 QUALITY ANALYSIS"
echo "================================================================"

# Check for repetitive greetings
echo ""
echo "1. Checking for repetitive greetings..."
GREETING_COUNT=$(grep -i 'olá.*somos\|olá.*sou' /tmp/messages.txt | wc -l | tr -d ' ')
if [ "$GREETING_COUNT" -gt 5 ]; then
  echo "   🔴 WARNING: Found ${GREETING_COUNT} greeting messages (potential repetition issue)"
  echo "   Sample greetings:"
  grep -i 'olá.*somos\|olá.*sou' /tmp/messages.txt | head -5 | cut -d'|' -f5
else
  echo "   ✅ OK: ${GREETING_COUNT} greeting messages (normal range)"
fi

# Check for empty messages
echo ""
echo "2. Checking for empty messages..."
EMPTY_COUNT=$(grep -c '\[empty\]' /tmp/messages.txt || echo "0")
if [ "$EMPTY_COUNT" -gt 0 ]; then
  echo "   🟡 WARNING: Found ${EMPTY_COUNT} empty messages"
else
  echo "   ✅ OK: No empty messages"
fi

# Check message length distribution
echo ""
echo "3. Checking message length distribution..."
echo "   Long messages (>500 chars):"
awk -F'|' 'length($5) > 500 {print "     - Phone: " $2 " (" length($5) " chars)"}' /tmp/messages.txt | head -5

# Analyze by phone number
echo ""
echo "================================================================"
echo "📱 PER-CONVERSATION ANALYSIS"
echo "================================================================"

# Get unique phones
PHONES=$(cut -d'|' -f2 /tmp/messages.txt | sort | uniq)

for PHONE in $PHONES; do
  if [ "$PHONE" = "unknown" ]; then
    continue
  fi

  echo ""
  echo "Phone: ${PHONE}"
  echo "----------------------------------------"

  # Get messages for this phone
  grep "^[^|]*|${PHONE}|" /tmp/messages.txt > /tmp/phone_msgs.txt

  TOTAL=$(wc -l < /tmp/phone_msgs.txt | tr -d ' ')
  OUT=$(grep -c '|outbound|' /tmp/phone_msgs.txt || echo "0")
  IN=$(grep -c '|inbound|' /tmp/phone_msgs.txt || echo "0")

  echo "  Total messages: ${TOTAL} (${OUT} AI, ${IN} customer)"

  # Check for issues
  GREETINGS=$(grep -ic 'olá.*somos\|olá.*sou' /tmp/phone_msgs.txt || echo "0")
  if [ "$GREETINGS" -gt 1 ]; then
    echo "  🔴 ISSUE: ${GREETINGS} greetings in same conversation (context loss)"
  fi

  # Check engagement ratio
  if [ "$IN" -gt 0 ]; then
    RATIO=$(echo "scale=1; $OUT / $IN" | bc)
    if (( $(echo "$RATIO > 3" | bc -l) )); then
      echo "  🟡 ISSUE: Low engagement ratio (AI:Customer = ${RATIO}:1)"
    fi
  fi

  # Show first and last messages
  echo "  First message:"
  head -1 /tmp/phone_msgs.txt | cut -d'|' -f4-5 | sed 's/|/ - /' | head -c 100
  echo "..."

  if [ "$TOTAL" -gt 1 ]; then
    echo "  Last message:"
    tail -1 /tmp/phone_msgs.txt | cut -d'|' -f4-5 | sed 's/|/ - /' | head -c 100
    echo "..."
  fi
done

echo ""
echo "================================================================"
echo "💡 RECOMMENDATIONS"
echo "================================================================"

# Generate recommendations based on findings
if [ "$GREETING_COUNT" -gt 5 ]; then
  echo ""
  echo "🔴 CRITICAL: Fix greeting repetition"
  echo "   Location: /app/api/webhooks/twilio/route.ts"
  echo "   Issue: AI is sending greetings multiple times per conversation"
  echo "   Fix: Check conversation history before greeting"
  echo "        - Load recent messages for phone number"
  echo "        - Skip greeting if last outbound message was recent (<24h)"
  echo "        - Use customer name if already known"
fi

if [ "$EMPTY_COUNT" -gt 0 ]; then
  echo ""
  echo "🟡 MEDIUM: Empty messages being stored"
  echo "   Location: Message creation logic in webhook handler"
  echo "   Issue: Messages with no body are being saved to Airtable"
  echo "   Fix: Add validation before atCreate()"
  echo "        - if (!body || body.trim() === '') return"
  echo "        - Handle media messages separately"
fi

# Check if we have conversation restarts
RESTART_ISSUES=$(grep -i 'olá.*somos' /tmp/messages.txt | wc -l | tr -d ' ')
if [ "$RESTART_ISSUES" -gt 10 ]; then
  echo ""
  echo "🔴 CRITICAL: Conversation restart loops detected"
  echo "   Location: Session management in webhook handler"
  echo "   Issue: Each message is treated as new conversation"
  echo "   Fix: Implement session persistence"
  echo "        - Use BookingSessions/VerificationSessions tables"
  echo "        - Track conversation state (in_booking, in_verification, idle)"
  echo "        - Load context from previous messages"
fi

echo ""
echo "================================================================"
echo "📝 NEXT STEPS"
echo "================================================================"
echo ""
echo "1. Review sample conversations in /tmp/messages.txt"
echo "2. Check webhook handler: /app/api/webhooks/twilio/route.ts"
echo "3. Verify conversation history is being loaded"
echo "4. Add greeting detection logic"
echo "5. Test with real WhatsApp messages"
echo ""
echo "Full data available at:"
echo "  - /tmp/messages.json (raw Airtable response)"
echo "  - /tmp/messages.txt (parsed messages)"
echo ""
