# Airtable Schema Documentation

This document describes the complete Airtable base structure required for Watch Verify.

## Base Setup

1. Create a new Airtable base
2. Copy the Base ID from the URL (starts with `app`)
3. Generate a Personal Access Token with full permissions
4. Add both to your `.env.local` file

---

## Table 1: Tenants

**Purpose:** Store information about each jewelry store using the platform.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `name` | Single line text | ✅ | Store name (e.g., "Joalheria Premium") |
| `logo_url` | URL | ❌ | Logo image URL for white-labeling |
| `primary_color` | Single line text | ❌ | Hex color code (e.g., "#0ea5e9") |
| `twilio_number` | Phone | ✅ | WhatsApp Business number |
| `created_at` | Date & time | ✅ | Auto-set on creation |
| `active` | Checkbox | ✅ | Whether tenant is active |

**Example Record:**
```json
{
  "name": "Boutique São Paulo",
  "logo_url": "https://example.com/logo.png",
  "primary_color": "#0ea5e9",
  "twilio_number": "+5511999999999",
  "created_at": "2024-01-15T10:00:00.000Z",
  "active": true
}
```

---

## Table 2: StoreNumbers

**Purpose:** Map Twilio phone numbers to tenants for multi-tenant routing.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Links to Tenants table |
| `phone` | Phone | ✅ | Twilio WhatsApp number (must be unique) |
| `active` | Checkbox | ✅ | Whether number is active |

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "phone": "+5511999999999",
  "active": true
}
```

---

## Table 3: Customers

**Purpose:** Store customer information across all tenants.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Links to Tenants table |
| `phone` | Phone | ✅ | Customer WhatsApp number |
| `name` | Single line text | ❌ | Customer name (extracted from conversation) |
| `email` | Email | ❌ | Customer email |
| `last_interest` | Single line text | ❌ | Last product category of interest |
| `created_at` | Date & time | ✅ | First contact date |
| `deleted_at` | Date & time | ❌ | LGPD soft-delete timestamp |

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "phone": "+5511988888888",
  "name": "João Silva",
  "email": "joao@example.com",
  "last_interest": "Rolex Submariner",
  "created_at": "2024-01-20T14:30:00.000Z",
  "deleted_at": null
}
```

**Formula Fields (Optional):**
- `display_name`: `IF({name}, {name}, {phone})`

---

## Table 4: Messages

**Purpose:** Log all WhatsApp messages for conversation history.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Links to Tenants table |
| `phone` | Phone | ✅ | Customer phone number |
| `body` | Long text | ✅ | Message content |
| `direction` | Single select | ✅ | "inbound" or "outbound" |
| `media_url` | URL | ❌ | Media attachment URL (photos, docs) |
| `created_at` | Date & time | ✅ | Message timestamp |
| `deleted_at` | Date & time | ❌ | LGPD soft-delete timestamp (cascade from customer) |

**Single Select Options for `direction`:**
- inbound
- outbound

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "phone": "+5511988888888",
  "body": "Olá, gostaria de verificar meu Rolex",
  "direction": "inbound",
  "media_url": null,
  "created_at": "2024-01-20T15:00:00.000Z"
}
```

---

## Table 5: WatchVerify

**Purpose:** Store watch verification requests and ICD scores.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Links to Tenants table |
| `customer` | Single line text | ✅ | Customer name |
| `phone` | Phone | ✅ | Customer phone |
| `brand` | Single line text | ✅ | Watch brand (e.g., "Rolex") |
| `model` | Single line text | ❌ | Watch model (e.g., "Submariner") |
| `reference` | Single line text | ❌ | Reference number (e.g., "116610LN") |
| `serial` | Single line text | ❌ | Serial number |
| `icd` | Number | ✅ | ICD score (0-100) |
| `status` | Single select | ✅ | Verification status |
| `photo_url` | URL | ❌ | Watch photo URL |
| `guarantee_url` | URL | ❌ | Guarantee card photo URL |
| `invoice_url` | URL | ❌ | Invoice/receipt photo URL |
| `notes` | Long text | ❌ | Internal notes |
| `created_at` | Date & time | ✅ | Verification request date |
| `deleted_at` | Date & time | ❌ | LGPD soft-delete timestamp (cascade from customer) |

**Single Select Options for `status`:**
- pending
- in_progress
- completed
- approved
- manual_review
- rejected

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "customer": "João Silva",
  "phone": "+5511988888888",
  "brand": "Rolex",
  "model": "Submariner",
  "reference": "116610LN",
  "serial": "A1234567",
  "icd": 85,
  "status": "approved",
  "photo_url": "https://example.com/watch.jpg",
  "guarantee_url": "https://example.com/guarantee.jpg",
  "invoice_url": "https://example.com/invoice.jpg",
  "notes": "All documents consistent",
  "created_at": "2024-01-20T15:30:00.000Z"
}
```

