# Salesperson Feedback System - Specification

## 🎯 Overview

**Purpose:** Allow salespeople to quickly update customer data after in-person visits using audio or text via WhatsApp.

**Business Value:**
- Enrich customer profiles with preferences, interests, personal dates
- Enable personalized follow-up messages
- Track sales pipeline (visited, liked product X, budget, etc.)
- Build relationship history for future visits

**User Experience:**
- Salesperson sends audio (natural, fast) or text (structured)
- AI transcribes, extracts data, finds customer
- AI asks for confirmation before updating
- AI suggests follow-up message (optional)

---

## 📋 Workflow

### Phase 1: Feedback Initiation (Manual - Option C)

**Trigger:** Salesperson types `/feedback` or sends audio/text after a visit

**Example Messages:**
- **Audio:** "Atendi o João Silva hoje, ele adorou o Submariner preto, aniversário dele é 15 de março, joga golfe nos finais de semana"
- **Text:** "João Silva - interessado em Rolex Submariner preto - budget R$ 50k - aniversário 15/03 - hobby: golfe"

---

### Phase 2: Audio Transcription (if audio)

**Using:** OpenAI Whisper API

**Process:**
1. Download audio from Twilio media URL
2. Send to Whisper API for transcription
3. Get Portuguese text back
4. Log transcription for debugging

**Error Handling:**
- If transcription fails → Ask salesperson to send text instead
- If audio too long (> 2 minutes) → Ask to be more concise

---

### Phase 3: Structured Data Extraction

**Using:** GPT-4 to parse feedback into structured fields

**Extraction Target:**
```typescript
interface FeedbackData {
  customer_name: string           // "João Silva"
  customer_phone?: string         // "+5511995843051" (if mentioned)
  product_interest?: string       // "Rolex Submariner preto"
  budget_min?: number            // 40000 (if mentioned "R$ 40-60k")
  budget_max?: number            // 60000
  birthday?: string              // "03-15" (MM-DD format, year unknown)
  hobbies?: string[]             // ["Golfe", "Viajar"]
  visit_notes?: string           // "Cliente VIP, conhece muito de relógios"
  next_action?: string           // "Ligar quando chegar GMT azul"
  visited_at?: string            // Today's date (inferred)
  salesperson_notes?: string     // Any additional notes
}
```

**GPT-4 Prompt:**
```
Extract structured customer feedback from this salesperson's message:

"{transcribed_text or original_text}"

Return ONLY a JSON object with these fields (use null if not mentioned):
{
  "customer_name": "string or null",
  "customer_phone": "string or null (format +55XXXXXXXXXXX)",
  "product_interest": "string or null",
  "budget_min": number or null,
  "budget_max": number or null,
  "birthday": "string or null (MM-DD format)",
  "hobbies": ["string"] or null,
  "visit_notes": "string or null",
  "next_action": "string or null",
  "visited_at": "YYYY-MM-DD" (today's date),
  "salesperson_notes": "string or null"
}

Rules:
- Extract only what was explicitly mentioned
- Convert dates to standardized formats
- Extract budget ranges if mentioned ("40-60k" → min: 40000, max: 60000)
- Identify product brands and models
- Be conservative - if unsure, use null
```

---

### Phase 4: Customer Disambiguation

**Challenge:** Multiple customers might have same first name or similar names

**Logic:**
1. Search for customers matching name in tenant's Customers table
2. If **1 match** → Use it
3. If **multiple matches** → Ask salesperson to confirm
4. If **no match** → Ask if this is a new customer

**Disambiguation Message:**
```
Encontrei 3 clientes com nome similar. Qual deles?

1️⃣ João Silva - +5511995843051
   Última visita: 2024-10-15
   Interesse: Rolex Submariner

2️⃣ João Pedro Silva - +5511988776655
   Última visita: 2024-09-20
   Interesse: Cartier Tank

3️⃣ João da Silva - +5511977665544
   Primeira visita: 2024-11-10
   Sem visitas registradas

Responda com o número (1, 2 ou 3) ou "nenhum" se for um cliente novo.
```

---

### Phase 5: Confirmation Before Update

**Show Preview:**
```
Confirma as informações do João Silva (+5511995843051)?

✅ Interesse: Rolex Submariner (preto)
✅ Budget: R$ 40.000 - R$ 60.000
✅ Aniversário: 15/03
✅ Hobbies: Golfe
✅ Observação: Cliente VIP, conhece muito de relógios
✅ Próxima ação: Ligar quando chegar GMT azul

Confirmar? (Sim/Não/Editar)
```

**Options:**
- **"Sim"** → Update customer + create appointment record
- **"Não"** → Cancel, don't update
- **"Editar"** → Ask what field to change (future enhancement)

---

### Phase 6: Update Database

**Tables to Update:**

