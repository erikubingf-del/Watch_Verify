# Salesperson Feedback System - Setup Guide

## 🎯 Overview

The Salesperson Feedback System allows salespeople to quickly enrich customer data after in-person visits using audio or text via WhatsApp.

**Key Features:**
- Audio transcription with OpenAI Whisper
- Structured data extraction with GPT-4
- Customer disambiguation
- Automatic customer/appointment updates
- Follow-up message suggestions

---

## 📋 Required Airtable Tables

### 1. FeedbackSessions Table (NEW)

Create this new table in your Airtable base:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `tenant_id` | Link to Tenants | ✅ | Store tenant |
| `salesperson_phone` | Phone | ✅ | Who gave feedback |
| `customer_phone` | Phone | ❌ | Customer identified |
| `customer_name` | Single line text | ❌ | Customer name mentioned |
| `feedback_type` | Single select | ✅ | "audio" or "text" |
| `raw_input` | Long text | ✅ | Original audio URL or text |
| `transcription` | Long text | ❌ | Whisper transcription (if audio) |
| `extracted_data` | Long text | ❌ | JSON of extracted fields |
| `matched_customers` | Long text | ❌ | JSON array of matched customers |
| `state` | Single select | ✅ | Current state |
| `created_at` | Date & time | ✅ | Feedback timestamp |

**Single Select Options for `feedback_type`:**
- audio
- text

**Single Select Options for `state`:**
- awaiting_transcription
- awaiting_extraction
- awaiting_disambiguation
- awaiting_new_customer_confirm
- awaiting_confirmation
- awaiting_follow_up
- completed
- cancelled

---

### 2. Customers Table - New Fields

Add these fields to your existing **Customers** table:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `budget_min` | Number | ❌ | Minimum budget (R$) |
| `budget_max` | Number | ❌ | Maximum budget (R$) |
| `birthday` | Single line text | ❌ | Birthday in MM-DD format (no year) |
| `hobbies` | Long text | ❌ | Customer hobbies (comma-separated) |
| `notes` | Long text | ❌ | Salesperson notes (append-only) |
| `last_visit` | Date | ❌ | Last visit date |
| `updated_at` | Date & time | ❌ | Last update timestamp |

---

### 3. Users/Salespeople Table

Ensure salespeople have their WhatsApp numbers registered in either:
- **Users** table with `phone` field
- **Salespeople** table with `phone` field (if exists)

The system checks both tables to identify if a message is from a salesperson.

---

## 🔐 Environment Variables

No additional environment variables needed! The system uses existing OpenAI API key:

```env
OPENAI_API_KEY=sk-...
```

---

## 🚀 How to Use

### For Salespeople:

**Option 1: Audio Feedback (Recommended)**
```
1. Record audio describing the visit
2. Send audio to store WhatsApp
3. AI transcribes and extracts data
4. Confirm information
5. Optionally send follow-up to customer
```

**Option 2: Text Feedback**
```
1. Type /feedback or send structured text:
   "João Silva - Rolex Submariner - budget 50k - aniversário 15/03"
2. AI extracts data
3. Confirm information
4. Optionally send follow-up
```

---

## 💬 Conversation Examples

### Example 1: Audio Feedback (Happy Path)

**Salesperson:** _[Sends audio]_ "Atendi o João Silva hoje, ele adorou o Submariner preto, aniversário dele é 15 de março, joga golfe nos finais de semana"

**AI:** "⏳ Transcrevendo áudio... Aguarde um instante."

**AI:** "Transcrição: 'Atendi o João Silva hoje...' ✅

⏳ Extraindo informações..."

**AI:** "Encontrei este cliente:

João Silva - +5511995843051
Última visita: 2024-10-15

Confirma as informações do João Silva?

✅ Interesse: Rolex Submariner (preto)
✅ Aniversário: 15/03
✅ Hobbies: Golfe

Confirmar? (Sim/Não)"

**Salesperson:** "Sim"

**AI:** "✅ Dados atualizados!

Quer que eu envie uma mensagem de follow-up para João Silva? (Sim/Não)"

**Salesperson:** "Sim"

**AI:** "✅ Mensagem enviada para João Silva!

'Olá João! Foi um prazer recebê-lo hoje. O Submariner preto que você viu está disponível. Quando quiser agendar outra visita, é só me chamar! 😊'

Feedback concluído! 🎯"

---

### Example 2: Text Feedback

**Salesperson:** "/feedback Maria Oliveira - Cartier pulseiras - budget 30-40k"

**AI:** "⏳ Processando feedback... Aguarde."

**AI:** "Maria Oliveira não encontrada no sistema. É uma cliente nova? (Sim/Não)"

**Salesperson:** "Sim"

**AI:** "Qual o telefone da Maria Oliveira?"

**Salesperson:** "11988887777"

**AI:** "✅ Cliente criado!

Confirma as informações do Maria Oliveira?

✅ Interesse: Cartier pulseiras
✅ Budget: R$ 30.000 - R$ 40.000

Confirmar? (Sim/Não)"

---

### Example 3: Disambiguation

**Salesperson:** "João da Silva gostou do GMT"

**AI:** "Encontrei 3 clientes com nome similar. Qual deles?

1️⃣ João Silva - +5511995843051
   Última visita: 2024-10-15
   Interesse: Rolex Submariner

2️⃣ João Pedro Silva - +5511988776655
   Última visita: 2024-09-20
   Interesse: Cartier Tank

3️⃣ João da Silva - +5511977665544
   Primeira visita: 2024-11-10

Responda com o número (1, 2, 3) ou 'nenhum' se for um cliente novo."

**Salesperson:** "3"

**AI:** "Confirma João da Silva (+5511977665544)?

✅ Interesse: GMT

