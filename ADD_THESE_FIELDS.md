# ✅ Required Airtable Fields to Add

**IMPORTANT**: These fields are MISSING but REQUIRED by the code. Add them to prevent errors.

---

## 📋 CUSTOMERS TABLE - Add These 3 Fields

### 1. interests_all
- **Type**: Long text
- **Description**: Complete historical interests (all products customer ever asked about)
- **Used in**: `app/api/webhooks/twilio/route.ts:409`, `lib/scheduling.ts:290`
- **Why Critical**: Tracks ALL customer interests for analytics and long-term campaigns

**How to Add**:
1. Open Airtable → Customers table
2. Click "+" to add field
3. Name: `interests_all`
4. Type: Long text
5. Description: "Complete historical interests (all products ever)"
6. Click "Create field"

---

### 2. last_interaction
- **Type**: Date and time
- **Description**: Timestamp of most recent WhatsApp message
- **Used in**: `app/api/webhooks/twilio/route.ts:416`, `lib/scheduling.ts:294`
- **Why Critical**: Tracks customer activity for re-engagement campaigns

**How to Add**:
1. Customers table → Click "+"
2. Name: `last_interaction`
3. Type: Date and time
4. Include time: YES
5. Time format: 24 hour
6. Description: "Timestamp of most recent message"
7. Click "Create field"

---

### 3. city
- **Type**: Single line text
- **Description**: Customer city for salesperson feedback
- **Used in**: `lib/salesperson-feedback.ts:442-448`
- **Why Critical**: Salesperson can track customer location

**How to Add**:
1. Customers table → Click "+"
2. Name: `city`
3. Type: Single line text
4. Description: "Customer city for salesperson feedback"
5. Click "Create field"

---

## 📋 CATALOG TABLE - Add These 5 Fields

### 1. embedding
- **Type**: Long text
- **Description**: Vector embeddings for AI semantic search (base64-encoded)
- **Used in**: `lib/semantic-search.ts:93,124,132`
- **Why CRITICAL**: **CORE FEATURE** - Without this, semantic search will NOT work

**How to Add**:
1. Catalog table → Click "+"
2. Name: `embedding`
3. Type: Long text
4. Description: "Vector embeddings for semantic search (base64)"
5. Click "Create field"

⚠️ **After adding this field**: Run embedding generation script (future step)

---

### 2. brand
- **Type**: Single line text
- **Description**: Product brand (Rolex, Patek Philippe, Cartier, etc.)
- **Used in**: `lib/rag.ts:89`
- **Why Critical**: AI offers brand list to customers upfront

**How to Add**:
1. Catalog table → Click "+"
2. Name: `brand`
3. Type: Single line text
4. Description: "Product brand (Rolex, Patek Philippe, etc.)"
5. Click "Create field"

---

### 3. tags
- **Type**: Multiple select
- **Description**: Product tags (luxury, sport, classic, diving, chronograph, etc.)
- **Used in**: `lib/semantic-search.ts:156,222`
- **Why Critical**: Tag-based filtering for customer preferences

**How to Add**:
1. Catalog table → Click "+"
2. Name: `tags`
3. Type: Multiple select
4. Add these options:
   - luxury
   - sport
   - classic
   - diving
   - chronograph
   - automatic
   - quartz
   - limited_edition
   - vintage
5. Description: "Product tags for filtering"
6. Click "Create field"

---

### 4. delivery_options
- **Type**: Single select
- **Description**: Delivery availability (store_only, delivery_only, both)
- **Used in**: `lib/semantic-search.ts:33,157,340`
- **Why Critical**: Controls whether product can be shipped or only viewed in-store

**How to Add**:
1. Catalog table → Click "+"
2. Name: `delivery_options`
3. Type: Single select
4. Add these options:
   - store_only
   - delivery_only
   - both
5. Description: "Delivery availability"
6. Click "Create field"

---

### 5. active
- **Type**: Checkbox
- **Description**: Whether product is currently available for sale/display
- **Used in**: `lib/semantic-search.ts:88,326`
- **Why Critical**: Hides inactive products from search results

**How to Add**:
1. Catalog table → Click "+"
2. Name: `active`
3. Type: Checkbox
4. Default: Checked ✅
5. Description: "Product is available"
6. Click "Create field"

