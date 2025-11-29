# Enhanced Watch Verification Flow (Premium Add-On)

## 🎯 Feature Overview

**Purpose:** Allow customers to verify watches they want to **sell** to the store.

**Business Model:** Premium feature - stores pay extra to activate.

**Outcome:** Comprehensive verification report sent to store owner with all documents and cross-references.

---

## 🔧 Configuration

### Settings Table - New Fields

```typescript
{
  tenant_id: string
  verification_enabled: boolean  // NEW - Toggle verification feature
  welcome_message: string        // UPDATED - Can mention "also buy watches"
  offers_purchase: boolean       // NEW - Store buys watches from customers
}
```

### Welcome Message Example

**When `offers_purchase = true`:**
> "Olá! Seja bem-vindo à Boutique Premium. Oferecemos relógios de luxo, joias e também **compramos relógios autênticos**. Como posso ajudar?"

**When `offers_purchase = false`:**
> "Olá! Seja bem-vindo à Boutique Premium. Oferecemos relógios de luxo e joias. Como posso ajudar?"

---

## 📋 Verification Workflow

### Phase 1: Intent Detection & Initial Data

#### Step 1: Customer Intent
**Triggers:**
- "Quero vender um relógio"
- "Vocês compram relógios?"
- "Tenho um Rolex para vender"

#### Step 2: Collect CPF
**AI:**
> "Perfeito! Para iniciar a verificação, preciso do seu CPF."

**Validation:**
- Format: `###.###.###-##` or `###########`
- Stored encrypted in `WatchVerify.cpf` field

#### Step 3: Collect Watch Information
**AI:**
> "Qual relógio você gostaria de vender? (marca e modelo)"

**Customer:** "Rolex GMT-Master II"

**Stored in:** `WatchVerify.brand`, `WatchVerify.model`

**Purpose:** Cross-reference baseline - we know what to expect in documents.

---

### Phase 2: Document Collection

#### Document 1: Watch Photo
**AI:**
> "Ótimo! Vou precisar de algumas fotos e documentos. Primeiro, envie uma foto clara do relógio, mostrando todo o relogio."

**Processing:**
1. Receive media via Twilio
2. Store  (permanent)
3. GPT-4 Vision analysis:
   - Extract reference number from dial/caseback (if possible)
   - Identify brand/model from visual
   - Check condition (scratches, authenticity markers)
4. Store URL in `WatchVerify.photo_url`
5. Store extracted data in `WatchVerify.reference` (from photo)

---

#### Document 2: Guarantee Card
**AI:**
> "Perfeito! Agora envie uma foto do certificado de garantia (guarantee card)."

**Processing:**
1. Store 
2. GPT-4 Vision OCR:
   - Extract reference number
   - Extract serial number
   - Extract purchase date
   - Extract store name (if available)
3. **Cross-Reference:**
   - Compare `reference_from_guarantee` vs `reference_from_watch_photo`
   - Compare `model_from_guarantee` vs `customer_stated_model`
   - **If mismatch:**
     - Flag in `WatchVerify.issues[]`
     - AI: "⚠️ Notei que o certificado indica [X] mas a foto mostra [Y]. Poderia confirmar qual é o correto?"
4. Store URL in `WatchVerify.guarantee_url`

---

#### Document 3: Invoice (Nota Fiscal)
**AI:**
> "Ótimo! Agora envie a Nota Fiscal de compra original."

**Processing:**
1. Store in Cloudinary
2. GPT-4 Vision OCR:
   - Extract NF number
   - Extract issue date
   - Extract store/CNPJ
   - Extract product description (should match watch)
   - Extract value
3. **Country-Specific Validation:**
   - **Brazil:** Check NF via SEFAZ API (if available)
     - URL: `https://www.nfe.fazenda.gov.br/portal/consulta.aspx?tipoConsuln=completa&tipoNF=0&nfe=[NF_NUMBER]`
     - If valid: ✅ Mark as `nf_validated: true`
     - If invalid/not found: ⚠️ Mark as `nf_validated: false`
   - **Other countries:** Cannot validate online
     - ⚠️ Mark as `nf_country: [country]`, `nf_validated: null`

