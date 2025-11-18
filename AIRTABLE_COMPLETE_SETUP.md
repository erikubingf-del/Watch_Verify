# 🎯 COMPLETE AIRTABLE DATABASE SETUP GUIDE

**Watch Verify CRM - All 17 Tables**

This guide provides step-by-step instructions to create your complete Airtable database, including:
- ✅ **Customer Interests Tracking** (from conversations)
- ✅ **Watch Verification System** (used watch authentication)
- ✅ **Product Stock Management** (inventory & delivery options)
- ✅ **Screenshot References** (for each table)

---

## 📂 Screenshot Organization

**Create folder:** `/home/user/Watch_Verify/airtable-screenshots/`

Save screenshots as:
- `01-tenants.png`
- `02-store-numbers.png`
- `03-customers.png`
- `04-messages.png`
- `05-watch-verify.png`
- `06-catalog.png`
- `07-settings.png`
- `08-users.png`
- `09-verification-sessions.png`
- `10-salespeople.png`
- `11-appointments.png`
- `12-store-availability.png`
- `13-payment-providers.png`
- `14-payment-links.png`
- `15-campaigns.png`
- `16-campaign-sessions.png`
- `17-booking-sessions.png`

---

## 🏗️ Setup Priority

### Phase 1: CORE TABLES (Required First) - 30 minutes
Tables 1-3, 7-8 - Basic CRM functionality

### Phase 2: BOOKING SYSTEM (Priority for Testing) - 20 minutes
Tables 10-12, 17 - Appointment booking

### Phase 3: OPTIONAL TABLES (Create Later) - 30 minutes
Tables 4-6, 9, 13-16 - Advanced features

---

# 📋 TABLE SPECIFICATIONS

---

## ✅ Table 1: Tenants

**Purpose:** Stores (multi-tenant support)

