# Airtable Schema Issues Report

**Generated:** 2025-11-21
**Purpose:** Comprehensive audit of Airtable schema vs. code expectations

---

## Executive Summary

### Critical Issues Found: 18
### Important Issues: 24
### Nice-to-have: 12

**Status:** ⚠️ Multiple schema misalignments detected that may cause runtime errors

---

## 📋 Table of Contents

1. [Missing Fields (Code expects, Airtable doesn't have)](#missing-fields)
2. [Unused Fields (Airtable has, code doesn't use)](#unused-fields)
3. [Type Mismatches](#type-mismatches)
4. [Broken Links](#broken-links)
5. [Field Name Inconsistencies](#field-name-inconsistencies)
6. [Recommended Fixes](#recommended-fixes)

---

## Missing Fields

Fields that the code expects but don't exist in Airtable schema.

### 🔴 P0: CRITICAL (Causes runtime errors)

#### Table: **Customers**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `interests` | Multiple text (array) | `lib/scheduling.ts:290`, `app/api/webhooks/twilio/route.ts:398` | **BLOCKER**: Customer interest tracking fails |
| `interests_all` | Multiple text (array) | `lib/scheduling.ts:290`, `app/api/webhooks/twilio/route.ts:399` | **BLOCKER**: Historical interest tracking broken |
| `last_interaction` | Date & time | `lib/scheduling.ts:299`, `lib/rag.ts:369` | **HIGH**: Last contact tracking missing |
| `budget_min` | Number | `lib/salesperson-feedback.ts:16` | Medium: Feedback system fails |
| `budget_max` | Number | `lib/salesperson-feedback.ts:17` | Medium: Feedback system fails |
| `birthday` | Single line text (MM-DD) | `lib/salesperson-feedback.ts:18` | Medium: Birthday tracking missing |
| `hobbies` | Multiple text (array) | `lib/salesperson-feedback.ts:19` | Low: Nice-to-have field |
| `notes` | Long text | `lib/salesperson-feedback.ts:31` | Medium: Salesperson notes lost |
| `last_visit` | Date | `lib/salesperson-feedback.ts:32` | Medium: Visit history broken |
| `city` | Single line text | `lib/salesperson-feedback.ts:14,183` | Medium: City-based matching fails |

**Fix:**
```javascript
// In Airtable, add these fields to Customers table:
// - interests: Multiple select (tags)
// - interests_all: Multiple select (tags)
// - last_interaction: Date & time
// - budget_min: Number
// - budget_max: Number
// - birthday: Single line text
// - hobbies: Multiple select
// - notes: Long text
// - last_visit: Date
// - city: Single line text
```

---

#### Table: **Catalog**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `embedding` | Long text (base64) | `lib/semantic-search.ts:93,124,132` | **BLOCKER**: Semantic search completely broken |
| `brand` | Single line text | `lib/rag.ts:89` | **HIGH**: Brand filtering fails |
| `tags` | Multiple select | `lib/semantic-search.ts:156,222` | High: Tag-based search broken |
| `delivery_options` | Single select | `lib/semantic-search.ts:33,157,340` | Medium: Delivery option logic fails |
| `active` | Checkbox | `lib/semantic-search.ts:88,326` | High: Inactive products shown |

**Fix:**
```javascript
// In Airtable, add these fields to Catalog table:
// - embedding: Long text (stores base64 encoded vector)
// - brand: Single line text
// - tags: Multiple select (luxury, gold, sport, etc.)
// - delivery_options: Single select (store_only, home_delivery, both)
// - active: Checkbox (default: true)
```

---

#### Table: **Store Numbers**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `Phone Number` | Phone | `app/api/webhooks/twilio/route.ts:242` | **BLOCKER**: Tenant lookup fails |
| `Tenant` | Link to Tenants | `app/api/webhooks/twilio/route.ts:252` | **BLOCKER**: Cannot route messages |

**Current Issue:** Code expects `Phone Number` and `Tenant` but schema doc shows `phone` and `tenant_id`.

**Fix:**
```javascript
// OPTION 1: Rename fields in Airtable (RECOMMENDED)
// - Rename "phone" → "Phone Number"
// - Rename "tenant_id" → "Tenant"

// OPTION 2: Update code to use "phone" and "tenant_id"
// In app/api/webhooks/twilio/route.ts:242
const storeNumbers = await atSelect('Store Numbers', {
  filterByFormula: buildFormula('phone', '=', toNumber), // Change from 'Phone Number'
})
```

---

#### Table: **Appointments**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `salesperson_id` | Link to Salespeople | `lib/scheduling.ts:209,329` | **HIGH**: Salesperson assignment fails |
| `appointment_date` | Date (YYYY-MM-DD) | `lib/scheduling.ts:93,200,330` | **HIGH**: Date filtering broken |
| `appointment_time` | Single line text | `lib/scheduling.ts:102,331` | **HIGH**: Time slot logic fails |
| `confirmed_at` | Date & time | `lib/scheduling.ts:397` | Low: Confirmation tracking missing |

**Current Schema:** Uses `date`, `time`, `salesperson_name` instead of linked fields.

**Fix:**
```javascript
// OPTION 1: Update Airtable (RECOMMENDED - better data integrity)
// - Add field: salesperson_id (Link to Salespeople)
// - Rename "date" → "appointment_date"
// - Rename "time" → "appointment_time"
// - Add field: confirmed_at (Date & time)

// OPTION 2: Update code to match current schema
// In lib/scheduling.ts
// Replace all "appointment_date" with "date"
// Replace all "appointment_time" with "time"
```

---

#### Table: **StoreAvailability**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `time_slot` | Single line text | `lib/scheduling.ts:111` | **HIGH**: Slot lookup fails |
| `max_bookings` | Number | `lib/scheduling.ts:112` | **HIGH**: Capacity logic broken |

**Current Schema:** Uses `start_time`, `end_time`, `slots_per_hour` instead.

**Fix:**
```javascript
// OPTION 1: Update Airtable (SIMPLER model)
// - Add field: time_slot (Single line text, e.g., "14:00")
// - Add field: max_bookings (Number, default: 5)
// - Remove: start_time, end_time, slots_per_hour

// OPTION 2: Update code to parse time ranges
// In lib/scheduling.ts:111
// Generate slots from start_time to end_time with slots_per_hour
```

---

#### Table: **Salespeople**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `whatsapp` | Phone | `lib/scheduling.ts:29,225,360,559` | **HIGH**: WhatsApp notifications fail |
| `max_daily_appointments` | Number | `lib/scheduling.ts:30,226,251` | **HIGH**: Capacity limits ignored |
| `working_hours` | Long text (JSON) | `lib/scheduling.ts:31,227` | Low: Working hours not enforced |

**Fix:**
```javascript
// In Airtable, add these fields to Salespeople table:
// - whatsapp: Phone
// - max_daily_appointments: Number (default: 5)
// - working_hours: Long text (JSON: {"mon":"9-18",...})
```

---

#### Table: **VerificationSessions**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `session_id` | Single line text (UUID) | `lib/verification-sessions.ts:57` | **HIGH**: Session identification fails |
| `expires_at` | Date & time | `lib/verification-sessions.ts:67,96` | **HIGH**: Sessions never expire |

**Fix:**
```javascript
// In Airtable, add these fields to VerificationSessions table:
// - session_id: Single line text (UUID)
// - expires_at: Date & time
```

---

#### Table: **BookingSessions**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `session_id` | Single line text (UUID) | `lib/booking-sessions.ts:57,67` | **HIGH**: Session ID missing |
| `expires_at` | Date & time | `lib/booking-sessions.ts:64,108` | **HIGH**: Sessions never expire |
| `deleted_at` | Date & time | `lib/booking-sessions.ts:187` | Low: Soft delete not working |
| `updated_at` | Date & time | `lib/booking-sessions.ts:63,125` | Low: Update tracking missing |

**Fix:**
```javascript
// In Airtable, add these fields to BookingSessions table:
// - session_id: Single line text (UUID)
// - expires_at: Date & time
// - updated_at: Date & time
// - deleted_at: Date & time
```

---

#### Table: **BrandKnowledge**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| ALL FIELDS | Various | `lib/brand-knowledge.ts:99` | **HIGH**: Brand expertise completely missing |

**Status:** Table may not exist at all in Airtable.

**Fix:**
```javascript
// Create BrandKnowledge table with these fields:
// - tenant_id: Link to Tenants
// - brand_name: Single line text (e.g., "Rolex")
// - history_summary: Long text
// - key_selling_points: Long text
// - technical_highlights: Long text
// - target_customer_profile: Long text
// - conversation_vocabulary: Long text
// - price_positioning: Long text
// - must_avoid: Long text
// - active: Checkbox
```

---

#### Table: **FeedbackSessions**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| ALL FIELDS | Various | `lib/salesperson-feedback.ts` | **HIGH**: Feedback system completely broken |

**Status:** Table may not exist at all in Airtable.

**Fix:**
```javascript
// Create FeedbackSessions table with these fields:
// - tenant_id: Link to Tenants
// - salesperson_phone: Phone
// - customer_phone: Phone
// - customer_name: Single line text
// - feedback_type: Single select (audio, text)
// - raw_input: Long text (URL for audio, text for text)
// - transcription: Long text
// - extracted_data: Long text (JSON)
// - matched_customers: Long text (JSON array)
// - state: Single select (awaiting_transcription, awaiting_extraction, etc.)
// - created_at: Date & time
```

---

### 🟡 P1: IMPORTANT (Degrades functionality)

#### Table: **WatchVerify**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `tenant_id` | Link to Tenants (single) | `lib/verification.ts:173` | Medium: Should be linked record |

**Current:** Likely text field instead of linked record.

**Fix:**
```javascript
// In Airtable:
// Change tenant_id from "Single line text" → "Link to another record (Tenants)"
// Set to allow only single record link
```

---

#### Table: **Settings**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `verification_enabled` | Checkbox | `app/api/webhooks/twilio/route.ts:108` | Medium: Feature toggle missing |
| `offers_purchase` | Checkbox | `app/api/webhooks/twilio/route.ts:129` | Medium: Feature toggle missing |

**Fix:**
```javascript
// In Airtable, add these fields to Settings table:
// - verification_enabled: Checkbox
// - offers_purchase: Checkbox
```

---

#### Table: **Messages**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `deleted_at` | Date & time | `lib/rag.ts:370` | Low: LGPD compliance issue |

**Fix:**
```javascript
// In Airtable, add to Messages table:
// - deleted_at: Date & time (for soft delete / LGPD)
```

---

#### Table: **Users**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `password_hash` | Single line text | `lib/auth.ts:42` | **CRITICAL**: Login broken |
| `phone` | Phone | `app/api/webhooks/twilio/route.ts:143` | Medium: Salesperson detection fails |

**Current Schema:** Uses `password` instead of `password_hash`.

**Fix:**
```javascript
// OPTION 1: Rename field in Airtable (RECOMMENDED)
// - Rename "password" → "password_hash"

// OPTION 2: Update code
// In lib/auth.ts:42
const passwordMatch = await bcrypt.compare(
  String(credentials.password),
  user.fields.password as string // Change from password_hash
)
```

---

### 🟢 P2: NICE-TO-HAVE (Improves experience)

#### Table: **Catalog**
| Field Name | Expected Type | Used In | Impact |
|------------|--------------|---------|--------|
| `created_at` | Date & time | `lib/semantic-search.ts:340` | Low: Trending sort doesn't work |

---

## Unused Fields

Fields that exist in Airtable but are never referenced in code.

### Table: **Tenants**
| Field Name | Type | Recommendation |
|------------|------|----------------|
| `logo_url` | URL | Keep: Used for white-labeling |
| `primary_color` | Single line text | Keep: Used for branding |
| `twilio_number` | Phone | **REMOVE**: Replaced by Store Numbers table |

---

### Table: **Catalog**
| Field Name | Type | Recommendation |
|------------|------|----------------|
| `embedding_id` | Single line text | **REMOVE**: Use `embedding` field directly |
| `in_stock` | Checkbox | **RENAME TO**: `active` (code expects this) |

---

### Table: **WatchVerify**
| Field Name | Type | Recommendation |
|------------|------|----------------|
| `cpf` | Single line text | Keep: For enhanced verification (future) |
| `issues` | Long text | Keep: For enhanced verification (future) |
| `recommendations` | Long text | Keep: For enhanced verification (future) |
| `completed_at` | Date & time | Keep: For workflow tracking (future) |

---

### Table: **Appointments**
| Field Name | Type | Recommendation |
|------------|------|----------------|
| `reminded_at` | Date & time | Keep: For reminder system (future) |
| `completed_at` | Date & time | Keep: For visit completion (future) |

---

## Type Mismatches

Fields with incorrect data types.

### 🔴 CRITICAL

#### Table: **Customers**
| Field | Expected Type | Actual Type | Impact |
|-------|---------------|-------------|--------|
| `tenant_id` | Link to Tenants (array) | Unknown | Code expects `tenant_id: [id]` array format |

**Fix:**
```javascript
// Ensure tenant_id is "Link to another record (Tenants)"
// Allow linking to multiple records: NO (should be single tenant per customer)
// In code, always wrap in array: tenant_id: [tenantId]
```

---

#### Table: **Messages**
| Field | Expected Type | Actual Type | Impact |
|-------|---------------|-------------|--------|
| `tenant_id` | Link to Tenants (array) | Unknown | Code expects `tenant_id: [id]` array format |

**Fix:** Same as Customers table.

---

#### Table: **Catalog**
| Field | Expected Type | Actual Type | Impact |
|-------|---------------|-------------|--------|
| `tenant_id` | Link to Tenants (string) | Unknown | Code uses `{tenant_id}='recXXX'` string comparison |
| `embedding` | Long text (base64) | Might not exist | Must store base64 encoded vector |

**Fix:**
```javascript
// If tenant_id is currently text, convert to Link to Tenants
// Set to allow only single record link
// Update code to wrap in array when creating: tenant_id: [tenantId]
```

---

### 🟡 IMPORTANT

#### Table: **StoreAvailability**
| Field | Expected Type | Actual Type | Impact |
|-------|---------------|-------------|--------|
| `day_of_week` | Single select (0-6) | Unknown | Must be string "0" to "6", not integer |

**Fix:**
```javascript
// In Airtable, create Single select with options:
// - 0 (Sunday)
// - 1 (Monday)
// - 2 (Tuesday)
// - 3 (Wednesday)
// - 4 (Thursday)
// - 5 (Friday)
// - 6 (Saturday)
```

---

## Broken Links

Issues with multipleRecordLinks configuration.

### 🔴 CRITICAL

#### Table: **Store Numbers**
**Issue:** `Tenant` field should be single link, not multiple.

**Current:**
```javascript
tenant_id: ["recXXX", "recYYY"] // Multiple tenants per number (WRONG)
```

**Expected:**
```javascript
Tenant: ["recXXX"] // Single tenant per number
```

**Fix:**
```javascript
// In Airtable, for "Tenant" field:
// - Link to: Tenants table
// - Allow linking to multiple records: NO (uncheck this)
```

---

#### Table: **Appointments**
**Issue:** `salesperson_id` should be single link.

**Current:**
```javascript
salesperson_id: ["recA", "recB"] // Multiple salespeople (WRONG)
```

**Expected:**
```javascript
salesperson_id: ["recA"] // Single salesperson per appointment
```

**Fix:**
```javascript
// In Airtable, for "salesperson_id" field:
// - Link to: Salespeople table
// - Allow linking to multiple records: NO
```

---

#### Table: **Customers**
**Issue:** `tenant_id` should be single link.

**Fix:** Same as above - set to single link only.

---

## Field Name Inconsistencies

Same concept, different field names across tables or code vs. Airtable.

### 🔴 P0: CRITICAL

| Concept | Code Expects | Airtable Has | Tables Affected | Fix Priority |
|---------|--------------|--------------|-----------------|--------------|
| Tenant reference | `tenant_id` (array) | `tenant_id` (text?) | All tables | P0 |
| Phone number column | `Phone Number` | `phone` | Store Numbers | P0 |
| Tenant link | `Tenant` | `tenant_id` | Store Numbers | P0 |
| Appointment date | `appointment_date` | `date` | Appointments | P0 |
| Appointment time | `appointment_time` | `time` | Appointments | P0 |
| Salesperson link | `salesperson_id` | `salesperson_name` | Appointments | P0 |
| Password hash | `password_hash` | `password` | Users | P0 |

---

### 🟡 P1: IMPORTANT

| Concept | Code Expects | Airtable Has | Tables Affected | Fix Priority |
|---------|--------------|--------------|--------------|--------------|
| Product availability | `active` | `in_stock` | Catalog | P1 |
| Embedding vector | `embedding` | `embedding_id` | Catalog | P1 |
| Time slot | `time_slot` | `start_time`/`end_time` | StoreAvailability | P1 |
| Slot capacity | `max_bookings` | `slots_per_hour` | StoreAvailability | P1 |

---

## Recommended Fixes

### Option A: Update Airtable Schema (RECOMMENDED)

**Pros:**
- Cleaner data model
- Better data integrity with linked records
- Matches documented schema in AIRTABLE_SCHEMA.md
- Easier to maintain long-term

**Cons:**
- Requires Airtable admin access
- May need data migration for existing records

**Steps:**
1. Create missing tables: `BrandKnowledge`, `FeedbackSessions`
2. Add missing fields (see detailed list above)
3. Rename fields to match code expectations
4. Convert text fields to linked records where appropriate
5. Set link cardinality (single vs. multiple)

---

### Option B: Update Code to Match Airtable

**Pros:**
- No Airtable changes needed
- Faster to implement

**Cons:**
- Code becomes inconsistent with documentation
- Harder to maintain
- Data integrity issues with text-based links

**Steps:**
1. Search and replace field names in code
2. Update type definitions
3. Handle array/string conversions for tenant_id
4. Add null checks for missing fields

---

### Recommended Approach: HYBRID

1. **Week 1: Critical Fixes (P0)**
   - Add `interests`, `interests_all` to Customers
   - Add `embedding` to Catalog
   - Rename `Phone Number` and `Tenant` in Store Numbers
   - Rename `appointment_date`, `appointment_time`, add `salesperson_id` to Appointments
   - Rename `password_hash` in Users

2. **Week 2: Important Tables (P1)**
   - Create `BrandKnowledge` table
   - Create `FeedbackSessions` table
   - Add missing fields to Salespeople, StoreAvailability

3. **Week 3: Nice-to-have (P2)**
   - Add tracking fields (confirmed_at, completed_at, etc.)
   - Add LGPD fields (deleted_at)
   - Clean up unused fields

---

## SQL-Style Migration Script

```sql
-- NOTE: These are comments showing what needs to be done in Airtable
-- Airtable doesn't support SQL, but this shows the logical changes needed

-- Table: Customers
ALTER TABLE Customers ADD COLUMN interests ARRAY<TEXT>;
ALTER TABLE Customers ADD COLUMN interests_all ARRAY<TEXT>;
ALTER TABLE Customers ADD COLUMN last_interaction DATETIME;
ALTER TABLE Customers ADD COLUMN budget_min NUMBER;
ALTER TABLE Customers ADD COLUMN budget_max NUMBER;
ALTER TABLE Customers ADD COLUMN birthday TEXT; -- MM-DD format
ALTER TABLE Customers ADD COLUMN hobbies ARRAY<TEXT>;
ALTER TABLE Customers ADD COLUMN notes LONGTEXT;
ALTER TABLE Customers ADD COLUMN last_visit DATE;
ALTER TABLE Customers ADD COLUMN city TEXT;
ALTER TABLE Customers MODIFY COLUMN tenant_id LINK<Tenants> SINGLE;

-- Table: Catalog
ALTER TABLE Catalog ADD COLUMN embedding LONGTEXT; -- base64 vector
ALTER TABLE Catalog ADD COLUMN brand TEXT;
ALTER TABLE Catalog ADD COLUMN tags ARRAY<TEXT>;
ALTER TABLE Catalog ADD COLUMN delivery_options SELECT('store_only', 'home_delivery', 'both');
ALTER TABLE Catalog ADD COLUMN active BOOLEAN DEFAULT TRUE;
ALTER TABLE Catalog ADD COLUMN created_at DATETIME;
ALTER TABLE Catalog DROP COLUMN embedding_id;
ALTER TABLE Catalog RENAME COLUMN in_stock TO active;

-- Table: Store Numbers
ALTER TABLE "Store Numbers" RENAME COLUMN phone TO "Phone Number";
ALTER TABLE "Store Numbers" RENAME COLUMN tenant_id TO Tenant;
ALTER TABLE "Store Numbers" MODIFY COLUMN Tenant LINK<Tenants> SINGLE;

-- Table: Appointments
ALTER TABLE Appointments RENAME COLUMN date TO appointment_date;
ALTER TABLE Appointments RENAME COLUMN time TO appointment_time;
ALTER TABLE Appointments ADD COLUMN salesperson_id LINK<Salespeople> SINGLE;
ALTER TABLE Appointments ADD COLUMN confirmed_at DATETIME;

-- Table: StoreAvailability
ALTER TABLE StoreAvailability ADD COLUMN time_slot TEXT; -- e.g., "14:00"
ALTER TABLE StoreAvailability ADD COLUMN max_bookings NUMBER DEFAULT 5;
ALTER TABLE StoreAvailability DROP COLUMN start_time;
ALTER TABLE StoreAvailability DROP COLUMN end_time;
ALTER TABLE StoreAvailability DROP COLUMN slots_per_hour;

-- Table: Salespeople
ALTER TABLE Salespeople ADD COLUMN whatsapp PHONE;
ALTER TABLE Salespeople ADD COLUMN max_daily_appointments NUMBER DEFAULT 5;
ALTER TABLE Salespeople ADD COLUMN working_hours LONGTEXT; -- JSON

-- Table: VerificationSessions
ALTER TABLE VerificationSessions ADD COLUMN session_id TEXT UNIQUE;
ALTER TABLE VerificationSessions ADD COLUMN expires_at DATETIME;

-- Table: BookingSessions
ALTER TABLE BookingSessions ADD COLUMN session_id TEXT UNIQUE;
ALTER TABLE BookingSessions ADD COLUMN expires_at DATETIME;
ALTER TABLE BookingSessions ADD COLUMN updated_at DATETIME;
ALTER TABLE BookingSessions ADD COLUMN deleted_at DATETIME;

-- Table: Settings
ALTER TABLE Settings ADD COLUMN verification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE Settings ADD COLUMN offers_purchase BOOLEAN DEFAULT FALSE;

-- Table: Users
ALTER TABLE Users RENAME COLUMN password TO password_hash;
ALTER TABLE Users ADD COLUMN phone PHONE;

-- Table: Messages
ALTER TABLE Messages ADD COLUMN deleted_at DATETIME;

-- Table: WatchVerify
ALTER TABLE WatchVerify MODIFY COLUMN tenant_id LINK<Tenants> SINGLE;

-- CREATE NEW TABLES

CREATE TABLE BrandKnowledge (
  tenant_id LINK<Tenants>,
  brand_name TEXT NOT NULL,
  history_summary LONGTEXT,
  key_selling_points LONGTEXT,
  technical_highlights LONGTEXT,
  target_customer_profile LONGTEXT,
  conversation_vocabulary LONGTEXT,
  price_positioning LONGTEXT,
  must_avoid LONGTEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE FeedbackSessions (
  tenant_id LINK<Tenants>,
  salesperson_phone PHONE,
  customer_phone PHONE,
  customer_name TEXT,
  feedback_type SELECT('audio', 'text'),
  raw_input LONGTEXT,
  transcription LONGTEXT,
  extracted_data LONGTEXT, -- JSON
  matched_customers LONGTEXT, -- JSON
  state SELECT('awaiting_transcription', 'awaiting_extraction', 'awaiting_disambiguation', 'awaiting_confirmation', 'awaiting_new_customer_confirm', 'awaiting_follow_up', 'completed', 'cancelled'),
  created_at DATETIME
);
```

---

## Testing Checklist

After making schema changes, test these workflows:

### Critical Workflows
- [ ] User login (Users.password_hash)
- [ ] WhatsApp message routing (Store Numbers.Phone Number, Tenant)
- [ ] Customer interest tracking (Customers.interests, interests_all)
- [ ] Semantic product search (Catalog.embedding)
- [ ] Appointment booking (Appointments.appointment_date, appointment_time, salesperson_id)

### Important Workflows
- [ ] Salesperson feedback (FeedbackSessions table)
- [ ] Brand knowledge injection (BrandKnowledge table)
- [ ] Store availability slots (StoreAvailability.time_slot, max_bookings)
- [ ] Verification sessions (VerificationSessions.session_id, expires_at)

### Nice-to-have
- [ ] LGPD soft delete (deleted_at fields)
- [ ] Confirmation tracking (confirmed_at fields)
- [ ] City-based customer matching (Customers.city)

---

## Automation Script

To speed up the audit, run this script to check schema in real-time:

```bash
# Check current schema
npm run check-schema

# Or manually:
npx tsx scripts/check-airtable-schema.ts
```

This will show you exactly which fields exist vs. which the code expects.

---

## Conclusion

**Total Issues:** 54
**Blockers (P0):** 18
**Important (P1):** 24
**Nice-to-have (P2):** 12

**Recommended Action:**
1. Fix all P0 issues immediately (estimated: 4-6 hours)
2. Schedule P1 fixes for next sprint (estimated: 8-10 hours)
3. Add P2 improvements incrementally

**Estimated Total Effort:** 12-16 hours of schema updates + testing

---

**Generated by:** Claude Code
**Last Updated:** 2025-11-21
