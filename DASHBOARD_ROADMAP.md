# Dashboard Development Roadmap

**Priority:** High - Work in parallel while testing WhatsApp features
**Target:** White-label luxury CRM dashboard for store owners

---

## 🎯 Core Dashboard Features

### 1. **Conversations Overview Page** (Priority 1)
**Route:** `/dashboard/conversations`

**Features:**
- Table of all WhatsApp customer interactions
- Columns:
  - Customer Name (or phone if no name)
  - Last Message Time
  - Summary of Interest (AI-generated 1-line summary)
  - Products Shown (links to Catalog items)
  - Visit Scheduled (Yes/No + Date/Time)
  - Status (Active, Scheduled, Converted, Inactive)
  - Last Interaction (relative time: "2 hours ago")

**Filters:**
- Date range picker
- Status filter (Active, Scheduled, Converted, Inactive)
- Search by name/phone
- Sort by: Most Recent, Scheduled Visit, Interest Level

**Click Actions:**
- Click row → Open conversation detail modal
- Shows full message history
- AI summary of customer interests
- Products recommended/shown
- Next action suggestion

**Design:**
- Clean table with subtle hover effects
- Luxury color palette (deep navy, gold accents)
- Mobile responsive
- Export to CSV button

---

### 2. **Watch Verification Dashboard** (Priority 2)
**Route:** `/dashboard/verification`

**Features:**

**Toggle Feature:**
- If `verification_enabled = false` in Settings:
  - Show feature promotion card
  - "Unlock Premium Verification Feature"
  - Benefits list:
    - Secure watch authentication
    - CPF encryption (LGPD compliant)
    - AI-powered document analysis
    - Legal risk assessment
    - Increase customer trust
  - "Contact us to activate" button

**If Enabled (`verification_enabled = true`):**

**Verification Table:**
- Columns:
  - Customer Name
  - Watch (Brand + Model)
  - Submitted Date
  - Status Badge:
    - 🟢 High Confidence (ICD > 85)
    - 🟡 Medium Confidence (ICD 70-85)
    - 🟠 Review Required (ICD 50-70)
    - 🔴 High Risk (ICD < 50)
  - Legal Risk Indicators:
    - ✅ Complete Documentation
    - ⚠️ Missing Guarantee
    - ⚠️ Wrong Pictures (mismatch)
    - ⚠️ Invoice from Outside Brazil
    - ⚠️ Inconsistent Dates
    - 🚫 Suspicious Documents
  - Actions (View Report, Contact Customer)

**CPF Security:**
- CPF column shows: `***.***.123-45` (masked)
- Click "Show CPF" → Password modal
- Enter Airtable password → Shows full CPF for 10 seconds
- Auto-masks again after timeout
- Audit log of CPF views

**Watch Detail Modal:**
- Customer info (name, phone, city if available)
- Watch details (brand, model, reference, serial)
- ICD Score with visual gauge (0-100)
- Document thumbnails (click to enlarge)
  - Watch photo
  - Guarantee card
  - Invoice
  - Additional documents
- Cross-reference Analysis:
  - ✅ Serial number consistent
  - ✅ Reference matches
  - ⚠️ Date discrepancy (+ explanation if provided)
  - ✅ Store authorized dealer
- Legal Risk Summary:
  - "Complete Documentation" (green)
  - "Missing Guarantee - Proceed with Caution" (yellow)
  - "Invoice from Outside Brazil - Verify Import" (orange)
  - "Inconsistent Information - Not Recommended" (red)
- Full AI Report (markdown rendered)
- Actions:
  - "Send WhatsApp to Schedule Visit"
  - "Mark as Reviewed"
  - "Reject" (removes from active list)
  - "Split Verification" (if multiple watches in one submission)

**Split Verification Feature:**
- If customer sends GMT photo but Omega guarantee:
  - Create 2 separate WatchVerify records
  - GMT record: missing guarantee, lower ICD
  - Omega record: missing photo, lower ICD
  - Link both to same customer
  - Alert: "Customer attempting to sell 2 watches"