**Screenshot:** Save as `01-tenants.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `name` | Single line text | - | ✅ | Store name (e.g., "Boutique São Paulo") |
| `logo_url` | URL | - | ❌ | Logo image URL for white-labeling |
| `primary_color` | Single line text | - | ❌ | Hex color (e.g., "#0ea5e9") |
| `twilio_number` | Phone | - | ✅ | WhatsApp Business number |
| `created_at` | Date & time | Include time | ✅ | Auto-set on creation |
| `active` | Checkbox | - | ✅ | Whether tenant is active |

**Sample Record:**
```
name: Boutique Premium SP
logo_url: https://example.com/logo.png
primary_color: #0ea5e9
twilio_number: +5511999999999
created_at: 2024-01-20 10:00:00
active: ✓
```

**Why Important:** Every other table links to Tenants for multi-store isolation.

---

## ✅ Table 2: StoreNumbers

**Purpose:** Map Twilio numbers to tenants

**Screenshot:** Save as `02-store-numbers.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Links to Tenants table |
| `phone` | Phone | - | ✅ | Twilio WhatsApp number (unique) |
| `active` | Checkbox | - | ✅ | Whether number is active |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
phone: +5511999999999
active: ✓
```

**Why Important:** Webhook routing (incoming WhatsApp → correct tenant).

---

## ✅ Table 3: Customers ⭐

**Purpose:** Customer CRM with **INTEREST TRACKING**

**Screenshot:** Save as `03-customers.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Links to Tenants table |
| `phone` | Phone | - | ✅ | Customer WhatsApp number (unique per tenant) |
| `name` | Single line text | - | ❌ | Customer name (extracted from conversation) |
| `email` | Email | - | ❌ | Customer email |
| `interests` | Long text | - | ❌ | **JSON array of interests** (e.g., `["Rolex", "Submariner"]`) |
| `last_interest` | Single line text | - | ❌ | Most recent product inquiry |
| `budget_range` | Single select | low, medium, high, luxury | ❌ | Inferred budget (never asked directly) |
| `vip` | Checkbox | - | ❌ | VIP customer flag |
| `notes` | Long text | - | ❌ | Internal notes (salespeople add context) |
| `last_purchase` | Date | - | ❌ | Last purchase date (for campaign targeting) |
| `created_at` | Date & time | Include time | ✅ | First contact date |
| `deleted_at` | Date & time | Include time | ❌ | LGPD soft-delete timestamp |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
phone: +5511988888888
name: João Silva
email: joao@example.com
interests: ["Rolex Submariner", "Patek Philippe", "diving watches"]
last_interest: Rolex Submariner
budget_range: luxury
vip: ✓
notes: Cliente VIP, gosta de relógios esportivos, comprou Omega em 2023
last_purchase: 2023-06-15
created_at: 2024-01-20 14:30:00
deleted_at: (empty)
```

**Why Important:**
- Tracks customer interests automatically from conversations
- Used for personalized recommendations
- Campaign targeting (inactive 6+ months, VIP, etc.)

**Formula Field (Optional):**
- `display_name`: `IF({name}, {name}, {phone})`

---

## ✅ Table 4: Messages

**Purpose:** WhatsApp conversation history

**Screenshot:** Save as `04-messages.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Links to Tenants table |
| `phone` | Phone | - | ✅ | Customer phone number |
| `body` | Long text | - | ✅ | Message content |
| `direction` | Single select | inbound, outbound | ✅ | Message direction |
| `media_url` | URL | - | ❌ | Media attachment URL (photos, docs) |
| `created_at` | Date & time | Include time | ✅ | Message timestamp |
| `deleted_at` | Date & time | Include time | ❌ | LGPD soft-delete (cascade from customer) |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
phone: +5511988888888
body: Olá, gostaria de verificar meu Rolex
direction: inbound
media_url: (empty)
created_at: 2024-01-20 15:00:00
deleted_at: (empty)
```

**Why Important:**
- Full conversation history
- Used for extracting customer interests
- RAG context for personalized responses

---

## ✅ Table 5: WatchVerify ⭐

**Purpose:** **WATCH AUTHENTICATION** (used watch verification when customer wants to sell)

**Screenshot:** Save as `05-watch-verify.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Links to Tenants table |
| `customer` | Single line text | - | ✅ | Customer name |
| `phone` | Phone | - | ✅ | Customer phone |
| `brand` | Single line text | - | ✅ | Watch brand (e.g., "Rolex") |
| `model` | Single line text | - | ❌ | Watch model (e.g., "Submariner") |
| `reference` | Single line text | - | ❌ | Reference number (e.g., "116610LN") |
| `serial` | Single line text | - | ❌ | Serial number |
| `icd` | Number | Decimal (0-100) | ✅ | **ICD Consistency Score** (0-100) |
| `status` | Single select | pending, in_progress, completed, approved, manual_review, rejected | ✅ | Verification status |
| `photo_url` | URL | - | ❌ | Watch photo URL (Cloudinary permanent) |
| `guarantee_url` | URL | - | ❌ | Guarantee card photo URL (Cloudinary) |
| `invoice_url` | URL | - | ❌ | Invoice/receipt photo URL (Cloudinary) |
| `issues` | Long text | - | ❌ | Issues found (JSON array) |
| `recommendations` | Long text | - | ❌ | Recommendations (JSON array) |
| `notes` | Long text | - | ❌ | Internal notes |
| `created_at` | Date & time | Include time | ✅ | Verification request date |
| `completed_at` | Date & time | Include time | ❌ | Verification completion date |
| `deleted_at` | Date & time | Include time | ❌ | LGPD soft-delete timestamp |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
customer: João Silva
phone: +5511988888888
brand: Rolex
model: Submariner
reference: 116610LN
serial: A1234567
icd: 85
status: approved
photo_url: https://res.cloudinary.com/.../watch.jpg
guarantee_url: https://res.cloudinary.com/.../guarantee.jpg
invoice_url: https://res.cloudinary.com/.../invoice.jpg
issues: ["Minor serial mismatch on guarantee card"]
recommendations: ["Request additional dealer confirmation"]
notes: All documents consistent, high confidence
created_at: 2024-01-20 15:30:00
completed_at: 2024-01-20 15:35:00
deleted_at: (empty)
```

**Why Important:**
- Authenticates used watches when customers want to sell
- Prevents fraud
- Builds trust with customers
- Premium paid feature ($50/verification)

**Formula Field (Optional):**
- `icd_band`:
  ```
  IF({icd} >= 90, "✅ Consistente (validado)",
     IF({icd} >= 70, "⚠️ Consistente (sem validação)",
        IF({icd} >= 41, "⚠️ Inconclusivo",
           "❌ Inconsistente")))
  ```

---

## ✅ Table 6: Catalog ⭐

**Purpose:** **PRODUCT CATALOG** with stock management & semantic search

**Screenshot:** Save as `06-catalog.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Links to Tenants table |
| `title` | Single line text | - | ✅ | Product name (e.g., "Rolex Submariner Date 116610LN") |
| `description` | Long text | - | ✅ | Detailed description |
| `category` | Single select | watches, rings, necklaces, bracelets, earrings, other | ✅ | Product category |
| `brand` | Single line text | - | ❌ | Brand name (e.g., "Rolex") |
| `price` | Currency | BRL (R$) | ❌ | Product price |
| `image_url` | URL | - | ❌ | Product image |
| `tags` | Multiple select | luxury, gold, silver, platinum, diamond, vintage, modern, sport, dress, automatic, quartz | ❌ | Searchable tags |
| `stock_quantity` | Number | Integer | ❌ | **Stock count** (0 = out of stock) |
| `delivery_options` | Single select | store_only, delivery_only, both | ✅ | **Delivery method available** |
| `embedding` | Long text | - | ❌ | **Vector embedding (base64)** - CRITICAL for semantic search |
| `active` | Checkbox | - | ✅ | Whether product is available |
| `created_at` | Date & time | Include time | ✅ | Product creation date |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
title: Rolex Submariner Date 116610LN
description: Relógio automático de mergulho, 40mm, aço inoxidável, mostrador preto, data, resistência à água 300m. Movimento calibre 3135 automático com 48h de reserva de marcha.
category: watches
brand: Rolex
price: 85000.00
image_url: https://example.com/submariner.jpg
tags: luxury, sport, automatic
stock_quantity: 2
delivery_options: both
embedding: [base64 encoded vector - auto-generated]
active: ✓
created_at: 2024-01-15 10:00:00
```

**Why Important:**
- **Stock tracking** (user's concern: "product stock and etc")
- **Delivery options** per product (store pickup, home delivery, both)
- **Semantic search** via embeddings (AI finds relevant products)
- Used for personalized recommendations

**Notes:**
- Run `npm run sync-catalog` to generate embeddings
- Embedding field is auto-populated by script

---

## ✅ Table 7: Settings

**Purpose:** White-label configuration per tenant

**Screenshot:** Save as `07-settings.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Links to Tenants table |
| `brand` | Single line text | - | ❌ | Store brand name override |
| `logo` | URL | - | ❌ | Logo URL override |
| `primary` | Single line text | - | ❌ | Primary color override (hex) |
| `welcome_message` | Long text | - | ❌ | Custom welcome message |
| `business_hours` | Long text | - | ❌ | Store hours (formatted text) |
| `updated_at` | Date & time | Include time | ✅ | Last update timestamp |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
brand: Boutique Premium
logo: https://example.com/new-logo.png
primary: #d4af37
welcome_message: Bem-vindo à Boutique Premium! Como posso ajudá-lo hoje?
business_hours: Seg-Sex: 10h-19h\nSáb: 10h-15h
updated_at: 2024-01-25 10:00:00
```

---

## ✅ Table 8: Users

**Purpose:** Dashboard authentication (NextAuth)

**Screenshot:** Save as `08-users.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Links to Tenants table |
| `email` | Email | - | ✅ | User email (unique) |
| `password_hash` | Single line text | - | ✅ | Bcrypt hashed password |
| `name` | Single line text | - | ✅ | User full name |
| `role` | Single select | admin, manager, staff | ✅ | User role |
| `active` | Checkbox | - | ✅ | Whether user can log in |
| `created_at` | Date & time | Include time | ✅ | Account creation date |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
email: admin@boutique.com
password_hash: $2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
name: Maria Admin
role: admin
active: ✓
created_at: 2024-01-15 10:00:00
```

**Security Note:** Never store plain passwords. Use bcrypt hash.

---

## ✅ Table 9: VerificationSessions

**Purpose:** Temporary verification workflow state (1 hour TTL)

**Screenshot:** Save as `09-verification-sessions.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `session_id` | Single line text | - | ✅ | Unique session ID (UUID) |
| `tenant_id` | Single line text | - | ✅ | Tenant ID (not linked) |
| `customer_phone` | Phone | - | ✅ | Customer phone (unique per active session) |
| `customer_name` | Single line text | - | ✅ | Customer name |
| `state` | Single select | awaiting_watch_photo, awaiting_guarantee, awaiting_invoice, processing, completed | ✅ | Current workflow state |
| `watch_photo_url` | URL | - | ❌ | Watch photo URL |
| `guarantee_card_url` | URL | - | ❌ | Guarantee card URL |
| `invoice_url` | URL | - | ❌ | Invoice URL |
| `created_at` | Date & time | Include time | ✅ | Session creation time |
| `updated_at` | Date & time | Include time | ✅ | Last update time |
| `expires_at` | Date & time | Include time | ✅ | Session expiration (1 hour) |

