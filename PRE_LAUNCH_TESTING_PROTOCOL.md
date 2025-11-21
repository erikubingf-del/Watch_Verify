# Pre-Launch Testing Protocol
# Watch Verify CRM - Production Readiness Checklist

**Last Updated:** November 21, 2025
**Status:** Ready for Production Testing
**Twilio:** Production Account (ACf732c8d1bd2e881724592369471bbb4d)

---

## 🔧 Phase 1: Local Environment Setup (COMPLETE THIS FIRST)

### ✅ Step 1.1: Verify Environment Variables

Run this to check all required env vars are set:

```bash
# Check if .env.local exists and has all required variables
cat .env.local | grep -E "AIRTABLE_API_KEY|TWILIO_ACCOUNT_SID|OPENAI_API_KEY|NEXTAUTH_SECRET"
```

**Expected Result:** All 4 variables should show values (not empty)

**Current Status:**
- ✅ Twilio Production Credentials Updated:
  - Account SID: `ACf732c8d1bd2e881724592369471bbb4d`
  - Auth Token: `934e62c6d7cbb7defabbb74f3db9fe39`
  - WhatsApp Number: `+17623727247`

---

### ✅ Step 1.2: Start Local Development Server

```bash
npm run dev
```

**Expected Result:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in Xms
```

**Troubleshooting:**
- If port 3000 is busy: `lsof -ti:3000 | xargs kill -9`
- If dependencies missing: `npm install`

---

### ✅ Step 1.3: Test Database Connection

Open: http://localhost:3000/api/health (if you have a health endpoint)

Or test Airtable connection:
```bash
# In a new terminal
curl http://localhost:3000/api/dashboard/catalog
```

**Expected Result:** JSON response (not 500 error)

---

## 📱 Phase 2: WhatsApp Integration Testing

### ⚠️ IMPORTANT: Twilio WhatsApp Business Setup

Before testing, ensure in Twilio Console:

1. **Go to:** https://console.twilio.com/
2. **Navigate:** Messaging → Try it out → Send a WhatsApp message
3. **Verify:**
   - Your WhatsApp Business number: `+17623727247`
   - Status: "Active" or "Approved"
   - Profile: Business profile submitted and approved

**If NOT approved yet:**
- WhatsApp numbers require Facebook Business Manager approval
- Approval takes 1-3 business days
- For testing NOW, you can use Twilio's test number with limitations

---

### ✅ Step 2.1: Configure Twilio Webhook (CRITICAL)

**Using ngrok for local testing:**

```bash
# Install ngrok (if not installed)
brew install ngrok

# Start ngrok tunnel
ngrok http 3000
```

**Copy the HTTPS URL** (e.g., `https://abcd1234.ngrok.io`)

**Then configure Twilio:**

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on: `+17623727247`
3. Scroll to: **Messaging Configuration**
4. Under **"A MESSAGE COMES IN":**
   - **Webhook URL:** `https://YOUR-NGROK-URL.ngrok.io/api/webhooks/twilio`
   - **HTTP Method:** `POST`
5. Click **Save Configuration**

**Example:**
```
https://abcd1234.ngrok.io/api/webhooks/twilio
```

---

### ✅ Step 2.2: Send Test WhatsApp Message

**From your personal WhatsApp:**

Send to: `+1 (762) 372-7247`

**Test Message 1:** Basic Greeting
```
Olá! Quero informações sobre relógios
```

**Expected Response (within 3 seconds):**
```
Olá! Bem-vindo à [Store Name]! 👋

Sou o assistente virtual e estou aqui para ajudar você.

Como posso te ajudar hoje?

💬 Agendar uma visita à loja
🔍 Verificar autenticidade de relógio
📦 Ver nosso catálogo de produtos
💰 Fazer uma oferta de compra

Por favor, me conte o que você procura!
```

---

### ✅ Step 2.3: Test Appointment Booking Flow

**Message:**
```
Quero agendar uma visita
```

**Expected Flow:**
1. AI asks for your name
2. AI asks for preferred date
3. AI asks for preferred time
4. AI confirms appointment
5. Record created in Airtable `Appointments` table

**Verify in Airtable:**
- Go to: https://airtable.com/appig3KRYD5neBJqV
- Open: **Appointments** table
- Check: New record with your name, phone, scheduled time

