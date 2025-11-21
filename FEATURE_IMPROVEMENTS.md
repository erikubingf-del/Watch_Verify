# Feature Improvements Based on User Feedback

**Date:** 2025-11-21
**Status:** Planned Enhancements

---

## 🎯 Key Improvements to Implement

### 1. **Enhanced Customer Matching (Salesperson Feedback)**

**Current:** Matches by name and phone only

**Improvement:** Add city-based filtering for higher accuracy

**Implementation:**

**Add to Customers table:**
- `city` (Single line text)

**Update matching algorithm in `lib/salesperson-feedback.ts`:**

```typescript
export async function findCustomersByName(
  tenantId: string,
  customerName: string,
  city?: string
): Promise<any[]> {
  // Step 1: Exact phone match (if provided)
  // Step 2: Exact name + city match (highest priority)
  // Step 3: Exact name match (any city)
  // Step 4: Partial name + city match
  // Step 5: Partial name match (any city)
}
```

**Extraction Prompt Update:**
Add `city` to extracted fields:
```typescript
{
  customer_name: string
  customer_phone?: string
  city?: string  // NEW
  product_interest?: string
  budget_min?: number
  budget_max?: number
  birthday?: string
  hobbies?: string[]
  visit_notes?: string
}
```

**Disambiguation Display:**
```
Encontrei 3 clientes com nome similar:

1️⃣ João Silva - São Paulo - +5511995843051
   Última visita: 2024-10-15
   Interesse: Rolex Submariner

2️⃣ João Silva - Rio de Janeiro - +5521988776655
   Última visita: 2024-09-20
   Interesse: Cartier Tank

3️⃣ João da Silva - São Paulo - +5511977665544
   Primeira visita: 2024-11-10

Responda com o número (1, 2, 3) ou 'nenhum' se for novo cliente.
```

**Why Important:**
- Common names (João Silva, Maria Santos) become more accurate
- Especially useful for multi-location stores
- Reduces disambiguation prompts
- Improves automation confidence

---

### 2. **Multi-Watch Verification Handling**

**Current:** Single verification per session

**Improvement:** Detect and split multiple watches in one submission

**Scenario:**
Customer sends:
- Photo: GMT Master watch
- Guarantee card: Omega Seamaster
- Invoice: Rolex Datejust

**AI Detection in `lib/document-ocr.ts`:**

```typescript
export function detectMultipleWatches(
  photoAnalysis: WatchPhotoAnalysis,
  guaranteeAnalysis: GuaranteeCardAnalysis,
  invoiceAnalysis: InvoiceAnalysis
): MultiWatchDetection {
  const brands = new Set([
    photoAnalysis.brand,
    guaranteeAnalysis.brand,
    invoiceAnalysis.brand
  ])

  const models = new Set([
    photoAnalysis.model,
    guaranteeAnalysis.model,
    invoiceAnalysis.model
  ])

  if (brands.size > 1 || models.size > 1) {
    return {
      multipleDetected: true,
      watches: [
        { source: 'photo', brand: photoAnalysis.brand, model: photoAnalysis.model },
        { source: 'guarantee', brand: guaranteeAnalysis.brand, model: guaranteeAnalysis.model },
        { source: 'invoice', brand: invoiceAnalysis.brand, model: invoiceAnalysis.model }
      ]
    }
  }

  return { multipleDetected: false }
}
```

**Dashboard Action:**
- Owner sees alert: "⚠️ Multiple watches detected in one submission"
- Button: "Split into Separate Verifications"
- Creates 2+ WatchVerify records:
  - **GMT Master:** has photo, missing guarantee/invoice → Lower ICD
  - **Omega Seamaster:** has guarantee, missing photo/invoice → Lower ICD
- Links both records to same customer
- Status: "Incomplete - Customer attempting to sell multiple watches"

**Customer Communication:**
```
⚠️ Detectei informações de mais de um relógio nos documentos enviados:

1. GMT Master (foto)
2. Omega Seamaster (garantia)

Você está tentando vender ambos os relógios? Se sim, vamos precisar
de documentos completos para cada um separadamente.

Por favor, confirme:
- Quantos relógios quer vender?
- Quais modelos exatamente?
```

