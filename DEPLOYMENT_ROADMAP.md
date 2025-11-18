# 🚀 DEPLOYMENT ROADMAP - From Tables to Production

**Current Status:** ✅ Airtable tables created with sample data

**Goal:** Live production deployment on Vercel with WhatsApp integration

---

## 📊 PHASE 1: Fix Airtable Connection (5 minutes)

### Issue Detected:
```
HTTP 403: Access denied
```

Your token doesn't have access to your base yet.

### ✅ Fix Steps:

1. **Go to Airtable Token Settings:**
   - Visit: https://airtable.com/create/tokens
   - Find your token (starts with `patceBx20...`)
   - Click **"Edit"**

2. **Add Base Access:**
   - Scroll to **"Access"** section
   - Click **"Add a base"**
   - Search: **"Verify"**
   - Select your base (ID: `appig3KRYD5neBJqV`)
   - Click **"Save changes"**

3. **Verify Scopes (should already have these):**
   - ✅ `data.records:read`
   - ✅ `data.records:write`

4. **Test Connection:**
```bash
curl "https://api.airtable.com/v0/appig3KRYD5neBJqV/Tenants?maxRecords=1" \
  -H "Authorization: Bearer YOUR_AIRTABLE_TOKEN"
```

**Expected:** JSON with your tenant data
**NOT:** "Access denied"

---

## 📊 PHASE 2: Configure Environment Variables (10 minutes)

### Check Current Configuration:

```bash
cd /home/user/Watch_Verify
cat .env.local
```

### Required Variables for Full Functionality:

```env
# Airtable Configuration
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appig3KRYD5neBJqV

# NextAuth Configuration
NEXTAUTH_SECRET=super-secret-key-for-testing-minimum-32-characters-long
NEXTAUTH_URL=http://localhost:3000

# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenAI Configuration (for AI responses)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cloudinary Configuration (for permanent media storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: Chrono24 Integration (for watch market data)
CHRONO24_API_KEY=optional
```

### ✅ Action Items:

1. **Twilio Credentials** (CRITICAL for WhatsApp):
   - Log in to: https://console.twilio.com
   - Dashboard → Copy **Account SID** and **Auth Token**
   - Phone Numbers → Copy your WhatsApp number

2. **OpenAI API Key** (CRITICAL for AI conversations):
   - Go to: https://platform.openai.com/api-keys
   - Create new key
   - Copy key (starts with `sk-`)

3. **Cloudinary** (CRITICAL for media storage):
   - Sign up: https://cloudinary.com (free tier OK)
   - Dashboard → Copy: Cloud Name, API Key, API Secret

4. **Update `.env.local`:**
```bash
nano .env.local
# Paste all variables above with your actual values
# Save: Ctrl+O, Enter, Ctrl+X
```

---

## 📊 PHASE 3: Test Locally (30 minutes)

### Step 1: Test Airtable Connection

```bash
# Load from .env.local file
source .env.local
npx tsx scripts/test-airtable.ts
```

**Expected Output:**
```
✅ Tenants: 1 records
✅ StoreNumbers: 1 records
✅ Users: 1 records
✅ Salespeople: 1 records
✅ StoreAvailability: 3+ records
```

### Step 2: Build TypeScript

```bash
npm run build
```

**Expected:** No errors, successful build

### Step 3: Start Dev Server

```bash
npm run dev
```

Server should start on: http://localhost:3000

### Step 4: Test Dashboard Login

1. Open: http://localhost:3000/login
2. Login with:
   - Email: `admin@boutique.com`
   - Password: `password123` (if you used sample data)
3. Should redirect to: http://localhost:3000/dashboard

### Step 5: Test API Endpoints

```bash
# Test customer export
curl http://localhost:3000/api/export?scope=customers

# Test stats
curl http://localhost:3000/api/dashboard/stats
```

**Expected:** JSON responses with data

### Step 6: Test WhatsApp Booking Flow (LOCAL TESTING)

**Option A: Use Twilio WhatsApp Sandbox**

1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Send "join [your-sandbox-code]" to Twilio number
3. Configure webhook:
   ```
   When a message comes in: http://localhost:3000/api/webhooks/twilio
   Method: POST
   ```
4. Send message: `agendar`
5. Should receive booking flow response

**Option B: Use ngrok for Local Testing**

```bash
# Install ngrok (if not installed)
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

Then:
1. Go to Twilio Console → Phone Numbers
2. Select your WhatsApp number
3. Update webhook URL to: `https://abc123.ngrok.io/api/webhooks/twilio`
4. Send WhatsApp message: `agendar`

