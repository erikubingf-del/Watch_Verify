# 🔑 Airtable API Token Setup Guide

## Current Status

✅ Base ID: `appig3KRYD5neBJqV`
✅ Token saved in `.env.local`
❌ Access denied error

---

## 🔧 Fix "Access Denied" Error

### Step 1: Verify Token Has Correct Scopes

1. Go to: https://airtable.com/create/tokens
2. Find your token (starts with `pat...`)
3. Click **"Edit"**
4. Verify these scopes are checked:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ `schema.bases:read` (optional but recommended)

### Step 2: Add Base Access

**CRITICAL:** The token must have access to your specific base!

1. Still in token settings, scroll to **"Access"** section
2. Click **"Add a base"**
3. Search for: **"Verify"**
4. Select your base (ID: `appig3KRYD5neBJqV`)
5. Click **"Save changes"**

### Step 3: Verify Base ID

1. Open your Airtable base in browser
2. Check the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. Confirm it matches: `appig3KRYD5neBJqV`
4. If different, copy the correct Base ID

---

## 🧪 Test After Fixing

After updating the token, test the connection:

```bash
# Method 1: Using curl (replace YOUR_TOKEN with your actual token)
curl -X GET "https://api.airtable.com/v0/appig3KRYD5neBJqV/Tenants?maxRecords=1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# You should see JSON response with records, NOT "Access denied"
```

```bash
# Method 2: Start dev server and test API
npm run dev

# In another terminal:
curl http://localhost:3000/api/export?scope=customers
```

---

## ✅ Expected Success Response

When the token is configured correctly, you'll see:

```json
{
  "records": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "fields": {
        "name": "Boutique Premium SP",
        ...
      }
    }
  ]
}
```

**NOT:** `Access denied`

---

## 🔍 Common Issues

### "Access denied"
- **Cause:** Token doesn't have access to the base
- **Fix:** Add base access in token settings (Step 2 above)

### "NOT_FOUND"
- **Cause:** Table doesn't exist yet
- **Fix:** Create the table in Airtable first

### "AUTHENTICATION_REQUIRED"
- **Cause:** Token is invalid or expired
- **Fix:** Generate a new token

---

## 📊 Which Tables Should Exist?

After you create tables in Airtable, these should be accessible:

**Phase 1 (Must create first):**
- Tenants
- StoreNumbers
- Users

**Phase 2 (For booking test):**
- Salespeople
- Appointments
- StoreAvailability
- BookingSessions

**Optional:**
- Customers
- Messages
- Catalog
- WatchVerify
- Settings
- VerificationSessions
- PaymentProviders
- PaymentLinks
- Campaigns
- CampaignSessions

---

## 🚀 Next Steps

1. **Fix token access** (Steps 1-2 above)
2. **Create tables** in Airtable (follow `AIRTABLE_SAMPLE_DATA_GUIDE.md`)
3. **Test connection** again
4. **Add sample data** (minimum 5 tables with 7 records)

---

## 💡 Quick Fix Checklist

- [ ] Token has `data.records:read` scope
- [ ] Token has `data.records:write` scope
- [ ] Token has access to base "Verify" (`appig3KRYD5neBJqV`)
- [ ] Base ID matches your browser URL
- [ ] At least Table 1 (Tenants) exists in Airtable
- [ ] Token saved in `.env.local`

Once all checked, the connection will work! ✅