4. **Cross-Reference:**
   - Compare `nf_date` vs `guarantee_date`
   - **If mismatch (>30 days difference):**
     - AI: "A Nota Fiscal é de [date1] mas o certificado de garantia é [date2]. Qual o motivo dessa diferença?"
     - Store customer answer in `WatchVerify.date_mismatch_reason`
   - Check if NF mentions reference/serial
   - **If reference in NF ≠ guarantee:**
     - Flag in `WatchVerify.issues[]`

5. Store URL in `WatchVerify.invoice_url`

---

#### Optional Documents: Additional Evidence if nf_validated: false
**AI:**
> "Recebi todos os documentos principais! Mas como foi comprado no Exterior e para fortalecer a verificação, você pode enviar documentos adicionais (opcional):
> - Fatura do cartão de crédito (comprovando a compra)
> - Comprovante de viagem (se comprou no exterior)
> - Outros certificados ou documentos (hotel em seu nome)
>
> Prefere enviar agora ou que eu envie o relatório atual para a boutique?"

**Customer Options:**

**Option A: "Enviar agora"**
- AI waits for additional documents
- Processes each document received
- Updates verification report

**Option B: "Enviar relatório agora"**
- AI finalizes report with current documents
- Sends to store immediately
- Customer can still send documents later (AI will append to report)

**Processing:**
- Store in `WatchVerify.additional_documents[]` (array of URLs)
- No strict validation - just attach to report
- Customer can send **days later** - AI re-opens verification session
- Each time new document arrives, report is regenerated

---

### Phase 3: Cross-Reference Analysis

#### Automatic Checks

**1. Reference Number Consistency**
```
Photo reference: 126710BLRO
Guarantee reference: 126710BLRO
NF reference: 126710BLRO
✅ PASS
```

**2. Model vs Documents**
```
Customer said: "Rolex GMT-Master II"
Photo shows: GMT-Master II
Guarantee says: GMT-Master II
✅ PASS
```

**3. Date Consistency**
```
Guarantee date: 15/03/2022
NF date: 18/03/2022
Difference: 3 days
✅ PASS (within 30 days tolerance)
```

**4. Serial Number Presence**
```
Guarantee serial: ABC123456
Photo serial: ABC123456 (if visible)
✅ PASS
```

**5. Store/Origin Validation**
```
Guarantee store: "Boutique Rolex São Paulo"
NF store: "Boutique Rolex SP LTDA" (CNPJ: 12.345.678/0001-99)
✅ PASS (same entity)
```

---

### Phase 4: Issue Detection

#### Common Issues & Flags

**🚨 Critical Issues (Auto-Flag for Manual Review):**
- Reference number mismatch (photo ≠ guarantee)
- Model mismatch (customer said GMT, photo shows Submariner)
- Serial number mismatch
- NF validation failed (Brazil only)
- NF date > 60 days from guarantee date (no explanation given)

**⚠️ Warnings (Note in Report):**
- Missing optional documents
- Cannot validate NF (foreign purchase)
- Guarantee card condition (torn, faded)
- Photo quality low

**✅ Clean Verification:**
- All cross-references match
- Dates aligned
- NF validated (if Brazil)
- High-quality photos

---

### Phase 5: Report Generation

#### Verification Report Structure

