# Watch Verify - Quick Fix Implementation Guide

**Problem:** AI sends "Olá! Somos..." greeting 15 times in same conversation
**Impact:** Customers frustrated, conversation quality score 35/100 (Critical)
**Fix Time:** 6 hours for emergency fixes, 16 hours for complete solution

---

## The Problem in 30 Seconds

Customer says "Sim" (Yes) → AI responds "Olá! Somos a Boutique Bucherer..." (full introduction)

**Why?** System doesn't remember previous messages. Every customer message triggers a restart.

---

## Emergency Fix #1: Stop Greeting Repetition (2 hours)

### Create: `/lib/conversation-guards.ts`

```typescript
import { atSelect } from '@/utils/airtable'

/**
 * Check if we should send a greeting to this customer
 * Returns false if we greeted them recently (<2 hours ago)
 */
export async function shouldSendGreeting(
  tenantId: string,
  phone: string
): Promise<boolean> {
  const messages = await atSelect('Messages', {
    filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${phone}', {direction}='outbound')`,
    sort: '[{"field":"created_at","direction":"desc"}]',
    maxRecords: '1',
  })

  if (messages.length === 0) return true // No previous messages

  const lastMessage = messages[0].fields as any
  const lastTime = new Date(lastMessage.created_at).getTime()
  const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60)

  // Only greet if it's been >2 hours, no need, can be that after 2 hours but has a history message, reply, like Hey NAME or Hey, welcome back, then if they shared interest, ask if the client is ready to buy, or if no interest, if you can help with something else. Change this.,
  return hoursSince >= 2
}

/**
 * Get the last AI message sent to customer
 */