**Expected Flow:**
```
You: agendar
Bot: Ótimo! Qual dia você gostaria de nos visitar?
You: sexta
Bot: Ótimo! Para sexta-feira, [date], temos:
     • 10:00 (manhã)
     • 14:00 (tarde)
     • 16:00 (tarde)

     Qual horário funciona melhor para você?
You: 14:00
Bot: Perfeito! 14:00 está reservado para você. 🎯
     O que gostaria de ver na visita? (opcional)
You: Rolex Submariner
Bot: ✅ Agendamento Confirmado
     📅 sexta-feira, [date]
     🕒 14:00
     👤 Patricia aguarda você
     💎 Rolex Submariner

     Nos vemos em breve! 🎯
```

### Step 7: Verify Database Updates

After booking test, check Airtable:

1. **Table 11: Appointments** → Should have 1 new record
2. **Table 3: Customers** → Should have customer record (if new)
3. **Table 4: Messages** → Should have conversation messages

---

## 📊 PHASE 4: Prepare for Deployment (15 minutes)

### Step 1: Generate Production NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output (e.g., `abc123xyz789...`)

You'll use this in Vercel later.

### Step 2: Update Production URL (after deploy)

You'll need to update this in Vercel environment variables:
```
NEXTAUTH_URL=https://your-app.vercel.app
```

### Step 3: Verify .gitignore

```bash
cat .gitignore | grep env
```

Should show:
```
.env.local
.env*.local
```

This ensures secrets aren't committed.

### Step 4: Final Build Test

```bash
npm run build
```

**Expected:** Clean build, no errors

---

## 📊 PHASE 5: Deploy to Vercel (10 minutes)

### Step 1: Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow authentication prompts.

### Step 3: Deploy

```bash
# From project root
cd /home/user/Watch_Verify

# Deploy
vercel
```

