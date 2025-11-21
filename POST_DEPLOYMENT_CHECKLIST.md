# Post-Deployment Checklist

**Status:** Deployment in progress...
**Follow these steps after deployment completes**

---

## ✅ Step 1: Get Your Vercel URL

After deployment completes, you'll see a URL like:
```
https://watch-verify-[random-id].vercel.app
```

Copy this URL - you'll need it for the next steps.

---

## ✅ Step 2: Update NEXTAUTH_URL in Vercel

**Why:** NextAuth needs to know the production URL for authentication to work.

1. Go to Vercel Dashboard → Your Project
2. Click "Settings" → "Environment Variables"
3. Find `NEXTAUTH_URL`
4. Click "Edit" (three dots)
5. Change value to your Vercel URL: `https://watch-verify-xyz.vercel.app`
6. Save
7. Go to "Deployments" tab
8. Click "..." on latest deployment → "Redeploy"

---

## ✅ Step 3: Configure Twilio Webhook

**Why:** Twilio needs to know where to send incoming WhatsApp messages.

1. Go to https://console.twilio.com/
2. Navigate: **Phone Numbers → Manage → Active Numbers**
3. Click your WhatsApp Sandbox number: **+1 415 523 8886**
4. Scroll to **"Messaging Configuration"** section
5. Under **"A MESSAGE COMES IN"**:
   - **Webhook URL:** `https://your-vercel-url.vercel.app/api/webhooks/twilio`
   - **HTTP Method:** `POST`
6. Click **"Save Configuration"**

---

## ✅ Step 4: Test WhatsApp Integration

### Test 1: Basic Message
Send to WhatsApp: `join [sandbox-keyword]` (if needed)
Then send:
```
Olá! Quero agendar uma visita
```

**Expected:** AI responds with appointment booking flow

### Test 2: Check Vercel Logs
1. Vercel Dashboard → Your Project → "Logs" tab
2. Look for incoming webhook calls
3. Should see: `POST /api/webhooks/twilio 200`

### Test 3: Check Airtable
1. Open Airtable base: https://airtable.com/appig3KRYD5neBJqV
2. Go to **Messages** table
3. Should see your test message recorded

---

## ✅ Step 5: Enable Premium Features

### In Airtable Settings Table:

1. Open **Settings** table
2. Find your tenant record
3. Set these fields:
   - `verification_enabled` = ✅ (checked)
   - `offers_purchase` = ✅ (checked)

### Add City Field to Customers:

1. Open **Customers** table
2. Click "+ Add field"
3. Name: `city`
4. Type: "Single line text"
5. Create field

---

## ✅ Step 6: Register Test Salesperson

**For Feedback System Testing:**

1. Open **Users** or **Salespeople** table in Airtable
2. Add a record:
   - `name`: Your name
   - `phone`: Your WhatsApp number (format: +5511999999999)
   - `tenant_id`: Link to your tenant
   - `active`: ✅ checked

---

## 🧪 Step 7: Test Enhanced Features

### Test Enhanced Verification:
Send to WhatsApp:
```
Quero vender meu Rolex Submariner
```

**Expected Flow:**
1. Asks for CPF
2. Asks for watch details
3. Requests photos (watch, guarantee, invoice)
4. Analyzes documents
5. Generates verification report with legal risk assessment

**Check:**
- VerificationSessions table (new record)
- WatchVerify table (completed verification)

### Test Salesperson Feedback:
From registered salesperson phone, send audio:
```
"Atendi o João Silva de São Paulo hoje, ele adorou o Submariner preto"
```

**Expected Flow:**
1. Transcribes audio
2. Extracts structured data
3. Finds/creates customer
4. Asks for confirmation
5. Updates customer record

**Check:**
- FeedbackSessions table (new record)
- Customers table (João Silva updated with city, interest, last_visit)

---

## 🚨 Troubleshooting

### Issue: WhatsApp not responding

**Check:**
1. Twilio webhook URL is correct (ends with `/api/webhooks/twilio`)
2. Vercel deployment succeeded (green checkmark)
3. Environment variables are all set
4. Check Vercel logs for errors

### Issue: 401 or Authentication Errors

**Solution:**
1. Verify `NEXTAUTH_URL` matches your Vercel URL exactly
2. Redeploy after changing
3. Check `NEXTAUTH_SECRET` is set

### Issue: Airtable Errors

**Check:**
1. `AIRTABLE_API_KEY` is correct
2. `AIRTABLE_BASE_ID` is correct (appig3KRYD5neBJqV)
3. All tables exist (run schema checker)

### Issue: OpenAI Errors

**Check:**
1. `OPENAI_API_KEY` is valid
2. API key has credits
3. Models are accessible (gpt-4o, text-embedding-3-small)

---

## 📊 Monitor Your Deployment

### Vercel Dashboard:
- **Functions:** Check execution time and errors
- **Logs:** Real-time application logs
- **Analytics:** Traffic and performance

### Airtable:
- **Messages:** All WhatsApp conversations
- **WatchVerify:** Verification requests
- **FeedbackSessions:** Salesperson feedback
- **Customers:** Updated customer data

### Twilio:
- **Messaging Logs:** Delivery status
- **Error Logs:** Failed webhooks

---

## ✅ Success Criteria

Your deployment is successful when:

- [x] Vercel deployment shows green checkmark
- [ ] Twilio webhook configured
- [ ] NEXTAUTH_URL updated and redeployed
- [ ] Test WhatsApp message gets response
- [ ] Messages appear in Airtable
- [ ] Verification flow works end-to-end
- [ ] Salesperson feedback works
- [ ] City field added to Customers
- [ ] Premium features enabled in Settings

---

## 🎉 Next Steps After Successful Deployment

1. **Invite salespeople** - Add their phones to Users/Salespeople table
2. **Populate Catalog** - Add your products
3. **Test booking flow** - Schedule a test appointment
4. **Configure StoreAvailability** - Set your business hours
5. **Train team** - Share WhatsApp number and brief instructions

---

## 📱 Production WhatsApp Number

**Current:** Test Sandbox (+1 415 523 8886)
- Limited to verified numbers
- For testing only

**For Production:**
1. Upgrade Twilio account
2. Get approved WhatsApp Business number
3. Update `TWILIO_WHATSAPP_NUMBER` in Vercel
4. Update webhook configuration
5. Redeploy

---

## 🔗 Important Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Twilio Console:** https://console.twilio.com/
- **Airtable Base:** https://airtable.com/appig3KRYD5neBJqV
- **OpenAI Dashboard:** https://platform.openai.com/
- **Cloudinary Console:** https://cloudinary.com/console

---

**Deployment Guide:** VERCEL_DEPLOYMENT_GUIDE.md
**Testing Guide:** TESTING_GUIDE.md
**Feature Improvements:** FEATURE_IMPROVEMENTS.md

---

_Your Watch Verify CRM is almost ready! 🚀_
