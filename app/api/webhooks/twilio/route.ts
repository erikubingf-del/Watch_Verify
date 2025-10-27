import { NextRequest, NextResponse } from 'next/server'
import { atCreate } from '@/utils/airtable'
import { chat } from '@/utils/openai'

// Twilio sends x-www-form-urlencoded; parse using formData() in Next.js
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const from = String(form.get('From')||'')
    const body = String(form.get('Body')||'')
    const wa = from.replace('whatsapp:', '')

    // Log message
    await atCreate('Messages', { phone: wa, body, created_at: new Date().toISOString() } as any)

    // Generate human reply (does not send back to Twilio; Make.com can relay this content)
    const content = await chat([
      { role:'system', content: 'Você é um concierge humano, educado e objetivo. Se o cliente pedir verificação de relógio, explique os passos e peça confirmação antes de iniciar.' },
      { role:'user', content: body }
    ], 0.65)

    // Return TwiML (so Twilio can deliver directly)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Message></Response>`
    return new NextResponse(twiml, { headers: { 'content-type':'application/xml' } })
  } catch (e:any) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Desculpe, houve um erro.</Message></Response>`, { headers: { 'content-type':'application/xml' } })
  }
}