```markdown
# RELATÓRIO DE VERIFICAÇÃO - [Watch Brand Model]

**Cliente:** [Name] (CPF: ***.***.[last 3 digits])
**Data:** [timestamp]
**ID Verificação:** [WatchVerify.id]

---

## 📸 DOCUMENTOS RECEBIDOS

✅ Foto do relógio
✅ Certificado de garantia
✅ Nota Fiscal
✅ Fatura cartão de crédito (adicional)

---

## 🔍 ANÁLISE TÉCNICA

**Marca:** Rolex
**Modelo:** GMT-Master II
**Referência:** 126710BLRO
**Serial:** ABC123456

---

## ✅ CONSISTÊNCIA DE DADOS

| Campo | Foto | Garantia | NF | Status |
|-------|------|----------|--------|
| Referência | 126710BLRO | 126710BLRO | 126710BLRO | ✅ |
| Modelo | GMT-Master II | GMT-Master II | - | ✅ |
| Data Compra | - | 15/03/2022 | 18/03/2022 | ✅ (3 dias) |

---

## 🇧🇷 VALIDAÇÃO NOTA FISCAL

**Número NF:** 12345
**CNPJ Emissor:** 12.345.678/0001-99
**Validação SEFAZ:** ✅ **AUTÊNTICA**
**Status:** NF válida e verificada pelo sistema da Receita Federal

---

## 📋 OBSERVAÇÕES

- Todas as referências cruzadas conferem
- Documentação completa e autêntica
- Relógio adquirido em loja autorizada Rolex
- Cliente forneceu fatura adicional do cartão

---

## ⚠️ ALERTAS

Nenhum alerta detectado.

---

## 💡 RECOMENDAÇÃO

**APROVADO PARA AVALIAÇÃO PRESENCIAL**

Sugerimos agendar visita do cliente para inspeção física do relógio.
Documentação em ordem, alta confiabilidade.

---

## ⚖️ AVISO LEGAL

**IMPORTANTE:** Este relatório é uma análise preliminar de documentação.

🔸 **Todos os relatórios são analisados mediante pagamento da taxa de verificação**
🔸 **NENHUM valor ou avaliação é definitivo sem inspeção física por relojoeiro qualificado**
🔸 **A autenticidade final e valor de mercado só podem ser determinados presencialmente**
🔸 **Este relatório NÃO constitui garantia de compra ou proposta de valor**
🔸 **Recomendamos fortemente avaliação presencial antes de qualquer transação**

---

**Documentos anexos:** [4 arquivos]
- [watch_photo.jpg](url)
- [guarantee_card.jpg](url)
- [invoice.pdf](url)
- [credit_card_statement.pdf](url)

---

_Gerado automaticamente pelo Watch Verify AI_
_Este relatório é confidencial e destinado exclusivamente à boutique contratante_
```

---

#### Report Delivery

**To Store Owner (via WhatsApp):**
> "📊 **Nova Verificação Completa!**
>
> Cliente: João Silva
> Relógio: Rolex GMT-Master II Ref. 126710BLRO
> Status: ✅ Aprovado para avaliação
>
> Relatório completo: [Dashboard Link]"

**To Customer (via WhatsApp):**
> "✅ Verificação concluída!
>
> Sua documentação foi analisada e enviada para a equipe da boutique.
>
> ⚠️ **Importante:** Este relatório é uma análise preliminar. Qualquer proposta de compra e valor só será definida após avaliação física do relógio por nossos especialistas.
>
> Em breve entraremos em contato para agendar uma avaliação presencial.
>
> Código de verificação: #VER-12345"

---

## 🔄 Late Document Submission

### Scenario: Customer sends document 2 days later

**Customer:** _[sends credit card invoice 2 days after completing verification]_

**AI Detection:**
1. Check if customer has recent verification (`status = completed`, `created_at < 7 days`)
2. If found:
   - Re-open verification record
   - Add document to `additional_documents[]`
   - Update `WatchVerify.updated_at`
   - Regenerate report
   - Notify store owner

**AI Response:**
> "Recebi o comprovante adicional! Vou incluir no relatório de verificação do seu Rolex GMT. A equipe será notificada."

---

## 🎛️ AI Conversation Examples

### Example 1: Clean Verification

**Customer:** "Quero vender meu Rolex"
**AI:** "Perfeito! Para iniciar a verificação, preciso do seu CPF."

**Customer:** "123.456.789-00"
**AI:** "Obrigado! Qual relógio você gostaria de vender?"

**Customer:** "Rolex Submariner 126610LN"
**AI:** "Ótimo! Vou precisar de 3 documentos. Primeiro, envie uma foto clara do relógio mostrando o mostrador."