---

### ✅ Step 2.4: Test Watch Verification Flow

**Message:**
```
Quero verificar a autenticidade do meu Rolex Submariner
```

**Expected Flow:**
1. AI asks for CPF
2. AI asks for watch photos
3. AI asks for guarantee card photo
4. AI asks for invoice photo
5. AI analyzes documents
6. AI sends verification report with ICD score

**Verify in Airtable:**
- Open: **WatchVerify** table
- Check: New verification record with ICD score
- Check: **VerificationSessions** table for session state

**IMPORTANT:** If AI doesn't ask for documents:
- Check: **Settings** table → `verification_enabled` = ✅ checked

---

### ✅ Step 2.5: Test Semantic Product Search

**Prerequisites:**
- Add at least 3 products to Catalog via dashboard
- Generate embeddings for those products

**Message:**
```
Estou procurando um relógio de mergulho
```

**Expected Response:**
- AI should recommend products matching "diving watch"
- Should mention specific brands/models from your catalog
- Should offer to schedule a visit to see them

**Verify:**
- AI uses semantic search (not keyword matching)
- Recommends relevant products based on description similarity

---

## 🖥️ Phase 3: Dashboard Testing

### ✅ Step 3.1: Authentication Test

1. **Open:** http://localhost:3000/dashboard
2. **Expected:** Redirect to `/login`
3. **Enter credentials** (from your Users/Salespeople table)
4. **Expected:** Redirect to dashboard home

**Troubleshooting:**
- If credentials don't work, check `Users` table in Airtable
- Password should be hashed (bcrypt)
- Or use NextAuth magic link if configured

---

### ✅ Step 3.2: Conversations Page Test

**URL:** http://localhost:3000/dashboard/conversations

**Test Checklist:**
- [ ] Conversations load from Messages table
- [ ] Customer names display correctly
- [ ] Last message time shows
- [ ] Interest summary generates
- [ ] Product mentions detected
- [ ] Status badges show (active, scheduled, etc.)
- [ ] Search by name/phone works
- [ ] Filter by status works
- [ ] Click row opens detail modal
- [ ] WhatsApp link works
- [ ] CSV export downloads

**Expected Data Source:** Airtable `Messages` table

---

### ✅ Step 3.3: Verification Dashboard Test

**URL:** http://localhost:3000/dashboard/verification

**Test Checklist:**
- [ ] Verifications load from WatchVerify table
- [ ] CPF displays masked (***.***.123-45)
- [ ] Click "Show CPF" opens password modal
- [ ] Entering password reveals full CPF
- [ ] CPF auto-hides after 10 seconds
- [ ] ICD score displays with color (green/yellow/orange/red)
- [ ] Legal risk badges show
- [ ] Click row opens detail modal
- [ ] Full verification report displays
- [ ] Critical issues and warnings show
- [ ] Filters work (status, brand, risk level)
- [ ] Search works

**Password for CPF reveal:** Any non-empty string (for now)

**Expected Data Source:** Airtable `WatchVerify` table

---

### ✅ Step 3.4: Visits Page Test

**URL:** http://localhost:3000/dashboard/visits

**Test Checklist:**
- [ ] Visits load from Appointments table
- [ ] Customer names and phones display
- [ ] Scheduled dates show correctly
- [ ] Unassigned visits show "Assign" button
- [ ] Click "Assign" opens salesperson modal
- [ ] Salesperson availability scores calculate
- [ ] Manual assignment works
- [ ] Auto-assign button works (if unassigned visits exist)
- [ ] Days until visit countdown accurate
- [ ] Status badges display correctly
- [ ] Filters work (status, salesperson, date range)
- [ ] WhatsApp links work
- [ ] Visit detail modal opens

**Expected Data Sources:**
- Airtable `Appointments` table
- Airtable `Salespeople` table

---

### ✅ Step 3.5: Catalog Management Test

**URL:** http://localhost:3000/dashboard/catalog