---

## 🔧 STORE NUMBERS TABLE - Rename These Fields

⚠️ **Code expects different field names** - Rename these fields:

### 1. phone → Phone Number
**Current name**: `phone`
**Required name**: `Phone Number`
**Used in**: `utils/airtable.ts:293`

**How to Rename**:
1. Store Numbers table → Click `phone` field header
2. Click "Customize field type"
3. Change Field name: `Phone Number`
4. Click "Save"

---

### 2. tenant_id → Tenant
**Current name**: `tenant_id`
**Required name**: `Tenant`
**Used in**: `utils/airtable.ts:294`

**How to Rename**:
1. Store Numbers table → Click `tenant_id` field header
2. Click "Customize field type"
3. Change Field name: `Tenant`
4. Click "Save"

---

## 🔧 APPOINTMENTS TABLE - Rename These Fields

### 1. date → appointment_date
**Current name**: `date`
**Required name**: `appointment_date`
**Used in**: `lib/scheduling.ts:117,222,281`

**How to Rename**:
1. Appointments table → Click `date` field header
2. Click "Customize field type"
3. Change Field name: `appointment_date`
4. Click "Save"

---

### 2. time → appointment_time
**Current name**: `time`
**Required name**: `appointment_time`
**Used in**: `lib/scheduling.ts:117,222,281`

**How to Rename**:
1. Appointments table → Click `time` field header
2. Click "Customize field type"
3. Change Field name: `appointment_time`
4. Click "Save"

---

### 3. salesperson_name → salesperson_id (CHANGE TYPE!)
**Current**: `salesperson_name` (Single line text)
**Required**: `salesperson_id` (Link to Salespeople table)
**Used in**: `lib/scheduling.ts:328`

⚠️ **This is NOT a rename** - You need to DELETE the text field and CREATE a new link field:

**How to Fix**:
1. Appointments table → Click `salesperson_name` field header
2. Delete this field (it's the wrong type)
3. Click "+" to add new field
4. Name: `salesperson_id`
5. Type: Link to another record
6. Choose table: Salespeople
7. Link type: Allow linking to multiple records (unchecked)
8. Description: "Assigned salesperson"
9. Click "Create field"

---

## 🧪 Testing After Adding Fields

After adding all fields above, test:

1. **WhatsApp Interest Tracking**:
   ```
   Send: "Quero um Rolex Submariner"
   Check: Customers.interests_all should show "Rolex Submariner"
   Check: Customers.last_interaction should show current timestamp
   ```

2. **Brand List in Conversation**:
   ```
   Send: "Quero um relógio de luxo"
   AI should respond: "Trabalhamos com Rolex, Patek Philippe, Cartier..."
   ```

3. **Store-Only Product Handling**:
   ```
   Add a product to Catalog with delivery_options = "store_only"
   Send: "Tem [product name] disponível?"
   AI should NOT mention stock, just invite to visit store
   ```

4. **Appointment Booking**:
   ```
   Book an appointment via WhatsApp
   Check: Appointments.appointment_date has correct date
   Check: Appointments.salesperson_id is LINKED to Salespeople table
   ```

---

## 📊 Summary

**Fields to Add**: 8 new fields
- Customers: 3 fields (interests_all, last_interaction, city)
- Catalog: 5 fields (embedding, brand, tags, delivery_options, active)

**Fields to Rename**: 4 fields
- Store Numbers: 2 renames (phone → Phone Number, tenant_id → Tenant)
- Appointments: 2 renames (date → appointment_date, time → appointment_time)

**Fields to Change Type**: 1 field
- Appointments: salesperson_name (text) → salesperson_id (link)

**Expected Impact**: Fixes ALL critical schema errors, enables semantic search, improves conversation quality

**Time Estimate**: 15-20 minutes

---

## ⚠️ IMPORTANT: Do This in Order

1. **First**: Add Customers table fields (interests_all, last_interaction, city)
2. **Second**: Add Catalog table fields (embedding, brand, tags, delivery_options, active)
3. **Third**: Rename Store Numbers fields (phone, tenant_id)
4. **Fourth**: Rename and fix Appointments fields (date, time, salesperson_name)
5. **Finally**: Test all features

---

**Need help with any step? Let me know which field you're stuck on!**