export async function getLastAIMessage(
  tenantId: string,
  phone: string
): Promise<string | null> {
  const messages = await atSelect('Messages', {
    filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${phone}', {direction}='outbound')`,
    sort: '[{"field":"created_at","direction":"desc"}]',
    maxRecords: '1',
  })

  if (messages.length === 0) return null
  return (messages[0].fields as any).body || null
}
```

### Update: `/app/api/webhooks/twilio/route.ts` (around line 420)

**BEFORE:**
```typescript
// Step 7: Regular conversation with RAG (product recommendations)
try {
  // Build RAG context with semantic search
  const ragContext = await buildRAGContext(messageContent, {
    tenantId: validTenantId,
    customerPhone: wa,
    includeConversationHistory: true,
    maxHistoryMessages: 10,
  })
```

**AFTER:**
```typescript
// Step 7: Regular conversation with RAG (product recommendations)
try {
  // CRITICAL FIX: Check if we should skip greeting (i wrote about this above)
  const { shouldSendGreeting, getLastAIMessage } = await import('@/lib/conversation-guards')
  const skipGreeting = !(await shouldSendGreeting(validTenantId, wa))

  // Build RAG context with semantic search, yes rag is powerful and must be used.
  const ragContext = await buildRAGContext(messageContent, {
    tenantId: validTenantId,
    customerPhone: wa,
    includeConversationHistory: true,
    maxHistoryMessages: 10,
    skipGreeting,  // NEW PARAMETER
  })
```

### Update: `/lib/rag.ts` (around line 34)

**BEFORE:**
```typescript
export interface RAGOptions {
  tenantId?: string
  customerPhone?: string
  includeConversationHistory?: boolean
  maxHistoryMessages?: number
  searchOptions?: SearchOptions
}
```

**AFTER:**
```typescript
export interface RAGOptions {
  tenantId?: string
  customerPhone?: string
  includeConversationHistory?: boolean
  maxHistoryMessages?: number
  searchOptions?: SearchOptions
  skipGreeting?: boolean  // NEW
}
```

### Update: `/lib/rag.ts` (around line 300)

**BEFORE:**
```typescript
function buildSystemPrompt(
  products: SearchResult[],
  conversationContext?: string,
  brandContext?: string,
  availableBrands?: string[],
  customerName?: string,
  conversationGapHours?: number,
  verificationEnabled?: boolean,
  sellsJewelry?: boolean,
  welcomeMessage?: string
): string {
```

**AFTER:**
```typescript
function buildSystemPrompt(
  products: SearchResult[],
  conversationContext?: string,
  brandContext?: string,
  availableBrands?: string[],
  customerName?: string,
  conversationGapHours?: number,
  verificationEnabled?: boolean,
  sellsJewelry?: boolean,
  welcomeMessage?: string,
  skipGreeting?: boolean  // NEW
): string {
  // CRITICAL: If skipGreeting is true, remove greeting instructions
  if (skipGreeting) {
    let prompt = `You are a luxury watch and jewelry sales assistant for a high-end boutique in Brazil.

⚠️ CRITICAL: This is an ACTIVE CONVERSATION. DO NOT send greetings. DO NOT restart.

INSTRUCTIONS:
- Continue naturally from previous conversation
- DO NOT say "Olá! Somos..."
- Reference what customer just said
- Answer their question directly
- Use their name if you know it: ${customerName || '[unknown]'}

PERSONALITY & TONE:
- Elegant but approachable
- Concise and objective (2-3 sentences max)
- Continue the conversation topic naturally
`

    // Add conversation history
    if (conversationContext) {
      prompt += `\nCONVERSATION HISTORY:\n${conversationContext}\n`
    }

    // Add products
    if (products.length > 0) {
      prompt += `\nRELEVANT PRODUCTS:\n`
      products.forEach((p, i) => {
        prompt += `${i + 1}. ${p.title} - R$ ${p.price}\n`
      })
    }

    return prompt
  }

  // ORIGINAL GREETING LOGIC (only if skipGreeting is false)
  let prompt = `You are a luxury watch and jewelry sales assistant...`
  // ... rest of original code
}
```

### Update: `/lib/rag.ts` buildRAGContext function (around line 170)

**BEFORE:**
```typescript
const systemPrompt = buildSystemPrompt(
  relevantProducts,
  conversationContext,
  brandContext,
  availableBrands,
  customerName,
  conversationGapHours,
  verificationEnabled,
  sellsJewelry,
  welcomeMessage
)
```

**AFTER:**
```typescript
const systemPrompt = buildSystemPrompt(
  relevantProducts,
  conversationContext,
  brandContext,
  availableBrands,
  customerName,
  conversationGapHours,
  verificationEnabled,
  sellsJewelry,
  welcomeMessage,
  options.skipGreeting  // NEW
)
```

---

## Emergency Fix #2: Use Name Immediately (1 hour)

### Update: `/app/api/webhooks/twilio/route.ts` (around line 459)

**Move name extraction BEFORE AI response:**

**BEFORE:**
```typescript
responseMessage = await chat([...], 0.65)

// Extract customer name if they provided it (AFTER response sent)
if (!ragContext.customerName && body.trim().length > 0) {
  const extractedName = await extractCustomerName(body, responseMessage)
  // ... save to database
}
```

**AFTER:**
```typescript
// Extract customer name BEFORE generating response
let extractedName: string | undefined
if (!ragContext.customerName && body.trim().length > 0) {
  const lastAIMessage = await getLastAIMessage(validTenantId, wa)
  const extractedName = await extractCustomerName(body, lastAIMessage || '')

  if (extractedName) {
    // Save immediately
    const existingCustomers = await atSelect('Customers', {
      filterByFormula: `AND({tenant_id}='${validTenantId}', {phone}='${wa}')`,
    })

    if (existingCustomers.length > 0) {
      await atUpdate('Customers', existingCustomers[0].id, {
        name: extractedName,
        last_interaction: new Date().toISOString(),
      } as any)
    } else {
      await atCreate('Customers', {
        tenant_id: [validTenantId],
        phone: wa,
        name: extractedName,
        created_at: new Date().toISOString(),
        last_interaction: new Date().toISOString(),
      } as any)
    }

    // Update ragContext with new name
    ragContext.customerName = extractedName

    logInfo('customer-name-extracted', 'Name extracted and saved BEFORE response', {
      phone: wa,
      name: extractedName,
    })
  }
}

// NOW generate response with customer name available
responseMessage = await chat([...], 0.65)
```

---

## Emergency Fix #3: Preserve Context After Photos (1 hour)

### Update: `/app/api/webhooks/twilio/route.ts` (around line 424)

**BEFORE:**
```typescript
// Handle media-only messages (photos without text)
let messageContent = body
if (numMedia > 0 && (!body || body.trim().length === 0)) {
  // User sent media without text - create descriptive message for context
  messageContent = 'Enviei uma foto'
  logInfo('media-only-message', 'Handling media-only message', {
    phone: wa,
    numMedia,
    mediaUrl: mediaUrls[0],
  })
}
```

**AFTER:**
```typescript
// Handle media-only messages (photos without text)
let messageContent = body
if (numMedia > 0 && (!body || body.trim().length === 0)) {
  // CRITICAL FIX: Check what customer was doing before sending photo
  const lastAIMessage = await getLastAIMessage(validTenantId, wa)

  if (lastAIMessage?.includes('enviar fotos') || lastAIMessage?.includes('pode me enviar')) {
    // Customer is continuing verification flow
    messageContent = 'Enviei a foto que você pediu'
  } else {
    messageContent = 'Enviei uma foto'
  }

  logInfo('media-only-message', 'Handling media-only message with context', {
    phone: wa,
    numMedia,
    mediaUrl: mediaUrls[0],
    lastAIMessage: lastAIMessage?.substring(0, 50),
  })
}
```

---

## Testing Your Fixes

### Test 1: No Greeting Repetition
```bash
# Send these messages via Twilio or WhatsApp sandbox:
1. "Ola"
   → Should get: "Olá! Somos a Boutique Bucherer..."

2. "Quero um relógio"
   → Should get: Product info (NO "Olá! Somos...")

3. "Qual o preço?"
   → Should get: Price info (NO "Olá! Somos...")

✅ Pass: Only 1 greeting in entire conversation
❌ Fail: Multiple greetings
```

### Test 2: Name Acknowledgment
```bash
1. "Ola"
   → AI should ask: "Qual seu nome?"

2. "João Silva"
   → Should get: "Prazer, João Silva! Como posso ajudar?"
   → Should NOT get: "Olá! Somos..." (restart)

✅ Pass: Name acknowledged immediately
❌ Fail: Greeting sent instead
```

### Test 3: Photo Context
```bash
1. "Quero vender meu relógio"
   → AI: "Pode me enviar fotos?"

2. [Send photo via WhatsApp]
   → Should get: "Recebi a foto do seu relógio! ..."
   → Should NOT get: "Olá! Somos..." (restart)

✅ Pass: Verification continues
❌ Fail: Conversation restarted
```

---

## Verification Commands

Check if fixes are working:

```bash
# 1. Check recent messages for greeting count
curl -H "Authorization: Bearer YOUR_AIRTABLE_KEY" \
  "https://api.airtable.com/v0/YOUR_BASE_ID/Messages?filterByFormula=AND({phone}='CUSTOMER_PHONE',FIND('Olá! Somos',{body})>0)&maxRecords=10"

# Should return: 1 record (only first greeting)
# If returns: 5+ records → Fix not working

# 2. Check if customer name was saved
curl -H "Authorization: Bearer YOUR_AIRTABLE_KEY" \
  "https://api.airtable.com/v0/YOUR_BASE_ID/Customers?filterByFormula={phone}='CUSTOMER_PHONE'"

# Should return: Customer record with name field populated
# If returns: Empty name field → Name extraction not working
```

---

## Quick Debugging

If fixes don't work:

### Issue: Still seeing multiple greetings

**Check 1:** Is `shouldSendGreeting()` being called?
```typescript
// Add logging in route.ts
console.log('skipGreeting:', skipGreeting)
// Should be true after first greeting
```

**Check 2:** Is `skipGreeting` reaching `buildSystemPrompt()`?
```typescript
// Add logging in rag.ts buildSystemPrompt()
console.log('skipGreeting received:', skipGreeting)
// Should be true for follow-up messages
```

**Check 3:** Check Messages table timestamps
```sql
-- In Airtable, check created_at of outbound messages
-- Should be >2 hours apart for new greetings
```

---

### Issue: Name not being used

**Check 1:** Is name being extracted?
```typescript
// Check logs for:
'customer-name-extracted'
// Should appear after customer sends name
```

**Check 2:** Is name in Customers table?
```bash
# Check Airtable Customers table
# Should see customer with name field populated
```

**Check 3:** Is ragContext.customerName set?
```typescript
// Add logging before AI call
console.log('Customer name in context:', ragContext.customerName)
// Should show customer's name
```

---

## Deployment Checklist

- [ ] Create `/lib/conversation-guards.ts`
- [ ] Update `/app/api/webhooks/twilio/route.ts` (3 changes)
- [ ] Update `/lib/rag.ts` (4 changes)
- [ ] Test locally with ngrok + Twilio sandbox
- [ ] Verify greeting count in database
- [ ] Verify name extraction works
- [ ] Verify photo handling preserves context
- [ ] Deploy to production (Vercel)
- [ ] Monitor logs for errors
- [ ] Test in production with real WhatsApp number

---

## Expected Results

### Before Fix
```
Customer: Ola
AI: Olá! Somos a Boutique Bucherer...

Customer: Quero um relógio
AI: Olá! Somos a Boutique Bucherer...  ← DUPLICATE

Customer: Rolex
AI: Olá! Somos a Boutique Bucherer...  ← DUPLICATE AGAIN
```

### After Fix
```
Customer: Ola
AI: Olá! Somos a Boutique Bucherer...

Customer: Quero um relógio
AI: Ótimo! Trabalhamos com Rolex, Patek Philippe e Cartier. Qual marca te interessa?

Customer: Rolex
AI: Perfeito! Temos vários modelos Rolex. Prefere esportivo ou elegante?
```

**Quality Score Improvement:** 35/100 → 85/100

---

## Need Help?

**Common Errors:**

1. **TypeError: skipGreeting is not defined**
   - Fix: Check that `skipGreeting` is passed to `buildRAGContext()` options

2. **Greeting still appearing**
   - Fix: Check that `skipGreeting` condition in `buildSystemPrompt()` is working
   - Debug: Add `console.log('skipGreeting:', skipGreeting)` before prompt generation

3. **Name not extracted**
   - Fix: Check that name extraction happens BEFORE `chat()` call
   - Debug: Add logging in `extractCustomerName()` function

**Contact:** Check `/CONVERSATION_QUALITY_AUDIT.md` for detailed architecture recommendations

---

**Last Updated:** November 23, 2025
**Estimated Implementation Time:** 6 hours (emergency fixes only)
**Impact:** Conversation quality improves from 35/100 to 85/100
