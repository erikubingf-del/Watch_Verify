# Airtable Base Setup - Complete Guide

This guide will help you create the Watch Verify Airtable base from scratch with exact specifications.

---

## Table 1: Tenants

**Purpose:** Store jewelry store information

### Fields to Create:

1. **name** (Primary Field)
   - Type: Single line text
   - Required: Yes

2. **logo_url**
   - Type: URL
   - Required: No

3. **primary_color**
   - Type: Single line text
   - Required: No

4. **twilio_number**
   - Type: Phone number
   - Required: No

5. **created_at**
   - Type: Created time
   - Required: Yes (auto-generated)

6. **active**
   - Type: Checkbox
   - Required: Yes
   - Default: Checked

### Sample Record to Add:

```
name: Boutique São Paulo
logo_url: https://example.com/logo.png
primary_color: #0ea5e9
twilio_number: +5511999999999
active: ✓ (checked)
```

---

## Table 2: StoreNumbers

**Purpose:** Map phone numbers to tenants

### Fields to Create:

1. **phone** (Primary Field)
   - Type: Phone number
   - Required: Yes

2. **tenant_id**
   - Type: Link to another record
   - Link to table: Tenants
   - Allow linking to multiple records: No
   - Required: Yes

3. **active**
   - Type: Checkbox
   - Required: Yes
   - Default: Checked

### Sample Record to Add:

```
phone: +5511999999999
tenant_id: [Link to "Boutique São Paulo" from Tenants table]
active: ✓ (checked)
```

---

## Table 3: Customers

**Purpose:** Store customer information

### Fields to Create:

1. **phone** (Primary Field)
   - Type: Phone number
   - Required: Yes

2. **tenant_id**
   - Type: Link to another record
   - Link to table: Tenants
   - Allow linking to multiple records: No
   - Required: Yes

3. **name**
   - Type: Single line text
   - Required: No

4. **email**
   - Type: Email
   - Required: No

5. **last_interest**
   - Type: Single line text
   - Required: No

6. **created_at**
   - Type: Created time
   - Required: Yes (auto-generated)

7. **deleted_at**
   - Type: Date and time
   - Include time field: Yes
   - Time format: 24 hour
   - Required: No

### Sample Record to Add:

```
phone: +5511988888888
tenant_id: [Link to "Boutique São Paulo"]
name: João Silva
email: joao@example.com
last_interest: Rolex Submariner
deleted_at: (leave empty)
```

---

## Table 4: Messages

**Purpose:** Log all WhatsApp conversations

### Fields to Create:

1. **body** (Primary Field)
   - Type: Long text
   - Enable rich text formatting: No
   - Required: Yes

2. **tenant_id**
   - Type: Link to another record
   - Link to table: Tenants
   - Allow linking to multiple records: No
   - Required: Yes

3. **phone**
   - Type: Phone number
   - Required: Yes

4. **direction**
   - Type: Single select
   - Options:
     - inbound
     - outbound
   - Required: Yes

5. **media_url**
   - Type: URL
   - Required: No

6. **created_at**
   - Type: Created time
   - Required: Yes (auto-generated)

7. **deleted_at**
   - Type: Date and time
   - Include time field: Yes
   - Required: No

### Sample Record to Add:

```
body: Olá, gostaria de verificar meu Rolex
tenant_id: [Link to "Boutique São Paulo"]
phone: +5511988888888
direction: inbound
media_url: (leave empty)
deleted_at: (leave empty)
```

---

## Table 5: WatchVerify

**Purpose:** Store watch verification records

### Fields to Create:

1. **customer** (Primary Field)
   - Type: Single line text
   - Required: Yes

2. **tenant_id**
   - Type: Link to another record
   - Link to table: Tenants
   - Allow linking to multiple records: No
   - Required: Yes

3. **phone**
   - Type: Phone number
   - Required: Yes

4. **brand**
   - Type: Single line text
   - Required: Yes

5. **model**
   - Type: Single line text
   - Required: No

6. **reference**
   - Type: Single line text
   - Required: No

7. **serial**
   - Type: Single line text
   - Required: No

8. **icd**
   - Type: Number
   - Number format: Integer
   - Allow negative numbers: No
   - Required: Yes

9. **status**
   - Type: Single select
   - Options:
     - pending
     - in_progress
     - completed
     - approved
     - manual_review
     - rejected
   - Required: Yes

10. **photo_url**
    - Type: URL
    - Required: No

