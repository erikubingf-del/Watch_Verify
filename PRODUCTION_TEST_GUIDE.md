# 🧪 Production Testing Guide - AI Conversation Fixes

**Deployed:** 2025-11-22
**Commits:** 9314648, e4a90cc, f9a3c04, 44ba7a8, 2e28b39

---

## 📱 WhatsApp Test Number

**Test with:** +1 762-372-7247 (Boutique Bucherer)

---

## ✅ Test Scenarios

### Test 1: Conversation Memory (Bug #1 Fix)

**Objective:** Verify AI remembers previous messages

```
Step 1: Send "Olá"
Expected: AI introduces store

Step 2: Send "Quero um Rolex"
Expected: AI recommends Rolex models WITHOUT repeating "Olá! Somos..."

Step 3: Send "Quanto custa?"
Expected: AI provides price WITHOUT restarting conversation

✅ PASS if: No "Olá! Somos..." after first message
❌ FAIL if: AI repeats introduction
```

**What Changed:**
- Fixed `BLANK()` syntax in conversation history query
- [lib/rag.ts:370](lib/rag.ts#L370)

---

### Test 2: Verification Service Detection (Bug #2 Fix)

**Objective:** Verify AI knows verification is enabled

```
Step 1: Check Airtable Settings table
- Confirm verification_enabled = ✅ (checked)

Step 2: Send "Quero vender meu relógio"
Expected: AI offers verification service:
  "Posso ajudar com a verificação/autenticação do seu relógio..."

✅ PASS if: AI mentions verification service
❌ FAIL if: AI says "não oferecemos verificação"
```

**What Changed:**
- Fixed Settings query to handle linked record fields
- [lib/rag.ts:76-101](lib/rag.ts#L76-L101)

---

### Test 3: Mid-Conversation Continuation (Bug #3 Fix)

**Objective:** Verify AI doesn't restart when customer says "Sim"

```
Step 1: Send "Olá"
Expected: AI introduces store

Step 2: Send "Quero um anel"
Expected: AI shows jewelry options

Step 3: Send "Sim"
Expected: AI continues naturally: "Perfeito! [next step]"

✅ PASS if: No "Olá! Somos..." restart
❌ FAIL if: AI repeats introduction after "Sim"
```

**What Changed:**
- Removed `.includes('olá')` from name extraction trigger
- Added ⛔ NEVER restart rules to system prompt
- [app/api/webhooks/twilio/route.ts:1307](app/api/webhooks/twilio/route.ts#L1307)
- [lib/rag.ts:322-336](lib/rag.ts#L322-L336)

---

### Test 4: Photo Handling (Bug #5 Fix) - CRITICAL

**Objective:** Verify AI doesn't restart when receiving photos

```
Step 1: Send "Vou mandar fotos do meu relógio"
Expected: AI says "Claro! Pode enviar as fotos..."

Step 2: Send a photo (any watch image)
Expected: AI acknowledges photo naturally:
  "Recebi a foto do seu relógio!"
  "Pode me enviar também fotos do número de série?"

✅ PASS if: AI continues verification flow
❌ FAIL if: AI responds "Olá! Somos a Boutique Bucherer..."
```

**What Changed:**
- Handle media-only messages (empty body) with descriptive content
- Include `[Foto recebida: URL]` in AI message
- Added PHOTO/MEDIA HANDLING rules to system prompt
- [app/api/webhooks/twilio/route.ts:360-395](app/api/webhooks/twilio/route.ts#L360-L395)
- [lib/rag.ts:434-445](lib/rag.ts#L434-L445)

---

### Test 5: Time-Based Greeting Reset

**Objective:** Verify AI can greet again after 2+ hours

```
Step 1: Send "Olá" (morning)
Expected: AI introduces store

Step 2: Send "Obrigado"
Expected: AI says "De nada! Qualquer dúvida..."

Step 3: Wait 2+ hours OR manually test by checking Airtable:
- Update last_interaction in Customers table to 3 hours ago

Step 4: Send "Oi"
Expected: AI greets again: "Olá! Como posso ajudar hoje?"

✅ PASS if: AI greets naturally after time gap
❌ FAIL if: AI doesn't greet or repeats full introduction mid-gap
```

**What Changed:**
- Added conversationGapHours calculation
- Greeting allowed if gap ≥ 2 hours
- [lib/rag.ts:322-336](lib/rag.ts#L322-L336)

---

### Test 6: Custom Welcome Message

**Objective:** Verify custom welcome_message from Settings works

```
Step 1: Add custom welcome message in Airtable Settings:
  welcome_message = "Bem-vindo à Boutique Bucherer! Especialistas em Rolex."

Step 2: Start new conversation (use new phone number or clear Messages table)

Step 3: Send "Olá"
Expected: AI uses EXACT custom message:
  "Bem-vindo à Boutique Bucherer! Especialistas em Rolex."

✅ PASS if: AI uses custom message
❌ FAIL if: AI uses default introduction
```

**What Changed:**
- Added welcome_message field support from Settings
- [lib/rag.ts:376-392](lib/rag.ts#L376-L392)

---

## 🔍 Debugging Production Issues

### Check Vercel Logs

If tests fail, check Vercel logs for these markers:

1. **Conversation History Loading:**
   ```
   Search for: "rag-history-loaded"
   Expected: "Loaded X messages for phone +5511..."
   ```

2. **Settings Detection:**
   ```
   Search for: "rag-settings-loaded"
   Expected: "verificationEnabled: true, hasWelcomeMessage: true"
   ```

3. **Media Handling:**
   ```
   Search for: "media-only-message"
   Expected: "Handling media-only message, numMedia: 1"
   ```

4. **Name Extraction:**
   ```
   Search for: "customer-name-extracted"
   Expected: Only when AI explicitly asks for name
   ```

### Common Issues

**Issue:** AI still restarting
**Solution:** Check if conversation history query returns results
```bash
# Check Airtable Messages table:
# - Filter by phone number
# - Verify deleted_at is empty (not "")
# - Check created_at timestamps
```

**Issue:** Verification not enabled
**Solution:** Verify Settings table
```bash
# Airtable Settings table:
# - tenant_id should be linked record (blue link)
# - verification_enabled should be checked (✅)
# - Not just text field!
```

**Issue:** Photos still restart
**Solution:** Check webhook logs
```bash
# Vercel logs should show:
# - "media-only-message" log
# - User message: "Enviei uma foto\n\n[Foto recebida: https://...]"
```

---

## 📊 Expected Behavior Summary

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| **Customer says "Sim"** | "Olá! Somos..." | "Perfeito! [continues]" |
| **Sends photo** | "Olá! Somos..." | "Recebi a foto!" |
| **Asks about verification** | "Não oferecemos" | "Posso verificar!" |
| **New conversation** | Generic intro | Custom welcome message |
| **2+ hours later** | No greeting | "Olá [Nome]! Como posso ajudar?" |

---

## 🎯 Quick Smoke Test (5 Minutes)

**Fastest way to verify all fixes:**

```
1. Send: "Olá"
   ✅ AI introduces store

2. Send: "Quero vender meu relógio"
   ✅ AI offers verification (if enabled)

3. Send: "Sim"
   ✅ AI continues (NOT "Olá! Somos...")

4. Send a photo
   ✅ AI says "Recebi a foto!" (NOT "Olá! Somos...")

5. Send: "Obrigado"
   ✅ AI says "De nada!"

ALL PASS = 🎉 Deployment Successful!
```

---

## 📞 Support

If tests fail:

1. **Check Vercel Deployment:** Ensure latest commits deployed
   - Dashboard: https://vercel.com/your-project/deployments
   - Look for commits: 2e28b39, f9a3c04, e4a90cc

2. **Verify Airtable Schema:**
   - Settings.tenant_id is linked record (not text)
   - Messages.deleted_at is empty (use BLANK() in formulas)

3. **Review Logs:**
   - Vercel → Project → Logs
   - Filter by: "rag-", "media-", "customer-"

4. **Re-deploy if needed:**
   ```bash
   git push origin main --force-with-lease
   ```

---

**Last Updated:** 2025-11-22
**Status:** ✅ Ready for Testing
