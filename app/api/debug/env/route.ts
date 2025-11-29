import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint to check environment variables
 * REMOVE THIS IN PRODUCTION!
 */
export async function GET() {
  return NextResponse.json({
    hasTwilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    twilioAuthTokenLength: process.env.TWILIO_AUTH_TOKEN?.length || 0,
    hasTwilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    twilioNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
  })
}
