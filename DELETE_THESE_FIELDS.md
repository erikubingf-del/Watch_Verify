# ✅ Safe-to-Delete Airtable Fields Checklist

**IMPORTANT**: Make a backup of your Airtable base before deleting any fields!

---

## 📋 Fields You Can DELETE (Zero Code Impact)

These 10 fields are **NEVER used in code** - they're purely cosmetic in Airtable UI.

---

### 1️⃣ Tenants Table

Delete these 3 rollup/count fields (they're auto-calculated, not used in logic):

- [ ] **Total Store Numbers** (Count field)
  - Why: Never used in code, can query Store Numbers table directly

- [ ] **Active Store Numbers** (Rollup field)
  - Why: No code reads this value

- [ ] **Store Numbers List** (Rollup field)
  - Why: Display-only, not used in logic

**How to Delete:**
1. Open Airtable → Tenants table
2. Click field header → "Customize field type" → Delete field
3. Repeat for all 3 fields

---

### 2️⃣ Store Numbers Table

Delete these 4 lookup/formula fields (computed values, not used):

- [ ] **Tenant Name** (Lookup from Tenants)
  - Why: Code uses tenant_id directly, never reads tenant name from here

- [ ] **Tenant Primary Color** (Lookup from Tenants)
  - Why: Branding fetched from Settings table, not Store Numbers

- [ ] **Tenant Created At** (Lookup from Tenants)
  - Why: Zero references in code

- [ ] **Days Since Tenant Created** (Formula field)
  - Why: Not used in any business logic

**How to Delete:**
1. Open Airtable → Store Numbers table
2. Click each field header → Delete field
3. Repeat for all 4 fields

---

### 3️⃣ WatchVerify Table

Delete this 1 formula field:

- [ ] **icd_band** (Formula field)
  - Why: Frontend calculates ICD band using `getICDBadge()` function
  - Code reference: `lib/verification-report.ts` has the logic

**How to Delete:**
1. Open Airtable → WatchVerify table
2. Click "icd_band" field header → Delete field

---

### 4️⃣ Catalog Table

Delete these 2 unused link fields (features not implemented yet):

- [ ] **PaymentLinks** (Link to PaymentLinks table)
  - Why: Payment link creation doesn't query this field
  - Code creates PaymentLinks directly, doesn't use this reverse link

- [ ] **Campaigns** (Link to Campaigns table)
  - Why: Campaign system doesn't read this field
  - Campaigns query Catalog directly when needed

**How to Delete:**
1. Open Airtable → Catalog table
2. Click "PaymentLinks" field header → Delete field
3. Click "Campaigns" field header → Delete field

---

## ⚠️ IMPORTANT: Do NOT Delete These!

### ❌ Customer Table Fields - ALL USED!

These fields might **look** unused but are actually critical:

- **budget_min** / **budget_max** ✅ KEEP
  - Used in: `lib/salesperson-feedback.ts:418-423`
  - Purpose: Salesperson can set budget range during feedback

- **birthday** ✅ KEEP
  - Used in: `lib/salesperson-feedback.ts:426-435`
  - Purpose: Salesperson tracks customer birthdays for campaigns

- **hobbies** ✅ KEEP
  - Used in: `lib/salesperson-feedback.ts:436-440`
  - Purpose: Salesperson enrichment (e.g., "golf, diving" → suggest sport watches)

- **notes** ✅ KEEP
  - Used in: `lib/salesperson-feedback.ts:450-455`
  - Purpose: Salesperson adds personal notes about customer

- **last_visit** ✅ KEEP
  - Used in: `lib/salesperson-feedback.ts:460-465`
  - Purpose: Tracks when customer last visited store

- **vip** ✅ KEEP
  - Used in: Future campaign targeting (inactive customers, VIP customers)

- **budget_range** ✅ KEEP
  - Used in: Customer segmentation for campaigns

- **last_purchase** ✅ KEEP
  - Used in: Re-engagement campaigns

### ❌ Catalog Fields - DO NOT DELETE!

- **embedding** ✅ CRITICAL - DO NOT DELETE!
  - Used in: `lib/semantic-search.ts:93,124,132`
  - Purpose: Vector embeddings for AI semantic search (CORE FEATURE)

- **brand** ✅ KEEP
  - Used in: `lib/rag.ts:89`
  - Purpose: Brand filtering and offering brand list to customers

- **tags** ✅ KEEP
  - Used in: `lib/semantic-search.ts:156,222`
  - Purpose: Tag-based filtering (luxury, sport, etc.)

- **delivery_options** ✅ KEEP
  - Used in: `lib/semantic-search.ts:33,157,340`
  - Purpose: store_only vs delivery logic

- **stock_quantity** ✅ KEEP
  - Used in: Inventory management (even if not shown to customers)

- **active** ✅ KEEP
  - Used in: `lib/semantic-search.ts:88,326`
  - Purpose: Hide inactive products from search

### ❌ System Fields - NEVER DELETE!

All fields named `tenant_id` - these enforce multi-tenancy isolation!

---

## 🧪 Testing After Deletion

After deleting the 10 safe fields above, test:

1. **WhatsApp Message Routing**:
   ```
   Send: "Olá" to +1 762-372-7247
   → Should route correctly (Store Numbers lookups deleted but core routing works)
   ```

2. **Customer Interest Tracking**:
   ```
   Send: "Quero um Rolex"
   → Check Customers table (enrichment fields still work)
   ```

3. **Dashboard Load**:
   ```
   Visit: https://crmlx.vercel.app/dashboard
   → All pages load (no errors from missing rollup fields)
   ```

4. **Verification Flow**:
   ```
   Test watch verification
   → ICD score shows correctly (frontend calculates icd_band)
   ```

---

## 📊 Summary

**Total Safe Deletions**: 10 fields
- Tenants: 3 fields (rollups)
- Store Numbers: 4 fields (lookups/formulas)
- WatchVerify: 1 field (formula)
- Catalog: 2 fields (unused links)

**Expected Impact**: ZERO - All deleted fields are:
- Computed/derived (not source data)
- Never read by code
- Purely cosmetic in Airtable UI

**Time Savings**: Cleaner schema, faster Airtable views, less visual clutter

---

## 🔒 Backup Instructions

**Before deleting anything:**

1. Go to Airtable → Your base
2. Click "..." menu → "Duplicate base"
3. Name it: "Watch Verify - Backup [DATE]"
4. Confirm you have the backup before proceeding

**If something breaks:**
- Delete current base
- Rename backup base
- Restore from backup

---

## ✅ Deletion Order (Recommended)

Do deletions in this order to minimize risk:

1. **Start with Tenants table** (3 rollup fields) - Safest
2. **Store Numbers table** (4 lookup/formula fields) - Very safe
3. **WatchVerify table** (1 formula field) - Safe
4. **Catalog table** (2 link fields) - Safe but test campaigns/payments after

**Test after each table** to ensure nothing broke.

---

**Need help with deletions? I can guide you through each table step-by-step!**
