# Watch Verify - Complete Testing Guide

**Date:** 2025-11-21
**Status:** Ready for Phase 1 & 2 Testing

---

## 🧪 PHASE 1: Enhanced Verification System Test

### Prerequisites:
1. ✅ Airtable schema 100% complete (manual step done)
2. ✅ Settings table has `verification_enabled = true` and `offers_purchase = true`
3. ✅ VERIFICATION_ENCRYPTION_KEY in .env.local
4. ✅ Development server running

### Test Steps:

#### Step 1: Start Development Server
```bash
cd /Users/erikfigueiredo/Documents/GitHub/Watch_Verify
npm run dev
```

Wait for: `Ready on http://localhost:3000`

#### Step 2: Enable Verification Feature
1. Open Airtable: https://airtable.com/appig3KRYD5neBJqV
2. Go to **Settings** table
3. Find your tenant record
4. Set `verification_enabled` = ✅ checked
5. Set `offers_purchase` = ✅ checked

#### Step 3: Initiate Verification via WhatsApp
Send to your Twilio WhatsApp number (whatsapp:+14155238886):

```
Quero vender meu Rolex Submariner
```

**Expected Response:**
```
Ótimo! Vou te ajudar com a verificação do seu relógio. Esse processo
garante autenticidade e segurança para ambos.

Primeiro, preciso do seu CPF (será armazenado de forma criptografada).
Por favor, envie no formato: 123.456.789-10
```

#### Step 4: Send CPF
```
123.456.789-10
```

**Expected Response:**
```
✅ CPF registrado com segurança.

Agora, me conte sobre o relógio:
- Marca (ex: Rolex, Patek Philippe)
- Modelo (ex: Submariner, Nautilus)
- Referência (número do modelo, se souber)
```

#### Step 5: Provide Watch Info
```
Rolex Submariner preto, referência 116610LN
```

**Expected Response:**
```
Perfeito! Rolex Submariner 116610LN registrado.

📸 Agora preciso de uma foto clara do relógio mostrando:
- Mostrador completo
- Ponteiros visíveis
- Coroa Rolex (se possível)

Por favor, envie a foto do relógio.
```

#### Step 6: Send Watch Photo
Upload any watch image from your phone/computer

**Expected Response:**
```
✅ Foto do relógio recebida e armazenada!

📄 Agora preciso do Cartão de Garantia (Guarantee Card).
Envie uma foto clara mostrando:
- Número de série
- Referência do modelo
- Data de compra
- Carimbo da loja autorizada
```

#### Step 7: Send Guarantee Card Photo
Upload guarantee card image

**Expected Response:**
```
✅ Cartão de garantia recebido!

🧾 Por último, preciso da Nota Fiscal ou Invoice de compra.
Envie uma foto clara mostrando:
- Data da compra
- Valor pago
- Dados da loja
- Descrição do produto
```

#### Step 8: Send Invoice Photo
Upload invoice image

**Expected Response:**
```
✅ Nota fiscal recebida!

🔍 Analisando a diferença de datas entre os documentos...

[If dates match]
✅ As datas entre garantia e nota fiscal estão consistentes!

Recebi todos os documentos principais! Para fortalecer a verificação,
você pode enviar documentos adicionais (opcional):
- Fatura do cartão de crédito (comprovando a compra)
- Comprovante de viagem (se comprou no exterior)
- Box original do relógio
- Outros certificados ou documentos

Prefere enviar agora ou que eu envie o relatório atual para a boutique?
```

**OR**

```
[If dates don't match]
⚠️ Notei uma diferença de datas:
- Garantia: 15/03/2023
- Nota Fiscal: 20/03/2023

Isso é normal em alguns casos. Pode me explicar o motivo da diferença?
```

#### Step 9A: If Dates Match - Choose Option
```
Enviar relatório agora
```

**Expected Response:**
```
⏳ Processando verificação completa...

[Wait 10-15 seconds for GPT-4 Vision analysis]

✅ VERIFICAÇÃO CONCLUÍDA!

Seu relógio Rolex Submariner 116610LN foi analisado.

📊 Índice de Consistência: 85/100

✅ Pontos Positivos:
- Números de série consistentes
- Referência validada
- Documentos legíveis

⚠️ Atenção:
- Recomenda-se validação presencial por relojoeiro

🏪 IMPORTANTE:
- Relatório enviado para a boutique
- Aguarde contato para avaliação presencial
- Valor final será definido SOMENTE após inspeção física por especialista

AVISO LEGAL: Este relatório é uma análise preliminar baseada em documentos
fotográficos. A autenticidade definitiva e o valor de mercado só podem ser
confirmados mediante inspeção física por relojoeiro certificado. Nenhuma
oferta de compra está sendo feita neste momento.

Qualquer dúvida, estou à disposição! 😊
```