**Test Checklist:**
- [ ] Products load from Catalog table
- [ ] Click "Novo Produto" opens form
- [ ] Fill form and create new product
- [ ] Product appears in table
- [ ] Click "Editar" opens form with existing data
- [ ] Update product and save
- [ ] Changes reflect in table
- [ ] Click "Deletar" shows confirmation
- [ ] Confirm deletion removes product
- [ ] Stock quantity displays
- [ ] Low stock (<5) shows in red
- [ ] Embedding status badges show
- [ ] Click "Gerar Embeddings" generates for all products
- [ ] CSV upload works (test with template)
- [ ] CSV preview shows before import
- [ ] Filters work (search, category, embedding status, active only)

**CSV Test:**
1. Click "Importar CSV"
2. Download template
3. Add 2-3 products to CSV
4. Upload CSV
5. Verify preview shows correctly
6. Click "Importar Produtos"
7. Check products appear in table

**Expected Data Source:** Airtable `Catalog` table

---

## 🔍 Phase 4: End-to-End User Journeys

### ✅ Journey 1: Customer Books Visit

**Actors:** Customer (WhatsApp) + Owner (Dashboard)

1. **Customer sends:** "Quero agendar uma visita amanhã às 14h"
2. **AI responds:** Confirmation with appointment details
3. **Owner opens:** `/dashboard/visits`
4. **Owner sees:** New appointment (unassigned)
5. **Owner clicks:** "Auto-Atribuir" or manual assign
6. **Owner verifies:** Salesperson assigned
7. **Owner sends:** WhatsApp reminder to customer

**Success Criteria:**
- Appointment created in Airtable
- Appears in dashboard immediately
- Can be assigned to salesperson
- WhatsApp link works from dashboard

---

### ✅ Journey 2: Customer Requests Verification

**Actors:** Customer (WhatsApp) + Owner (Dashboard)

1. **Customer sends:** "Quero vender meu Rolex"
2. **AI requests:** CPF
3. **Customer sends:** CPF
4. **AI requests:** Watch photo
5. **Customer sends:** Photo
6. **AI requests:** Guarantee card
7. **Customer sends:** Photo
8. **AI requests:** Invoice
9. **Customer sends:** Photo
10. **AI analyzes:** Documents
11. **AI sends:** Verification report with ICD score
12. **Owner opens:** `/dashboard/verification`
13. **Owner sees:** New verification with legal risk badge
14. **Owner clicks:** Verification to see full report
15. **Owner reviews:** ICD score, critical issues, warnings
16. **Owner contacts:** Customer via WhatsApp

**Success Criteria:**
- Complete verification flow works
- Photos upload to Cloudinary
- GPT-4 Vision analyzes images
- Cross-reference logic works
- ICD score calculated correctly
- Legal risk categorized properly
- Report appears in dashboard
- CPF protected (masked by default)

---

### ✅ Journey 3: Salesperson Reports Feedback

**Actors:** Salesperson (WhatsApp) + Owner (Dashboard)

**Prerequisites:**
- Add salesperson phone to `Salespeople` table

1. **Salesperson sends audio:** "Atendi o João Silva de São Paulo hoje, ele adorou o Submariner preto"
2. **AI transcribes:** Audio via Whisper
3. **AI extracts:** Name, city, product interest
4. **AI searches:** Existing customers named "João Silva" in São Paulo
5. **AI matches or creates:** Customer record
6. **AI updates:** Customer with visit notes, city, product interest
7. **Owner opens:** `/dashboard/conversations`
8. **Owner sees:** Updated conversation with João Silva
9. **Owner opens:** Customer detail
10. **Owner sees:** Visit notes, city (São Paulo), interest (Submariner preto)

**Success Criteria:**
- Audio transcription works
- City extraction works
- Customer matching uses city priority
- Disambiguation works if multiple "João Silva"
- Customer record updates correctly
- Appears in conversations dashboard

---

## 🚨 Phase 5: Error Handling & Edge Cases

### ✅ Test 5.1: Invalid WhatsApp Messages

**Send these and verify graceful handling:**

1. Empty message: ""
2. Only emojis: "😀😀😀"
3. Very long message (1000+ chars)
4. Special characters: `<script>alert('test')</script>`
5. SQL injection attempt: `'; DROP TABLE Messages; --`

**Expected:** AI responds professionally, no crashes, no SQL injection

---

### ✅ Test 5.2: Incomplete Flows

**Abandon flows mid-conversation:**