**Prompts:**
- Set up and deploy? **Y**
- Which scope? (Select your account)
- Link to existing project? **N**
- Project name? **watch-verify** (or your choice)
- Directory? **./** (default)
- Override settings? **N**

**Expected Output:**
```
✅ Deployed to production: https://watch-verify-xyz123.vercel.app
```

Copy this URL!

### Step 4: Add Environment Variables to Vercel

```bash
# Method 1: Via CLI (recommended)
vercel env add AIRTABLE_BASE_ID
# Paste: appig3KRYD5neBJqV
# Environment: Production
# Add to all? Y

vercel env add AIRTABLE_API_KEY
# Paste: patceBx20PHCAZ934...
# Environment: Production

vercel env add NEXTAUTH_SECRET
# Paste: (your generated secret from Phase 4)

vercel env add NEXTAUTH_URL
# Paste: https://watch-verify-xyz123.vercel.app

vercel env add TWILIO_ACCOUNT_SID
# Paste: ACxxxxxxxx...

vercel env add TWILIO_AUTH_TOKEN
# Paste: your auth token

vercel env add TWILIO_WHATSAPP_NUMBER
# Paste: whatsapp:+14155238886

vercel env add OPENAI_API_KEY
# Paste: sk-xxxxxxxx...

vercel env add CLOUDINARY_CLOUD_NAME
# Paste: your-cloud-name

vercel env add CLOUDINARY_API_KEY
# Paste: your api key

vercel env add CLOUDINARY_API_SECRET
# Paste: your api secret
```

**Method 2: Via Dashboard (alternative)**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add all variables above

### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

This redeploys with the new environment variables.

---

## 📊 PHASE 6: Configure Twilio Webhook (5 minutes)

### Step 1: Get Your Production URL

From Vercel deployment:
```
https://watch-verify-xyz123.vercel.app
```

### Step 2: Update Twilio Webhook

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active
2. Click your WhatsApp number
3. Scroll to **"Messaging"** section
4. **"A message comes in"** webhook:
   ```
   URL: https://watch-verify-xyz123.vercel.app/api/webhooks/twilio
   Method: POST
   ```
5. Click **"Save configuration"**

---

## 📊 PHASE 7: Production Testing (15 minutes)

### Step 1: Test Dashboard

Visit: https://watch-verify-xyz123.vercel.app

1. Should see login page
2. Login with admin credentials
3. Dashboard should load with real data from Airtable

### Step 2: Test Booking Flow via WhatsApp

Send to your Twilio WhatsApp number:
```
agendar
```

**Expected:** Same conversation flow as local testing

### Step 3: Verify in Airtable

After booking, check:
1. Appointments table → New record
2. Customers table → Customer added
3. Messages table → Conversation logged

### Step 4: Test Watch Verification (Optional)

Send to WhatsApp:
```
verificar relógio
```

Follow the flow:
1. Send watch photo
2. Send guarantee card photo
3. Send invoice photo
4. Receive ICD score

Check **WatchVerify** table for new record.

### Step 5: Monitor Vercel Logs

```bash
vercel logs --follow
```

Or via dashboard:
https://vercel.com/dashboard → Your Project → Deployments → Latest → Logs

Check for errors.

---

## 📊 PHASE 8: Post-Deployment Configuration (10 minutes)

### Step 1: Set Up Cron Job for Daily Reports (Optional)

Create: `/home/user/Watch_Verify/api/cron/daily-reports.ts`

```typescript
import { sendDailyScheduleReports } from '@/lib/scheduling'

export default async function handler(req: any, res: any) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const tenantId = req.query.tenantId
  const reportsSent = await sendDailyScheduleReports(tenantId)

  return res.status(200).json({ reportsSent })
}
```

Configure in Vercel:
- Settings → Cron Jobs
- Schedule: `0 8 * * *` (8am daily)
- Path: `/api/cron/daily-reports?tenantId=YOUR_TENANT_ID`

### Step 2: Enable Monitoring

Add to Vercel:
1. Analytics (free tier available)
2. Speed Insights
3. Web Vitals

### Step 3: Custom Domain (Optional)

If you have a domain:

1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `app.boutiquepremium.com`)
3. Update DNS records
4. Update `NEXTAUTH_URL` in environment variables

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] Airtable token has base access (Phase 1)
- [ ] All environment variables configured locally (Phase 2)
- [ ] Local testing successful (Phase 3)
  - [ ] Airtable connection works
  - [ ] Build completes successfully
  - [ ] Dashboard loads
  - [ ] WhatsApp booking flow works
- [ ] Production secrets generated (Phase 4)

### Deployment:
- [ ] Deployed to Vercel (Phase 5)
- [ ] Environment variables added to Vercel
- [ ] Redeployed with env vars
- [ ] Twilio webhook updated to production URL (Phase 6)

### Post-Deployment:
- [ ] Production dashboard works (Phase 7)
- [ ] Production WhatsApp booking works
- [ ] Airtable updates confirmed
- [ ] Logs show no errors
- [ ] Daily reports configured (Phase 8, optional)
- [ ] Monitoring enabled

---

## 🚨 TROUBLESHOOTING

### "Access denied" in production
- Verify Airtable token has base access
- Check `AIRTABLE_BASE_ID` and `AIRTABLE_API_KEY` in Vercel

### WhatsApp messages not received
- Verify Twilio webhook URL is production URL
- Check Vercel logs for errors
- Verify `TWILIO_AUTH_TOKEN` is correct

### "NEXTAUTH_SECRET is not defined"
- Add `NEXTAUTH_SECRET` to Vercel environment variables
- Redeploy

### Dashboard shows no data
- Check Airtable API credentials in Vercel
- Verify tables have sample data
- Check browser console for errors

### Booking doesn't create appointments
- Verify `Salespeople` table has at least 1 active salesperson
- Verify `StoreAvailability` has time slots
- Check Vercel logs for errors

---

## 📊 ESTIMATED TIMELINE

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Fix Airtable Connection | 5 min | ⏳ Next |
| Phase 2: Configure Environment | 10 min | ⏳ Pending |
| Phase 3: Test Locally | 30 min | ⏳ Pending |
| Phase 4: Prepare Deployment | 15 min | ⏳ Pending |
| Phase 5: Deploy to Vercel | 10 min | ⏳ Pending |
| Phase 6: Configure Twilio | 5 min | ⏳ Pending |
| Phase 7: Production Testing | 15 min | ⏳ Pending |
| Phase 8: Post-Deployment | 10 min | ⏳ Pending |
| **TOTAL** | **~2 hours** | |

---

## 🎯 SUCCESS CRITERIA

✅ **You're live when:**
1. Dashboard accessible at your Vercel URL
2. Can login with admin credentials
3. WhatsApp "agendar" creates appointment
4. Appointment appears in Airtable
5. Salesperson receives WhatsApp notification
6. No errors in Vercel logs

---

**START WITH PHASE 1 NOW:** Fix the Airtable token access, then proceed sequentially through each phase.
