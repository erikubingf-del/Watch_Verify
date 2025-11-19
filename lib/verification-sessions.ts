import { atCreate, atUpdate, atSelect, buildFormula } from '@/utils/airtable'
import { logInfo, logError } from './logger'

/**
 * Verification session state machine
 * Stores multi-step workflow state in Airtable instead of memory
 */

export interface VerificationSession {
  id: string
  tenantId: string
  customerPhone: string
  customerName: string
  state:
    | 'awaiting_watch_photo'
    | 'awaiting_guarantee'
    | 'awaiting_invoice'
    | 'processing'
    | 'completed'
  watchPhotoUrl?: string
  guaranteeCardUrl?: string
  invoiceUrl?: string
  createdAt: string
  updatedAt: string
}

// Session expiration time (1 hour)
const SESSION_TTL_MS = 60 * 60 * 1000

/**
 * Create new verification session in Airtable
 */
export async function createVerificationSession(
  tenantId: string,
  customerPhone: string,
  customerName: string
): Promise<VerificationSession> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)

  const session: VerificationSession = {
    id: crypto.randomUUID(),
    tenantId,
    customerPhone,
    customerName,
    state: 'awaiting_watch_photo',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  try {
    // Delete any existing session for this phone first
    await clearVerificationSession(customerPhone)

    // Create new session in Airtable
    await atCreate('VerificationSessions', {
      session_id: session.id,
      tenant_id: tenantId,
      customer_phone: customerPhone,
      customer_name: customerName,
      state: session.state,
      watch_photo_url: null,
      guarantee_card_url: null,
      invoice_url: null,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      expires_at: expiresAt.toISOString(),
    })

    logInfo('verification-session', `Created session for ${customerPhone}`)
    return session
  } catch (error: any) {
    logError('verification-session', error, { action: 'create', phone: customerPhone })
    throw error
  }
}

/**
 * Get existing session from Airtable
 */
export async function getVerificationSession(customerPhone: string): Promise<VerificationSession | null> {
  try {
    const records = await atSelect('VerificationSessions', {
      filterByFormula: buildFormula('customer_phone', '=', customerPhone),
      maxRecords: '1',
    })

    if (records.length === 0) {
      return null
    }

    const record = records[0]
    const fields = record.fields as any

    // Check if session is expired
    const expiresAt = new Date(fields.expires_at)
    if (expiresAt < new Date()) {
      logInfo('verification-session', `Session expired for ${customerPhone}`)
      await clearVerificationSession(customerPhone)
      return null
    }

    // Check if session is already completed
    if (fields.state === 'completed') {
      return null
    }

    // Map Airtable fields to VerificationSession
    const session: VerificationSession = {
      id: fields.session_id,
      tenantId: fields.tenant_id,
      customerPhone: fields.customer_phone,
      customerName: fields.customer_name,
      state: fields.state,
      watchPhotoUrl: fields.watch_photo_url || undefined,
      guaranteeCardUrl: fields.guarantee_card_url || undefined,
      invoiceUrl: fields.invoice_url || undefined,
      createdAt: fields.created_at,
      updatedAt: fields.updated_at,
    }

    return session
  } catch (error: any) {
    logError('verification-session', error, { action: 'get', phone: customerPhone })
    return null
  }
}

/**
 * Update session with new document
 */
export async function updateVerificationSession(
  customerPhone: string,
  documentType: 'watch' | 'guarantee' | 'invoice',
  documentUrl: string
): Promise<VerificationSession | null> {
  try {
    // Get current session
    const session = await getVerificationSession(customerPhone)
    if (!session) return null

    // Find the Airtable record
    const records = await atSelect('VerificationSessions', {
      filterByFormula: buildFormula('customer_phone', '=', customerPhone),
      maxRecords: '1',
    })

    if (records.length === 0) return null

    const recordId = records[0].id

    // Determine new state and field to update
    let newState = session.state
    const fieldsToUpdate: any = {
      updated_at: new Date().toISOString(),
    }

    if (documentType === 'watch') {
      fieldsToUpdate.watch_photo_url = documentUrl
      newState = 'awaiting_guarantee'
      session.watchPhotoUrl = documentUrl
    } else if (documentType === 'guarantee') {
      fieldsToUpdate.guarantee_card_url = documentUrl
      newState = 'awaiting_invoice'
      session.guaranteeCardUrl = documentUrl
    } else if (documentType === 'invoice') {
      fieldsToUpdate.invoice_url = documentUrl
      newState = 'processing'
      session.invoiceUrl = documentUrl
    }

    fieldsToUpdate.state = newState
    session.state = newState
    session.updatedAt = fieldsToUpdate.updated_at

    // Update in Airtable
    await atUpdate('VerificationSessions', recordId, fieldsToUpdate)

    logInfo('verification-session', `Updated session for ${customerPhone}`, {
      state: newState,
    })

    return session
  } catch (error: any) {
    logError('verification-session', error, { action: 'update', phone: customerPhone })
    return null
  }
}

/**
 * Check if session is complete and ready for verification
 */
export function isSessionComplete(session: VerificationSession): boolean {
  return !!(session.watchPhotoUrl && session.guaranteeCardUrl && session.invoiceUrl)
}

/**
 * Clear session after completion
 */
export async function clearVerificationSession(customerPhone: string): Promise<void> {
  try {
    const records = await atSelect('VerificationSessions', {
      filterByFormula: buildFormula('customer_phone', '=', customerPhone),
    })

    if (records.length === 0) return

    // Mark all sessions as completed
    for (const record of records) {
      await atUpdate('VerificationSessions', record.id, {
        state: 'completed',
        updated_at: new Date().toISOString(),
      })
    }

    logInfo('verification-session', `Cleared session for ${customerPhone}`)
  } catch (error: any) {
    logError('verification-session', error, { action: 'clear', phone: customerPhone })
  }
}

/**
 * Get next prompt for user based on session state
 */
export function getNextPrompt(session: VerificationSession): string {
  switch (session.state) {
    case 'awaiting_watch_photo':
      return '📸 Por favor, envie uma foto clara do seu relógio (mostrando o dial e a caixa).'
    case 'awaiting_guarantee':
      return '📄 Ótimo! Agora envie uma foto do certificado de garantia ou warranty card.'
    case 'awaiting_invoice':
      return '🧾 Perfeito! Por último, envie a nota fiscal ou recibo de compra.'
    case 'processing':
      return '⏳ Estou analisando todos os documentos. Isso levará alguns instantes...'
    case 'completed':
      return '✅ Verificação concluída!'
    default:
      return 'Por favor, envie a documentação solicitada.'
  }
}
