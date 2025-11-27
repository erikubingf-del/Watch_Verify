/**
 * Enhanced Watch Verification System
 *
 * Premium feature for stores that buy watches from customers.
 * Includes CPF collection, document cross-referencing, and comprehensive reports.
 */

import { logInfo, logError } from './logger'
import crypto from 'crypto'
import { SessionManager } from './session-manager'

// Encryption key for CPF (should be in environment variable)
const ENCRYPTION_KEY = process.env.CPF_ENCRYPTION_KEY || 'default-key-change-in-production'

export interface EnhancedVerificationSession {
  id: string
  tenantId: string
  customerPhone: string
  customerName?: string
  cpf?: string // Encrypted
  customerStatedModel?: string
  state:
  | 'awaiting_cpf'
  | 'awaiting_watch_info'
  | 'awaiting_watch_photo'
  | 'awaiting_guarantee'
  | 'awaiting_invoice'
  | 'awaiting_date_explanation'
  | 'awaiting_optional_docs'
  | 'processing'
  | 'completed'
  watchPhotoUrl?: string
  guaranteeCardUrl?: string
  invoiceUrl?: string
  additionalDocuments?: string[]
  referenceFromPhoto?: string
  referenceFromGuarantee?: string
  referenceFromInvoice?: string
  serialFromPhoto?: string
  serialFromGuarantee?: string
  guaranteeDate?: string
  invoiceDate?: string
  invoiceNumber?: string
  invoiceValidated?: boolean | null
  dateMismatchReason?: string
  createdAt: string
  updatedAt: string
}

const sessionManager = new SessionManager<EnhancedVerificationSession>('verification_session')

/**
 * Encrypt CPF for storage
 */
export function encryptCPF(cpf: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(cpf, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

/**
 * Decrypt CPF for display (masked)
 */
export function decryptCPF(encryptedCPF: string): string {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
    let decrypted = decipher.update(encryptedCPF, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    logError('cpf-decryption', error as Error)
    return ''
  }
}

/**
 * Mask CPF for display (***.***.123-45)
 */
export function maskCPF(cpf: string): string {
  // Remove non-numeric
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return '***.***.***-**'

  // Show only last 5 digits
  return `***.***.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
}

/**
 * Validate CPF format
 */
export function isValidCPF(cpf: string): boolean {
  // Remove non-numeric
  const cleaned = cpf.replace(/\D/g, '')

  // Must have 11 digits
  if (cleaned.length !== 11) return false

  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cleaned)) return false

  // Validate check digits
  let sum = 0
  let remainder

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false

  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false

  return true
}

/**
 * Get active verification session for customer
 */
export async function getEnhancedVerificationSession(
  customerPhone: string
): Promise<EnhancedVerificationSession | null> {
  return await sessionManager.get(customerPhone)
}

/**
 * Create new verification session
 */
export async function createEnhancedVerificationSession(
  tenantId: string,
  customerPhone: string,
  customerName: string
): Promise<EnhancedVerificationSession> {
  const session: EnhancedVerificationSession = {
    id: crypto.randomUUID(),
    tenantId,
    customerPhone,
    customerName,
    state: 'awaiting_cpf',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await sessionManager.create(customerPhone, session)

  logInfo('verification-session-created', 'New verification session', {
    phone: customerPhone,
    state: session.state,
  })

  return session
}

/**
 * Update verification session with new data
 */
export async function updateEnhancedVerificationSession(
  customerPhone: string,
  updates: Partial<EnhancedVerificationSession>
): Promise<EnhancedVerificationSession | null> {
  const session = await sessionManager.get(customerPhone)
  if (!session) return null

  const updatedSession = { ...session, ...updates, updatedAt: new Date().toISOString() }
  await sessionManager.create(customerPhone, updatedSession)

  logInfo('verification-session-updated', 'Session updated', {
    phone: customerPhone,
    updates: Object.keys(updates),
  })

  return updatedSession
}

/**
 * Get next prompt based on session state
 */
export function getVerificationPrompt(session: EnhancedVerificationSession): string {
  switch (session.state) {
    case 'awaiting_cpf':
      return `Ótimo! Vou iniciar o processo de verificação do seu relógio. 📋

*O que vou precisar:*
✅ Seu CPF (para o relatório)
📸 Foto clara do relógio (mostrador e caixa)
📄 Certificado de garantia (guarantee card)
🧾 Nota Fiscal original

*Documentos opcionais* (fortalecem a análise):
• Fatura do cartão de crédito
• Box original
• Certificados adicionais

Se alguma informação estiver faltando, não tem problema - podemos prosseguir com o que você tem disponível e documentar no relatório.

*Vamos começar?*

Para iniciar, me envie seu CPF.`

    case 'awaiting_watch_info':
      return 'Obrigado! Agora, qual relógio você gostaria de vender? (marca e modelo)'

    case 'awaiting_watch_photo':
      return 'Ótimo! Vou precisar de alguns documentos. Primeiro, envie uma foto clara do relógio mostrando o mostrador e, se possível, a parte de trás da caixa.'

    case 'awaiting_guarantee':
      return 'Perfeito! Agora envie uma foto do certificado de garantia (guarantee card).'

    case 'awaiting_invoice':
      return 'Ótimo! Por último, envie a Nota Fiscal de compra original.'

    case 'awaiting_optional_docs':
      return `Recebi todos os documentos principais! Para fortalecer a verificação, você pode enviar documentos adicionais (opcional):
- Fatura do cartão de crédito
- Comprovante de viagem (se comprou no exterior)
- Box original do relógio
- Outros certificados

Prefere enviar agora ou que eu envie o relatório atual para a boutique?`

    case 'processing':
      return 'Estou analisando os documentos... ⏳'

    case 'completed':
      return '✅ Verificação concluída! O relatório foi enviado para a boutique.'

    default:
      return 'Como posso ajudar?'
  }
}

/**
 * Check if session is complete (has all required documents)
 */
export function isVerificationComplete(session: EnhancedVerificationSession): boolean {
  return !!(
    session.cpf &&
    session.customerStatedModel &&
    session.watchPhotoUrl &&
    session.guaranteeCardUrl &&
    session.invoiceUrl
  )
}

/**
 * Clear/complete verification session
 */
export async function completeVerificationSession(
  customerPhone: string
): Promise<void> {
  const session = await sessionManager.get(customerPhone)
  if (!session) return

  await sessionManager.update(customerPhone, {
    state: 'completed',
  })

  logInfo('verification-session-completed', 'Session completed', {
    phone: customerPhone,
  })
}
