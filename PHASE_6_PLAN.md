# Phase 6: Advanced Features Implementation Plan

**Status**: Planning → Implementation
**Started**: 2025-01-12
**Categories**: Analytics (A), Automation (B), Document Management (D), WhatsApp Enhancements (E)

---

## 📋 Overview

Phase 6 adds enterprise-grade features to Watch Verify platform:
- **Analytics & Reporting**: Export, custom ranges, fraud detection
- **Advanced Automation**: Workflows, notifications, triggers
- **Document Management**: Upload, analysis, versioning, encryption
- **WhatsApp Enhancements**: Templates, interactive menus, multi-language, broadcast

---

## A. Enhanced Analytics & Reporting

### A1: PDF/Excel Export for Verification Reports
**Files**:
- `lib/export/pdf-generator.ts` - PDF report generation
- `lib/export/excel-generator.ts` - Excel export with formatting
- `app/api/export/route.ts` - Export API endpoint

**Features**:
- Export single verification as PDF with branding
- Export bulk verifications as Excel spreadsheet
- Include ICD score, images, documents, timeline
- Custom branding per tenant (logo, colors)
- Email delivery option

**Dependencies**: `jspdf`, `xlsx`, `@react-pdf/renderer`

### A2: Custom Date Range Analytics
**Files**:
- `app/dashboard/analytics/components/DateRangePicker.tsx`
- `lib/analytics/date-range-calculator.ts`
- API updates to support date filtering

**Features**:
- Date range selector (7d, 30d, 90d, custom)
- Comparison mode (vs previous period)
- Trend visualization
- Growth percentage calculations
- Export filtered data

### A3: Fraud Pattern Detection
**Files**:
- `lib/fraud-detection/pattern-analyzer.ts`
- `lib/fraud-detection/risk-scorer.ts`
- `app/dashboard/fraud-alerts/page.tsx`

**Features**:
- Detect duplicate documents across verifications
- Flag suspicious ICD score patterns
- Identify rapid-fire verification attempts
- Cross-tenant fraud pattern matching (privacy-safe)
- Risk score calculation (0-100)
- Alert dashboard for high-risk cases

**Algorithm**:
```typescript
// Risk factors:
- Same document used multiple times (+30 risk)
- ICD score just below approval threshold (+20 risk)
- Multiple verifications same phone <24h (+25 risk)
- Document metadata inconsistencies (+15 risk)
- Known fraud database match (+40 risk)
```

---

## B. Advanced Automation

### B1: Automated Verification Workflow Engine
**Files**:
- `lib/workflows/workflow-engine.ts`
- `lib/workflows/workflow-definitions.ts`
- `app/dashboard/workflows/page.tsx`

**Features**:
- Visual workflow builder (drag-and-drop future version)
- Predefined workflows:
  - **Auto-Approve**: ICD ≥70 → Auto-approve → Send certificate
  - **Manual Review**: 41≤ICD<70 → Assign to agent → Notify
  - **Auto-Reject**: ICD <41 → Reject → Send explanation
- Custom workflow creation
- Step conditions and branching
- Audit trail for all workflow executions

**Workflow Structure**:
```typescript
type Workflow = {
  id: string
  name: string
  trigger: 'verification_created' | 'icd_calculated' | 'manual'
  steps: WorkflowStep[]
}

type WorkflowStep = {
  type: 'condition' | 'action' | 'wait'
  config: Record<string, any>
  onSuccess?: string // next step ID
  onFailure?: string // next step ID
}
```

### B2: Smart Notification System
**Files**:
- `lib/notifications/notification-service.ts`
- `lib/notifications/templates/` (email + WhatsApp templates)
- `app/api/notifications/route.ts`

**Features**:
- Multi-channel notifications (email, WhatsApp, in-app)
- Template system with variables
- Notification preferences per user
- Digest mode (daily summary vs real-time)
- Delivery tracking and retry logic

**Notification Types**:
- Verification completed
- Manual review required
- Fraud alert triggered
- Daily summary report
- System status updates

**Integrations**: SendGrid (email), Twilio (WhatsApp)

### B3: Auto-Categorization for Watch Brands
**Files**:
- `lib/ml/brand-classifier.ts`
- `lib/ml/model-identifier.ts`
- Training data in `data/watch-brands.json`

**Features**:
- Automatic brand detection from text/images
- Model/reference number extraction
- Confidence scoring
- Manual override capability
- Learning from corrections

**Approach**:
- Simple keyword matching (Phase 6.0)
- OpenAI GPT-4 Vision for images (Phase 6.1)
- Custom ML model training (Phase 6.2)

### B4: Alert Triggers for ICD Scores and Patterns
**Files**:
- `lib/alerts/alert-engine.ts`
- `lib/alerts/alert-definitions.ts`
- `app/dashboard/alerts/page.tsx`

**Features**:
- Configurable alert rules
- Multiple trigger conditions
- Alert severity levels (info, warning, critical)
- Alert history and resolution tracking
- Escalation rules