**Formula Fields (Optional):**
- `icd_band`:
  ```
  IF({icd} >= 90, "✅ Consistente (validado)",
     IF({icd} >= 70, "⚠️ Consistente (sem validação)",
        IF({icd} >= 41, "⚠️ Inconclusivo",
           "❌ Inconsistente")))
  ```

---

## Table 6: Catalog

**Purpose:** Store product catalog for RAG-powered recommendations.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Links to Tenants table |
| `title` | Single line text | ✅ | Product name |
| `description` | Long text | ✅ | Detailed description |
| `category` | Single select | ✅ | Product category |
| `price` | Currency | ❌ | Product price (BRL) |
| `image_url` | URL | ❌ | Product image |
| `tags` | Multiple select | ❌ | Searchable tags |
| `embedding_id` | Single line text | ❌ | Reference to vector embedding |
| `active` | Checkbox | ✅ | Whether product is available |

**Single Select Options for `category`:**
- watches
- rings
- necklaces
- bracelets
- earrings
- other

**Multiple Select Options for `tags`:**
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

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "title": "Rolex Submariner Date 116610LN",
  "description": "Relógio automático de mergulho, 40mm, aço inoxidável, mostrador preto, data, resistência à água 300m.",
  "category": "watches",
  "price": 85000.00,
  "image_url": "https://example.com/submariner.jpg",
  "tags": ["luxury", "sport", "automatic"],
  "embedding_id": "emb_abc123",
  "active": true
}
```

---

## Table 7: Settings

**Purpose:** Store white-label configuration per tenant.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Links to Tenants table |
| `brand` | Single line text | ❌ | Store brand name override |
| `logo` | URL | ❌ | Logo URL override |
| `primary` | Single line text | ❌ | Primary color override |
| `welcome_message` | Long text | ❌ | Custom welcome message |
| `business_hours` | Long text | ❌ | Store hours |
| `updated_at` | Date & time | ✅ | Last update timestamp |

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "brand": "Boutique Premium",
  "logo": "https://example.com/new-logo.png",
  "primary": "#d4af37",
  "welcome_message": "Bem-vindo à Boutique Premium! Como posso ajudá-lo hoje?",
  "business_hours": "Seg-Sex: 10h-19h\nSáb: 10h-15h",
  "updated_at": "2024-01-25T10:00:00.000Z"
}
```

---

## Table 8: Users (for NextAuth)

**Purpose:** Store admin/staff users for dashboard authentication.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Links to Tenants table |
| `email` | Email | ✅ | User email (unique) |
| `password_hash` | Single line text | ✅ | Bcrypt hashed password |
| `name` | Single line text | ✅ | User full name |
| `role` | Single select | ✅ | User role |
| `active` | Checkbox | ✅ | Whether user can log in |
| `created_at` | Date & time | ✅ | Account creation date |