Confirmar? (Sim/Não)"

---

## 📊 What Gets Updated

### Customers Table:
- `last_interest` → Latest product mentioned
- `budget_min` / `budget_max` → Extracted from feedback
- `birthday` → MM-DD format
- `hobbies` → Comma-separated list
- `notes` → Appends new notes with timestamp
- `last_visit` → Today's date
- `updated_at` → Current timestamp

### Appointments Table (new record created):
- `tenant_id` → Store
- `customer_phone` → Customer
- `customer_name` → Customer name
- `date` → Visit date (today)
- `time` → "N/A (walk-in)"
- `product_interest` → What they liked
- `status` → "completed"
- `notes` → Visit notes

### FeedbackSessions Table (audit log):
- Complete record of transcription, extraction, and confirmation

---

## 🎯 Intent Detection

The system detects feedback intent when:

1. Message starts with `/feedback`
2. From a registered salesperson AND:
   - Sends audio, OR
   - Has active feedback session, OR
   - Message contains "atendi"

**Example triggers:**
- "/feedback"
- _[Audio message from salesperson]_
- "Atendi o João Silva hoje..."

---

## ⚙️ Extracted Data Fields

The AI extracts these fields from feedback:

```typescript
{
  customer_name: string           // Required
  customer_phone?: string         // Optional (last 4 digits ok)
  product_interest?: string       // Product mentioned
  budget_min?: number            // In Reais
  budget_max?: number            // In Reais
  birthday?: string              // MM-DD format
  hobbies?: string[]             // Array of hobbies
  visit_notes?: string           // General observations
  next_action?: string           // Follow-up reminder
  visited_at: string             // Always today's date
  salesperson_notes?: string     // Any additional notes
}
```

---

## 🔍 Customer Matching Logic

1. **Exact phone match** (if phone mentioned)
   - Highest confidence
   - Skip disambiguation

2. **Exact name match** (case-insensitive)
   - If 1 result → Use it
   - If multiple → Disambiguate

3. **Partial name match** (first word)
   - "João" matches "João Silva", "João Pedro"
   - If multiple → Disambiguate

4. **No match**
   - Ask if new customer
   - Request phone number
   - Create new customer record

---

## 🎙️ Audio Transcription

**Using:** OpenAI Whisper API

**Supported Formats:**
- MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM, OGG

**Language:** Portuguese (pt)

**Max Duration:** ~2 minutes (recommended)

**Accuracy:** > 95% for clear audio

**Error Handling:**
- If transcription fails → Ask for text feedback
- If audio too long → Ask to be concise

---

## 💡 Follow-Up Messages

AI generates personalized follow-up messages:

**Example:**
```
"Olá João! Foi um prazer recebê-lo hoje. O Submariner preto que
você viu está disponível. Quando quiser agendar outra visita,
é só me chamar! 😊"
```

**Customization:**
- Mentions product interest
- Warm, personal tone
- Uses "você" (informal but respectful)
- Includes relevant emoji
- Short and actionable

---

## 🚨 Common Issues

### Issue: "Não consegui identificar o nome do cliente"
**Solution:** Make sure feedback mentions full name:
- ✅ "João Silva gostou do..."
- ❌ "O cliente gostou do..."

### Issue: Audio transcription fails
**Solution:**
- Check audio quality (not too noisy)
- Speak clearly
- Use text feedback as fallback

### Issue: Multiple customer matches
**Solution:** AI will ask for disambiguation - just respond with number

### Issue: Salesperson not recognized
**Solution:**
- Ensure phone is registered in Users or Salespeople table
- Check tenant_id matches

---

## 📈 Success Metrics

**Track these in your dashboard:**
- Feedback submissions per day
- Audio vs text ratio
- Transcription accuracy
- Customer match success rate
- Follow-up message acceptance rate

**Expected Performance:**
- Transcription: > 95% accuracy
- Extraction: > 90% accuracy
- Customer matching: > 85% success
- Time saved: ~5 minutes per feedback

---

## 🔄 State Machine

```
awaiting_transcription (audio only)
  ↓
awaiting_extraction
  ↓
awaiting_disambiguation (if multiple matches)
  or
awaiting_new_customer_confirm (if no match)
  ↓
awaiting_confirmation
  ↓
awaiting_follow_up
  ↓
completed
```

---

## 🎓 Training Salespeople

### Quick Start Guide for Salespeople:

**After each visit:**

1. **Open WhatsApp** with store number

2. **Record audio or type:**
   - Customer name
   - What they liked
   - Budget (if discussed)
   - Any special dates/interests

3. **Confirm information** when AI asks

4. **Send follow-up** (optional but recommended)

**Example Script:**
> "Atendi [Nome], ele/ela gostou de [Produto], budget aproximado [Valor],
> aniversário [Data], hobby [Interesse]"

**That's it!** Takes < 60 seconds.

---

## 🔐 Privacy & Security

**Data Protection:**
- Audio files processed in memory (not stored permanently)
- Transcriptions logged for audit only
- Personal data (birthday, phone) in encrypted Airtable
- LGPD compliant (deletion on request)

**Access Control:**
- Only registered salespeople can submit feedback
- Feedback scoped to tenant
- No cross-tenant data leaks

---

## 🚀 Next Steps

After setup:

1. ✅ Create FeedbackSessions table in Airtable
2. ✅ Add new fields to Customers table
3. ✅ Register salesperson phone numbers in Users table
4. ✅ Test with audio feedback
5. ✅ Test with text feedback
6. ✅ Train salespeople (5-10 minutes)
7. ✅ Monitor first week (check transcription accuracy)
8. ✅ Iterate based on feedback

---

**Ready to enrich your customer data! 🚀**

_Last Updated: 2025-11-20_