**Sample Record:**
```
session_id: 550e8400-e29b-41d4-a716-446655440000
tenant_id: recXXXXXXXXXXXXXX
customer_phone: +5511988888888
customer_name: João Silva
state: awaiting_guarantee
watch_photo_url: https://api.twilio.com/.../Media/...
guarantee_card_url: (empty)
invoice_url: (empty)
created_at: 2024-01-20 15:30:00
updated_at: 2024-01-20 15:32:00
expires_at: 2024-01-20 16:30:00
```

**Why Important:** Prevents data loss on server restarts (Vercel cold starts).

---

## ✅ Table 10: Salespeople

**Purpose:** Store contacts for appointment assignment

**Screenshot:** Save as `10-salespeople.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Store/tenant |
| `name` | Single line text | - | ✅ | Salesperson name (e.g., "Patricia") |
| `phone` | Phone | - | ✅ | Personal phone number |
| `whatsapp` | Phone | - | ✅ | WhatsApp for notifications |
| `email` | Email | - | ❌ | Email address |
| `max_daily_appointments` | Number | Integer | ✅ | Max appointments/day (default: 5) |
| `working_hours` | Long text | JSON | ✅ | Working schedule (JSON format) |
| `active` | Checkbox | - | ✅ | Is currently active |
| `created_at` | Date & time | Include time | ✅ | Record creation timestamp |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
name: Patricia
phone: +5511995843051
whatsapp: +5511995843051
email: patricia@boutique.com
max_daily_appointments: 5
working_hours: {"mon":"9-18","tue":"9-18","wed":"9-18","thu":"9-18","fri":"9-18","sat":"10-16"}
active: ✓
created_at: 2024-01-20 10:00:00
```