**Remove Verification:**
- If salesperson confirms customer no longer wants to sell
- "Mark as Not Selling" button
- Soft delete (deleted_at timestamp)
- Removed from active dashboard
- Audit trail maintained

---

### 3. **Scheduled Visits Page** (Priority 3)
**Route:** `/dashboard/visits`

**Features:**

**Upcoming Visits Table:**
- Next 7 days highlighted
- Columns:
  - Customer Name
  - Phone (click to WhatsApp)
  - Scheduled Date/Time
  - Product Interest
  - Assigned Salesperson (or "Unassigned")
  - Status (Confirmed, Pending Confirmation, Cancelled)
  - Days Until Visit

**Salesperson Assignment:**
- Click "Assign" → Dropdown of salespeople
- Shows salesperson's:
  - Usual schedule (working hours)
  - Today's appointments count
  - Availability score (low/medium/high)
- "Auto-Assign" button:
  - Algorithm considers:
    - Salesperson's usual schedule
    - Current appointment load
    - Customer's preferred salesperson (if exists)
    - Visit time match with availability

**Customer-Salesperson Relationship:**
- Each customer can have 1-2 preferred salespeople
- Field: `preferred_salespeople` (array of IDs)
- Default: 1 preferred (last person who helped them)
- Customer can request exclusive assignment:
  - "Would you prefer to always speak with Francisca?" prompt
  - If yes, lock to 1 salesperson
  - If no, keep flexible (up to 2)

**Salesperson Feedback Integration:**
- After feedback: "I noticed you spoke with Francisca last time. Would you
  like her to help you again, or are you flexible with schedules?"
- If customer chooses Francisca → Set as preferred
- If flexible → Keep open to 2 salespeople

**Visit Details Modal:**
- Customer profile summary
- Conversation history summary
- Products shown
- Budget range (if known)
- Special notes
- Send reminder WhatsApp button
- Reschedule button
- Cancel with reason

**Calendar View Toggle:**
- Switch between Table/Calendar view
- Calendar shows visits by day
- Color-coded by salesperson
- Drag-and-drop to reschedule

---

### 4. **Catalog Management** (Priority 4)
**Route:** `/dashboard/catalog`

**Features:**

**Catalog Table:**
- All products with images (thumbnail preview)
- Columns:
  - Image
  - Title
  - Brand
  - Price (formatted R$)
  - Category
  - Stock Quantity
  - Tags
  - Active Status (toggle)
  - Last Updated

**Actions:**
- Add New Product (form modal)
- Edit Product (inline or modal)
- Bulk Upload CSV
- Export to Excel (with images as URLs)
- Generate Semantic Embeddings (button)

**CSV Upload:**
- Template download button (sample CSV)
- Headers: title, brand, description, price, category, image_url, stock_quantity, tags
- Drag-and-drop CSV upload
- Preview changes before commit
- Validation errors highlighted
- Bulk embedding generation after upload

**Stock Management Integration:**
- Manual stock update (edit field)
- Automatic stock adjustment when salesperson reports sale
- Low stock alerts (< 5 items)
- Weekly stock update reminder (email/WhatsApp to owner)

**Embedding Status:**
- Visual indicator: ✅ Embedded / ⚠️ Pending / ❌ Failed
- "Generate Embeddings" batch button
- Progress bar during generation
- Uses OpenAI text-embedding-3-small

**Product Detail:**
- Full description
- All images
- Sales history (how many times recommended)
- Customer interest count (from conversations)
- Average time from interest → purchase
- Related products (semantic similarity)

---

### 5. **Salesperson Performance** (Priority 5)
**Route:** `/dashboard/salespeople`

**Note:** Salespeople do NOT have platform access (WhatsApp only)

**Owner Dashboard Features:**