**Default Alerts**:
- ICD score <41 (critical)
- ICD score 41-69 (warning)
- Duplicate document detected (critical)
- Verification volume spike (info)
- API errors >10/hour (critical)

---

## D. Document Management

### D1: Document Upload API with Cloud Storage
**Files**:
- `app/api/documents/upload/route.ts`
- `lib/storage/storage-service.ts` (S3-compatible)
- `lib/storage/local-storage.ts` (fallback)

**Features**:
- Multi-file upload support
- File type validation (jpg, png, pdf)
- Size limits (10MB per file)
- Virus scanning integration (ClamAV)
- Cloud storage (AWS S3 / Cloudflare R2 / local filesystem)
- Signed URLs for secure access
- Automatic thumbnail generation

**Storage Structure**:
```
/uploads/{tenant_id}/{verification_id}/{document_id}.{ext}
/uploads/{tenant_id}/{verification_id}/thumbs/{document_id}_thumb.jpg
```

### D2: Image Analysis for Watch Verification
**Files**:
- `lib/vision/image-analyzer.ts`
- `lib/vision/ocr-service.ts`
- `app/api/analyze-image/route.ts`

**Features**:
- Extract text from images (OCR)
- Detect watch brand/model from photo
- Image quality validation
- Authenticity markers detection
- Metadata extraction (EXIF data)

**Integrations**:
- OpenAI GPT-4 Vision for brand/model detection
- Tesseract OCR for text extraction
- Custom authenticity checkers

### D3: Document Versioning System
**Files**:
- `lib/documents/versioning-service.ts`
- Database schema updates for version tracking

**Features**:
- Track all document versions
- Compare versions side-by-side
- Rollback to previous versions
- Change audit trail
- Storage optimization (delta storage)

**Schema**:
```typescript
type DocumentVersion = {
  id: string
  document_id: string
  version: number
  uploaded_by: string
  uploaded_at: string
  file_path: string
  file_hash: string
  changes_summary: string
}
```

### D4: Secure File Encryption and Access Control
**Files**:
- `lib/security/encryption-service.ts`
- `lib/security/access-control.ts`

**Features**:
- At-rest encryption (AES-256)
- In-transit encryption (TLS)
- Role-based access control (RBAC)
- Time-limited access tokens
- Watermarking for downloaded files
- Download audit logs

**Security Layers**:
1. **Storage**: Files encrypted on disk
2. **Access**: Signed URLs with expiration
3. **Audit**: All access logged with user/IP
4. **LGPD**: Automatic deletion after retention period

---

## E. WhatsApp Enhancements

### E1: Rich Message Templates
**Files**:
- `lib/whatsapp/templates/template-manager.ts`
- `lib/whatsapp/templates/definitions.ts`
- `app/dashboard/templates/page.tsx`

**Features**:
- Pre-approved WhatsApp templates
- Variable placeholders ({{customer_name}}, {{icd_score}})
- Template categories (verification, marketing, alerts)
- Template approval workflow
- Usage analytics

**Template Examples**:
```
🎯 Verificação Completa!

Olá {{customer_name}}!

Sua verificação do {{brand}} {{model}} foi concluída:
✅ ICD Score: {{icd_score}}/100
📊 Status: {{status}}

{{cta_button}}
```

### E2: Interactive Buttons and Menus
**Files**:
- `lib/whatsapp/interactive/button-builder.ts`
- `lib/whatsapp/interactive/list-builder.ts`
- `app/api/whatsapp/interactive/route.ts`

**Features**:
- Quick reply buttons (max 3)
- List menus (up to 10 items)
- Call-to-action buttons
- Button click tracking
- Conversation flow management

**Use Cases**:
- "Start Verification" button
- "View Catalog" → List of categories
- "Check Status" → Enter verification ID
- "Contact Support" → Call/Message buttons

### E3: Multi-Language Support
**Files**:
- `lib/i18n/translations/pt-BR.json`
- `lib/i18n/translations/en-US.json`
- `lib/i18n/translations/es-ES.json`
- `lib/i18n/translator.ts`
- `lib/whatsapp/language-detector.ts`

**Features**:
- Automatic language detection from first message
- Manual language switching
- Translation for all templates
- Number/date formatting per locale
- RTL support (future: Arabic)

**Supported Languages (Phase 6)**:
- Portuguese (pt-BR) - Primary
- English (en-US)
- Spanish (es-ES)

### E4: Broadcast Messaging
**Files**:
- `lib/whatsapp/broadcast/broadcast-service.ts`
- `app/dashboard/broadcast/page.tsx`
- `app/api/broadcast/route.ts`

**Features**:
- Send to customer segments
- Schedule broadcasts
- Template-based messages
- Rate limiting (Twilio limits)
- Delivery tracking
- Opt-out management

**Segmentation**:
- All customers
- Active customers (verified in last 30 days)
- High-value (3+ verifications)
- By brand interest
- Custom filters

