import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified Twilio webhook for debugging
 * Minimal dependencies, maximum logging
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[WEBHOOK START]', new Date().toISOString())

    // Parse form data
    const form = await req.formData()
    const params: Record<string, string> = {}
    form.forEach((value, key) => {
      params[key] = String(value)
    })

    const from = params.From || ''
    const body = params.Body || ''
    const to = params.To || ''

    console.log('[WEBHOOK DATA]', { from, to, body: body.substring(0, 50) })

    // Check environment variables
    const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN

    console.log('[ENV CHECK]', { hasAirtable, hasOpenAI, hasTwilio })

    if (!hasAirtable) {
      console.error('[ERROR] Missing Airtable credentials')
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Configuration error - please contact support</Message></Response>',
        { status: 200, headers: { 'content-type': 'application/xml' } }
      )
    }

    // Lookup tenant from Store Numbers table
    const toNumber = to.replace('whatsapp:', '').replace('sms:', '')
    console.log('[TENANT LOOKUP]', { toNumber })

    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Store%20Numbers?filterByFormula=` +
      encodeURIComponent(`{Phone Number}='${toNumber}'`) +
      `&maxRecords=1`

    console.log('[AIRTABLE QUERY]', airtableUrl.substring(0, 100) + '...')

    const storeRes = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
      }
    })

    if (!storeRes.ok) {
      const errorText = await storeRes.text()
      console.error('[AIRTABLE ERROR]', storeRes.status, errorText)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Database error</Message></Response>',
        { status: 200, headers: { 'content-type': 'application/xml' } }
      )
    }

    const storeData = await storeRes.json()
    console.log('[STORE DATA]', JSON.stringify(storeData).substring(0, 200))

    if (!storeData.records || storeData.records.length === 0) {
      console.error('[ERROR] No tenant found for number:', toNumber)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Number not configured</Message></Response>',
        { status: 200, headers: { 'content-type': 'application/xml' } }
      )
    }

    const tenantIds = storeData.records[0].fields.Tenant
    const tenantId = Array.isArray(tenantIds) ? tenantIds[0] : tenantIds

    console.log('[TENANT FOUND]', tenantId)

    // Log message to Airtable
    const customerPhone = from.replace('whatsapp:', '').replace('sms:', '')

    const createRes = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: {
            tenant_id: [tenantId],
            phone: customerPhone,
            body: body,
            direction: 'inbound',
            created_at: new Date().toISOString()
          }
        }]
      })
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('[MESSAGE LOG ERROR]', createRes.status, errorText)
    } else {
      console.log('[MESSAGE LOGGED]')
    }

    // Simple AI response using OpenAI
    let responseMessage = 'Olá! Recebi sua mensagem. Como posso ajudar?'

    if (hasOpenAI) {
      try {
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'Você é um assistente de uma loja de relógios de luxo. Seja educado, objetivo e profissional.'
              },
              {
                role: 'user',
                content: body
              }
            ],
            max_tokens: 150,
            temperature: 0.7
          })
        })

        if (openaiRes.ok) {
          const aiData = await openaiRes.json()
          responseMessage = aiData.choices[0].message.content
          console.log('[AI RESPONSE]', responseMessage.substring(0, 50))
        } else {
          console.error('[OPENAI ERROR]', openaiRes.status)
        }
      } catch (aiError: any) {
        console.error('[AI ERROR]', aiError.message)
      }
    }

    // Send response via Twilio Messaging API
    if (hasTwilio) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
        const twilioAuth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')

        const twilioBody = new URLSearchParams({
          From: to,
          To: from,
          Body: responseMessage
        })

        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: twilioBody.toString()
        })

        if (twilioRes.ok) {
          console.log('[MESSAGE SENT]')

          // Log outbound message
          await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              records: [{
                fields: {
                  tenant_id: [tenantId],
                  phone: customerPhone,
                  body: responseMessage,
                  direction: 'outbound',
                  created_at: new Date().toISOString()
                }
              }]
            })
          })
        } else {
          const errorText = await twilioRes.text()
          console.error('[TWILIO SEND ERROR]', twilioRes.status, errorText)
        }
      } catch (twilioError: any) {
        console.error('[TWILIO ERROR]', twilioError.message)
      }
    }

    // Return empty TwiML (message already sent via API)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'content-type': 'application/xml' } }
    )

  } catch (error: any) {
    console.error('[WEBHOOK ERROR]', error.message, error.stack)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing message</Message></Response>',
      { status: 500, headers: { 'content-type': 'application/xml' } }
    )
  }
}