11. **guarantee_url**
    - Type: URL
    - Required: No

12. **invoice_url**
    - Type: URL
    - Required: No

13. **notes**
    - Type: Long text
    - Enable rich text formatting: No
    - Required: No

14. **created_at**
    - Type: Created time
    - Required: Yes (auto-generated)

15. **deleted_at**
    - Type: Date and time
    - Include time field: Yes
    - Required: No

### Optional Formula Field:

16. **icd_band**
    - Type: Formula
    - Formula:
    ```
    IF({icd} >= 90, "✅ Consistente (validado)", IF({icd} >= 70, "⚠️ Consistente (sem validação)", IF({icd} >= 41, "⚠️ Inconclusivo", "❌ Inconsistente")))
    ```

### Sample Record to Add:

```
customer: João Silva
tenant_id: [Link to "Boutique São Paulo"]
phone: +5511988888888
brand: Rolex
model: Submariner Date
reference: 116610LN
serial: A1234567
icd: 85
status: approved
photo_url: https://example.com/watch.jpg
guarantee_url: https://example.com/guarantee.jpg
invoice_url: https://example.com/invoice.jpg
notes: All documents consistent
deleted_at: (leave empty)
```

---

## Table 6: Catalog

**Purpose:** Product catalog for semantic search (CRITICAL FOR PHASE 4)

### Fields to Create:

1. **title** (Primary Field)
   - Type: Single line text
   - Required: Yes

2. **tenant_id**
   - Type: Link to another record
   - Link to table: Tenants
   - Allow linking to multiple records: No
   - Required: Yes

3. **description**
   - Type: Long text
   - Enable rich text formatting: No
   - Required: Yes

4. **category**
   - Type: Single select
   - Options:
     - watches
     - rings
     - necklaces
     - bracelets
     - earrings
     - other
   - Required: Yes

5. **price**
   - Type: Currency
   - Currency: BRL (R$)
   - Precision: 2 decimal places
   - Required: No

6. **image_url**
   - Type: URL
   - Required: No

7. **tags**
   - Type: Multiple select
   - Options:
     - luxury
     - gold
     - silver
     - platinum
     - diamond
     - vintage
     - modern
     - sport
     - dress
     - automatic
     - quartz
   - Required: No

8. **embedding**
   - Type: Long text
   - Enable rich text formatting: No
   - Required: No
   - **NOTE:** This will be populated automatically by `npm run sync-catalog`

9. **active**
   - Type: Checkbox
   - Required: Yes
   - Default: Checked

10. **created_at**
    - Type: Created time
    - Required: Yes (auto-generated)

### Sample Records to Add:

**Record 1:**
```
title: Rolex Submariner Date 116610LN
tenant_id: [Link to "Boutique São Paulo"]
description: Relógio automático de mergulho, 40mm, aço inoxidável, mostrador preto, data, resistência à água 300m. Movimento automático calibre 3135, certificado cronômetro.
category: watches
price: 85000.00
image_url: https://example.com/submariner.jpg
tags: luxury, sport, automatic
embedding: (leave empty - will be auto-generated)
active: ✓ (checked)
```

**Record 2:**
```
title: Rolex GMT-Master II 116710LN
tenant_id: [Link to "Boutique São Paulo"]
description: Relógio GMT dual timezone, 40mm, aço inoxidável, bezel cerâmica preta, mostrador preto. Movimento automático calibre 3186.
category: watches
price: 92000.00
image_url: https://example.com/gmt.jpg
tags: luxury, sport, automatic
embedding: (leave empty)
active: ✓ (checked)
```

**Record 3:**
```
title: Omega Seamaster 300M
tenant_id: [Link to "Boutique São Paulo"]
description: Relógio de mergulho profissional, 42mm, aço inoxidável, mostrador azul ondulado, resistência 300m. Movimento Co-Axial.
category: watches
price: 42000.00
image_url: https://example.com/seamaster.jpg
tags: luxury, sport, automatic
embedding: (leave empty)
active: ✓ (checked)
```

**Record 4:**
```
title: Cartier Tank Solo
tenant_id: [Link to "Boutique São Paulo"]
description: Relógio dress clássico retangular, 31mm, aço inoxidável, mostrador branco, pulseira de couro. Movimento quartzo.
category: watches
price: 18000.00
image_url: https://example.com/tank.jpg
tags: luxury, dress, quartz
embedding: (leave empty)
active: ✓ (checked)
```

