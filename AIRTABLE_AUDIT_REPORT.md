# Airtable Schema Audit Report

**Date:** 2025-11-20
**Base ID:** appig3KRYD5neBJqV

---

## 📊 Current Status Summary

Based on code analysis, here's what needs to be created/updated in your Airtable base to support the new features.

---

## ✅ Existing Tables (Assumed Working)

These tables should already exist based on the codebase:

1. **Tenants** - Store information
2. **Store Numbers** - Twilio number mapping
3. **Users** - Dashboard users
4. **Customers** - Customer registry
5. **Messages** - WhatsApp conversation history
6. **Catalog** - Product inventory
7. **Embeddings** - Semantic search cache
8. **WatchVerify** - Watch verification records
9. **Settings** - Per-tenant configuration
10. **Appointments** - Booking records
11. **StoreAvailability** - Time slot configuration
12. **BookingSessions** - Temporary booking state

---

## ❌ MISSING TABLES - Must Create

### 1. VerificationSessions (NEW - Required for Enhanced Verification)

**Purpose:** Temporary state storage for enhanced watch verification flow

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Store tenant |
| `customer_phone` | Phone | ✅ | Customer WhatsApp number |
| `customer_name` | Single line text | ✅ | Customer name |
| `cpf` | Single line text | ✅ | Encrypted CPF (AES-256) |
| `customer_stated_model` | Single line text | ✅ | Customer's stated watch model |
| `watch_photo_url` | URL | ❌ | Cloudinary URL of watch photo |
| `guarantee_card_url` | URL | ❌ | Cloudinary URL of guarantee card |
| `invoice_url` | URL | ❌ | Cloudinary URL of invoice/NF |
| `additional_documents` | Long text | ❌ | JSON array of additional document URLs |
| `date_mismatch_reason` | Long text | ❌ | Customer explanation for date differences |
| `state` | Single select | ✅ | Current verification state |
| `created_at` | Date & time | ✅ | Session creation timestamp |

**Single Select Options for `state`:**
```
awaiting_cpf
awaiting_watch_info
awaiting_watch_photo
awaiting_guarantee
awaiting_invoice
awaiting_date_explanation
awaiting_optional_docs
processing
completed
```

---

### 2. FeedbackSessions (NEW - Required for Salesperson Feedback)

**Purpose:** Temporary state storage for salesperson feedback workflow

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Store tenant |
| `salesperson_phone` | Phone | ✅ | Salesperson WhatsApp number |
| `customer_phone` | Phone | ❌ | Customer identified |
| `customer_name` | Single line text | ❌ | Customer name mentioned |
| `feedback_type` | Single select | ✅ | "audio" or "text" |
| `raw_input` | Long text | ✅ | Original audio URL or text |
| `transcription` | Long text | ❌ | Whisper transcription (if audio) |
| `extracted_data` | Long text | ❌ | JSON of extracted fields |
| `matched_customers` | Long text | ❌ | JSON array of matched customers |
| `state` | Single select | ✅ | Current feedback state |
| `created_at` | Date & time | ✅ | Feedback timestamp |

**Single Select Options for `feedback_type`:**
```
audio
text
```

**Single Select Options for `state`:**
```
awaiting_transcription
awaiting_extraction
awaiting_disambiguation
awaiting_new_customer_confirm
awaiting_confirmation
awaiting_follow_up
completed
cancelled
```

---

### 3. BrandKnowledge (NEW - Optional but Recommended)

**Purpose:** Store luxury brand expertise for AI conversations

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ❌ | Store tenant (empty = global) |
| `brand_name` | Single line text | ✅ | Brand name (e.g., "Rolex") |
| `history_summary` | Long text | ❌ | Brand heritage/history |
| `key_selling_points` | Long text | ❌ | What to emphasize when selling |
| `technical_highlights` | Long text | ❌ | Movements, materials, innovations |
| `target_customer_profile` | Long text | ❌ | Ideal customer for this brand |
| `conversation_vocabulary` | Long text | ❌ | Words/phrases to use |
| `price_positioning` | Long text | ❌ | How to discuss pricing |
| `must_avoid` | Long text | ❌ | Topics to never mention |
| `active` | Checkbox | ✅ | Whether brand knowledge is active |

**Example Record:**
```
brand_name: "Rolex"
history_summary: "Founded 1905, Swiss luxury watchmaker known for precision and prestige"
key_selling_points: "Timeless design, investment value, status symbol"
technical_highlights: "Oyster case, Perpetual movement, Chronometer certified"
target_customer_profile: "Successful professionals, collectors, heritage appreciators"
conversation_vocabulary: "investimento, herança, precisão, prestígio"
must_avoid: "fake, replica, comparison with cheaper brands"
active: true
```

---

### 4. Salespeople (OPTIONAL - If not using Users table)

**Purpose:** Store salesperson information separately from dashboard users

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Store tenant |
| `name` | Single line text | ✅ | Salesperson name |
| `phone` | Phone | ✅ | WhatsApp number |
| `email` | Email | ❌ | Email address |
| `active` | Checkbox | ✅ | Whether salesperson is active |
| `created_at` | Date & time | ✅ | Registration date |

**Note:** Only needed if you want to separate salespeople from dashboard users. Otherwise, use the existing Users table.

---

## ⚠️ EXISTING TABLES - Fields to Add

