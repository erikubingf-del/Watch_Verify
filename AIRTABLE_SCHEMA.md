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

## Quick Setup Guide

### 1. Create Base
1. Go to https://airtable.com/create
2. Name it "Watch Verify CRM"
3. Copy the Base ID from URL

### 2. Create Tables
Create all 8 tables listed above with exact field names and types.

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