**Record 5:**
```
title: Anel Solitário Diamante 1ct
tenant_id: [Link to "Boutique São Paulo"]
description: Anel solitário em ouro branco 18k com diamante central de 1 quilate, lapidação brilhante, claridade VS1, cor G.
category: rings
price: 35000.00
image_url: https://example.com/ring.jpg
tags: luxury, diamond, platinum
embedding: (leave empty)
active: ✓ (checked)
```

---

## Table 7: Settings

**Purpose:** White-label configuration per tenant

### Fields to Create:

1. **tenant_id** (Primary Field)
   - Type: Link to another record
   - Link to table: Tenants
   - Allow linking to multiple records: No
   - Required: Yes

2. **brand**
   - Type: Single line text
   - Required: No

3. **logo**
   - Type: URL
   - Required: No

4. **primary**
   - Type: Single line text
   - Required: No

5. **welcome_message**
   - Type: Long text
   - Enable rich text formatting: No
   - Required: No

6. **business_hours**
   - Type: Long text
   - Enable rich text formatting: No
   - Required: No

7. **updated_at**
   - Type: Last modified time
   - Required: Yes (auto-generated)

### Sample Record to Add:

```
tenant_id: [Link to "Boutique São Paulo"]
brand: Boutique Premium
logo: https://example.com/new-logo.png
primary: #d4af37
welcome_message: Bem-vindo à Boutique Premium! Como posso ajudá-lo hoje?
business_hours: Seg-Sex: 10h-19h
Sáb: 10h-15h
```

---

## Table 8: Users

**Purpose:** Dashboard authentication

### Fields to Create:

1. **email** (Primary Field)
   - Type: Email
   - Required: Yes

2. **tenant_id**
   - Type: Link to another record
   - Link to table: Tenants
   - Allow linking to multiple records: No
   - Required: Yes

3. **password_hash**
   - Type: Single line text
   - Required: Yes

4. **name**
   - Type: Single line text
   - Required: Yes

5. **role**
   - Type: Single select
   - Options:
     - admin
     - manager
     - staff
   - Required: Yes

6. **active**
   - Type: Checkbox
   - Required: Yes
   - Default: Checked

7. **created_at**
   - Type: Created time
   - Required: Yes (auto-generated)

### Sample Record to Add:

First, generate a password hash:

```bash
# Run this command in your project:
npm run hash-password "admin123"

# Copy the output hash (starts with $2b$10$...)
```

Then add the record:
```
email: admin@boutique.com
tenant_id: [Link to "Boutique São Paulo"]
password_hash: [Paste the hash from above]
name: Admin User
role: admin
active: ✓ (checked)
```

---

## Quick Creation Checklist

- [ ] Create base named "WatchVerify – Multi-Tenant"
- [ ] Create Table 1: Tenants (6 fields)
- [ ] Create Table 2: StoreNumbers (3 fields)
- [ ] Create Table 3: Customers (7 fields)
- [ ] Create Table 4: Messages (7 fields)
- [ ] Create Table 5: WatchVerify (16 fields)
- [ ] Create Table 6: Catalog (10 fields) ⭐ CRITICAL FOR PHASE 4
- [ ] Create Table 7: Settings (7 fields)
- [ ] Create Table 8: Users (7 fields)
- [ ] Add sample tenant record
- [ ] Add at least 5 sample catalog products
- [ ] Copy Base ID from URL (starts with `app...`)
- [ ] Create new Personal Access Token with base access
- [ ] Test connection

---

## Next Steps After Creation

1. **Copy your Base ID** from the URL (e.g., `app4cwmDJPeS604Bv`)
2. **Create a new Personal Access Token**:
   - Go to https://airtable.com/create/tokens
   - Create new token
   - Add scopes: `data.records:read`, `data.records:write`
   - Add base: "WatchVerify – Multi-Tenant"
   - Copy the token
3. **Update `.env.local`** with your Base ID and token
4. **Run connection test**: `npx tsx scripts/test-airtable.ts`
5. **Generate embeddings**: `npm run sync-catalog`

---

## Tips

- **Field order doesn't matter** - Airtable allows reordering
- **Primary field** is just the first field, determines record name
- **Links between tables** happen automatically when you select "Link to another record"
- **Formula fields** are optional but helpful for visualization
- **Start with 1 tenant** and expand later for multi-tenant testing

---

Let me know when tables are created and I'll help test the connection!
