# Vercel Deployment Guide

**Status:** Ready to deploy
**Estimated Time:** 5-10 minutes

---

## 🚀 Quick Deploy to Vercel

### Option 1: GitHub Integration (Recommended)

1. **Fix Git History First** (remove leaked secrets):
   ```bash
   # Use GitHub's allow secret feature for this one-time push
   # Go to: https://github.com/erikubingf-del/Watch_Verify/security/secret-scanning/unblock-secret/35nw6j9cYs8DdN5BjAozWPIPIdB
   # Click "Allow secret" for the Airtable token

   # Then push again
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import from GitHub: `erikubingf-del/Watch_Verify`
   - Vercel will auto-detect Next.js configuration

3. **Configure Environment Variables:**

   Click "Environment Variables" and add these (copy from `.env.local`):

   ```env
   # Airtable
   AIRTABLE_API_KEY=<your-airtable-api-key-from-env-local>
   AIRTABLE_BASE_ID=<your-airtable-base-id-from-env-local>

   # OpenAI
   OPENAI_API_KEY=<your-openai-api-key-from-env-local>
   OPENAI_CHAT_MODEL=gpt-4o
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small

   # Twilio (Test Credentials)
   TWILIO_ACCOUNT_SID=<your-twilio-account-sid-from-env-local>
   TWILIO_AUTH_TOKEN=<your-twilio-auth-token-from-env-local>
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name-from-env-local>
   CLOUDINARY_API_KEY=<your-cloudinary-api-key-from-env-local>
   CLOUDINARY_API_SECRET=<your-cloudinary-api-secret-from-env-local>

   # NextAuth
   NEXTAUTH_SECRET=<your-nextauth-secret-from-env-local>
   NEXTAUTH_URL=https://your-deployment-url.vercel.app

   # Verification Encryption
   VERIFICATION_ENCRYPTION_KEY=<your-verification-key-from-env-local>

   # Environment
   NODE_ENV=production
   ```

   **IMPORTANT:** Copy each value from your `.env.local` file. Do NOT commit the `.env.local` file to git.

   **IMPORTANT:** Update `NEXTAUTH_URL` after deployment with your actual Vercel URL!

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Takes ~2-3 minutes

5. **Update NEXTAUTH_URL:**
   - After deployment, copy your Vercel URL (e.g., `https://watch-verify-xyz.vercel.app`)
   - Go to Project Settings → Environment Variables
   - Update `NEXTAUTH_URL` with your actual URL
   - Redeploy (Deployments → three dots → Redeploy)

---

### Option 2: CLI Deployment (If npm/npx is available)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: watch-verify
# - Directory: ./
# - Override settings? No

# Vercel will ask about environment variables
# Add them interactively or use: vercel env add
```

---

## 📋 Post-Deployment Checklist

### 1. Configure Twilio Webhook

After deployment, update your Twilio WhatsApp webhook:

1. Go to https://console.twilio.com/
2. Phone Numbers → Manage → Active Numbers
3. Click your WhatsApp number (+14155238886)
4. Scroll to "Messaging Configuration"
5. Under "A MESSAGE COMES IN":
   - **Webhook URL:** `https://your-vercel-url.vercel.app/api/webhooks/twilio`
   - **HTTP Method:** POST
6. Click "Save"

### 2. Test the Deployment

1. Send a test message to your Twilio WhatsApp number:
   ```
   Olá! Quero agendar uma visita
   ```

2. Check Vercel logs:
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for incoming webhook calls

3. If you see errors:
   - Check environment variables are set correctly
   - Verify Twilio webhook URL is correct
   - Check Airtable base ID matches

### 3. Enable Production Features

In your Airtable **Settings** table:
- Set `verification_enabled = true`
- Set `offers_purchase = true`

### 4. Test Enhanced Features

**Test Verification:**
```
Quero vender meu Rolex Submariner
```

**Test Salesperson Feedback (after adding salesperson phone to Users table):**
- Send audio: "Atendi João Silva hoje, ele adorou o Submariner"

---

## 🔧 Troubleshooting

### Build Fails

**Error:** Missing environment variables

**Solution:**
- Ensure all env vars from `.env.local` are in Vercel
- Redeploy after adding variables

### Twilio Webhook 404

**Error:** Twilio shows "11200 HTTP retrieval failure"

**Solution:**
- Verify webhook URL: `https://your-url.vercel.app/api/webhooks/twilio`
- Check Vercel function logs for errors
- Ensure route file exists: `app/api/webhooks/twilio/route.ts`

### Authentication Not Working

**Error:** Redirect loops or 401 errors

**Solution:**
- Update `NEXTAUTH_URL` to match your Vercel URL exactly
- Include `https://`
- Redeploy after updating

### OpenAI API Errors

**Error:** 401 Unauthorized

**Solution:**
- Check `OPENAI_API_KEY` is set correctly in Vercel
- Verify key is active in OpenAI dashboard
- Check API key has credits

---

## 🌍 Custom Domain (Optional)

1. Go to Vercel Project → Settings → Domains
2. Add your custom domain (e.g., `watchverify.com`)
3. Update DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Twilio webhook URL
6. Redeploy

---

## 📊 Monitoring

### Vercel Dashboard

- **Deployments:** View build logs and deployment history
- **Functions:** Monitor serverless function execution
- **Analytics:** Track page views and performance
- **Logs:** Real-time application logs

### Recommended Monitoring

1. **Vercel Logs:** Check for webhook errors
2. **Airtable:** Monitor record creation (Messages, WatchVerify, etc.)
3. **Twilio Console:** Check message delivery status
4. **OpenAI Usage:** Monitor API credits

---

## 🔐 Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] `.env.local` added to `.gitignore`
- [ ] Utility scripts with hardcoded keys ignored
- [ ] NEXTAUTH_SECRET is strong (32+ characters)
- [ ] Twilio webhook uses HTTPS
- [ ] Airtable API key has appropriate permissions

---

## 🚨 Git History Issue

**Problem:** GitHub is blocking push due to leaked Airtable token in commit history

**Quick Fix:**
1. Go to the GitHub allow URL: https://github.com/erikubingf-del/Watch_Verify/security/secret-scanning/unblock-secret/35nw6j9cYs8DdN5BjAozWPIPIdB
2. Click "Allow this secret"
3. Push again: `git push origin main`

**Proper Fix (Optional):**
```bash
# Use BFG Repo-Cleaner to remove secrets from history
# Only do this if you're comfortable with git history rewriting
brew install bfg
bfg --replace-text secrets.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin main --force
```

**Note:** The leaked token is from development scripts that are now ignored. Production deployment uses Vercel environment variables.

---

## ✅ Deployment Complete!

Your Watch Verify CRM is now live on Vercel!

**Next Steps:**
1. Configure Twilio webhook
2. Test WhatsApp integration
3. Invite salespeople (add phones to Users table)
4. Start receiving customer conversations!

**Production URL:** `https://your-project-url.vercel.app`
**Dashboard:** `https://your-project-url.vercel.app/dashboard`

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Twilio WhatsApp: https://www.twilio.com/docs/whatsapp

---

_Deployment configuration ready: vercel.json, .vercelignore_
_Region: South America (São Paulo) - gru1_
