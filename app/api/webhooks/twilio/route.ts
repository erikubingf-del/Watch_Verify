import { NextRequest, NextResponse } from 'next/server'
import { atCreate } from '@/utils/airtable'
import { chat } from '@/utils/openai'
import { validateTwilioRequest } from '@/lib/twilio'
import { logError } from '@/lib/logger'

// Twilio sends x-www-form-urlencoded; parse using formData() in Next.js
export async function POST(req: NextRequest) {
  try {
    // Step 1: Verify Twilio signature for security
    const signature = req.headers.get('x-twilio-signature') || ''
    const url = req.url
    const form = await req.formData()

    // Convert FormData to plain object for validation
    const params: Record<string, string> = {}
    form.forEach((value, key) => {
      params[key] = String(value)
    })

    const isValid = validateTwilioRequest(signature, url, params)

    if (!isValid) {
      logError('twilio-webhook', new Error('Invalid Twilio signature'), { url })
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { status: 403, headers: { 'content-type': 'application/xml' } }
      )
    }

    // Step 2: Extract message data
    const from = String(form.get('From')||'')
    const body = String(form.get('Body')||'')
    const to = String(form.get('To')||'')
    const wa = from.replace('whatsapp:', '')
    const toNumber = to.replace('whatsapp:', '')

    // Step 3: Get tenant_id from Twilio number mapping
    // This will be implemented when we have StoreNumbers data
    const tenantId = 'temp-tenant-id' // TODO: Look up from StoreNumbers table

    // Step 4: Log message
    await atCreate('Messages', {
      tenant_id: tenantId,
      phone: wa,
      body,
      direction: 'inbound',
      created_at: new Date().toISOString()
    } as any)

    // Step 5: Generate AI reply
    const content = await chat([
      { role:'system', content: 'Você é um concierge humano, educado e objetivo. Se o cliente pedir verificação de relógio, explique os passos e peça confirmação antes de iniciar.' },
      { role:'user', content: body }
    ], 0.65)

    // Step 6: Log outbound message
    await atCreate('Messages', {
      tenant_id: tenantId,
      phone: wa,
      body: content,
      direction: 'outbound',
      created_at: new Date().toISOString()
    } as any)

    // Step 7: Return TwiML (Twilio will deliver the message)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&apos;').replace(/"/g,'&quot;')}</Message></Response>`
    return new NextResponse(twiml, { headers: { 'content-type':'application/xml' } })
  } catch (e:any) {
    logError('twilio-webhook', e, { formData: Object.fromEntries(await req.clone().formData()) })
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Desculpe, houve um erro. Tente novamente mais tarde.</Message></Response>`,
      { status: 500, headers: { 'content-type':'application/xml' } }
    )
  }
}