**Single Select Options for `role`:**
- admin
- manager
- staff

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "email": "admin@boutique.com",
  "password_hash": "$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "name": "Maria Admin",
  "role": "admin",
  "active": true,
  "created_at": "2024-01-15T10:00:00.000Z"
}
```

---

## Table 9: VerificationSessions

**Purpose:** Store temporary verification workflow sessions to prevent data loss on server restarts.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `session_id` | Single line text | ✅ | Unique session ID (UUID) |
| `tenant_id` | Single line text | ✅ | Tenant ID (not linked to avoid complexity) |
| `customer_phone` | Phone | ✅ | Customer phone number (unique per active session) |
| `customer_name` | Single line text | ✅ | Customer name |
| `state` | Single select | ✅ | Current workflow state |
| `watch_photo_url` | URL | ❌ | Watch photo URL |
| `guarantee_card_url` | URL | ❌ | Guarantee card URL |
| `invoice_url` | URL | ❌ | Invoice URL |
| `created_at` | Date & time | ✅ | Session creation time |
| `updated_at` | Date & time | ✅ | Last update time |
| `expires_at` | Date & time | ✅ | Session expiration (1 hour from creation) |

**Single Select Options for `state`:**
- awaiting_watch_photo
- awaiting_guarantee
- awaiting_invoice
- processing
- completed

**Example Record:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "recXXXXXXXXXXXXXX",
  "customer_phone": "+5511988888888",
  "customer_name": "João Silva",
  "state": "awaiting_guarantee",
  "watch_photo_url": "https://api.twilio.com/2010-04-01/Accounts/.../Media/...",
  "guarantee_card_url": null,
  "invoice_url": null,
  "created_at": "2024-01-20T15:30:00.000Z",
  "updated_at": "2024-01-20T15:32:00.000Z",
  "expires_at": "2024-01-20T16:30:00.000Z"
}
```

**Notes:**
- Sessions expire after 1 hour (configurable)
- Expired sessions should be cleaned up periodically
- Only one active session per customer_phone allowed
- Use `session_id` as primary key, `customer_phone` for lookups

---

## Table 10: Salespeople

**Purpose:** Store information about salespeople/store contacts for appointment booking and client distribution.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Linked record (Tenants) | ✅ | Store/tenant this salesperson belongs to |
| `name` | Single line text | ✅ | Salesperson name (e.g., "Patricia") |
| `phone` | Phone | ✅ | Personal phone number |
| `whatsapp` | Phone | ✅ | WhatsApp number for notifications |
| `email` | Email | ❌ | Email address |
| `max_daily_appointments` | Number | ✅ | Max appointments per day (default: 5) |
| `working_hours` | Long text (JSON) | ✅ | Working schedule (JSON format) |
| `active` | Checkbox | ✅ | Is currently active |
| `created_at` | Date & time | ✅ | Record creation timestamp |

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "name": "Patricia",
  "phone": "+5511999999999",
  "whatsapp": "+5511999999999",
  "email": "patricia@lojadeluxo.com",
  "max_daily_appointments": 5,
  "working_hours": "{\"mon\":\"9-18\",\"tue\":\"9-18\",\"wed\":\"9-18\",\"thu\":\"9-18\",\"fri\":\"9-18\",\"sat\":\"10-16\"}",
  "active": true,
  "created_at": "2024-01-20T10:00:00.000Z"
}
```

**Notes:**
- `working_hours` JSON format: `{"mon": "9-18", "tue": "9-18", ...}` (24h format)
- Use for round-robin appointment assignment
- Send daily schedule reports to `whatsapp` field

---

## Table 11: Appointments

**Purpose:** Store customer appointment bookings with salespeople.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Linked record (Tenants) | ✅ | Store/tenant |
| `customer_phone` | Phone | ✅ | Customer phone (link to Customers) |
| `customer_name` | Single line text | ✅ | Customer name |
| `salesperson_id` | Linked record (Salespeople) | ✅ | Assigned salesperson |
| `appointment_date` | Date | ✅ | Appointment date (YYYY-MM-DD) |
| `appointment_time` | Single line text | ✅ | Time slot (e.g., "14:00") |
| `status` | Single select | ✅ | Current appointment status |
| `product_interest` | Long text | ❌ | What customer is interested in |
| `notes` | Long text | ❌ | Additional notes |
| `created_at` | Date & time | ✅ | Booking creation time |
| `reminded_at` | Date & time | ❌ | Last reminder sent timestamp |
| `confirmed_at` | Date & time | ❌ | Customer confirmation timestamp |
| `completed_at` | Date & time | ❌ | Visit completion timestamp |

**Single Select Options for `status`:**
- pending
- confirmed
- completed
- cancelled
- no_show

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "customer_phone": "+5511988888888",
  "customer_name": "João Silva",
  "salesperson_id": ["recYYYYYYYYYYYYYY"],
  "appointment_date": "2024-01-25",
  "appointment_time": "14:00",
  "status": "confirmed",
  "product_interest": "Rolex Submariner",
  "notes": "Cliente VIP, preferência por relógios esportivos",
  "created_at": "2024-01-20T15:30:00.000Z",
  "confirmed_at": "2024-01-20T15:35:00.000Z"
}
```