**Why Important:**
- Round-robin appointment assignment
- Daily schedule reports (8am WhatsApp)
- Fair workload distribution

---

## ✅ Table 11: Appointments

**Purpose:** Customer appointment bookings

**Screenshot:** Save as `11-appointments.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Store/tenant |
| `customer_phone` | Phone | - | ✅ | Customer phone |
| `customer_name` | Single line text | - | ✅ | Customer name |
| `salesperson_id` | Link to another record | Link to: Salespeople | ✅ | Assigned salesperson |
| `appointment_date` | Date | - | ✅ | Appointment date (YYYY-MM-DD) |
| `appointment_time` | Single line text | - | ✅ | Time slot (e.g., "14:00") |
| `status` | Single select | pending, confirmed, completed, cancelled, no_show | ✅ | Current status |
| `product_interest` | Long text | - | ❌ | What customer wants to see |
| `notes` | Long text | - | ❌ | Additional notes |
| `created_at` | Date & time | Include time | ✅ | Booking creation time |
| `reminded_at` | Date & time | Include time | ❌ | Last reminder sent timestamp |
| `confirmed_at` | Date & time | Include time | ❌ | Customer confirmation timestamp |
| `completed_at` | Date & time | Include time | ❌ | Visit completion timestamp |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
customer_phone: +5511988888888
customer_name: João Silva
salesperson_id: [Link to Patricia]
appointment_date: 2024-01-25
appointment_time: 14:00
status: confirmed
product_interest: Rolex Submariner
notes: Cliente VIP, preferência por relógios esportivos
created_at: 2024-01-20 15:30:00
reminded_at: (empty)
confirmed_at: 2024-01-20 15:35:00
completed_at: (empty)
```