**Why Important:**
- Prevents confusion in verification
- Ensures complete documentation per watch
- Legal protection (separate appraisals)
- Better tracking of inventory

---

### 3. **Remove/Cancel Verification Feature**

**Current:** Verifications stay in database forever

**Improvement:** Allow owner to mark verifications as "Not Selling"

**Use Case:**
Salesperson confirms customer changed mind about selling watch

**Dashboard Action:**
In Verification Detail Modal:
- Button: "Mark as Not Selling"
- Reason dropdown:
  - Customer changed mind
  - Watch already sold elsewhere
  - Customer keeping watch
  - Duplicate submission
  - Other (text input)

**Database Update:**
```typescript
// WatchVerify table
{
  status: "cancelled",
  deleted_at: timestamp,
  cancellation_reason: "Customer changed mind",
  cancelled_by: "owner@store.com"
}
```

**Filtering:**
- Active verifications: `deleted_at IS NULL`
- Archived verifications: separate tab "Cancelled Verifications"
- Audit trail maintained for compliance

**Why Important:**
- Keeps active dashboard clean
- Prevents confusion with stale verifications
- Maintains compliance audit trail
- Owner control over displayed data

---

### 4. **Legal Risk Categorization**

**Current:** Generic ICD score (0-100)

**Improvement:** Human-readable legal risk categories

**Categories:**

1. **✅ Complete Documentation** (Green)
   - All documents present
   - Information consistent
   - Authorized dealer
   - ICD > 85

2. **⚠️ Missing Guarantee** (Yellow)
   - Photo + Invoice present
   - No guarantee card
   - ICD 70-85
   - Caution: Proceed with verification

3. **⚠️ Wrong Pictures** (Yellow)
   - Document mismatch detected
   - Serial numbers don't match
   - ICD 50-70
   - Caution: Manual verification required

4. **⚠️ Invoice Outside Brazil** (Orange)
   - International purchase
   - Verify import documentation
   - Possible tax implications
   - ICD varies
   - Caution: Consult legal/tax advisor

5. **⚠️ Inconsistent Information** (Orange)
   - Date mismatches without explanation
   - Model/reference conflicts
   - ICD < 50
   - Warning: High risk

6. **🚫 Suspicious Documents** (Red)
   - Potential fraud indicators
   - Watermark analysis failed
   - Known fake dealer
   - ICD < 30
   - Alert: Do not proceed

**Implementation in `lib/verification-report.ts`:**

```typescript
export function calculateLegalRisk(
  icd: number,
  crossRefResult: CrossReferenceResult,
  invoiceAnalysis: InvoiceAnalysis
): LegalRisk {
  // Check for international invoice
  if (invoiceAnalysis.country !== 'Brazil') {
    return {
      category: 'Invoice Outside Brazil',
      color: 'orange',
      recommendation: 'Verify import documentation and tax compliance'
    }
  }

  // Check for missing documents
  if (crossRefResult.criticalIssues.includes('Missing guarantee card')) {
    return {
      category: 'Missing Guarantee',
      color: 'yellow',
      recommendation: 'Proceed with extra caution'
    }
  }

  // ICD-based categorization
  if (icd >= 85) {
    return {
      category: 'Complete Documentation',
      color: 'green',
      recommendation: 'Low risk - schedule appraisal'
    }
  }

  if (icd >= 70) {
    return {
      category: 'Inconsistent Information',
      color: 'orange',
      recommendation: 'Manual verification required'
    }
  }

  return {
    category: 'Suspicious Documents',
    color: 'red',
    recommendation: 'Do not proceed - potential fraud'
  }
}
```

**Dashboard Display:**
- Table column shows badge with color
- Tooltip explains category
- Click for detailed explanation

**Why Important:**
- Easier for non-technical owners to understand
- Clear action recommendations
- Legal protection
- Reduces liability

---

### 5. **Owner WhatsApp Quick Actions**

