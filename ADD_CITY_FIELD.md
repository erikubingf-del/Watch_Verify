# Add City Field to Customers Table - Manual Step

**Status:** ⚠️ Manual action required
**Time:** 1 minute
**Priority:** HIGH - Improves customer matching accuracy

---

## Why This Field is Important

The `city` field enables much more accurate customer matching when salespeople submit feedback:

**Before (without city):**
```
"João Silva" → Finds 5 customers, needs disambiguation
```

**After (with city):**
```
"João Silva de São Paulo" → Finds 1 exact match immediately
```

---

## Manual Steps

1. **Open Airtable Base:** https://airtable.com/appig3KRYD5neBJqV

2. **Go to Customers Table**

3. **Click "+ Add field" button** (top right of table)

4. **Configure the field:**
   - Field name: `city`
   - Field type: "Single line text"
   - Click "Create field"

5. **Done!** The field is now ready

---

## How It Works

### Salesperson Feedback Example:

**Audio feedback:**
```
"Atendi o João Silva de São Paulo hoje, ele adorou o Submariner..."
```

**AI Extraction:**
```json
{
  "customer_name": "João Silva",
  "city": "São Paulo",
  "product_interest": "Submariner"
}
```

**Matching Priority:**
1. ✅ **Exact name + city** → João Silva + São Paulo (HIGHEST confidence)
2. ✅ **Exact name only** → João Silva (any city)
3. ⚠️  **Partial name + city** → João + São Paulo
4. ⚠️  **Partial name only** → João (any city)

### Disambiguation Message (now with city):

**Before:**
```
Encontrei 3 clientes:

1️⃣ João Silva - +5511995843051
   Última visita: 2024-10-15

2️⃣ João Silva - +5521988776655
   Última visita: 2024-09-20

3️⃣ João da Silva - +5511977665544
   Primeira visita: 2024-11-10
```

**After:**
```
Encontrei 3 clientes:

1️⃣ João Silva - São Paulo - +5511995843051
   Última visita: 2024-10-15

2️⃣ João Silva - Rio de Janeiro - +5521988776655
   Última visita: 2024-09-20

3️⃣ João da Silva - São Paulo - +5511977665544
   Primeira visita: 2024-11-10
```

Much easier to identify the correct customer!

---

## Code Already Updated

✅ `lib/salesperson-feedback.ts`:
- FeedbackData interface includes `city`
- extractFeedbackData() extracts city from feedback
- findCustomersByName() uses city for matching priority
- updateCustomerWithFeedback() saves city to database
- formatDisambiguationOptions() displays city

✅ `app/api/webhooks/twilio/route.ts`:
- Passes city to findCustomersByName()

---

## Testing After Adding Field

1. Send audio feedback with city:
   ```
   "Atendi o João Silva de São Paulo, ele gostou do Submariner"
   ```

2. Verify city extracted in FeedbackSessions table:
   ```json
   {
     "customer_name": "João Silva",
     "city": "São Paulo",
     ...
   }
   ```

3. Verify city saved in Customers table:
   - Customer record should show: `city = "São Paulo"`

4. Test disambiguation with multiple "João Silva" customers from different cities

---

## Optional: Populate Existing Customers

If you already have customers in the database, you can manually add their cities:

1. Open Customers table
2. Click on a customer row
3. Fill in the `city` field
4. Repeat for important customers

Or ask salespeople to mention city in next feedback:
```
"Atendi novamente o João Silva, ele mora em São Paulo..."
```

---

**Status:** Add this field manually, then city-based matching will work automatically!

**Estimated Impact:**
- 50-70% reduction in disambiguation prompts
- Faster feedback processing
- Better customer experience
