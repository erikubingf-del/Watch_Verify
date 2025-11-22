# Actually Missing Fields (Verified Against Real Schema)

I checked your actual Airtable schema. Here are the **ONLY** fields that are missing:

---

## ✅ CUSTOMERS TABLE - Add These 2 Fields

### 1. interests_all
- **Type**: Long text (multilineText)
- **Description**: Complete historical interests (all products customer ever asked about)
- **Why**: Code references this in `app/api/webhooks/twilio/route.ts:409` and `lib/scheduling.ts:290`

**How to Add**:
1. Airtable → Customers table
2. Click "+" button
3. Name: `interests_all`
4. Type: Long text
5. Click "Create field"

---

### 2. last_interaction
- **Type**: Date and time (dateTime)
- **Description**: Timestamp of most recent WhatsApp message
- **Why**: Code references this in `app/api/webhooks/twilio/route.ts:416` and `lib/scheduling.ts:294`

**How to Add**:
1. Customers table → Click "+"
2. Name: `last_interaction`
3. Type: Date and time
4. Include time: YES
5. Time format: 24 hour
6. Time zone: UTC
7. Click "Create field"

---

## ✅ CUSTOMERS TABLE - Add This Optional Field

### 3. city
- **Type**: Single line text
- **Description**: Customer city for salesperson feedback
- **Why**: Code references this in `lib/salesperson-feedback.ts:442-448`

**How to Add**:
1. Customers table → Click "+"
2. Name: `city`
3. Type: Single line text
4. Click "Create field"

---

## 🎉 Everything Else is Already There!

Your Airtable schema already has:

### Customers Table ✅
- interests
- budget_min, budget_max
- birthday
- hobbies
- last_visit
- updated_at
- notes

### Catalog Table ✅
- embedding
- brand
- tags
- delivery_options
- active

### Store Numbers Table ✅
- Phone Number (correct name!)
- Tenant (correct name!)

### Appointments Table ✅
- appointment_date (correct name!)
- appointment_time (correct name!)
- salesperson_id (link to Salespeople - correct type!)

---

## 📊 Summary

**Fields to ADD**: Only 3 fields (2 required, 1 optional)
- Customers: `interests_all` (required)
- Customers: `last_interaction` (required)
- Customers: `city` (optional, for salesperson feedback feature)

**Expected Impact**: Fixes customer interest tracking errors

**Time**: 2 minutes

---

## 🧪 Test After Adding

1. **Send WhatsApp message**:
   ```
   To: +1 762-372-7247
   Message: "Quero um Rolex Submariner"
   ```

2. **Check Customers table**:
   - `interests_all` should show: ["Rolex Submariner"]
   - `last_interaction` should show current timestamp

3. **Book appointment**:
   - Both fields should update automatically

---

**All other fields you need are already in your Airtable base!**