**Current:** Owner must manually contact customer from dashboard

**Improvement:** One-click WhatsApp messaging from verification

**Dashboard Button:**
"📱 Send WhatsApp to Schedule Visit"

**Pre-filled Message Templates:**

**Template 1: High Confidence (ICD > 85)**
```
Olá [Customer Name]! Recebemos a verificação do seu [Brand Model].

✅ Documentação completa e consistente!

Quando você poderia visitar nossa boutique para uma avaliação presencial?
Temos disponibilidade:
- Quinta-feira 14h
- Sexta-feira 10h ou 16h
- Sábado 11h

Qual horário funciona melhor para você?
```

**Template 2: Medium Confidence (ICD 70-85)**
```
Olá [Customer Name]! Analisamos a verificação do seu [Brand Model].

📋 Precisamos esclarecer alguns detalhes sobre a documentação.

Poderia agendar uma visita para conversarmos pessoalmente?
Nossos especialistas poderão te orientar melhor.

Temos horários disponíveis esta semana. Qual seu dia preferido?
```

**Template 3: Low Confidence (ICD < 70)**
```
Olá [Customer Name], obrigado pelo interesse em vender seu [Brand Model].

Infelizmente, precisamos de documentação adicional para prosseguir
com a avaliação. Poderia nos enviar:
- [Lista de documentos faltando]

Ou, se preferir, pode agendar uma visita e trazer os documentos pessoalmente.

Estamos à disposição!
```

**Implementation:**
- Click button → Opens WhatsApp Web/App
- Message pre-filled with template
- Owner can edit before sending
- Logged in Messages table automatically

**Why Important:**
- Faster owner response time
- Consistent professional messaging
- Reduces manual typing
- Improves conversion rate

---

### 6. **Salesperson Preferred Assignment**

**Current:** Manual assignment only

**Improvement:** Automatic + customer preference tracking

**Customer Table Fields:**
```typescript
{
  preferred_salesperson_1: string // Link to Salespeople
  preferred_salesperson_2?: string // Optional second choice
  salesperson_preference: 'exclusive' | 'flexible'
}
```

**After Feedback Flow:**
```
✅ Dados atualizados!

Vi que da última vez você falou com a Francisca. Para futuras visitas,
você prefere ser atendido(a) sempre pela Francisca ou está aberto(a)
a conhecer outros vendedores da equipe?

Responda:
1️⃣ Sempre Francisca
2️⃣ Flexível (qualquer vendedor disponível)
```

**Customer Response:**
- "1" → Sets `preferred_salesperson_1 = Francisca ID`, `salesperson_preference = exclusive`
- "2" → Sets `preferred_salesperson_1 = Francisca ID`, `salesperson_preference = flexible`

**Auto-Assignment Algorithm:**

```typescript
function autoAssignSalesperson(
  customer: Customer,
  visitTime: DateTime,
  salespeople: Salesperson[]
): Salesperson {
  // Priority 1: Customer exclusive preference
  if (customer.salesperson_preference === 'exclusive' && customer.preferred_salesperson_1) {
    const preferred = salespeople.find(s => s.id === customer.preferred_salesperson_1)
    if (isAvailable(preferred, visitTime)) {
      return preferred
    }
    // If unavailable, notify owner to reassign
  }

  // Priority 2: Customer flexible preference (prefer but not exclusive)
  if (customer.preferred_salesperson_1) {
    const preferred = salespeople.find(s => s.id === customer.preferred_salesperson_1)
    if (isAvailable(preferred, visitTime)) {
      return preferred
    }
  }

  // Priority 3: Load balancing
  const available = salespeople.filter(s => isAvailable(s, visitTime))
  return available.sort((a, b) =>
    a.appointmentsToday - b.appointmentsToday
  )[0]
}

function isAvailable(salesperson: Salesperson, visitTime: DateTime): boolean {
  // Check working_hours
  const schedule = parseSchedule(salesperson.working_hours)
  if (!schedule.includes(visitTime)) return false

  // Check max_daily_appointments
  const todayCount = getAppointmentsCount(salesperson.id, visitTime.date)
  if (todayCount >= salesperson.max_daily_appointments) return false

  return true
}
```