**Why Important:**
- Tracks all bookings
- Status flow: pending → confirmed → completed/cancelled/no_show
- Used for daily reports and reminders

---

## ✅ Table 12: StoreAvailability

**Purpose:** Configure time slots and capacity

**Screenshot:** Save as `12-store-availability.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Store/tenant |
| `day_of_week` | Single select | 0, 1, 2, 3, 4, 5, 6 | ✅ | Day (0=Sunday, 5=Friday, 6=Saturday) |
| `time_slot` | Single line text | - | ✅ | Time slot (e.g., "14:00") |
| `max_bookings` | Number | Integer | ✅ | Max appointments for this slot (default: 5) |
| `active` | Checkbox | - | ✅ | Is slot available |

**Sample Record (Friday 14:00):**
```
tenant_id: [Link to Boutique Premium SP]
day_of_week: 5
time_slot: 14:00
max_bookings: 5
active: ✓
```

**Why Important:**
- Configurable capacity per slot
- Algorithm prioritizes less busy slots
- Editable max_bookings per store

**Setup Note:** Create one record per time slot per day you want available.

---

## ✅ Table 13: PaymentProviders

**Purpose:** Store payment API credentials (encrypted)

**Screenshot:** Save as `13-payment-providers.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Store/tenant |
| `provider_name` | Single select | Pagbank, Cielo, Mercado Pago, Stone, PicPay, Stripe, Custom | ✅ | Payment provider |
| `api_key` | Single line text | - | ✅ | API key (encrypt before storing) |
| `api_secret` | Single line text | - | ✅ | API secret (encrypt before storing) |
| `webhook_url` | URL | - | ❌ | Provider webhook URL |
| `active` | Checkbox | - | ✅ | Is provider active |
| `created_at` | Date & time | Include time | ✅ | Configuration timestamp |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
provider_name: Pagbank
api_key: encrypted_key_here
api_secret: encrypted_secret_here
webhook_url: https://api.pagbank.com/webhooks
active: ✓
created_at: 2024-01-20 10:00:00
```

**Security Note:** Encrypt credentials before storing.

---

## ✅ Table 14: PaymentLinks

**Purpose:** Track payment links and status

**Screenshot:** Save as `14-payment-links.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Store/tenant |
| `customer_phone` | Phone | - | ✅ | Customer phone |
| `customer_name` | Single line text | - | ✅ | Customer name |
| `product_id` | Link to another record | Link to: Catalog | ❌ | Product being purchased |
| `product_name` | Single line text | - | ✅ | Product name (fallback) |
| `amount` | Currency | BRL (R$) | ✅ | Payment amount |
| `provider_name` | Single line text | - | ✅ | Payment provider used |
| `provider_link_url` | URL | - | ✅ | Generated payment link |
| `provider_link_id` | Single line text | - | ✅ | Provider's transaction ID |
| `status` | Single select | pending, paid, expired, cancelled, refunded | ✅ | Payment status |
| `delivery_option` | Single select | store_pickup, home_delivery, both | ✅ | Delivery method |
| `created_at` | Date & time | Include time | ✅ | Link creation time |
| `paid_at` | Date & time | Include time | ❌ | Payment confirmation timestamp |
| `expires_at` | Date & time | Include time | ❌ | Link expiration time |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
customer_phone: +5511988888888
customer_name: João Silva
product_id: [Link to Rolex Submariner]
product_name: Rolex Submariner 116610LN
amount: 75000.00
provider_name: Pagbank
provider_link_url: https://pag.ae/7XXXXXXXXX
provider_link_id: PAY_123456789
status: pending
delivery_option: both
created_at: 2024-01-20 15:30:00
paid_at: (empty)
expires_at: 2024-01-27 15:30:00
```

**Why Important:**
- Track all payment links
- Webhook updates status
- Revenue reporting

---

## ✅ Table 15: Campaigns

**Purpose:** Marketing campaign automation

**Screenshot:** Save as `15-campaigns.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Store/tenant |
| `name` | Single line text | - | ✅ | Campaign name |
| `target_type` | Single select | inactive_6m, vip, product_launch, custom | ✅ | Target audience type |
| `target_filter` | Long text | - | ✅ | Airtable formula for filtering |
| `message_template` | Long text | - | ✅ | Message to send |
| `status` | Single select | draft, scheduled, sending, completed, cancelled | ✅ | Campaign status |
| `scheduled_at` | Date & time | Include time | ❌ | When to send (null = immediate) |
| `sent_count` | Number | Integer | ❌ | Number of messages sent |
| `created_by` | Phone | - | ✅ | Store contact who created campaign |
| `created_at` | Date & time | Include time | ✅ | Campaign creation time |
| `completed_at` | Date & time | Include time | ❌ | Campaign completion time |

