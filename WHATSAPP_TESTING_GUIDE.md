# 📱 WhatsApp Testing Guide - Watch Verify CRM

## ✅ Test Data Created

### **Catalog Products** (6 items)
1. ✅ Rolex Submariner Date 126610LN - R$ 58,900
2. ✅ Rolex Datejust 41 Azul Jubilee - R$ 52,000
3. ✅ Rolex GMT-Master II Pepsi - R$ 68,000
4. ✅ Patek Philippe Nautilus 5711 (Usado) - R$ 320,000
5. ✅ Anel Diamante 1.0ct D/VVS2 - R$ 48,000
6. ✅ Cartier Love Bracelet Ouro Rosa - R$ 72,000

### **Salespeople** (3 people)
1. ✅ Patricia Silva (+5511999998888)
2. ✅ Ricardo Mendes (+5511999997777)
3. ✅ Juliana Costa (+5511999996666)

---

## 🎯 Complete Test Scenarios

### **Scenario 1: Rolex Inquiry → Visit Scheduling**

**Your Number**: Use your phone
**Send to**: **+1 762-372-7247** (WhatsApp)

**Test Flow**:
```
You: Olá, quero um Rolex Submariner

AI: Olá! Temos o Rolex Submariner Date 126610LN disponível.
    [Provides detailed specs, price R$ 58,900]
    Rolex não permite venda online. Posso agendar uma visita?

You: Sim, quero agendar

AI: Ótimo! Qual data prefere? (suggests this week)

You: Sexta-feira

AI: Sexta-feira temos:
    - Manhã (10h)
    - Tarde (14h)
    - Final da tarde (18h)
    Qual horário prefere?

You: Tarde

AI: Perfeito! Visita agendada para sexta 14h.
    Patricia aguarda você na loja!
```

**Expected in Dashboard**:
- ✅ New conversation appears in **Conversations** page
- ✅ Customer phone number recorded
- ✅ Interest: "Rolex Submariner Date 126610LN"
- ✅ Visit scheduled in **Visits** page
- ✅ Status: "Pending" (awaiting salesperson assignment)
- ✅ You can assign Patricia, Ricardo, or Juliana

---

### **Scenario 2: Jewelry for Wife → Profile Update**

**Continue same conversation**:
```
You: Também quero uma joia para minha esposa

AI: Que lindo! Temos opções de anéis de diamante e pulseiras.
    O que ela preferiria?

You: Um anel de diamante

AI: Temos um Anel Solitário com diamante 1.0ct, cor D (incolor),
    pureza VVS2, certificado GIA. R$ 48,000.
    [Explains 4Cs: Cut, Color, Clarity, Carat]

You: Perfeito!

AI: Maravilhoso! Posso adicionar na sua visita de sexta?
```

**Expected in Dashboard**:
- ✅ Customer profile updated: `marital_status: married`
- ✅ Interests: ["Rolex Submariner", "Anel Diamante 1.0ct"]
- ✅ Same visit, multiple interests

---

### **Scenario 3: Send Image → Interest Recognition**

**Send a photo** of any luxury watch (find on Google):
```
[You send image of Patek Philippe Nautilus]

AI: Linda foto! É um Patek Philippe Nautilus?

You: Sim!

AI: Temos um Nautilus 5711 usado, estado 95%!
    R$ 320,000 - raridade descontinuada.
    Quer detalhes?
```

**Expected**:
- ✅ AI recognizes watch from image (GPT-4 Vision)
- ✅ Adds "Patek Philippe Nautilus" to interests
- ✅ Interest history accumulates

---

### **Scenario 4: Sell Your Watch (Verification)**