**Notes:**
- One customer can have multiple appointments (different dates)
- Use for daily reports and reminders
- Status flow: pending → confirmed → completed/cancelled/no_show

---

## Table 12: StoreAvailability

**Purpose:** Configure available time slots and capacity per store.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Linked record (Tenants) | ✅ | Store/tenant |
| `day_of_week` | Single select | ✅ | Day of week (0=Sunday, 6=Saturday) |
| `time_slot` | Single line text | ✅ | Time slot (e.g., "14:00") |
| `max_bookings` | Number | ✅ | Maximum appointments for this slot (default: 5) |
| `active` | Checkbox | ✅ | Is slot available for booking |

**Single Select Options for `day_of_week`:**
- 0 (Sunday)
- 1 (Monday)
- 2 (Tuesday)
- 3 (Wednesday)
- 4 (Thursday)
- 5 (Friday)
- 6 (Saturday)

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "day_of_week": "5",
  "time_slot": "14:00",
  "max_bookings": 5,
  "active": true
}
```

**Notes:**
- Create one record per time slot per day
- Algorithm prioritizes slots with fewer bookings
- `max_bookings` can be customized per store

---

## Table 13: PaymentProviders

**Purpose:** Store payment provider API credentials per store (encrypted).

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Linked record (Tenants) | ✅ | Store/tenant |
| `provider_name` | Single select | ✅ | Payment provider name |
| `api_key` | Single line text | ✅ | API key (encrypt before storing) |
| `api_secret` | Single line text | ✅ | API secret (encrypt before storing) |
| `webhook_url` | URL | ❌ | Provider webhook URL |
| `active` | Checkbox | ✅ | Is provider active |
| `created_at` | Date & time | ✅ | Configuration timestamp |

**Single Select Options for `provider_name`:**
- Pagbank
- Cielo
- Mercado Pago
- Stone
- PicPay
- Stripe
- Custom

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "provider_name": "Pagbank",
  "api_key": "encrypted_key_here",
  "api_secret": "encrypted_secret_here",
  "webhook_url": "https://api.pagbank.com/webhooks",
  "active": true,
  "created_at": "2024-01-20T10:00:00.000Z"
}
```

**Notes:**
- Encrypt credentials before storing (use lib/encryption.ts)
- Only one active provider per tenant
- Store owners configure via dashboard

---

## Table 14: PaymentLinks

**Purpose:** Track payment links generated and sent to customers.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Linked record (Tenants) | ✅ | Store/tenant |
| `customer_phone` | Phone | ✅ | Customer phone |
| `customer_name` | Single line text | ✅ | Customer name |
| `product_id` | Linked record (Catalog) | ❌ | Product being purchased |
| `product_name` | Single line text | ✅ | Product name (fallback) |
| `amount` | Currency | ✅ | Payment amount (BRL) |
| `provider_name` | Single line text | ✅ | Payment provider used |
| `provider_link_url` | URL | ✅ | Generated payment link |
| `provider_link_id` | Single line text | ✅ | Provider's link/transaction ID |
| `status` | Single select | ✅ | Payment status |
| `delivery_option` | Single select | ✅ | Delivery method |
| `created_at` | Date & time | ✅ | Link creation time |
| `paid_at` | Date & time | ❌ | Payment confirmation timestamp |
| `expires_at` | Date & time | ❌ | Link expiration time |