### 1. Settings Table - Add These Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `verification_enabled` | Checkbox | ✅ | Toggle enhanced verification feature |
| `offers_purchase` | Checkbox | ✅ | Store buys watches from customers |

**Why:** Controls which premium features are enabled per tenant.

---

### 2. Customers Table - Add These Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `budget_min` | Number | ❌ | Minimum budget (R$) |
| `budget_max` | Number | ❌ | Maximum budget (R$) |
| `birthday` | Single line text | ❌ | Birthday in MM-DD format (no year) |
| `hobbies` | Long text | ❌ | Customer hobbies (comma-separated) |
| `notes` | Long text | ❌ | Salesperson notes (append-only) |
| `last_visit` | Date | ❌ | Last visit date |
| `updated_at` | Date & time | ❌ | Last update timestamp |

**Why:** Enables salesperson feedback system to enrich customer profiles.

**Example Data:**
```
budget_min: 40000
budget_max: 60000
birthday: "03-15"
hobbies: "Golfe, Viajar, Coleção de relógios"
notes: "[2024-11-20] Cliente VIP, conhece muito de relógios\n[2024-11-15] Interessado em GMT"
last_visit: "2024-11-20"
updated_at: "2024-11-20T15:30:00Z"
```

---

### 3. WatchVerify Table - Verify These Fields Exist

Should already have these, but double-check:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `cpf` | Single line text | ❌ | Encrypted CPF |
| `issues` | Long text | ❌ | JSON array of critical issues |
| `recommendations` | Long text | ❌ | JSON array of passed checks |
| `notes` | Long text | ❌ | Full markdown verification report |
| `completed_at` | Date & time | ❌ | Verification completion timestamp |

---

## 🚀 Priority Implementation Order

### Phase 1: Essential for Enhanced Verification (HIGH PRIORITY)
1. ✅ Create **VerificationSessions** table
2. ✅ Add `verification_enabled` and `offers_purchase` to **Settings** table
3. ✅ Verify **WatchVerify** table has all required fields

### Phase 2: Essential for Salesperson Feedback (HIGH PRIORITY)
1. ✅ Create **FeedbackSessions** table
2. ✅ Add budget, birthday, hobbies, notes, last_visit, updated_at to **Customers** table
3. ✅ Ensure **Users** or **Salespeople** table has phone field

### Phase 3: Enhanced Experience (MEDIUM PRIORITY)
1. ⚠️ Create **BrandKnowledge** table
2. ⚠️ Populate with 5-10 luxury brands

### Phase 4: Optional Improvements (LOW PRIORITY)
1. ⭐ Create separate **Salespeople** table (if not using Users)

---

## 📋 Quick Setup Checklist

Copy this checklist and check off as you complete:

### Enhanced Verification System:
- [ ] Create VerificationSessions table with 12 fields
- [ ] Add Single Select options for `state` (9 options)
- [ ] Add `verification_enabled` checkbox to Settings
- [ ] Add `offers_purchase` checkbox to Settings
- [ ] Set VERIFICATION_ENCRYPTION_KEY in .env.local (32 characters)

### Salesperson Feedback System:
- [ ] Create FeedbackSessions table with 11 fields
- [ ] Add Single Select options for `feedback_type` (2 options)
- [ ] Add Single Select options for `state` (8 options)
- [ ] Add 7 new fields to Customers table
- [ ] Verify Users or Salespeople table has `phone` field

### Brand Knowledge System (Optional):
- [ ] Create BrandKnowledge table with 10 fields
- [ ] Add 5-10 brand records (Rolex, Patek, Omega, Cartier, etc.)

---

## 🔍 How to Verify Your Schema

1. **Open Airtable Base:** https://airtable.com/appig3KRYD5neBJqV
2. **Check Tables:** Look for missing tables in left sidebar
3. **Check Fields:** Open each table, click "+ Add field" to see existing fields
4. **Create Missing:** Follow field types and requirements above
5. **Test:** Run the system and check for Airtable errors in logs

---

## 🆘 Common Issues

### "Table not found" error
**Solution:** Create the missing table with exact name (case-sensitive)

### "Unknown field name" error
**Solution:** Add the missing field to the table with correct type

### "Invalid field type" error
**Solution:** Check that Single Select options are configured correctly

### Verification/Feedback not triggering
**Solution:**
- Check Settings.verification_enabled = true
- Check Settings.offers_purchase = true
- Verify Users/Salespeople table has phone numbers

---

## 📞 Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Look at Airtable API error responses in Network tab
3. Verify field names match exactly (case-sensitive)
4. Ensure linked record fields point to correct tables

---

## 🎯 Next Steps After Setup

1. **Test Enhanced Verification:**
   - Send "Quero vender meu Rolex" to WhatsApp
   - Follow the full flow
   - Check VerificationSessions and WatchVerify tables

2. **Test Salesperson Feedback:**
   - Register salesperson phone in Users table
   - Send audio: "Atendi João Silva, adorou Submariner"
   - Check FeedbackSessions and Customers tables

3. **Populate Brand Knowledge:**
   - Add Rolex with selling points
   - Add Patek Philippe
   - Test AI responses mentioning brands

---

**Complete Audit Date:** 2025-11-20
**Status:** Ready for implementation
**Estimated Setup Time:** 30-45 minutes

---

_Need help? All field specifications are in:_
- `ENHANCED_VERIFICATION_SETUP.md`
- `SALESPERSON_FEEDBACK_SETUP.md`
- `AIRTABLE_SCHEMA.md`