**Dashboard Display:**
- Visit assignment shows: "Auto-assigned to Francisca (customer preference)"
- Override button if needed
- Notification if preferred salesperson unavailable

**Why Important:**
- Builds customer-salesperson relationships
- Increases customer satisfaction
- Reduces manual work for owner
- Balances workload automatically

---

### 7. **Stock Management via Salesperson Feedback**

**Current:** Manual stock updates only

**Improvement:** Automatic adjustments when sales reported

**Salesperson Feedback with Sale:**
```
Audio: "Vendi um Submariner preto hoje para o João Silva, referência 116610LN"
```

**AI Extraction:**
```typescript
{
  customer_name: "João Silva",
  product_interest: "Submariner preto",
  product_reference: "116610LN",
  sale_completed: true
}
```

**System Response:**
```
✅ Venda registrada!

Produto: Rolex Submariner 116610LN
Cliente: João Silva
Data: Hoje

Estoque atualizado automaticamente: -1 unidade

Parabéns pela venda! 🎉
```

**Implementation:**

```typescript
// In handleSalespersonFeedback after confirmation
if (extractedData.sale_completed && extractedData.product_reference) {
  const product = await findProductByReference(
    tenantId,
    extractedData.product_reference
  )

  if (product) {
    await updateProductStock(product.id, product.stock_quantity - 1)

    // Create sale record
    await createSaleRecord({
      tenant_id: tenantId,
      customer_id: customer.id,
      salesperson_id: salesperson.id,
      product_id: product.id,
      sale_date: new Date(),
      sale_price: product.price,
      status: 'completed'
    })

    // Update catalog metrics
    await incrementProductSold(product.id)
  } else {
    // Product not found - ask for clarification
    return `Produto referência ${extractedData.product_reference} não encontrado
no catálogo. Qual o nome completo do produto vendido?`
  }
}
```

**Weekly Stock Reminder:**
```typescript
// Cron job: Every Monday 9am BRT
async function sendStockUpdateReminder(tenantId: string) {
  const owner = await getOwnerPhone(tenantId)

  await sendWhatsApp(owner, `
📦 Bom dia! Lembrete semanal de estoque.

Produtos com estoque baixo:
- Rolex Submariner 116610LN: 2 unidades
- Omega Seamaster 210.30.42.20.01.001: 1 unidade

Por favor, atualize o estoque:
1. Envie planilha CSV atualizada
2. Ou responda "Estoque OK" se não houver mudanças

/stock para ver comandos disponíveis
  `)
}
```

**Why Important:**
- Real-time stock accuracy
- Prevents selling out-of-stock items
- Reduces manual work
- Better inventory management
- Owner visibility into sales

---

## 📋 Implementation Priority

### High Priority (Week 1-2):
1. ✅ Enhanced customer matching with city
2. ✅ Legal risk categorization
3. ✅ Owner WhatsApp quick actions

### Medium Priority (Week 3-4):
4. ⭐ Salesperson preferred assignment
5. ⭐ Multi-watch verification handling
6. ⭐ Stock management automation

### Low Priority (Week 5+):
7. ⭐ Remove/cancel verification feature
8. ⭐ Weekly stock reminders

---

## 🎯 Expected Impact

**Customer Experience:**
- Faster matching (city filtering)
- More accurate recommendations
- Personalized service (preferred salesperson)

**Owner Efficiency:**
- Clear risk assessment (legal categories)
- One-click WhatsApp responses
- Automatic stock updates
- Less manual data entry

**Salesperson Productivity:**
- Automatic stock adjustments
- Stronger customer relationships
- Better commission tracking

**System Intelligence:**
- Smarter matching algorithms
- Multi-watch detection
- Fraud prevention

---

**Next Steps:**
1. Test current implementation
2. Gather feedback
3. Prioritize improvements
4. Implement in sprints

Ready to build! 🚀