**New conversation** (or continue):
```
You: Quero vender meu Rolex

AI: Perfeito! Vou ajudar na avaliação.
    Primeiro, preciso do seu CPF para registro.

You: 123.456.789-00

AI: Obrigado! Qual modelo do Rolex?

You: Submariner 2020

AI: Ótimo! Agora envie uma foto clara do relógio.

[You send photo]

AI: Recebi! Agora preciso do cartão de garantia.

[You send guarantee card photo]

AI: Perfeito! Por último, a nota fiscal (se tiver).

[You send invoice photo or say "não tenho"]

AI: Analisando documentos... [AI processes with GPT-4 Vision]

    ✅ Documentação completa!
    ICD Score: 85/100
    Risco Legal: Baixo

    Verificação concluída. Patricia entrará em contato!
```

**Expected in Dashboard**:
- ✅ Verification appears in **Verifications** page
- ✅ CPF masked (***.***.789-00)
- ✅ ICD Score badge (colored)
- ✅ Legal Risk: "Documentação Completa" (green)
- ✅ Watch details: Rolex Submariner 2020
- ✅ All document URLs stored

---

### **Scenario 5: Objection Handling**

```
You: Muito caro!

AI: Entendo! Rolex é um investimento, não despesa.
    Valoriza 8-12% ao ano no mercado secundário.
    Lista de espera de 2-5 anos em revendedores autorizados.

    Posso oferecer parcelamento em até 12x sem juros?
```

**AI pulls from Brand Knowledge table** (selling arguments)

---

### **Scenario 6: Product Not Available**

```
You: Quero o Nautilus 5711

AI: Infelizmente o Nautilus está esgotado.
    Mas posso sugerir:
    - Rolex GMT-Master II Pepsi (R$ 68,000)
    - Rolex Datejust 41 Azul (R$ 52,000)

    Qual te interessa mais?
```

---

### **Scenario 7: Diamond Education (4Cs)**

```
You: Não entendo de diamantes

AI: Sem problema! Diamantes são avaliados pelos 4Cs:

    ✅ CUT (Lapidação): Excellent = máximo brilho
    ✅ COLOR (Cor): D-E-F = incolor (mais valioso)
    ✅ CLARITY (Pureza): VVS = muito puro
    ✅ CARAT (Quilate): 1ct = 6.5mm diâmetro

    Nosso anel tem:
    - Cut: Excellent
    - Color: D (top)
    - Clarity: VVS2
    - Carat: 1.0ct
    - Certificado GIA (garantia de autenticidade)
```

---

## 📊 Dashboard Testing Checklist

### **Conversations Page**
Access: https://crmlx.vercel.app/dashboard/conversations

✅ Check:
- [ ] Your phone number appears
- [ ] Last message time is recent
- [ ] Interest summary shows: "Rolex Submariner, Anel Diamante"
- [ ] Products shown list is populated
- [ ] Visit scheduled: "Yes" with date
- [ ] Status: "Scheduled" (or "Active")

### **Visits Page**
Access: https://crmlx.vercel.app/dashboard/visits

✅ Check:
- [ ] Your name and phone
- [ ] Scheduled date/time
- [ ] Product interest: "Rolex Submariner, Anel Diamante"
- [ ] Assigned salesperson: **Dropdown to select**
  - Patricia Silva
  - Ricardo Mendes
  - Juliana Costa
- [ ] **Auto-Assign button** (click to balance load)
- [ ] Status: Pending → Confirmed

### **Verifications Page**
Access: https://crmlx.vercel.app/dashboard/verifications

✅ Check:
- [ ] Your name, CPF masked
- [ ] Watch: Rolex Submariner 2020
- [ ] ICD Score: 85 (green badge)
- [ ] Legal Risk: "Documentação Completa"
- [ ] Critical Issues: (empty or warnings)
- [ ] Date completed

### **Catalog Page**
Access: https://crmlx.vercel.app/dashboard/catalog

✅ Check:
- [ ] 6 products listed
- [ ] Rolex, Patek, Diamond, Cartier visible
- [ ] Prices displayed correctly
- [ ] Stock quantities
- [ ] Active/Inactive toggle
- [ ] **Generate Embeddings button** (for semantic search)