**Single Select Options for `status`:**
- pending
- paid
- expired
- cancelled
- refunded

**Single Select Options for `delivery_option`:**
- store_pickup
- home_delivery
- both

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "customer_phone": "+5511988888888",
  "customer_name": "João Silva",
  "product_id": ["recZZZZZZZZZZZZZZ"],
  "product_name": "Rolex Submariner 116610LN",
  "amount": 75000.00,
  "provider_name": "Pagbank",
  "provider_link_url": "https://pag.ae/7XXXXXXXXX",
  "provider_link_id": "PAY_123456789",
  "status": "pending",
  "delivery_option": "both",
  "created_at": "2024-01-20T15:30:00.000Z",
  "expires_at": "2024-01-27T15:30:00.000Z"
}
```

**Notes:**
- Track all payment links for audit
- Webhook updates status to 'paid'
- Use for revenue reporting

---

## Table 15: Campaigns

**Purpose:** Store marketing campaign configurations and execution history.

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Linked record (Tenants) | ✅ | Store/tenant |
| `name` | Single line text | ✅ | Campaign name |
| `target_type` | Single select | ✅ | Target audience type |
| `target_filter` | Long text | ✅ | Airtable formula for filtering |
| `message_template` | Long text | ✅ | Message to send |
| `status` | Single select | ✅ | Campaign status |
| `scheduled_at` | Date & time | ❌ | When to send (null = immediate) |
| `sent_count` | Number | ❌ | Number of messages sent |
| `created_by` | Phone | ✅ | Store contact who created campaign |
| `created_at` | Date & time | ✅ | Campaign creation time |
| `completed_at` | Date & time | ❌ | Campaign completion time |

**Single Select Options for `target_type`:**
- inactive_6m
- vip
- product_launch
- custom

**Single Select Options for `status`:**
- draft
- scheduled
- sending
- completed
- cancelled

**Example Record:**
```json
{
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "name": "Campanha VIP - Novos Rolex 2024",
  "target_type": "vip",
  "target_filter": "AND({tenant_id}='recXXXXXXXXXXXXXX', {vip}=TRUE())",
  "message_template": "Olá! Temos novidades exclusivas da Rolex para você. Agende sua visita: https://...",
  "status": "completed",
  "sent_count": 47,
  "created_by": "+5511999999999",
  "created_at": "2024-01-20T10:00:00.000Z",
  "completed_at": "2024-01-20T10:15:00.000Z"
}
```

**Notes:**
- Store contacts create campaigns via WhatsApp conversation
- `target_filter` is Airtable formula for customer selection
- Rate limited to 1 msg/second (Twilio)

---

## Table 16: CampaignSessions

**Purpose:** Temporary storage for campaign creation conversations (30min TTL).

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `phone` | Phone | ✅ | Store contact phone |
| `tenant_id` | Linked record (Tenants) | ✅ | Store/tenant |
| `step` | Single line text | ✅ | Current conversation step |
| `data` | Long text (JSON) | ✅ | Session state data |
| `created_at` | Date & time | ✅ | Session creation time |
| `expires_at` | Date & time | ✅ | Session expiration (30 minutes) |

**Example Record:**
```json
{
  "phone": "+5511999999999",
  "tenant_id": ["recXXXXXXXXXXXXXX"],
  "step": "write_message",
  "data": "{\"type\":\"inactive_6m\",\"filter\":\"AND({tenant_id}='recXXX', DATETIME_DIFF(NOW(), {last_purchase}, 'months') >= 6)\"}",
  "created_at": "2024-01-20T15:00:00.000Z",
  "expires_at": "2024-01-20T15:30:00.000Z"
}
```

**Notes:**
- Similar to VerificationSessions but for campaigns
- Auto-cleanup expired sessions
- Steps: select_type → write_message → confirm → execute

---

## Table 17: BookingSessions

**Purpose:** Temporary storage for appointment booking conversations (30min TTL).

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `session_id` | Single line text | ✅ | Unique session ID (UUID) |
| `tenant_id` | Single line text | ✅ | Store/tenant |
| `customer_phone` | Phone | ✅ | Customer phone number |
| `customer_name` | Single line text | ✅ | Customer name |
| `state` | Single select | ✅ | Current conversation step |
| `preferred_date` | Date | ❌ | Date customer wants to visit |
| `preferred_time` | Single line text | ❌ | Time slot chosen |
| `available_slots` | Long text (JSON) | ❌ | Cached available slots |
| `product_interest` | Long text | ❌ | Product customer wants to see |
| `created_at` | Date & time | ✅ | Session creation time |
| `updated_at` | Date & time | ✅ | Last update time |
| `expires_at` | Date & time | ✅ | Session expiration (30 minutes) |
| `deleted_at` | Date & time | ❌ | Soft delete timestamp |

**Single Select Options for `state`:**
- awaiting_date
- awaiting_time
- awaiting_product
- completed

**Example Record:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "recXXXXXXXXXXXXXX",
  "customer_phone": "+5511988888888",
  "customer_name": "João Silva",
  "state": "awaiting_time",
  "preferred_date": "2024-01-25",
  "preferred_time": null,
  "available_slots": "[{\"time\":\"14:00\",\"available\":5,\"booked\":0,\"percentage\":0}]",
  "product_interest": null,
  "created_at": "2024-01-20T15:00:00.000Z",
  "updated_at": "2024-01-20T15:05:00.000Z",
  "expires_at": "2024-01-20T15:30:00.000Z"
}
```