1. **Customers Table:**
```typescript
{
  // Find by phone or name
  phone: customer_phone,
  name: customer_name,

  // Update fields
  last_interest: product_interest,
  budget_min: budget_min,
  budget_max: budget_max,
  birthday: birthday,
  hobbies: hobbies.join(', '),
  notes: Append to existing notes,
  last_visit: visited_at,
  updated_at: now()
}
```

2. **Appointments Table (create new record):**
```typescript
{
  tenant_id: [tenant_id],
  customer_phone: customer_phone,
  customer_name: customer_name,
  date: visited_at,
  time: "N/A (walk-in)",
  product_interest: product_interest,
  status: "completed",
  notes: visit_notes,
  created_at: now()
}
```

3. **FeedbackSessions Table (log for audit):**
```typescript
{
  tenant_id: [tenant_id],
  salesperson_phone: salesperson_phone,
  customer_phone: customer_phone,
  feedback_type: "audio" or "text",
  transcription: transcribed_text,
  extracted_data: JSON.stringify(feedback_data),
  status: "completed",
  created_at: now()
}
```

---

### Phase 7: Follow-Up Message (Optional)

**After Confirmation:**
```
✅ Dados atualizados!

Quer que eu envie uma mensagem de follow-up para o João?

Mensagem sugerida:

"Olá João! Foi um prazer recebê-lo hoje. O Rolex Submariner preto que você viu está disponível. Quando quiser finalizar ou agendar outra visita, é só me chamar! 😊"

Enviar? (Sim/Não/Editar)
```

**Options:**
- **"Sim"** → Send WhatsApp to customer
- **"Não"** → Skip follow-up
- **"Editar"** → Let salesperson rewrite message

---

## 🎙️ Audio Feedback Examples

### Example 1: Simple Feedback
**Audio:** "João Silva, gostou do Submariner, budget 50 mil"

**Extracted:**
```json
{
  "customer_name": "João Silva",
  "product_interest": "Submariner",
  "budget_min": 50000,
  "budget_max": null,
  "visited_at": "2024-11-20"
}
```

### Example 2: Detailed Feedback
**Audio:** "Atendi a Maria Oliveira hoje, telefone dela termina em 8776, ela adora Cartier, especialmente pulseiras, budget entre 30 e 40 mil, aniversário é dia 20 de maio, ela mencionou que viaja muito a Paris, quer algo elegante mas discreto"

**Extracted:**
```json
{
  "customer_name": "Maria Oliveira",
  "customer_phone": "***8776",
  "product_interest": "Cartier pulseiras",
  "budget_min": 30000,
  "budget_max": 40000,
  "birthday": "05-20",
  "hobbies": ["Viagens", "Paris"],
  "visit_notes": "Quer algo elegante mas discreto",
  "visited_at": "2024-11-20"
}
```

### Example 3: Follow-Up Action
**Audio:** "Carlos Mendes voltou, ele quer o IWC Pilot que mostrei, mas só consegue pagar mês que vem, ligar ele dia 1º de dezembro"

**Extracted:**
```json
{
  "customer_name": "Carlos Mendes",
  "product_interest": "IWC Pilot",
  "next_action": "Ligar dia 1º de dezembro",
  "salesperson_notes": "Cliente voltou, quer comprar mas só consegue pagar mês que vem",
  "visited_at": "2024-11-20"
}
```

---

## 📱 Text Feedback Examples

### Example 1: Structured Format
**Text:**
```
João Silva
Rolex Submariner preto
Budget: R$ 40-60k
Aniversário: 15/03
Hobby: Golfe
```

**Extracted:** Same as audio

### Example 2: Freeform
**Text:** "João Silva adorou o Submariner preto, aniversário 15 de março, joga golfe"

**Extracted:** Same as audio

---

## 🔍 Customer Matching Algorithm

### Search Strategy:
1. **Exact phone match** (if phone mentioned)
   - Highest confidence
   - Skip disambiguation

2. **Exact name match** (case-insensitive)
   - If 1 result → Use it
   - If multiple → Disambiguate

3. **Fuzzy name match** (handles typos, partial names)
   - "João" matches "João Silva", "João Pedro Silva"
   - Levenshtein distance < 3 characters
   - If multiple → Disambiguate

4. **No match**
   - Ask: "João Silva não encontrado. É um cliente novo? (Sim/Não)"
   - If "Sim" → Create new customer record
   - If "Não" → Ask for phone number to search

---

## 🗄️ Database Schema

### Table: FeedbackSessions

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Store tenant |
| `salesperson_phone` | Phone | ✅ | Who gave feedback |
| `customer_phone` | Phone | ❌ | Customer identified |
| `customer_name` | Single line text | ✅ | Customer name mentioned |
| `feedback_type` | Single select | ✅ | "audio" or "text" |
| `raw_input` | URL (audio) or Long text | ✅ | Original input |
| `transcription` | Long text | ❌ | Whisper transcription (if audio) |
| `extracted_data` | Long text | ✅ | JSON of extracted fields |
| `status` | Single select | ✅ | "pending", "confirmed", "cancelled" |
| `state` | Single select | ✅ | Current state |
| `created_at` | Date & time | ✅ | Feedback timestamp |

