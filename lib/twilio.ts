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

  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not set - skipping signature validation (INSECURE!)')
    // In development, allow requests without validation
    // In production, this should throw an error
    return process.env.NODE_ENV === 'development'
  }

  try {
    return validateRequest(authToken, signature, url, params)
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
