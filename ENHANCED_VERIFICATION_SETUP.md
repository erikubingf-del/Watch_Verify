# Enhanced Verification Setup Guide

This guide explains how to configure your Airtable base to support the Enhanced Watch Verification feature.

## 🎯 Overview

Enhanced Verification is a premium add-on that allows stores to verify watches customers want to **sell to them**. It includes:
- CPF collection and encryption
- Document cross-reference analysis (watch photo, guarantee card, invoice)
- GPT-4 Vision OCR for all documents
- Comprehensive markdown reports
- Legal disclaimers about preliminary analysis

---

## 📋 Required Airtable Fields

### 1. Settings Table - New Fields

Add these fields to your existing **Settings** table:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `verification_enabled` | Checkbox | ✅ | Toggle enhanced verification feature on/off |
| `offers_purchase` | Checkbox | ✅ | Store buys watches from customers (shows in welcome message) |
| `welcome_message` | Long text | ❌ | Update to mention watch purchases if `offers_purchase = true` |

**Example Welcome Message:**
```
Olá! Seja bem-vindo à Boutique Premium. Oferecemos relógios de luxo, joias e também **compramos relógios autênticos**. Como posso ajudar?
```

---

### 2. VerificationSessions Table - New Fields

Add these fields to your existing **VerificationSessions** table (or create if missing):

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `cpf` | Single line text | ✅ | Encrypted CPF (AES-256) |
| `customer_stated_model` | Single line text | ✅ | What customer said they want to sell (baseline for cross-reference) |
| `watch_photo_url` | URL | ❌ | Cloudinary URL of watch photo |
| `guarantee_card_url` | URL | ❌ | Cloudinary URL of guarantee card |
| `invoice_url` | URL | ❌ | Cloudinary URL of invoice/NF |
| `additional_documents` | Long text | ❌ | JSON array of additional document URLs |
| `date_mismatch_reason` | Long text | ❌ | Customer explanation if NF date ≠ guarantee date |
| `state` | Single select | ✅ | Current verification state |

**Single Select Options for `state`:**
- awaiting_cpf
- awaiting_watch_info
- awaiting_watch_photo
- awaiting_guarantee
- awaiting_invoice
- awaiting_date_explanation
- awaiting_optional_docs
- processing
- completed

---

### 3. WatchVerify Table - Enhanced Fields

Update your **WatchVerify** table with these additional fields:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `cpf` | Single line text | ✅ | Encrypted CPF |
| `customer_stated_model` | Single line text | ✅ | Customer's stated watch model |
| `issues` | Long text | ❌ | JSON array of critical issues |
| `recommendations` | Long text | ❌ | JSON array of passed checks |
| `notes` | Long text | ✅ | Full markdown verification report |
| `completed_at` | Date & time | ❌ | When verification was completed |

**Note:** The `notes` field will contain the comprehensive markdown report with legal disclaimers.

---

## 🔐 Environment Variables

Ensure these environment variables are set in your `.env.local`:

```env
# Cloudinary (for permanent media storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Encryption (generate a strong 32-character key)
VERIFICATION_ENCRYPTION_KEY=your_32_character_encryption_key
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 🚀 Enabling Enhanced Verification

### Step 1: Update Settings Table

1. Open your Airtable base
2. Go to **Settings** table
3. Find your tenant record
4. Set `verification_enabled` = ✅ (checked)
5. Set `offers_purchase` = ✅ (checked)
6. Update `welcome_message` to mention watch purchases

### Step 2: Test the Flow

Send a WhatsApp message to your bot:
```
Customer: "Quero vender meu Rolex"
```

Expected response:
```
AI: "Perfeito! Para iniciar a verificação, preciso do seu CPF."
```

### Step 3: Complete a Test Verification

Follow the full flow:
1. Send CPF
2. State watch model (e.g., "Rolex Submariner 116610LN")
3. Upload watch photo
4. Upload guarantee card
5. Upload invoice/NF
6. Choose to send report now or add optional documents

---

## 📊 Verification Report Structure

The system generates a comprehensive markdown report with these sections:

### Included in Report:
- ✅ Client info (masked CPF: `***.***. 123-45`)
- ✅ Documents received checklist
- ✅ Technical analysis (brand, model, reference, serial)
- ✅ Cross-reference table (photo vs guarantee vs NF)
- ✅ NF validation (SEFAZ - Brazil only, TODO)
- ✅ Observations (passed checks, store info)
- ✅ Alerts (critical issues, warnings)
- ✅ Recommendation (approved/review/rejected)
- ✅ **Legal disclaimer** (per user requirement):

```markdown
## ⚖️ AVISO LEGAL