#### Step 9B: If Providing Date Explanation
```
Comprei no exterior e trouxe pro Brasil depois
```

**Expected Response:**
```
✅ Explicação registrada! Isso é comum em compras internacionais.

Prefere enviar documentos adicionais ou que eu envie o relatório
atual para a boutique?
```

#### Step 10: Verify Airtable Records

**Check VerificationSessions Table:**
- ✅ Record created with customer_phone
- ✅ customer_name filled
- ✅ cpf encrypted (shows encrypted string)
- ✅ customer_stated_model = "Rolex Submariner preto, referência 116610LN"
- ✅ watch_photo_url (Cloudinary URL)
- ✅ guarantee_card_url (Cloudinary URL)
- ✅ invoice_url (Cloudinary URL)
- ✅ state = "completed"
- ✅ date_mismatch_reason (if applicable)

**Check WatchVerify Table:**
- ✅ New record created
- ✅ customer = customer name
- ✅ phone = customer WhatsApp
- ✅ brand = "Rolex"
- ✅ model = "Submariner"
- ✅ reference = extracted reference number
- ✅ serial = extracted serial number
- ✅ icd = consistency score (0-100)
- ✅ status = "completed"
- ✅ photo_url, guarantee_url, invoice_url filled
- ✅ cpf encrypted
- ✅ issues = JSON array of problems found
- ✅ recommendations = JSON array of positive points
- ✅ notes = Full markdown verification report
- ✅ completed_at = timestamp

---

## 🧪 PHASE 2: Salesperson Feedback System Test

### Prerequisites:
1. ✅ FeedbackSessions table created
2. ✅ Salespeople or Users table has salesperson phone registered
3. ✅ Customers table has new feedback fields

### Test Steps:

#### Step 1: Register Salesperson
1. Open **Users** or **Salespeople** table in Airtable
2. Add record:
   - name: "Francisca Silva"
   - phone: "+5511999887766" (your test WhatsApp)
   - tenant_id: link to your tenant
   - active: ✅ checked

#### Step 2: Send Audio Feedback (Recommended)
Record and send audio from registered salesperson phone:

```
"Atendi o João Silva hoje de tarde, ele adorou o Rolex Submariner
preto, orçamento dele é na faixa de 50 a 60 mil reais, aniversário
dele é 15 de março, e ele falou que joga golfe nos finais de semana."
```

**Expected Response:**
```
⏳ Transcrevendo áudio... Aguarde um instante.
```

**Then:**
```
Transcrição: "Atendi o João Silva hoje de tarde, ele adorou o Rolex
Submariner preto, orçamento dele é na faixa de 50 a 60 mil reais..."

✅ Áudio transcrito com sucesso!

⏳ Extraindo informações...
```

**Then (if João Silva exists in Customers table):**
```
Encontrei este cliente:

📋 João Silva - +5511995843051
   Última visita: 2024-10-15
   Interesse anterior: GMT Master

Confirma as informações do João Silva?

✅ Interesse: Rolex Submariner (preto)
💰 Orçamento: R$ 50.000 - R$ 60.000
🎂 Aniversário: 15/03
⛳ Hobbies: Golfe

Confirmar? (Sim/Não)
```