---

## 🧪 Advanced Test Scenarios

### **Test 8: Interest Accumulation**
**Simulate 3 different days**:
- Day 1: Ask about Submariner
- Day 2: Ask about Datejust
- Day 3: Send photo of GMT

**Expected**: Dashboard shows `interests: ["Submariner", "Datejust", "GMT"]`

### **Test 9: Multi-Turn Natural Conversation**
```
You: Olá
AI: Olá! Como posso ajudar?
You: Procuro um relógio
AI: Temos Rolex, Patek Philippe... qual marca prefere?
You: Rolex
AI: Temos Submariner (R$ 58k), Datejust (R$ 52k), GMT (R$ 68k). Qual te interessa?
You: Submariner
AI: [Details] Quer agendar visita?
```

### **Test 10: Payment & Delivery**
```
You: Aceita cartão?
AI: Sim! Até 12x sem juros. Entrega em 48h ou retirada na loja.
```

### **Test 11: Gift Wrapping**
```
You: É presente de aniversário
AI: Posso preparar embalagem premium sem custo. Quer cartão com mensagem?
```

### **Test 12: After-Sales**
```
You: Comprei um Rolex com vocês há 3 anos. Precisa revisão?
AI: Rolex recomenda revisão a cada 5 anos. Seu relógio está dentro do prazo.
    Quer agendar manutenção preventiva?
```

---

## 🔧 Troubleshooting

### **No Response from WhatsApp**

1. **Check Twilio Logs**:
   - Go to Twilio Console → Messaging → Logs
   - Look for Error 11200 or webhook failures

2. **Check Vercel Logs**:
   - Vercel Dashboard → Functions → /api/webhooks/twilio
   - Look for errors in function execution

3. **Verify Webhook URL**:
   - Twilio Console → WhatsApp Senders → Configure
   - Should be: `https://crmlx.vercel.app/api/webhooks/twilio`

4. **Check Phone Number Mapping**:
   - Airtable → Store Numbers table
   - +17623727247 should map to tenant `recduwNrt9qNPH07h`

### **AI Response is Generic**

- **Missing Brand Knowledge**: Create BrandKnowledge records with selling arguments
- **Missing Product**: Ensure Catalog has products with tenant_id
- **No Embeddings**: Run "Generate Embeddings" in dashboard/catalog

### **Visit Not Appearing in Dashboard**

- Check Appointments table in Airtable
- Verify `tenant_id` matches
- Check `scheduled_at` field format (ISO 8601)

---

## 📈 Success Metrics

After testing, you should see:

✅ **Conversations**: 1+ with your phone
✅ **Visits**: 1+ scheduled
✅ **Interests**: Multiple products tracked
✅ **Verifications**: 1+ if you tested sell flow
✅ **Messages**: All stored in Messages table

---

## 🚀 Next Steps After Testing

1. **Add More Products**: Via dashboard or CSV upload
2. **Create Brand Knowledge**: Add selling arguments for each brand/model
3. **Generate Embeddings**: Enable semantic search
4. **Test Campaigns**: Create targeted campaigns for specific customer segments
5. **Add More Salespeople**: Expand team
6. **Configure Store Hours**: Set availability slots

---

## 💡 Pro Tips

- **Natural Language**: AI understands "sexta" = Friday, "tarde" = afternoon
- **Context Aware**: AI remembers conversation history
- **Marital Status**: Mentioning "wife" automatically updates profile
- **Image Recognition**: Send any watch/jewelry photo
- **CPF Protection**: Always masked in dashboard (***.***.XXX-XX)
- **Semantic Search**: AI finds products even with typos or synonyms

---

**Ready to test! Send your first message:** 📱

**WhatsApp**: +1 762-372-7247
**Message**: "Olá, quero um Rolex"

**Dashboard**: https://crmlx.vercel.app/dashboard

---

*Generated by Claude Code - Watch Verify CRM Testing Guide*
