# Watch Verify - Complete Setup Guide

This guide will walk you through setting up Watch Verify from scratch to deployment.

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Git
- Accounts for:
  - Airtable (Pro plan recommended)
  - OpenAI API
  - Twilio (with WhatsApp Business)
  - Make.com (Pro plan)
  - Vercel (for deployment)

---

## Part 1: Local Development Setup (30 minutes)

### Step 1: Clone and Install

```bash
git clone https://github.com/yourusername/watch-verify.git
cd watch-verify
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Open `.env.local` and fill in your credentials:

```bash
# Airtable - Get from https://airtable.com/create/apikey
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX

# OpenAI - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Twilio - Get from https://console.twilio.com
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Make.com - Create a webhook in Make.com and paste URL here
MAKE_WEBHOOK_ALERT=https://hook.eu2.make.com/XXXXXXXXXXXXXXXX

# NextAuth - Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXTAUTH_URL=http://localhost:3000

# Upstash Redis (optional, for rate limiting)
# Get from https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://XXXXXXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

NODE_ENV=development
```

### Step 3: Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in `.env.local`.

---

## Part 2: Airtable Setup (45 minutes)

### Step 1: Create New Base

1. Go to https://airtable.com/create
2. Click "Start from scratch"
3. Name it "Watch Verify CRM"
4. Copy the Base ID from the URL (format: `appXXXXXXXXXXXXXX`)
5. Paste it into `.env.local` as `AIRTABLE_BASE_ID`

### Step 2: Create Tables

Create **8 tables** with the exact names and fields listed below. Full schema is in `AIRTABLE_SCHEMA.md`.

#### Table 1: Tenants
- `name` (Single line text) ✅ Required
- `logo_url` (URL)
- `primary_color` (Single line text)
- `twilio_number` (Phone) ✅ Required
- `created_at` (Date & time) ✅ Required
- `active` (Checkbox) ✅ Required

#### Table 2: StoreNumbers
- `tenant_id` (Link to Tenants) ✅ Required
- `phone` (Phone) ✅ Required, Unique
- `active` (Checkbox) ✅ Required

#### Table 3: Customers
- `tenant_id` (Link to Tenants) ✅ Required
- `phone` (Phone) ✅ Required
- `name` (Single line text)
- `email` (Email)
- `last_interest` (Single line text)
- `created_at` (Date & time) ✅ Required
- `deleted_at` (Date & time)

#### Table 4: Messages
- `tenant_id` (Link to Tenants) ✅ Required
- `phone` (Phone) ✅ Required
- `body` (Long text) ✅ Required
- `direction` (Single select: inbound, outbound) ✅ Required
- `media_url` (URL)
- `created_at` (Date & time) ✅ Required

#### Table 5: WatchVerify
- `tenant_id` (Link to Tenants) ✅ Required
- `customer` (Single line text) ✅ Required
- `phone` (Phone) ✅ Required
- `brand` (Single line text) ✅ Required
- `model` (Single line text)
- `reference` (Single line text)
- `serial` (Single line text)
- `icd` (Number) ✅ Required
- `status` (Single select: pending, in_progress, completed, approved, manual_review, rejected) ✅ Required
- `photo_url` (URL)
- `guarantee_url` (URL)
- `invoice_url` (URL)
- `notes` (Long text)
- `created_at` (Date & time) ✅ Required

#### Table 6: Catalog
- `tenant_id` (Link to Tenants) ✅ Required
- `title` (Single line text) ✅ Required
- `description` (Long text) ✅ Required
- `category` (Single select: watches, rings, necklaces, bracelets, earrings, other) ✅ Required
- `price` (Currency)
- `image_url` (URL)
- `tags` (Multiple select)
- `embedding_id` (Single line text)
- `active` (Checkbox) ✅ Required

#### Table 7: Settings
- `tenant_id` (Link to Tenants) ✅ Required
- `brand` (Single line text)
- `logo` (URL)
- `primary` (Single line text)
- `welcome_message` (Long text)
- `business_hours` (Long text)
- `updated_at` (Date & time) ✅ Required

#### Table 8: Users
- `tenant_id` (Link to Tenants) ✅ Required
- `email` (Email) ✅ Required, Unique
- `password_hash` (Single line text) ✅ Required
- `name` (Single line text) ✅ Required
- `role` (Single select: admin, manager, staff) ✅ Required
- `active` (Checkbox) ✅ Required
- `created_at` (Date & time) ✅ Required

### Step 3: Generate API Token

1. Go to https://airtable.com/create/tokens
2. Click "Create new token"
3. Name it "Watch Verify API"
4. Add scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
5. Add access to your "Watch Verify CRM" base
6. Click "Create token"
7. Copy token to `.env.local` as `AIRTABLE_API_KEY`

### Step 4: Add Sample Data

#### Create First Tenant
In the Tenants table, add:
- name: `Test Store`
- twilio_number: `+5511999999999` (your Twilio number)
- active: ✅ checked
- created_at: (current date/time)

#### Create First User
1. Generate password hash:
```bash
npm run hash-password "admin123"
```

2. Copy the hash output

3. In the Users table, add:
- tenant_id: (link to Test Store)
- email: `admin@teststore.com`
- password_hash: (paste the hash)
- name: `Admin User`
- role: `admin`
- active: ✅ checked
- created_at: (current date/time)

---

## Part 3: OpenAI Setup (5 minutes)

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "Watch Verify"
4. Copy the key to `.env.local` as `OPENAI_API_KEY`
5. Add billing method if not already done

**Cost Estimate:** ~$0.002 per message with GPT-4o

---

## Part 4: Twilio Setup (20 minutes)

### Step 1: Get WhatsApp Number

1. Go to https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Follow the guide to enable WhatsApp on your Twilio number
3. Or buy a new WhatsApp-enabled number

### Step 2: Configure Webhook

1. Go to https://console.twilio.com/us1/develop/sms/settings/whatsapp-sender
2. Find your WhatsApp number
3. Under "When a message comes in", enter:
   ```
   http://localhost:3000/api/webhooks/twilio
   ```
   (You'll update this to your Vercel URL after deployment)
4. Set method to `POST`
5. Save

### Step 3: Copy Credentials

1. Go to https://console.twilio.com
2. Copy Account SID to `.env.local` as `TWILIO_ACCOUNT_SID`
3. Copy Auth Token to `.env.local` as `TWILIO_AUTH_TOKEN`

---

## Part 5: Make.com Setup (30 minutes)

### Scenario 1: Daily ICD Alert

1. Create new scenario: "Watch Verify - Daily ICD Alert"
2. Add modules:

**Module 1: Schedule (Trigger)**
- Schedule: Every day at 7:00 AM
- Timezone: America/Sao_Paulo

**Module 2: HTTP - Make a request**
- URL: `https://your-domain.vercel.app/api/export?scope=today`
- Method: GET
- Parse response: Yes