**OR (if João Silva doesn't exist):**
```
João Silva não encontrado no sistema. É um cliente novo? (Sim/Não)
```

#### Step 3A: Confirm Existing Customer
```
Sim
```

**Expected Response:**
```
✅ Dados atualizados com sucesso!

Cliente: João Silva (+5511995843051)
Interesse: Rolex Submariner
Orçamento: R$ 50.000 - R$ 60.000
Aniversário: 15/03
Hobbies: Golfe
Última visita: Hoje

Quer que eu envie uma mensagem de follow-up para João Silva? (Sim/Não)
```

#### Step 3B: New Customer Flow
```
Sim
```

**Expected Response:**
```
Qual o telefone do João Silva?
```

**Send:**
```
11999887766
```

**Expected Response:**
```
✅ Cliente criado!

Confirma as informações do João Silva (+5511999887766)?

✅ Interesse: Rolex Submariner (preto)
💰 Orçamento: R$ 50.000 - R$ 60.000
🎂 Aniversário: 15/03
⛳ Hobbies: Golfe

Confirmar? (Sim/Não)
```

#### Step 4: Send Follow-up (Optional)
```
Sim
```

**Expected Response:**
```
✅ Mensagem enviada para João Silva!

"Olá João! Foi um prazer recebê-lo hoje. O Rolex Submariner preto que
você viu está disponível. Quando quiser agendar outra visita ou tirar
dúvidas, é só me chamar! ⚫✨"

Feedback concluído! 🎯
```

**Then customer João Silva receives:**
```
Olá João! Foi um prazer recebê-lo hoje. O Rolex Submariner preto que
você viu está disponível. Quando quiser agendar outra visita ou tirar
dúvidas, é só me chamar! ⚫✨
```

#### Step 5: Test Text Feedback (Alternative)
From salesperson phone, send:

```
/feedback Maria Santos - Cartier Tank - budget 30-40k - aniversário 25/12
```

**Expected Response:**
```
⏳ Processando feedback...
```

**Then:**
```
Maria Santos não encontrada. É uma cliente nova? (Sim/Não)
```

#### Step 6: Verify Airtable Records

**Check FeedbackSessions Table:**
- ✅ Record created
- ✅ salesperson_phone = registered phone
- ✅ customer_name = "João Silva"
- ✅ customer_phone = identified phone
- ✅ feedback_type = "audio" or "text"
- ✅ raw_input = original audio URL or text
- ✅ transcription = Whisper output (if audio)
- ✅ extracted_data = JSON with budget, birthday, hobbies
- ✅ matched_customers = JSON array (if multiple matches)
- ✅ state = "completed"

**Check Customers Table (João Silva record):**
- ✅ last_interest = "Rolex Submariner"
- ✅ budget_min = 50000
- ✅ budget_max = 60000
- ✅ birthday = "03-15"
- ✅ hobbies = "Golfe"
- ✅ notes = "[2025-11-21] Adorou Submariner preto, joga golfe"
- ✅ last_visit = today's date
- ✅ updated_at = current timestamp

**Check Appointments Table:**
- ✅ New record created
- ✅ customer_name = "João Silva"
- ✅ customer_phone = customer phone
- ✅ date = today
- ✅ time = "N/A (walk-in)"
- ✅ product_interest = "Rolex Submariner"
- ✅ status = "completed"
- ✅ notes = visit feedback

---

## 🐛 Common Issues & Solutions

### Issue 1: "Table not found" error
**Solution:** Run `python3 scripts/update-airtable-schema.py` again

### Issue 2: Verification not triggering
**Solution:**
- Check Settings.verification_enabled = true
- Check Settings.offers_purchase = true
- Restart dev server

### Issue 3: Salesperson not recognized
**Solution:**
- Verify phone in Users or Salespeople table matches exactly
- Include country code: +5511999887766
- Check tenant_id is correct

### Issue 4: Audio transcription fails
**Solution:**
- Check OPENAI_API_KEY is valid
- Audio should be < 25MB
- Try text feedback as fallback

### Issue 5: Customer matching finds wrong person
**Solution:** This is expected - disambiguation flow will ask for clarification

### Issue 6: CPF encryption error
**Solution:**
- Verify VERIFICATION_ENCRYPTION_KEY in .env.local
- Must be exactly 32 characters

---

## 📊 Success Metrics

### Enhanced Verification:
- ✅ Session created in VerificationSessions table
- ✅ All 9 states working correctly
- ✅ Documents uploaded to Cloudinary
- ✅ GPT-4 Vision analysis completed
- ✅ WatchVerify record created with ICD score
- ✅ Legal disclaimers included in report
- ✅ CPF encrypted properly

### Salesperson Feedback:
- ✅ Audio transcription accuracy > 90%
- ✅ Structured data extraction complete
- ✅ Customer matching/disambiguation working
- ✅ Customers table updated correctly
- ✅ Follow-up messages personalized
- ✅ Appointments record created

---

## 🎯 Next Steps After Testing

1. **Fix any bugs found during testing**
2. **Populate BrandKnowledge table** with 5-10 luxury brands
3. **Build dashboard for store owners** (parallel work)
4. **White-label branding** (logo, colors)
5. **Production deployment** to Vercel

---

**Testing Time Estimate:**
- Phase 1 (Verification): 15-20 minutes
- Phase 2 (Feedback): 10-15 minutes
- Total: ~30-35 minutes

**Ready to test!** 🚀