**IMPORTANTE:** Este relatório é uma análise preliminar de documentação.

🔸 **Todos os relatórios são analisados mediante pagamento da taxa de verificação**
🔸 **NENHUM valor ou avaliação é definitivo sem inspeção física por relojoeiro qualificado**
🔸 **A autenticidade final e valor de mercado só podem ser determinados presencialmente**
🔸 **Este relatório NÃO constitui garantia de compra ou proposta de valor**
🔸 **Recomendamos fortemente avaliação presencial antes de qualquer transação**
```

- ✅ Document attachment links

---

## 🎛️ Customer-Facing Messages

### When Asking for Optional Documents:
```
Recebi todos os documentos principais! Para fortalecer a verificação, você pode enviar documentos adicionais (opcional):
- Fatura do cartão de crédito (comprovando a compra)
- Comprovante de viagem (se comprou no exterior)
- Box original do relógio
- Outros certificados ou documentos

Prefere enviar agora ou que eu envie o relatório atual para a boutique?
```

### Customer Summary (after completion):
```
✅ Verificação concluída!

Sua documentação foi analisada e enviada para a equipe da boutique.

⚠️ **Importante:** Este relatório é uma análise preliminar. Qualquer proposta de compra e valor só será definida após avaliação física do relógio por nossos especialistas.

Em breve entraremos em contato para agendar uma avaliação presencial.

Código de verificação: #VER-12345
```

---

## ⚠️ Known Limitations (To Be Implemented)

- [ ] **SEFAZ NF Validation** (Brazil only) - Not yet implemented
- [ ] **Store Owner WhatsApp Notification** - Logged but not sent
- [ ] **Late Document Submission** (2+ days later) - Not yet handled
- [ ] **Dashboard Verification Report Viewer** - Not yet built
- [ ] **PDF Export** - Not yet available

---

## 🔍 Cross-Reference Validation Logic

The system automatically checks:

1. **Reference Number Consistency:**
   - Photo reference = Guarantee reference = NF reference
   - If mismatch: ⚠️ Flag as critical issue

2. **Model Consistency:**
   - Customer stated model vs extracted from photo
   - Customer stated model vs guarantee card
   - If mismatch: ⚠️ Ask customer to clarify

3. **Date Consistency:**
   - Guarantee date vs NF date
   - Tolerance: 60 days
   - If > 60 days: ⚠️ Ask customer for explanation

4. **Serial Number Presence:**
   - Check if serial visible on watch photo
   - Check if serial on guarantee card
   - Cross-reference if both available

---

## 💰 Pricing Strategy (Recommendation)

**Premium Add-On:**
- R$ 50/verification (pay-per-use)
- R$ 299/month (unlimited verifications)

**Value Proposition:**
- Fraud prevention
- Time savings (automated cross-checking)
- Professional reports
- LGPD compliance (CPF encryption)
- Customer trust (AI analysis)

---

## 🎯 Next Steps

After completing this setup:

1. ✅ Test full verification flow
2. ✅ Review generated reports
3. 🔄 Implement SEFAZ NF validation (Brazil)
4. 🔄 Build dashboard verification viewer
5. 🔄 Add store owner WhatsApp notifications
6. 🔄 Implement late document submission handler

---

**Ready to verify luxury watches! 🚀**

_Last Updated: 2025-11-20_
