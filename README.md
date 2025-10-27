# Watch Verify — Next.js Starter (API + Dashboard)

White-label concierge + verificação documental de relógios / joias.
Inclui: APIs (Twilio webhook, AI responder, Index, Export, Alert, Delete), Dashboard (Watch Verify, Customers, Reports, Settings) e utilitários (Airtable, ICD, CSV).

## Stack
- Next.js 14 (App Router, TypeScript)
- Airtable (CRM / catálogo / verificação)
- OpenAI (chat + embeddings)
- Make.com (cron e alertas)

## Instalação
```bash
# 1) copie .env.example para .env.local e preencha
cp .env.example .env.local

# 2) instale e rode
npm i
npm run dev
```

## Pastas
```
app/
  api/
    webhooks/twilio/route.ts
    ai-responder/route.ts
    update/route.ts
    index/route.ts
    export/route.ts
    alert/route.ts
    delete/customer/route.ts
  dashboard/
    layout.tsx
    watch-verify/page.tsx
    customers/page.tsx
    reports/page.tsx
    settings/page.tsx
utils/
  airtable.ts
  openai.ts
  icdCalculator.ts
  csvExporter.ts
  alertHandler.ts
```

## Deploy
- GitHub → Vercel (import project)
- Configure as variáveis no painel da Vercel (copiar do seu `.env.local`)
- Make.com: crie cenários para chamadas POST nos webhooks com relatórios diários (07:00 e 16:00).