**Salespeople Table:**
- Name
- Phone (WhatsApp link)
- Active Customers (assigned)
- This Week's Visits
- Feedback Submissions (audio/text count)
- Conversion Rate (visit → purchase)
- Avg. Sale Value
- Status (Active/Inactive)

**Performance Metrics:**
- Feedback response rate (% of visits with feedback submitted)
- Customer satisfaction (inferred from repeat visits)
- Product knowledge (variety of products sold)
- Response time (time to submit feedback after visit)

**Salesperson Detail:**
- Full profile
- Usual schedule (working hours by day)
- Max daily appointments
- Assigned customers list
- Visit history
- Recent feedback submissions
- Sales this month
- Top products sold

**Automatic Stock Adjustment:**
- When salesperson sends feedback with sale:
  - "Vendi um Submariner hoje para o João"
  - AI extracts: product = Submariner, customer = João
  - Asks: "Qual o número de referência do produto vendido?"
  - Salesperson: "116610LN"
  - System searches Catalog for title/description match
  - Finds product, decrements stock by 1
  - Logs sale in Appointments or new Sales table
  - Owner sees notification: "Stock updated: Submariner -1 (by Francisca)"

**Weekly Stock Update:**
- Every Monday 9am BRT:
  - WhatsApp to owner: "Bom dia! Lembrete: Atualize o estoque semanal
    ou envie a planilha de inventário. /stock"
- Owner can reply with CSV or "Stock ok"

---

## 🎨 White-Label Branding

### Logo Integration:
1. **Default Logo:** Generate simple, elegant "W" monogram
   - Use Canva API or static SVG
   - Navy blue + gold gradient
   - Placeholder for all tenants without custom logo

2. **Custom Logo Upload:**
   - Settings page → Upload logo
   - Stored in Cloudinary
   - Linked in Tenants table `logo_url`
   - Automatically used in:
     - Dashboard header
     - WhatsApp welcome message (if media supported)
     - Email signatures
     - PDF reports

3. **Color Customization:**
   - Primary color picker in Settings
   - Stored in `primary_color` field
   - Applied to:
     - Dashboard theme
     - Buttons
     - Links
     - Charts

### Tenant Isolation:
- Every page filtered by `tenant_id` from session
- No cross-tenant data leaks
- URL structure: `/dashboard/[tenant-slug]/conversations`

---

## 🗂️ Airtable Schema Additions

### New Tables Needed:

**1. Sales Table** (optional, can use Appointments)
- tenant_id
- customer_id (link to Customers)
- salesperson_id (link to Salespeople)
- product_id (link to Catalog)
- sale_date
- sale_price
- payment_method
- delivery_method (store_pickup, home_delivery)
- status (completed, refunded, cancelled)
- notes
- created_at

**2. CustomerSalespeople Table** (many-to-many relationship)
- customer_id (link to Customers)
- salesperson_id (link to Salespeople)
- preference_level (primary, secondary)
- created_at
- last_interaction

**Alternative:** Add to Customers table:
- `preferred_salesperson_1` (link to Salespeople)
- `preferred_salesperson_2` (link to Salespeople)
- `salesperson_preference` (single select: exclusive, flexible)

### Fields to Add:

**Customers Table:**
- `city` (Single line text) - Important for filtering/matching
- `preferred_salesperson_1` (Link to Salespeople)
- `preferred_salesperson_2` (Link to Salespeople)
- `salesperson_preference` (Single select: exclusive, flexible)

**WatchVerify Table:**
- `legal_risk_summary` (Single select):
  - Complete Documentation
  - Missing Guarantee
  - Wrong Pictures
  - Invoice Outside Brazil
  - Inconsistent Information
  - Suspicious Documents

**Catalog Table:**
- `times_recommended` (Number) - Counter
- `times_sold` (Number) - Counter
- `avg_interest_to_purchase_days` (Number) - Calculated

---

## 🛠️ Technical Implementation

### Tech Stack (Already in place):
- Next.js 14 App Router
- React Server Components
- Tailwind CSS for styling
- shadcn/ui components
- NextAuth v5 for authentication
- Airtable as database

