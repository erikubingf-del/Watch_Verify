import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint to test webhook connectivity and environment variables
 */
export async function GET(req: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    envVars: {
      hasAirtableApiKey: !!process.env.AIRTABLE_API_KEY,
      hasAirtableBaseId: !!process.env.AIRTABLE_BASE_ID,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
      airtableBaseId: process.env.AIRTABLE_BASE_ID?.substring(0, 8) + '...',
    },
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  }

  return NextResponse.json(diagnostics, { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const params: Record<string, string> = {}
    body.forEach((value, key) => {
      params[key] = String(value)
    })

    const testResult = {
      success: true,
      receivedAt: new Date().toISOString(),
      from: params.From,
      body: params.Body,
      to: params.To,
      numMedia: params.NumMedia,
      envCheck: {
        hasAirtable: !!process.env.AIRTABLE_API_KEY,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
      },
    }

    console.log('[TEST WEBHOOK]', testResult)

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Test received successfully!</Message></Response>',
      { headers: { 'content-type': 'application/xml' } }
    )
  } catch (error: any) {
    console.error('[TEST WEBHOOK ERROR]', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
