import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Ultra-minimal debug webhook - no dependencies
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const logs: string[] = []

  try {
    logs.push(`[${Date.now() - startTime}ms] Webhook started`)

    // Parse form data
    const form = await req.formData()
    const params: Record<string, string> = {}
    form.forEach((value, key) => {
      params[key] = String(value)
    })

    logs.push(`[${Date.now() - startTime}ms] Form parsed: ${Object.keys(params).length} fields`)

    const from = params.From || ''
    const to = params.To || ''
    const body = params.Body || ''

    logs.push(`[${Date.now() - startTime}ms] From: ${from}, To: ${to}, Body: ${body.substring(0, 20)}`)

    // Check env vars
    const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID

    logs.push(`[${Date.now() - startTime}ms] Env: Airtable=${hasAirtable}, OpenAI=${hasOpenAI}, Twilio=${hasTwilio}`)

    if (!hasAirtable) {
      logs.push(`[${Date.now() - startTime}ms] ERROR: Missing Airtable env vars`)
      console.error('[DEBUG WEBHOOK]', logs.join('\n'))
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Config error: Missing Airtable credentials</Message></Response>`,
        { status: 200, headers: { 'content-type': 'application/xml' } }
      )
    }

    // Try Airtable lookup
    const toNumber = to.replace('whatsapp:', '').replace('sms:', '')
    logs.push(`[${Date.now() - startTime}ms] Looking up tenant for: ${toNumber}`)

    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Store%20Numbers?filterByFormula={Phone%20Number}='${encodeURIComponent(toNumber)}'&maxRecords=1`

    logs.push(`[${Date.now() - startTime}ms] Airtable URL: ${airtableUrl.substring(0, 80)}...`)

    const fetchStart = Date.now()
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
      }
    })

    const fetchTime = Date.now() - fetchStart
    logs.push(`[${Date.now() - startTime}ms] Airtable fetch took ${fetchTime}ms, status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      logs.push(`[${Date.now() - startTime}ms] Airtable ERROR: ${errorText.substring(0, 100)}`)
      console.error('[DEBUG WEBHOOK]', logs.join('\n'))
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Database error: ${response.status}</Message></Response>`,
        { status: 200, headers: { 'content-type': 'application/xml' } }
      )
    }

    const data = await response.json()
    logs.push(`[${Date.now() - startTime}ms] Airtable response: ${JSON.stringify(data).substring(0, 100)}`)

    if (!data.records || data.records.length === 0) {
      logs.push(`[${Date.now() - startTime}ms] No tenant found for ${toNumber}`)
      console.error('[DEBUG WEBHOOK]', logs.join('\n'))
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Number ${toNumber} not configured</Message></Response>`,
        { status: 200, headers: { 'content-type': 'application/xml' } }
      )
    }

    const tenantIds = data.records[0].fields.Tenant
    const tenantId = Array.isArray(tenantIds) ? tenantIds[0] : tenantIds

    logs.push(`[${Date.now() - startTime}ms] Tenant found: ${tenantId}`)

    // Success - return simple response
    logs.push(`[${Date.now() - startTime}ms] SUCCESS - Total time: ${Date.now() - startTime}ms`)
    console.log('[DEBUG WEBHOOK SUCCESS]', logs.join('\n'))

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Debug OK! Tenant: ${tenantId}, Body: ${body}</Message></Response>`,
      { status: 200, headers: { 'content-type': 'application/xml' } }
    )

  } catch (error: any) {
    logs.push(`[${Date.now() - startTime}ms] EXCEPTION: ${error.message}`)
    logs.push(`[${Date.now() - startTime}ms] Stack: ${error.stack?.substring(0, 200)}`)
    console.error('[DEBUG WEBHOOK ERROR]', logs.join('\n'))

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error: ${error.message}</Message></Response>`,
      { status: 500, headers: { 'content-type': 'application/xml' } }
    )
  }
}