1. Start appointment booking, don't provide date
2. Start verification, don't send photos
3. Start product search, don't respond

**Expected:** Session times out gracefully, no hanging state

---

### ✅ Test 5.3: Concurrent Users

**Test with 2+ phones simultaneously:**

1. Send messages from 2 different numbers at same time
2. Both request appointments
3. Both get responses

**Expected:** No message mixing, correct tenant isolation

---

### ✅ Test 5.4: Missing Data Scenarios

**Test dashboard with:**

1. Customer with no name (only phone)
2. Appointment with no assigned salesperson
3. Verification with missing photos
4. Product with no image URL
5. Product with no embedding

**Expected:** Dashboard shows gracefully (N/A, placeholder, etc.)

---

## 📊 Phase 6: Performance & Load Testing

### ✅ Test 6.1: Response Time

**Measure with:**
```bash
# Test webhook response time
time curl -X POST https://YOUR-NGROK-URL/api/webhooks/twilio \
  -d "From=whatsapp:+5511999999999" \
  -d "Body=Olá"
```

**Acceptable:** < 3 seconds for simple messages

---

### ✅ Test 6.2: Dashboard Load Time

**Open DevTools → Network → Reload each dashboard page**

**Acceptable:**
- Conversations: < 2 seconds
- Verification: < 2 seconds
- Visits: < 2 seconds
- Catalog: < 3 seconds (with 50+ products)

---

### ✅ Test 6.3: Large Dataset Handling

**Test with:**
- 100+ conversations
- 50+ verifications
- 100+ appointments
- 200+ products

**Expected:** Pagination works, no browser freeze

---

## 🔒 Phase 7: Security Testing

### ✅ Test 7.1: Authentication

1. **Try accessing dashboard without login:**
   - http://localhost:3000/dashboard
   - Expected: Redirect to `/login`

2. **Try API without session:**
   ```bash
   curl http://localhost:3000/api/dashboard/catalog
   ```
   - Expected: 401 Unauthorized

3. **Test CSRF protection:**
   - Submit form with wrong origin
   - Expected: Rejected

---

### ✅ Test 7.2: Tenant Isolation

1. **Create 2 tenants in Airtable**
2. **Add data to both**
3. **Login as Tenant A**
4. **Verify:** Can only see Tenant A data
5. **Login as Tenant B**
6. **Verify:** Can only see Tenant B data

---

### ✅ Test 7.3: CPF Protection

1. **Open verification dashboard**
2. **Verify:** CPF masked by default
3. **Click "Show CPF"**
4. **Enter wrong password**
5. **Expected:** CPF stays masked
6. **Enter correct password**
7. **Expected:** CPF reveals
8. **Wait 10 seconds**
9. **Expected:** CPF auto-masks again

---

## 🐛 Phase 8: Bug Tracking & Known Issues

### Known Limitations:

1. **Calendar View:** Placeholder only (not implemented)
2. **White-Label Branding:** Not yet implemented
3. **Multi-Watch Detection:** Not yet implemented
4. **Automatic Stock Decrement:** Not yet implemented

### Bugs to Watch For:

- [ ] Twilio webhook signature validation (currently disabled for testing)
- [ ] Embedding generation timeout (if 100+ products)
- [ ] CSV upload with special characters in product names
- [ ] Date parsing for non-Brazilian formats
- [ ] Image upload size limits (Cloudinary)

---

## ✅ Phase 9: Pre-Production Checklist

Before deploying to Vercel:

### Environment Variables:
- [ ] All env vars set in Vercel dashboard
- [ ] `NEXTAUTH_URL` set to production URL
- [ ] `NODE_ENV=production`
- [ ] API keys valid and have credits

### Airtable:
- [ ] All 17 tables created
- [ ] Sample data in Catalog table
- [ ] At least 1 salesperson in Salespeople table
- [ ] Settings table has tenant record
- [ ] `verification_enabled` checked if using verification
- [ ] `offers_purchase` checked if using payments

### Twilio:
- [ ] WhatsApp Business number approved
- [ ] Webhook configured to Vercel URL
- [ ] Phone number verified
- [ ] Messaging service active

### Domain & SSL:
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] HTTPS enforced

---

## 📞 Phase 10: User Acceptance Testing (UAT)