**Module 3: Array Iterator**
- Array: `{{2.rows}}`

**Module 4: Filter**
- Condition: `{{3.icd}}` Less than `80`

**Module 5: HTTP - Make a request**
- URL: `https://your-domain.vercel.app/api/alert`
- Method: POST
- Body type: Raw
- Content type: JSON
- Request content:
```json
{
  "customer": "{{3.customer}}",
  "phone": "{{3.phone}}",
  "brand": "{{3.brand}}",
  "model": "{{3.model}}",
  "icd": {{3.icd}},
  "message": "ICD score below threshold"
}
```

**Module 6: Email - Send an email**
- To: `manager@yourstore.com`
- Subject: `⚠️ Watch Verification Alert - ICD < 80`
- Body:
```
Customer: {{3.customer}}
Phone: {{3.phone}}
Watch: {{3.brand}} {{3.model}}
ICD Score: {{3.icd}}
Status: Requires manual review
```

3. Save and activate scenario

### Scenario 2: Monthly Report

1. Create new scenario: "Watch Verify - Monthly Report"
2. Add modules:

**Module 1: Schedule (Trigger)**
- Schedule: 1st day of every month at 9:00 AM
- Timezone: America/Sao_Paulo

**Module 2: HTTP - Make a request**
- URL: `https://your-domain.vercel.app/api/export?scope=month&format=csv`
- Method: GET

**Module 3: Email - Send an email**
- To: `admin@yourstore.com`
- Subject: `📊 Watch Verify - Monthly Report`
- Body: `Attached is the monthly verification report.`
- Attachments:
  - Filename: `watch_verify_monthly.csv`
  - Data: `{{2.data}}`
  - MIME type: `text/csv`

3. Save and activate scenario

### Step 3: Copy Webhook URL

1. In Make.com, create a new scenario
2. Add "Webhooks - Custom webhook" as trigger
3. Copy the webhook URL
4. Paste to `.env.local` as `MAKE_WEBHOOK_ALERT`

---

## Part 6: Run Locally (5 minutes)

```bash
npm run dev
```

Open http://localhost:3000

### Test Login

1. Go to http://localhost:3000/login
2. Email: `admin@teststore.com`
3. Password: `admin123`
4. Should redirect to dashboard

### Test Twilio Webhook (Optional)

Use ngrok to expose local server:

```bash
npx ngrok http 3000
```

Copy the HTTPS URL and update Twilio webhook to:
```
https://YOUR-NGROK-URL.ngrok.io/api/webhooks/twilio
```

Send a WhatsApp message to your Twilio number to test.

---

