import { validateRequest } from 'twilio'

/**
 * Validates that a webhook request actually came from Twilio
 * Prevents spoofed requests and replay attacks
 *
 * @param signature - X-Twilio-Signature header value
 * @param url - Full webhook URL
 * @param params - POST parameters as key-value object
 * @returns true if signature is valid, false otherwise
 */
export function validateTwilioRequest(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN

  // Allow bypassing signature validation for debugging (INSECURE - use only temporarily!)
  if (process.env.TWILIO_SKIP_SIGNATURE_VALIDATION === 'true') {
    console.warn('⚠️  TWILIO_SKIP_SIGNATURE_VALIDATION is enabled - bypassing signature check (INSECURE!)')
    return true
  }

  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not set - skipping signature validation (INSECURE!)')
    // In development, allow requests without validation
    // In production, this should throw an error
    return process.env.NODE_ENV === 'development'
  }

  try {
    console.log('Validating Twilio signature:', {
      url,
      hasSignature: !!signature,
      signatureLength: signature.length,
    })
    const isValid = validateRequest(authToken, signature, url, params)
    console.log('Twilio signature validation result:', isValid)
    return isValid
  } catch (error) {
    console.error('Twilio signature validation error:', error)
    return false
  }
}

/**
 * Format phone number for WhatsApp
 * Ensures consistent format across the application
 */
export function formatWhatsAppNumber(phone: string): string {
  // Remove whatsapp: prefix if present
  let cleaned = phone.replace('whatsapp:', '').trim()

  // Remove all non-numeric characters except +
  cleaned = cleaned.replace(/[^\d+]/g, '')

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume Brazilian number if no country code
    if (cleaned.length === 11) {
      cleaned = '+55' + cleaned
    } else {
      cleaned = '+' + cleaned
    }
  }

  return cleaned
}

/**
 * Create TwiML response
 * Properly escapes XML entities
 */
export function createTwiMLResponse(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
}

/**
 * Send WhatsApp message programmatically (for notifications, confirmations, etc.)
 * Uses Twilio's Messaging API
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  from?: string
): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const defaultFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'

    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured')
      return false
    }

    // Format numbers
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${formatWhatsAppNumber(to)}`
    const fromFormatted = from || defaultFrom

    // Send via Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({
          To: toFormatted,
          From: fromFormatted,
          Body: message,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Twilio API error:', errorData)
      return false
    }

    const data = await response.json()
    console.log('WhatsApp message sent:', { sid: data.sid, to: toFormatted })

    return true
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error.message)
    return false
  }
}