### New Dependencies Needed:
```bash
npm install @tanstack/react-table
npm install recharts
npm install date-fns
npm install react-day-picker
npm install lucide-react
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select
npm install react-dropzone
```

### Component Structure:
```
app/
├── dashboard/
│   ├── layout.tsx (protected route, sidebar)
│   ├── page.tsx (redirect to /conversations)
│   ├── conversations/
│   │   ├── page.tsx
│   │   ├── components/
│   │   │   ├── conversations-table.tsx
│   │   │   ├── conversation-detail-modal.tsx
│   │   │   └── filters.tsx
│   ├── verification/
│   │   ├── page.tsx
│   │   ├── components/
│   │   │   ├── verification-table.tsx
│   │   │   ├── verification-detail-modal.tsx
│   │   │   ├── cpf-password-modal.tsx
│   │   │   ├── legal-risk-badge.tsx
│   │   │   └── feature-promo-card.tsx
│   ├── visits/
│   │   ├── page.tsx
│   │   ├── components/
│   │   │   ├── visits-table.tsx
│   │   │   ├── visits-calendar.tsx
│   │   │   ├── assign-salesperson-modal.tsx
│   │   │   └── visit-detail-modal.tsx
│   ├── catalog/
│   │   ├── page.tsx
│   │   ├── components/
│   │   │   ├── catalog-table.tsx
│   │   │   ├── product-form-modal.tsx
│   │   │   ├── csv-upload-modal.tsx
│   │   │   └── embedding-status.tsx
│   ├── salespeople/
│   │   ├── page.tsx
│   │   ├── components/
│   │   │   ├── salespeople-table.tsx
│   │   │   ├── performance-metrics.tsx
│   │   │   └── salesperson-detail-modal.tsx
│   └── settings/
│       ├── page.tsx
│       └── components/
│           ├── logo-upload.tsx
│           ├── color-picker.tsx
│           └── feature-toggles.tsx
```

---

## 📅 Development Timeline (Parallel with Testing)

### Week 1: Core Dashboard
**Day 1-2:** Conversations Overview
- Table with filters
- Conversation detail modal
- AI summary generation

**Day 3-4:** Verification Dashboard
- Table with risk badges
- CPF password modal
- Feature promotion card
- Detail modal with documents

**Day 5:** Scheduled Visits (basic)
- Table view
- Manual salesperson assignment

### Week 2: Advanced Features
**Day 1-2:** Catalog Management
- CRUD operations
- CSV upload/export
- Embedding generation

**Day 3:** Salesperson Performance
- Metrics dashboard
- Stock adjustment logic

**Day 4:** White-label Branding
- Logo upload
- Color customization
- Tenant theming

**Day 5:** Testing & Polish
- Bug fixes
- Mobile responsiveness
- Performance optimization

---

## 🎯 Acceptance Criteria

### Must Have:
✅ Store owner can see all customer conversations
✅ Owner can view verification reports with risk assessment
✅ Owner can assign salespeople to visits
✅ Owner can manage catalog (CRUD + CSV)
✅ CPF protected with password
✅ White-label logo and colors
✅ Mobile responsive

### Nice to Have:
⭐ Export conversations to Excel
⭐ Calendar view for visits
⭐ Real-time notifications
⭐ Advanced analytics (charts, trends)
⭐ Bulk actions (assign multiple visits)

---

## 🚀 Next Steps

1. **While you test WhatsApp features:**
   - I build the dashboard in parallel
   - You provide feedback on design/UX
   - We iterate quickly

2. **After testing complete:**
   - Merge dashboard with tested backend
   - End-to-end testing
   - Deploy to Vercel staging

3. **Production:**
   - Final QA
   - Security audit
   - Launch! 🎉

---

**Estimated Dashboard Development Time:** 7-10 days
**Can start immediately while you test!**

Ready to proceed? 🚀