### Internal Testing (3-5 days):
1. **Day 1:** Onboard 1 test customer via WhatsApp
2. **Day 2:** Test full verification flow with real watch
3. **Day 3:** Test salesperson feedback with audio
4. **Day 4:** Test dashboard analytics and reporting
5. **Day 5:** Stress test with 20+ messages in 1 hour

### Beta Testing (1-2 weeks):
1. **Invite 5-10 real customers** to test WhatsApp
2. **Track issues** in a spreadsheet
3. **Collect feedback** on AI responses
4. **Monitor Vercel logs** for errors
5. **Check Airtable** for data accuracy

---

## 🎯 Launch Readiness Scorecard

**Mark each as ✅ before launch:**

### Critical (Must Have):
- [ ] WhatsApp messages send and receive
- [ ] Twilio webhook configured and working
- [ ] All API endpoints respond (no 500 errors)
- [ ] Authentication works
- [ ] Tenant isolation verified
- [ ] CPF protection working
- [ ] At least 10 products in catalog
- [ ] Embeddings generated for all products
- [ ] Dashboard loads without errors
- [ ] No console errors in browser DevTools

### Important (Should Have):
- [ ] Response time < 3 seconds
- [ ] Dashboard load time < 2 seconds
- [ ] CSV upload tested
- [ ] Auto-assignment tested
- [ ] Legal risk categorization tested
- [ ] All modals functional
- [ ] All filters working
- [ ] WhatsApp links tested
- [ ] Export CSV tested
- [ ] At least 1 salesperson registered

### Nice to Have:
- [ ] Custom domain configured
- [ ] Analytics tracking set up
- [ ] Error monitoring (Sentry)
- [ ] Backup strategy in place
- [ ] Documentation for team

---

## 📈 Success Metrics to Track After Launch

### Week 1:
- Total WhatsApp messages received
- Total conversations started
- Appointment booking rate
- Verification requests
- Dashboard login frequency

### Week 2-4:
- Appointment show-up rate
- Verification approval rate
- Customer satisfaction (ask manually)
- Salesperson adoption (feedback submissions)
- Average response time

### Month 2-3:
- Conversion rate (conversation → visit → purchase)
- Customer lifetime value
- Salesperson efficiency gains
- Revenue per conversation
- Churn rate

---

## 🆘 Troubleshooting Guide

### Issue: WhatsApp not responding

**Check:**
1. Twilio webhook URL is correct
2. ngrok is running (for local) or Vercel deployed
3. Twilio account has credits
4. WhatsApp number is approved
5. Check Vercel/ngrok logs for incoming requests

**Solution:**
```bash
# Check ngrok logs
curl http://localhost:4040/api/requests/http

# Check Vercel logs
vercel logs
```

---

### Issue: Dashboard shows no data

**Check:**
1. Logged in user has correct `tenant_id`
2. Airtable tables have data
3. `tenant_id` field exists in all tables
4. API endpoint returns data (test with curl)

**Solution:**
```bash
# Test API directly
curl http://localhost:3000/api/dashboard/conversations
```

---

### Issue: Embeddings not generating

**Check:**
1. OpenAI API key valid
2. OpenAI account has credits
3. Products have title + description
4. No rate limit exceeded

**Solution:** Check OpenAI dashboard for usage

---

### Issue: 401 Unauthorized on API

**Check:**
1. NextAuth session exists
2. Cookie sent with request
3. `NEXTAUTH_SECRET` matches
4. `NEXTAUTH_URL` correct

**Solution:** Clear cookies, login again

---

## 📞 Support Contacts

**Twilio Support:** https://support.twilio.com
**Airtable Support:** https://support.airtable.com
**OpenAI Support:** https://help.openai.com
**Vercel Support:** https://vercel.com/support

---

## 🎉 Ready for Launch!

When all tests pass:

1. **Update `NEXTAUTH_URL` in Vercel** to production URL
2. **Configure Twilio webhook** to Vercel URL
3. **Test one final message** via WhatsApp
4. **Monitor Vercel logs** for first hour
5. **Have rollback plan** ready (previous deployment)

**Good luck! 🚀**

---

_Last updated: November 21, 2025_
_Version: 1.0_
_Status: Ready for Production Testing_
