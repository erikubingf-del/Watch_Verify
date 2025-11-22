# Airtable Fields Deletion Analysis

**Generated:** 2025-11-22
**Purpose:** Identify safe-to-delete, risky, and must-keep fields in Airtable schema

## Table of Contents
1. [Summary](#summary)
2. [Tenants Table](#tenants-table)
3. [Store Numbers Table](#store-numbers-table)
4. [Customers Table](#customers-table)
5. [Messages Table](#messages-table)
6. [WatchVerify Table](#watchverify-table)
7. [Catalog Table](#catalog-table)
8. [Settings Table](#settings-table)
9. [Users Table](#users-table)
10. [Salespeople Table](#salespeople-table)
11. [Appointments Table](#appointments-table)
12. [StoreAvailability Table](#storeavailability-table)
13. [PaymentProviders Table](#paymentproviders-table)
14. [PaymentLinks Table](#paymentlinks-table)
15. [Campaigns Table](#campaigns-table)
16. [CampaignSessions Table](#campaignsessions-table)
17. [BookingSessions Table](#bookingsessions-table)
18. [VerificationSessions Table](#verificationsessions-table)
19. [BrandKnowledge Table](#brandknowledge-table)
20. [FeedbackSessions Table](#feedbacksessions-table)

---

## Summary

### Quick Stats
- **Total Fields Analyzed:** 200+ across 20 tables
- **Safe to Delete:** 10 fields (unused in code)
- **Risky to Delete:** 6 fields (limited usage or future features)
- **Must Keep:** 180+ fields (actively used or system fields)

### Critical Findings
1. **Rollup/Lookup fields in Tenants table are NEVER used in code** (safe to delete)
2. **Link fields to PaymentLinks and Campaigns in Catalog are unused** (payment/campaign systems not implemented)
3. **Several customer enrichment fields are properly used** (budget_min, birthday, hobbies - keep them)
4. **Computed fields (formulas, lookups) can be deleted** without breaking code

---

## Tenants Table

### 🔒 KEEP (System-critical fields)
These fields are actively used in code and essential for the system:

| Field | Type | Usage |
|-------|------|-------|
| `Name` | Single line text | PRIMARY - Used everywhere as tenant identifier |
| `Logo` | Attachments | Used in Settings dashboard (`app/dashboard/settings/page.tsx:95`) |
| `Primary Color` | Single line text | Used for white-label branding |
| `WhatsApp Number` | Single line text | Used for tenant phone mapping |
| `Created At` | Date | System timestamp |
| `Active` | Checkbox | Used to filter active tenants |

**Code References:**
- `lib/auth.ts` - Tenant authentication
- `app/dashboard/settings/page.tsx` - Settings UI
- All API routes filter by tenant_id

### ✅ SAFE TO DELETE (Never used in code)
These fields exist in Airtable but are NEVER referenced in any TypeScript file:

| Field | Type | Reason | Impact |
|-------|------|--------|--------|
| `Total Store Numbers` | Count (rollup) | Computed field, not used in code | None - purely cosmetic in Airtable UI |
| `Active Store Numbers` | Rollup | Aggregation not used in logic | None - can recalculate if needed |
| `Store Numbers List` | Rollup | Display-only, not used in code | None - can query StoreNumbers table directly |

**Why Delete?**
- These are **computed fields** that Airtable generates automatically
- **No code reads these values** (grep search shows zero references)
- They **increase complexity** and slow down Airtable views
- Data is available via direct queries if ever needed

**How to Delete:**
```bash
# In Airtable UI:
1. Open Tenants table
2. Click field header: "Total Store Numbers" → Delete field
3. Click field header: "Active Store Numbers" → Delete field
4. Click field header: "Store Numbers List" → Delete field
```

### ⚠️ RISKY (Verify before deleting)
| Field | Type | Reason | Check Before Delete |
|-------|------|--------|---------------------|
| Link fields (Store Numbers, Customers, Messages, etc.) | Multiple record links | Used for Airtable relationship navigation | Keep - used by Airtable's relational structure |

---

## Store Numbers Table

### 🔒 KEEP
| Field | Usage |
|-------|-------|
| `Phone Number` | PRIMARY - Used in webhook routing (`app/api/webhooks/twilio/route.ts`) |
| `Tenant` | CRITICAL - Links phone to tenant |
| `Active Number` | Used in filtering active numbers |

### ✅ SAFE TO DELETE
| Field | Type | Reason |
|-------|------|--------|
| `Tenant Name` | Lookup | Computed from Tenant link - not used in code |
| `Tenant Primary Color` | Lookup | Display-only, never referenced |
| `Tenant Created At` | Lookup | Not used in logic |
| `Days Since Tenant Created` | Formula | Not used in code |

**Why Delete?**
- All computed/lookup fields that aggregate data from Tenants table
- **No code references** (grep returns only schema files)
- Can be recalculated via JOIN if needed

**How to Delete:**
```bash
# In Airtable UI (Store Numbers table):
1. Delete field: "Tenant Name"
2. Delete field: "Tenant Primary Color"
3. Delete field: "Tenant Created At"
4. Delete field: "Days Since Tenant Created"
```

---

## Customers Table

### 🔒 KEEP (All actively used!)
**Critical:** All customer fields are used in the salesperson feedback system and customer management.

| Field | Usage | Code Reference |
|-------|-------|----------------|
| `name` | PRIMARY - Used everywhere | `app/api/dashboard/customers/route.ts:61` |
| `tenant_id` | CRITICAL - Multi-tenant filtering | All API routes |
| `phone` | CRITICAL - Customer identifier | All messaging logic |
| `email` | Used in customer records | `app/api/dashboard/customers/route.ts:63` |
| `interests` | Used in semantic search | `lib/salesperson-feedback.ts:300` |
| `last_interest` | Displayed in dashboard | `app/api/dashboard/customers/route.ts:64` |
| `budget_min` | **USED** - Feedback extraction | `lib/salesperson-feedback.ts:418-423` |
| `budget_max` | **USED** - Feedback extraction | `lib/salesperson-feedback.ts:422-423` |
| `vip` | Used in campaign targeting | Campaign filter formulas |
| `notes` | **USED** - Appended by salespeople | `lib/salesperson-feedback.ts:439-450` |
| `birthday` | **USED** - Extracted from feedback | `lib/salesperson-feedback.ts:426-427` |
| `hobbies` | **USED** - Customer enrichment | `lib/salesperson-feedback.ts:434-435` |
| `last_visit` | **USED** - Updated on appointment | `lib/salesperson-feedback.ts:455` |
| `created_at` | System timestamp | Used in sorting |
| `updated_at` | Recently added tracking field | New field for data freshness |
| `deleted_at` | Soft delete support | `app/api/dashboard/customers/route.ts:26` |
| `display_name` | Formula: `IF({name}, {name}, {phone})` | Computed field (keep for UI) |

**Why Keep All?**
- The salesperson feedback system (`lib/salesperson-feedback.ts`) **actively updates** all these fields
- Dashboard displays them (`app/api/dashboard/customers/route.ts`)
- Campaign targeting uses vip/budget/last_purchase filters
- **DO NOT DELETE** any customer fields - all are used!

### ✅ SAFE TO DELETE
**NONE** - All fields are actively used or planned for use.

### ⚠️ RISKY
| Field | Status | Reason |
|-------|--------|--------|
| `budget_range` | Keep for now | May be used for campaign targeting (enum: low/medium/high/luxury) |
| `last_purchase` | Keep for now | Used in campaign filters for "inactive 6m+" targeting |

---

## Messages Table

### 🔒 KEEP (All essential)
| Field | Usage |
|-------|-------|
| `body` | PRIMARY - Message content |
| `tenant_id` | Multi-tenant filtering |
| `phone` | Customer identifier |
| `direction` | Inbound/outbound tracking |
| `media_url` | Image/document attachments |
| `created_at` | Message timestamp |
| `deleted_at` | Soft delete support |

**Why Keep All?**
- Core messaging functionality
- Used in conversations display
- Webhook processing relies on all fields

### ✅ SAFE TO DELETE
**NONE** - All fields essential for messaging.

---

## WatchVerify Table

### 🔒 KEEP
| Field | Usage |
|-------|-------|
| `customer`, `phone`, `tenant_id` | Core identification |
| `brand`, `model`, `reference`, `serial` | Watch details |
| `icd` | Consistency score (CRITICAL) |
| `status` | Verification workflow state |
| `photo_url`, `guarantee_url`, `invoice_url` | Document storage |
| `issues`, `recommendations` | AI analysis results |
| `notes` | Verification report storage |
| `cpf` | Used for payment processing |
| `created_at`, `completed_at`, `deleted_at` | Timestamps |

**Code Usage:**
- `lib/verification.ts:172-187` - Creates verification records
- `app/api/dashboard/verifications/route.ts` - Displays all fields
- `app/dashboard/verification/page.tsx:576-581` - Shows notes

### ✅ SAFE TO DELETE
| Field | Type | Reason |
|-------|------|--------|
| `icd_band` | Formula | Computed from ICD score, not used in code - can calculate client-side |

**Formula:** `IF({icd} >= 90, "✅ Consistente (validado)", IF({icd} >= 70, "⚠️ Consistente (sem validação)", ...))`

**Why Delete?**
- Frontend calculates the badge using `lib/dashboard-utils.ts:getICDBadge()`
- Duplicate logic (computed in UI and Airtable)
- Not referenced in any API response

**How to Delete:**
```bash
# In Airtable UI (WatchVerify table):
1. Delete field: "icd_band"
```

---

## Catalog Table

### 🔒 KEEP (Essential product fields)
| Field | Usage |
|-------|-------|
| `title` | PRIMARY - Product name |
| `tenant_id` | Multi-tenant filtering |
| `description` | Product details |
| `category` | Product type (watches/rings/etc.) |
| `brand` | Used in semantic search |
| `price` | Product pricing |
| `image_url` | Product images |
| `tags` | Semantic search enhancement |
| `stock_quantity` | **USED** - Inventory management | `app/dashboard/catalog/page.tsx:476-477` |
| `delivery_options` | **USED** - Shipping logic | `lib/semantic-search.ts:157`, `lib/rag.ts:340-342` |
| `embedding` | **CRITICAL** - Semantic search | `lib/semantic-search.ts:93,124,132` |
| `active` | Product visibility |
| `created_at` | Timestamp |

**Why Keep All?**
- `embedding` is **CRITICAL** for AI semantic search (most important field!)
- `delivery_options` affects product recommendations
- `stock_quantity` displayed in dashboard
- All fields used in catalog dashboard

### ✅ SAFE TO DELETE (Unused link fields)
| Field | Type | Reason | Impact |
|-------|------|--------|--------|
| `PaymentLinks` | Multiple record links | Payment system NOT implemented | None - feature not built |
| `Campaigns` | Multiple record links | Campaign links to products not used | None - campaigns don't link products |

**Why Delete?**
- Payment system is **planned but not implemented** (Phase 2)
- Campaign system exists but **doesn't link to specific products** in code
- These links add complexity without current use

**How to Delete:**
```bash
# In Airtable UI (Catalog table):
1. Delete field: "PaymentLinks"
2. Delete field: "Campaigns"
```

### ⚠️ RISKY
| Field | Status | Reason |
|-------|--------|--------|
| `BrandKnowledge` | Keep | Used in RAG system (`lib/brand-knowledge.ts:99`) |

---

## Settings Table

### 🔒 KEEP
All fields are used in Settings UI (`app/dashboard/settings/page.tsx`):
- `brand`, `tenant_id`, `logo`, `primary`
- `welcome_message`, `business_hours`
- `verification_enabled`, `offers_purchase`
- `updated_at`

**Why Keep All?**
- Displayed and editable in dashboard
- Control system behavior (verification/purchase toggles)

### ✅ SAFE TO DELETE
**NONE** - All fields actively used.

---

## Users Table

### 🔒 KEEP (All authentication fields)
- `email` (PRIMARY - login identifier)
- `tenant_id` (multi-tenant access)
- `password_hash` (authentication)
- `name`, `role`, `active` (user management)
- `created_at` (audit trail)

**Why Keep All?**
- Core authentication system (`lib/auth.ts`)
- All fields essential for NextAuth

### ✅ SAFE TO DELETE
**NONE** - All fields critical for auth.

---

## Salespeople Table

### 🔒 KEEP
| Field | Usage |
|-------|-------|
| `name` | Salesperson identifier |
| `tenant_id` | Multi-tenant filtering |
| `phone`, `whatsapp` | Contact methods |
| `email` | Communication |
| `max_daily_appointments` | Scheduling capacity |
| `working_hours` | Availability rules |
| `active` | Status filter |
| `created_at` | Timestamp |
| `Appointments` | Link to appointments (relational) |

**Code Usage:**
- `lib/scheduling.ts:184-259` - Salesperson assignment logic
- `lib/scheduling.ts:541-619` - Daily schedule reports
- All fields actively used!

### ✅ SAFE TO DELETE
**NONE** - All fields used in scheduling system.

---

## Appointments Table

### 🔒 KEEP (All booking fields)
| Field | Usage |
|-------|-------|
| `customer_name`, `customer_phone` | Customer info |
| `tenant_id`, `salesperson_id` | Relationships |
| `appointment_date`, `appointment_time` | Scheduling |
| `status` | Workflow state (pending/confirmed/completed/cancelled/no_show) |
| `product_interest` | What customer wants to see |
| `notes` | Additional context |
| `created_at` | Booking timestamp |
| `reminded_at` | **USED** - Reminder tracking |
| `confirmed_at` | **USED** - Confirmation timestamp | `lib/scheduling.ts:397` |
| `completed_at` | **USED** - Completion tracking |

**Why Keep All?**
- Core booking system functionality
- Timestamps track appointment lifecycle
- All fields displayed in visits dashboard

### ✅ SAFE TO DELETE
**NONE** - All fields essential for appointment tracking.

---

## StoreAvailability Table

### 🔒 KEEP
- `tenant_id` (tenant filtering)
- `time_slot` (e.g., "14:00")
- `max_bookings` (capacity limit)
- `active` (enable/disable slots)
- `day_of_week` (0-6 for Sun-Sat)

**Code Usage:**
- `lib/scheduling.ts:76-83` - Fetches availability config
- All fields used in slot calculation

### ✅ SAFE TO DELETE
**NONE** - All fields essential.

---

## PaymentProviders Table

### 🔒 KEEP (Payment system planned)
All fields are for **future payment integration** (Phase 2):
- `tenant_id`, `api_key`, `api_secret`
- `webhook_url`, `active`, `created_at`
- `provider_name` (Pagbank/Cielo/etc.)

**Status:** Table exists, feature not implemented yet.

**Recommendation:** **KEEP** - Needed for Phase 2 payment integration.

---

## PaymentLinks Table

### 🔒 KEEP (Future feature)
All fields for payment tracking (planned Phase 2):
- Customer info, product links, payment status
- Provider integration fields
- Delivery options

**Recommendation:** **KEEP** - Needed for Phase 2.

### ✅ SAFE TO DELETE
| Field | Reason |
|-------|--------|
| `source_campaign_id` | Campaigns don't generate payment links (not in code) |
| `last_status_updated_at` | Not used in webhook logic |

---

## Campaigns Table

### 🔒 KEEP (Campaign system exists)
Most fields are used in campaign logic:
- `name`, `tenant_id`, `target_type`, `target_filter`
- `message_template`, `status`, `scheduled_at`
- `sent_count`, `created_by`, `created_at`, `completed_at`
- `description`

**Code Usage:**
- Campaign tables exist in schema
- System designed but not fully implemented

### ✅ SAFE TO DELETE
| Field | Type | Reason |
|-------|------|--------|
| `products_promoted` | Link to Catalog | Campaigns don't link specific products in code |
| `payment_links_created` | Link to PaymentLinks | Not used in campaign flow |

---

## CampaignSessions Table

### 🔒 KEEP
All fields for conversational campaign creation:
- `phone`, `tenant_id`, `step`, `data`
- `campaign_id` (link to created campaign)
- `created_at`, `expires_at`, `last_interaction_at`

**Recommendation:** KEEP - Session management for campaign builder.

---

## BookingSessions Table

### 🔒 KEEP
All fields for appointment booking flow:
- Customer info, state machine fields
- Date/time preferences, product interest
- Timestamps, notes, source tracking

**Code Usage:** Session management for conversational booking.

**Recommendation:** KEEP ALL.

---

## VerificationSessions Table

### 🔒 KEEP (All session fields)
Session state for watch verification flow:
- `session_id`, `tenant_id`, `customer_phone`, `customer_name`
- `state` (workflow state machine)
- Document URLs (watch_photo_url, guarantee_card_url, invoice_url)
- Additional fields for enhanced verification
- Timestamps

**Code Usage:**
- `lib/verification-sessions.ts` - Session management
- `app/api/webhooks/twilio/route.ts` - Verification flow

**Recommendation:** KEEP ALL.

### ⚠️ RISKY
| Field | Status | Reason |
|-------|--------|--------|
| `customer_stated_model` | Keep | Used in enhanced verification flow |
| `additional_documents` | Keep | Multi-document upload support |
| `date_mismatch_reason` | Keep | Document consistency checking |

---

## BrandKnowledge Table

### 🔒 KEEP (RAG system)
All fields actively used in brand expertise:
- `brand_name` (PRIMARY)
- `history_summary`, `key_selling_points`, `technical_highlights`
- `target_customer_profile`, `conversation_vocabulary`
- `price_positioning`, `must_avoid`
- `related_catalog_items` (link to products)
- `tenant_id`, `active`

**Code Usage:**
- `lib/brand-knowledge.ts:81-178` - Brand context enrichment
- `lib/rag.ts:99` - Injected into AI responses

**Recommendation:** KEEP ALL - Critical for AI sales conversations.

---

## FeedbackSessions Table

### 🔒 KEEP (Audio feedback system)
All fields for salesperson feedback processing:
- Audio/text input, transcription
- Extracted data, customer matching
- State machine, timestamps

**Code Usage:**
- `lib/salesperson-feedback.ts` - Full feedback workflow

**Recommendation:** KEEP ALL.

---

## Deletion Commands Summary

### Safe to Delete (Copy-paste into terminal)

```bash
# These fields are confirmed UNUSED in code:

echo "Fields Safe to Delete:"
echo ""
echo "TENANTS TABLE:"
echo "  - Total Store Numbers (Count rollup)"
echo "  - Active Store Numbers (Rollup)"
echo "  - Store Numbers List (Rollup)"
echo ""
echo "STORE NUMBERS TABLE:"
echo "  - Tenant Name (Lookup)"
echo "  - Tenant Primary Color (Lookup)"
echo "  - Tenant Created At (Lookup)"
echo "  - Days Since Tenant Created (Formula)"
echo ""
echo "WATCHVERIFY TABLE:"
echo "  - icd_band (Formula - computed in frontend)"
echo ""
echo "CATALOG TABLE:"
echo "  - PaymentLinks (Link - feature not implemented)"
echo "  - Campaigns (Link - not used in campaign flow)"
echo ""
echo "Total: 10 fields can be safely deleted"
```

### Step-by-Step Deletion Guide

#### 1. Tenants Table (3 fields)
```
1. Open Airtable → Tenants table
2. Click "Total Store Numbers" column header → Delete field
3. Click "Active Store Numbers" column header → Delete field
4. Click "Store Numbers List" column header → Delete field
5. Verify tenant records still show correctly
```

#### 2. Store Numbers Table (4 fields)
```
1. Open Airtable → Store Numbers table
2. Delete: "Tenant Name"
3. Delete: "Tenant Primary Color"
4. Delete: "Tenant Created At"
5. Delete: "Days Since Tenant Created"
```

#### 3. WatchVerify Table (1 field)
```
1. Open Airtable → WatchVerify table
2. Delete: "icd_band"
   (Frontend calculates this with getICDBadge() function)
```

#### 4. Catalog Table (2 fields)
```
1. Open Airtable → Catalog table
2. Delete: "PaymentLinks" (payment feature not built)
3. Delete: "Campaigns" (not used in code)
```

---

## Fields to NEVER Delete

### Critical System Fields
These fields will **break the application** if deleted:

**Authentication:**
- Users: `email`, `password_hash`, `tenant_id`

**Multi-tenancy:**
- All tables: `tenant_id` (CRITICAL for data isolation!)

**Semantic Search (AI Core):**
- Catalog: `embedding` (CRITICAL - without this, AI search breaks!)
- Catalog: `title`, `description`, `brand`, `tags`

**Scheduling:**
- Appointments: All timestamp fields (created_at, reminded_at, confirmed_at, completed_at)
- StoreAvailability: All fields
- Salespeople: `max_daily_appointments`, `working_hours`

**Verification:**
- WatchVerify: `icd` (consistency score - CRITICAL)
- WatchVerify: Document URLs (photo_url, guarantee_url, invoice_url)

**Customer Data:**
- Customers: ALL fields (used in feedback system)

**Messaging:**
- Messages: ALL fields (core functionality)

---

## Verification Checklist

Before deleting any field, verify:

```bash
# Search for field usage in code:
cd /Users/erikfigueiredo/Documents/GitHub/Watch_Verify
grep -r "field_name" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules

# Check if it's a link field used by Airtable:
# - If it's a "Multiple record links" type, check if the LINKED table uses it
# - Example: Tenants.Customers links to Customers.tenant_id (keep both!)

# Verify it's not in validation schemas:
grep -r "field_name" lib/validations.ts
```

---

## Impact Assessment

### Deleting Rollup/Lookup/Formula Fields
**Risk:** ⭐ Very Low
**Reason:** These are computed fields - code doesn't read them directly

**Example:** `Total Store Numbers` is a COUNT rollup in Airtable, but code queries the StoreNumbers table directly.

### Deleting Link Fields
**Risk:** ⭐⭐⭐⭐ High
**Reason:** Breaking Airtable relationships can cascade

**Safe to delete links:**
- Link to non-existent features (PaymentLinks from Catalog)
- One-directional links not used in code

**NEVER delete:**
- tenant_id links (multi-tenant relationships!)
- salesperson_id, customer_phone links (booking system)

### Deleting Data Fields
**Risk:** ⭐⭐⭐⭐⭐ Critical
**Before deletion:** Search ENTIRE codebase for field name

---

## Testing After Deletion

After deleting any field, test these flows:

1. **Dashboard loads** without errors
   ```bash
   # Check browser console for Airtable errors
   ```

2. **Semantic search works**
   ```bash
   # Test: Send WhatsApp message "Procuro Rolex"
   # Verify: AI finds products
   ```

3. **Appointment booking**
   ```bash
   # Test: Book appointment via WhatsApp
   # Verify: Shows in dashboard
   ```

4. **Watch verification**
   ```bash
   # Test: Upload watch photo
   # Verify: ICD score displays correctly
   ```

5. **Customer enrichment**
   ```bash
   # Test: Salesperson audio feedback
   # Verify: Customer record updates with budget/birthday/hobbies
   ```

---

## Backup Before Deletion

**CRITICAL:** Export Airtable base before deleting fields!

```bash
# Via Airtable UI:
1. Click base name → "..." menu
2. Export base → Download CSV
3. Store backup: airtable-backup-YYYY-MM-DD.zip
```

**Recovery:** If something breaks, re-import the backup and restore the field.

---

## Conclusion

**Summary:**
- **10 fields safe to delete** (rollups, lookups, unused links)
- **6 fields risky** (verify usage first)
- **180+ fields must keep** (actively used or system-critical)

**Recommendation:** Start by deleting the 10 confirmed-safe fields, then monitor for 24 hours before considering risky deletions.

**Questions?** Run field search before deleting:
```bash
grep -r "field_name" /Users/erikfigueiredo/Documents/GitHub/Watch_Verify --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
```