_[Customer sends photo]_

**AI:** "Perfeito! Agora envie o certificado de garantia."

_[Customer sends guarantee card]_

**AI:** "Ótimo! Por último, a Nota Fiscal de compra original."

_[Customer sends NF]_

**AI:** "Pronto! Estou analisando os documentos... ⏳"

_[30 seconds later]_

**AI:** "✅ Verificação concluída! Todos os documentos conferem. Enviei o relatório para a boutique. Código: #VER-12345. Aguarde contato para agendarmos uma avaliação presencial."

---

### Example 2: Reference Number Mismatch

**AI:** "Perfeito! Agora envie o certificado de garantia."

_[Customer sends guarantee card for GMT, but photo shows Submariner]_

**AI:** "⚠️ Notei que o certificado indica **GMT-Master II (126710)** mas a foto mostra **Submariner (126610)**. Você quer vender qual dos dois?"

**Customer:** "Ah, me enganei! Quero vender o GMT. Vou enviar a foto certa."

**AI:** "Sem problemas! Envie a foto correta do GMT-Master II."

---

### Example 3: NF Date Mismatch

**AI:** "A Nota Fiscal é de **15/01/2020** mas o certificado de garantia é **10/06/2020**. Qual o motivo dessa diferença?"

**Customer:** "Comprei como presente de aniversário em janeiro, mas só ativei a garantia em junho quando ganhei"

**AI:** "Entendi! Vou incluir essa informação no relatório. ✅"

---

## 🗄️ Database Schema Updates

### WatchVerify Table - New Fields

```typescript
{
  // Existing fields
  customer: string
  tenant_id: string
  phone: string
  brand: string
  model: string
  reference: string
  serial: string
  icd: number
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'manual_review' | 'rejected'
  photo_url: string
  guarantee_url: string
  invoice_url: string
  issues: string[]
  recommendations: string[]
  notes: string
  created_at: string
  completed_at: string

  // NEW FIELDS
  cpf: string                           // Encrypted CPF
  customer_stated_model: string         // What customer said initially
  reference_from_photo: string          // Extracted from photo
  reference_from_guarantee: string      // Extracted from guarantee
  reference_from_nf: string             // Extracted from invoice
  serial_from_photo: string             // If visible in photo
  serial_from_guarantee: string         // From guarantee card
  guarantee_date: string                // Purchase date from guarantee
  nf_number: string                     // Invoice number
  nf_date: string                       // Invoice date
  nf_store_name: string                 // Store that issued invoice
  nf_cnpj: string                       // Store CNPJ (Brazil)
  nf_validated: boolean | null          // SEFAZ validation result
  nf_country: string                    // Country of purchase
  date_mismatch_reason: string          // Customer explanation for date diff
  additional_documents: string[]        // Array of extra document URLs
  verification_report: string           // Full markdown report
  report_sent_at: string                // When report was sent to store
}
```

---

## 🚀 Implementation Checklist

- [ ] Add `verification_enabled` toggle to Settings table
- [ ] Add `offers_purchase` field to Settings
- [ ] Create enhanced verification session state machine
- [ ] Implement CPF collection & encryption
- [ ] Build GPT-4 Vision document OCR pipeline
- [ ] Create SEFAZ NF validation (Brazil only)
- [ ] Build cross-reference logic
- [ ] Generate markdown verification report
- [ ] WhatsApp notification to store owner
- [ ] Late document submission handler
- [ ] Verification reopening logic (7-day window)
- [ ] Dashboard verification report viewer
- [ ] Export verification report as PDF

---

## 💰 Pricing Strategy

**Base Plan:** Watch verification **disabled**

**Premium Add-On:** R$ 50/verification or R$ 299/month unlimited

**Value Proposition:**
- Fraud prevention (fake watches, stolen goods)
- Time savings (automated cross-checking)
- Professional reports (impress customers)
- Compliance (CPF collection, LGPD-compliant)
- Confidence boost (customers trust AI analysis)

---

**Ready for implementation! 🚀**
