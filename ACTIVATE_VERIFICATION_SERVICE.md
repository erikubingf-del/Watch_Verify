# 🔧 How to Activate Watch Verification Service

## Quick Overview

The watch verification service is controlled by **two checkboxes** in the Settings table in Airtable.

---

## 📋 Activation Steps

### 1. Open Airtable Settings Table

Go to your Airtable base → **Settings** table

### 2. Find Your Tenant Record

Locate the record for tenant: `recduwNrt9qNPH07h`

### 3. Check the Required Fields

Enable these two checkboxes:

| Field | Type | Enable? | Purpose |
|-------|------|---------|---------|
| `verification_enabled` | Checkbox | ✅ **YES** | Activates the enhanced verification feature |
| `offers_purchase` | Checkbox | ✅ **YES** | Store accepts watches to buy from customers |

### 4. Save Changes

That's it! The service is now active.

---

## 🧪 Testing the Service

### Send WhatsApp Message

**To**: +1 762-372-7247

**Message**: "Quero vender meu Rolex"

### Expected Flow

```
You: Quero vender meu Rolex

AI: Perfeito! Vou ajudar na avaliação.
    Primeiro, preciso do seu CPF para registro.

You: 123.456.789-00

AI: Obrigado! Qual modelo do Rolex?

You: Submariner 2020

AI: Ótimo! Agora envie uma foto clara do relógio.

[You send photo]

AI: Recebi! Agora preciso do cartão de garantia.

[You send guarantee card photo]

AI: Perfeito! Por último, a nota fiscal (se tiver).

[You send invoice photo or say "não tenho"]

AI: Analisando documentos... [AI processes with GPT-4 Vision]

    ✅ Documentação completa!
    ICD Score: 85/100
    Risco Legal: Baixo

    Verificação concluída. Patricia entrará em contato!
```

---

## 📊 Where to See Results

### Dashboard - Verifications Page

**URL**: https://crmlx.vercel.app/dashboard/verifications

**What You'll See**:
- Customer name and CPF (masked: `***.***. 789-00`)
- Watch details: Rolex Submariner 2020
- ICD Score: 85 (color-coded badge)
- Legal Risk: "Documentação Completa" (green)
- Critical Issues: (empty or warnings)
- Document URLs: Links to all uploaded photos

### Airtable - VerificationSessions Table

**Direct Access**: Check the `VerificationSessions` table in Airtable

**Expected Fields**:
- `customer_phone`: Your WhatsApp number
- `state`: "completed" (final state)
- `watch_brand`: Rolex
- `watch_model`: Submariner 2020
- `cpf`: Encrypted value
- `photo_url`, `guarantee_url`, `invoice_url`: Cloudinary links
- `icd_score`: 85
- `legal_risk`: "low"

---

## ⚠️ If Verification DOESN'T Trigger

### Troubleshooting Checklist:

1. **Check Settings Table**:
   - Open Airtable → Settings table
   - Verify `verification_enabled` = ✅ checked
   - Verify `offers_purchase` = ✅ checked
   - Make sure you're looking at the correct tenant record

2. **Check Environment Variables**:
   - Vercel Dashboard → Settings → Environment Variables
   - Verify `VERIFICATION_ENCRYPTION_KEY` exists (32+ characters)
   - If missing, add it and redeploy

3. **Check Vercel Deployment**:
   - Go to Vercel Dashboard
   - Check latest deployment succeeded
   - If Settings were just changed, redeploy the app

4. **Check Webhook Logs**:
   - Vercel → Functions → `/api/webhooks/twilio`
   - Look for errors related to verification
   - Check if `isEnhancedVerificationEnabled()` returns true

---

## 🔄 How to Disable Verification

Simply **uncheck** the two fields in Settings table:
- `verification_enabled` = ❌ unchecked
- `offers_purchase` = ❌ unchecked

When disabled, the AI will respond:
> "Lamento, mas no momento não oferecemos compra de relógios usados. Posso ajudar com verificação/autenticação se você precisar avaliar seu relógio."

---

## 💡 Important Notes

### Security:
- CPF is **always encrypted** in Airtable (using AES-256)
- CPF is **always masked** in dashboard (***.***.XXX-XX)
- Only visible to authorized users with Airtable access

### Service Types:
- ✅ **Verification/Authentication**: AI helps verify watch authenticity (ENABLED with these settings)
- ❌ **Watch Buying for Resale**: Store buys watches to resell (CONTROLLED by `offers_purchase`)

The two are different:
- **Verification**: Customer wants to know if their watch is authentic
- **Buying**: Customer wants to sell their watch to the store

### Cost:
- GPT-4 Vision API calls are triggered for photo analysis
- Cloudinary storage for uploaded documents
- Monitor usage in OpenAI dashboard

---

## 📈 Success Criteria

After testing, you should see:

✅ Verification appears in dashboard/verifications
✅ CPF is masked in UI
✅ ICD Score badge is color-coded
✅ Legal Risk assessment is shown
✅ All document URLs are accessible
✅ VerificationSessions record exists in Airtable

---

**Ready to activate! Just check those two boxes in Settings table.**

---

*Generated with [Claude Code](https://claude.com/claude-code) - Watch Verify CRM Documentation*