## Part 7: Deploy to Vercel (15 minutes)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial Watch Verify setup"
git push origin main
```

### Step 2: Import to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your watch-verify repo
4. Click "Import"

### Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add ALL variables from `.env.local`:

```
AIRTABLE_BASE_ID
AIRTABLE_API_KEY
OPENAI_API_KEY
OPENAI_CHAT_MODEL
OPENAI_EMBEDDING_MODEL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
MAKE_WEBHOOK_ALERT
NEXTAUTH_SECRET
NEXTAUTH_URL (set to your Vercel domain, e.g., https://watch-verify.vercel.app)
UPSTASH_REDIS_REST_URL (optional)
UPSTASH_REDIS_REST_TOKEN (optional)
NODE_ENV=production
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2 minutes)
3. Copy your Vercel URL (e.g., `watch-verify.vercel.app`)

### Step 5: Update Integrations

1. **Twilio**: Update webhook URL to `https://watch-verify.vercel.app/api/webhooks/twilio`
2. **Make.com**: Update all scenario URLs from localhost to your Vercel domain
3. **NextAuth**: Add `NEXTAUTH_URL=https://watch-verify.vercel.app` in Vercel env vars
4. Redeploy Vercel project for env var changes to take effect

---

## Part 8: Testing (30 minutes)

### Test 1: Authentication
- ✅ Can log in with created user
- ✅ Redirects to /login when not authenticated
- ✅ Can log out successfully

### Test 2: WhatsApp Integration
1. Send message to Twilio number: "Olá"
2. Should receive AI response
3. Check Airtable Messages table for logged message

### Test 3: Dashboard
- ✅ /dashboard/customers shows customer list
- ✅ /dashboard/watch-verify shows verifications
- ✅ /dashboard/settings can be updated

### Test 4: Export
1. Visit `/api/export?scope=customers`
2. Should return JSON with customer data
3. Visit `/api/export?scope=today&format=csv`
4. Should download CSV file

### Test 5: Make.com Alerts
1. Manually trigger the ICD alert scenario
2. Check that email is received
3. Verify alert appears in logs

---

## Part 9: Production Checklist

Before going live with real customers:

- [ ] Add real user accounts for all staff
- [ ] Configure custom domain in Vercel
- [ ] Set up monitoring (Sentry, Vercel Analytics)
- [ ] Test with 10+ sample conversations
- [ ] Verify ICD calculation with real watch data
- [ ] Set up backup/export procedures
- [ ] Configure rate limiting (add Upstash Redis)
- [ ] Review all error handling
- [ ] Test LGPD delete functionality
- [ ] Create runbook for common issues
- [ ] Train staff on dashboard usage
- [ ] Set up customer support workflow
- [ ] Load test with 50 concurrent users
- [ ] Review and optimize OpenAI costs
- [ ] Set budget alerts on all services

---

## Troubleshooting

### "Missing required environment variables"
- Check that all vars from `.env.example` are in `.env.local`
- In Vercel, verify all env vars are set in project settings
- Redeploy after adding env vars

### Twilio webhook not working
- Verify webhook URL is correct (HTTPS only)
- Check Twilio console for error logs
- Test webhook with curl:
```bash
curl -X POST https://your-domain.vercel.app/api/webhooks/twilio \
  -d "From=whatsapp:+5511999999999" \
  -d "Body=test message"
```

### Authentication fails
- Verify password hash was generated correctly
- Check NEXTAUTH_SECRET is set
- Clear browser cookies and try again
- Check Airtable Users table has active=true

### Build fails on Vercel
- Run `npm run build` locally first
- Check for TypeScript errors
- Verify all imports use correct paths (@/...)
- Check Vercel build logs for specific error

### Rate limit errors
- Set up Upstash Redis for proper rate limiting
- Or temporarily disable rate limiting for testing

---

## Next Steps

After successful setup:

1. **Customize AI Prompts**: Edit `app/api/ai-responder/route.ts` system prompt
2. **Add Catalog Items**: Populate Catalog table for RAG recommendations
3. **Configure White-Label**: Update Settings table with logo/colors
4. **Set Up Analytics**: Add Vercel Analytics or Google Analytics
5. **Implement ICD Logic**: Complete watch verification workflow
6. **Add More Tenants**: Onboard additional jewelry stores

For detailed implementation of Phase 2-7, see the main technical audit document.

---

## Support

- **Documentation**: See README.md, AIRTABLE_SCHEMA.md
- **Issues**: https://github.com/yourusername/watch-verify/issues
- **Email**: your-email@domain.com

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Airtable Pro | $20/seat |
| OpenAI API | $150-300 |
| Twilio WhatsApp | $5-250 |
| Make.com Pro | $29 |
| Vercel Pro | $20 |
| Upstash Redis | Free |
| **TOTAL** | **$224-619/mo** |

Scale economics: At 100 stores charging $50/mo each = $5,000 MRR → $4,400 profit/mo