**Rate Limiting**:
- Max 1,000 messages/hour
- Respect WhatsApp 24-hour window
- Automatic retry on failures

---

## 🗄️ Database Schema Updates

### New Tables

```sql
-- Document Management
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  verification_id UUID,
  type VARCHAR(50), -- 'certificate', 'photo', 'invoice'
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_size INTEGER,
  file_hash VARCHAR(64),
  encrypted BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  uploaded_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  version INTEGER NOT NULL,
  file_path VARCHAR(500),
  file_hash VARCHAR(64),
  changes_summary TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Fraud Detection
CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  verification_id UUID,
  risk_score INTEGER, -- 0-100
  risk_factors JSONB,
  status VARCHAR(20), -- 'open', 'investigating', 'resolved', 'false_positive'
  assigned_to UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100),
  trigger VARCHAR(50),
  steps JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  verification_id UUID,
  status VARCHAR(20),
  current_step INTEGER,
  steps_completed JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  type VARCHAR(50),
  channel VARCHAR(20), -- 'email', 'whatsapp', 'in_app'
  template_id VARCHAR(100),
  content JSONB,
  status VARCHAR(20), -- 'pending', 'sent', 'delivered', 'failed'
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Broadcast
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100),
  template_id VARCHAR(100),
  segment_filter JSONB,
  scheduled_at TIMESTAMP,
  status VARCHAR(20), -- 'draft', 'scheduled', 'sending', 'completed', 'failed'
  total_recipients INTEGER,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100),
  category VARCHAR(50),
  language VARCHAR(10),
  content TEXT,
  variables JSONB,
  approved BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

---

## 📦 Dependencies to Install

```json
{
  "dependencies": {
    // Export
    "jspdf": "^2.5.1",
    "xlsx": "^0.18.5",
    "@react-pdf/renderer": "^3.1.14",

    // Document Management
    "aws-sdk": "^2.1500.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.1",

    // Image Analysis
    "tesseract.js": "^5.0.4",

    // Encryption
    "crypto-js": "^4.2.0",

    // Email
    "@sendgrid/mail": "^8.1.0",

    // i18n
    "i18next": "^23.7.13",
    "react-i18next": "^14.0.1",

    // Charts (for analytics)
    "recharts": "^2.10.3",
    "date-fns": "^3.0.6"
  }
}
```

---

## 🎯 Implementation Order

### Sprint 1: Foundation (Week 1)
1. Database schema updates
2. Document upload API (D1)
3. Basic export (A1) - PDF only
4. Notification service setup (B2)

### Sprint 2: Analytics & Automation (Week 2)
5. Date range analytics (A2)
6. Excel export (A1)
7. Workflow engine (B1)
8. Alert triggers (B4)

### Sprint 3: Fraud & Documents (Week 3)
9. Fraud detection (A3)
10. Image analysis (D2)
11. Document versioning (D3)
12. Auto-categorization (B3)

### Sprint 4: WhatsApp & Security (Week 4)
13. Message templates (E1)
14. Interactive buttons (E2)
15. Multi-language (E3)
16. File encryption (D4)

### Sprint 5: Broadcast & Polish (Week 5)
17. Broadcast messaging (E4)
18. UI dashboards for all features
19. Testing & bug fixes
20. Documentation

---

## 🧪 Testing Strategy

### Unit Tests
- Export generators (PDF/Excel)
- Fraud detection algorithms
- Workflow engine logic
- Encryption/decryption

### Integration Tests
- Document upload → storage → retrieval
- WhatsApp template → send → delivery
- Workflow trigger → execution → completion
- Alert creation → notification → resolution

### E2E Tests
- Complete verification with documents
- Fraud alert workflow
- Broadcast campaign execution
- Multi-language conversation

---

## 📊 Success Metrics

- **A**: 100% of verifications exportable as PDF
- **A**: Fraud detection catches 80%+ suspicious patterns
- **B**: 90% of verifications processed via workflows
- **B**: Notification delivery rate >95%
- **D**: Document upload success rate >99%
- **D**: Zero data breaches (encryption working)
- **E**: Template usage >70% of all messages
- **E**: Broadcast delivery rate >90%

---

## 🔐 Security Considerations

1. **Document Upload**: File type validation, virus scanning, size limits
2. **Encryption**: All files encrypted at rest (AES-256)
3. **Access Control**: Role-based permissions, audit logs
4. **API Security**: Rate limiting on all new endpoints
5. **LGPD Compliance**: Auto-deletion, data minimization
6. **WhatsApp**: Template approval process, opt-out management

---

## 📝 Notes

- All features maintain multi-tenant isolation
- Mock data available for testing before Airtable connection
- Dashboard pages follow Phase 5 design system (Tailwind, dark theme)
- All APIs follow RESTful conventions
- Comprehensive error handling and logging

---

**Phase 6 Duration**: 4-5 weeks
**Lines of Code Estimate**: ~8,000-10,000 LOC
**New Files**: ~45 files
**Database Tables**: 8 new tables