**Single Select Options for `state`:**
- awaiting_transcription
- awaiting_extraction
- awaiting_disambiguation
- awaiting_confirmation
- awaiting_follow_up
- completed
- cancelled

---

## 🚀 Implementation Checklist

- [ ] Create FeedbackSessions table in Airtable
- [ ] Implement Whisper API audio transcription
- [ ] Build GPT-4 structured extraction
- [ ] Create customer search/disambiguation logic
- [ ] Build confirmation workflow
- [ ] Update Customers table with enriched data
- [ ] Create Appointments record for completed visit
- [ ] Generate follow-up message suggestions
- [ ] Send follow-up via WhatsApp (if confirmed)
- [ ] Integrate into Twilio webhook
- [ ] Add `/feedback` command trigger

---

## 🎛️ Conversation Examples

### Example 1: Audio Feedback (Happy Path)

**Salesperson (audio):** "Atendi o João Silva hoje, ele adorou o Submariner preto, aniversário dele é 15 de março, joga golfe nos finais de semana"

**AI:** "Transcrição: 'Atendi o João Silva hoje...' ✅

Encontrei este cliente. Confirma?

João Silva - +5511995843051
Última visita: 2024-10-15
Interesse anterior: Rolex GMT

Dados extraídos:
✅ Interesse: Rolex Submariner (preto)
✅ Aniversário: 15/03
✅ Hobbies: Golfe

Confirmar? (Sim/Não)"

**Salesperson:** "Sim"

**AI:** "✅ Dados atualizados!

Quer que eu envie mensagem de follow-up para o João?

'Olá João! Foi um prazer recebê-lo hoje. O Submariner preto que você viu está disponível. Quer agendar outro horário para finalizarmos? 😊'

Enviar? (Sim/Não)"

**Salesperson:** "Sim"

**AI:** "✅ Mensagem enviada para João Silva!"

---

### Example 2: Disambiguation Needed

**Salesperson:** "João da Silva gostou do GMT"

**AI:** "Encontrei 3 clientes com nome similar:

1️⃣ João Silva - +5511995843051 (última visita: 15/10)
2️⃣ João Pedro Silva - +5511988776655 (última visita: 20/09)
3️⃣ João da Silva - +5511977665544 (sem visitas)

Qual deles? (1, 2, 3 ou 'nenhum')"

**Salesperson:** "3"

**AI:** "Confirma João da Silva (+5511977665544)?

✅ Interesse: GMT

Confirmar? (Sim/Não)"

---

### Example 3: New Customer

**Salesperson:** "Ana Carolina, primeira vez aqui, gostou das pulseiras Cartier"

**AI:** "Ana Carolina não encontrada no sistema. É uma cliente nova? (Sim/Não)"

**Salesperson:** "Sim"

**AI:** "Qual o telefone da Ana Carolina?"

**Salesperson:** "+5511988887777"

**AI:** "Confirma criação de novo cliente?

✅ Nome: Ana Carolina
✅ Telefone: +5511988887777
✅ Interesse: Pulseiras Cartier
✅ Primeira visita: Hoje

Confirmar? (Sim/Não)"

---

## 🔐 Security & Privacy

**Data Handling:**
- Audio files stored temporarily (delete after 24h)
- Transcriptions logged for audit
- Personal data (birthday, phone) stored encrypted
- LGPD compliance (delete on customer request)

**Access Control:**
- Only authenticated salespeople can submit feedback
- Feedback scoped to tenant (no cross-tenant leaks)
- Store owner can review all feedback in dashboard

---

## 📊 Success Metrics

**Adoption:**
- % of salespeople using feedback (target: > 80%)
- Average feedback per day per salesperson (target: > 3)
- Audio vs text ratio (expect 70% audio, 30% text)

**Quality:**
- Transcription accuracy (target: > 95%)
- Extraction accuracy (target: > 90%)
- Disambiguation success rate (target: > 85%)

**Business Impact:**
- Follow-up conversion rate (feedback → purchase)
- Customer satisfaction (personalized service)
- Repeat visit rate (enriched profiles)

---

## 💡 Future Enhancements

- [ ] **Batch Feedback:** "Atendi 3 clientes hoje: João, Maria, Carlos..."
- [ ] **Photo Feedback:** Send photo of business card → OCR extraction
- [ ] **Sentiment Analysis:** Detect if customer was happy, neutral, or frustrated
- [ ] **Automatic Reminders:** AI reminds salesperson to call customer on date mentioned
- [ ] **Integration with Calendar:** Create Google Calendar reminder for next actions

---

**Ready for implementation! 🚀**

_Last Updated: 2025-11-20_
