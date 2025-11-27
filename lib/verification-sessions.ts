/**
 * Verification Session Management (Redis)
 *
 * Stores multi-step workflow state in Redis instead of Airtable.
 */

import { SessionManager, BaseSession } from './session-manager'
import { logInfo, logError } from './logger'

export interface VerificationSession extends BaseSession {
  state:
  | 'awaiting_watch_photo'
  | 'awaiting_guarantee'
  | 'awaiting_invoice'
  | 'processing'
  | 'completed'
  customerPhone: string
  customerName: string
  watchPhotoUrl?: string
  guaranteeCardUrl?: string
  invoiceUrl?: string
}

const sessionManager = new SessionManager<VerificationSession>('verification', 60 * 60) // 1 hour TTL

/**
 * Create new verification session
 */
export async function createVerificationSession(
  tenantId: string,
  customerPhone: string,
  customerName: string
): Promise<VerificationSession> {
  const now = new Date().toISOString()

  const session: VerificationSession = {
    id: crypto.randomUUID(),
    tenantId,
    customerPhone,
    customerName,
    state: 'awaiting_watch_photo',
    createdAt: now,
    updatedAt: now,
  }

  await sessionManager.create(customerPhone, session)
  logInfo('verification-session', `Created session for ${customerPhone} (Redis)`)
  return session
}

/**
 * Get existing session
 */
export async function getVerificationSession(customerPhone: string): Promise<VerificationSession | null> {
  return await sessionManager.get(customerPhone)
}

/**
 * Update session with new document
 */
export async function updateVerificationSession(
  customerPhone: string,
  documentType: 'watch' | 'guarantee' | 'invoice',
  documentUrl: string
): Promise<VerificationSession | null> {
  const session = await getVerificationSession(customerPhone)
  if (!session) return null

  let newState = session.state
  const updates: Partial<VerificationSession> = {}

  if (documentType === 'watch') {
    updates.watchPhotoUrl = documentUrl
    newState = 'awaiting_guarantee'
  } else if (documentType === 'guarantee') {
    updates.guaranteeCardUrl = documentUrl
    newState = 'awaiting_invoice'
  } else if (documentType === 'invoice') {
    updates.invoiceUrl = documentUrl
    newState = 'processing'
  }

  updates.state = newState

  const updatedSession = await sessionManager.update(customerPhone, updates)
  logInfo('verification-session', `Updated session for ${customerPhone} (Redis)`, { state: newState })

  return updatedSession
}

/**
 * Check if session is complete
 */
export function isSessionComplete(session: VerificationSession): boolean {
  return !!(session.watchPhotoUrl && session.guaranteeCardUrl && session.invoiceUrl)
}

/**
 * Clear session
 */
export async function clearVerificationSession(customerPhone: string): Promise<void> {
  await sessionManager.clear(customerPhone)
  logInfo('verification-session', `Cleared session for ${customerPhone} (Redis)`)
}

/**
 * Get next prompt
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