**Sample Record:**
```
tenant_id: [Link to Boutique Premium SP]
name: Campanha VIP - Novos Rolex 2024
target_type: vip
target_filter: AND({tenant_id}='recXXXXXXXXXXXXXX', {vip}=TRUE())
message_template: Olá! Temos novidades exclusivas da Rolex para você. Agende sua visita: https://...
status: completed
scheduled_at: (empty)
sent_count: 47
created_by: +5511999999999
created_at: 2024-01-20 10:00:00
completed_at: 2024-01-20 10:15:00
```

**Why Important:**
- Conversational campaign creation via WhatsApp
- Target inactive customers, VIPs, product launches
- Rate-limited to 1 msg/second (Twilio compliance)

---

## ✅ Table 16: CampaignSessions

**Purpose:** Temporary campaign creation state (30min TTL)

**Screenshot:** Save as `16-campaign-sessions.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `phone` | Phone | - | ✅ | Store contact phone |
| `tenant_id` | Link to another record | Link to: Tenants | ✅ | Store/tenant |
| `step` | Single line text | - | ✅ | Current conversation step |
| `data` | Long text | JSON | ✅ | Session state data |
| `created_at` | Date & time | Include time | ✅ | Session creation time |
| `expires_at` | Date & time | Include time | ✅ | Session expiration (30 minutes) |

**Sample Record:**
```
phone: +5511999999999
tenant_id: [Link to Boutique Premium SP]
step: write_message
data: {"type":"inactive_6m","filter":"AND({tenant_id}='recXXX', DATETIME_DIFF(NOW(), {last_purchase}, 'months') >= 6)"}
created_at: 2024-01-20 15:00:00
expires_at: 2024-01-20 15:30:00
```

**Why Important:** Prevents data loss during campaign creation conversation.

---

## ✅ Table 17: BookingSessions

**Purpose:** Temporary booking conversation state (30min TTL)

**Screenshot:** Save as `17-booking-sessions.png`

| Field Name | Field Type | Options/Format | Required | Description |
|------------|------------|----------------|----------|-------------|
| `session_id` | Single line text | - | ✅ | Unique session ID (UUID) |
| `tenant_id` | Single line text | - | ✅ | Store/tenant |
| `customer_phone` | Phone | - | ✅ | Customer phone number |
| `customer_name` | Single line text | - | ✅ | Customer name |
| `state` | Single select | awaiting_date, awaiting_time, awaiting_product, completed | ✅ | Current conversation step |
| `preferred_date` | Date | - | ❌ | Date customer wants to visit |
| `preferred_time` | Single line text | - | ❌ | Time slot chosen |
| `available_slots` | Long text | JSON | ❌ | Cached available slots |
| `product_interest` | Long text | - | ❌ | Product customer wants to see |
| `created_at` | Date & time | Include time | ✅ | Session creation time |
| `updated_at` | Date & time | Include time | ✅ | Last update time |
| `expires_at` | Date & time | Include time | ✅ | Session expiration (30 minutes) |
| `deleted_at` | Date & time | Include time | ❌ | Soft delete timestamp |

**Sample Record:**
```
session_id: 550e8400-e29b-41d4-a716-446655440000
tenant_id: recXXXXXXXXXXXXXX
customer_phone: +5511988888888
customer_name: João Silva
state: awaiting_time
preferred_date: 2024-01-25
preferred_time: (empty)
available_slots: [{"time":"14:00","available":5,"booked":0,"percentage":0}]
product_interest: (empty)
created_at: 2024-01-20 15:00:00
updated_at: 2024-01-20 15:05:00
expires_at: 2024-01-20 15:30:00
deleted_at: (empty)
```

**Why Important:**
- Manages booking conversation state
- Prevents data loss on server restarts
- Steps: awaiting_date → awaiting_time → awaiting_product → completed

---

# 🎯 QUICK START CHECKLIST

## Phase 1: Core Tables (30 min)

- [ ] Create Table 1: Tenants
- [ ] Add 1 sample tenant (your store)
- [ ] Screenshot → `01-tenants.png`

- [ ] Create Table 2: StoreNumbers
- [ ] Link your Twilio number to tenant
- [ ] Screenshot → `02-store-numbers.png`

- [ ] Create Table 3: Customers
- [ ] Add `interests` field (Long text) ⭐
- [ ] Add `budget_range` field (Single select)
- [ ] Screenshot → `03-customers.png`

- [ ] Create Table 7: Settings
- [ ] Screenshot → `07-settings.png`

- [ ] Create Table 8: Users
- [ ] Add 1 admin user
- [ ] Screenshot → `08-users.png`

## Phase 2: Booking System (20 min) - PRIORITY FOR TESTING

- [ ] Create Table 10: Salespeople
- [ ] Add Patricia (+5511995843051)
- [ ] Screenshot → `10-salespeople.png`

- [ ] Create Table 11: Appointments
- [ ] Screenshot → `11-appointments.png`

- [ ] Create Table 12: StoreAvailability
- [ ] Add Friday 10:00, 14:00, 16:00 slots
- [ ] Set max_bookings = 5 for each
- [ ] Screenshot → `12-store-availability.png`

- [ ] Create Table 17: BookingSessions
- [ ] Screenshot → `17-booking-sessions.png`

## Phase 3: Optional Tables (30 min) - Create Later

- [ ] Create Table 4: Messages
- [ ] Screenshot → `04-messages.png`

- [ ] Create Table 5: WatchVerify ⭐
- [ ] Screenshot → `05-watch-verify.png`

- [ ] Create Table 6: Catalog ⭐
- [ ] Add `stock_quantity` field (Number) ⭐
- [ ] Add `delivery_options` field (Single select) ⭐
- [ ] Screenshot → `06-catalog.png`

- [ ] Create Table 9: VerificationSessions
- [ ] Screenshot → `09-verification-sessions.png`

- [ ] Create Table 13: PaymentProviders
- [ ] Screenshot → `13-payment-providers.png`

- [ ] Create Table 14: PaymentLinks
- [ ] Screenshot → `14-payment-links.png`

- [ ] Create Table 15: Campaigns
- [ ] Screenshot → `15-campaigns.png`

- [ ] Create Table 16: CampaignSessions
- [ ] Screenshot → `16-campaign-sessions.png`

---

# 🔧 After Creating Tables

## 1. Get Base ID
- Go to https://airtable.com
- Open your base
- Copy Base ID from URL (starts with `app`)

## 2. Generate API Token
- Go to https://airtable.com/create/tokens
- Create token with scopes: `data.records:read`, `data.records:write`
- Add your base
- Copy token

## 3. Update `.env.local`
```bash
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_PAT=patXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## 4. Test Connection
```bash
npm run dev
curl http://localhost:3000/api/export?scope=customers
```

## 5. Test Booking via WhatsApp
Send "agendar" to your WhatsApp test number (+5511995843051)

---

# 📊 Summary of What You Asked For

✅ **Customer Interests:** Table 3 (Customers) has `interests` field (JSON array)
✅ **Watch Verification:** Table 5 (WatchVerify) - complete authentication system
✅ **Product Stock:** Table 6 (Catalog) has `stock_quantity` field
✅ **Delivery Options:** Table 6 (Catalog) has `delivery_options` field
✅ **17 Tables Total:** All tables detailed above
✅ **Screenshots:** Save to `/home/user/Watch_Verify/airtable-screenshots/`

---

**Ready to create! 🚀**

Follow the Quick Start Checklist and you'll be testing in 50 minutes.