**Notes:**
- Similar to VerificationSessions and CampaignSessions
- Manages booking conversation state
- Auto-cleanup expired sessions
- Steps: awaiting_date → awaiting_time → awaiting_product → completed

---

## Quick Setup Guide

### 1. Create Base
1. Go to https://airtable.com/create
2. Name it "Watch Verify CRM"
3. Copy the Base ID from URL

### 2. Create Tables
Create all 17 tables listed above with exact field names and types.

**Core Tables (Tables 1-9):** Required for basic functionality
**Booking System (Tables 10-12, 17):** Required for appointment scheduling
**Payment System (Tables 13-14):** Required for online sales
**Campaign System (Tables 15-16):** Required for marketing automation

### 3. Add Sample Data
Add at least one tenant and one user to test authentication.

### 4. Generate API Token
1. Go to https://airtable.com/create/tokens
2. Create token with scopes: `data.records:read`, `data.records:write`
3. Add all required bases
4. Copy token to `.env.local`

### 5. Verify Connection
Run this test in your Next.js app:
```bash
curl http://localhost:3000/api/export?scope=customers
```

---

## Indexing & Performance

### Recommended Indexes (Airtable Pro)
- Customers: Index on `phone` and `tenant_id`
- Messages: Index on `phone` and `created_at`
- WatchVerify: Index on `tenant_id` and `created_at`
- StoreNumbers: Index on `phone` (unique)

### Airtable Limitations
- Free: 1,200 records/base
- Plus: 5,000 records/base
- Pro: 50,000 records/base
- Enterprise: 250,000+ records/base

**Recommendation:** Start with Pro plan ($20/user/month) for production.

---

## Migration to PostgreSQL (Future)

When you outgrow Airtable (>50k records or need better performance), migrate to:
- **Supabase** (PostgreSQL + Realtime + Auth)
- **PlanetScale** (Serverless MySQL)
- **Neon** (Serverless Postgres)

Use Prisma as ORM for easy migration.
