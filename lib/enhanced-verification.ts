/**
 * Enhanced Watch Verification System
 *
 * Premium feature for stores that buy watches from customers.
 * Includes CPF collection, document cross-referencing, and comprehensive reports.
 */

import { atSelect, atCreate, atUpdate } from '@/utils/airtable'
import { logInfo, logError } from './logger'
import crypto from 'crypto'

// Encryption key for CPF (should be in environment variable)
const ENCRYPTION_KEY = process.env.CPF_ENCRYPTION_KEY || 'default-key-change-in-production'

export interface EnhancedVerificationSession {
  id: string
  tenant_id: string
  customer_phone: string
  customer_name?: string
  cpf?: string // Encrypted
  customer_stated_model?: string
  state:
    | 'awaiting_cpf'
    | 'awaiting_watch_info'
    | 'awaiting_watch_photo'
    | 'awaiting_guarantee'
    | 'awaiting_invoice'
    | 'awaiting_optional_docs'
    | 'processing'
    | 'completed'
  watch_photo_url?: string
  guarantee_card_url?: string
  invoice_url?: string
  additional_documents?: string[]
  reference_from_photo?: string
  reference_from_guarantee?: string
  reference_from_invoice?: string
  serial_from_photo?: string
  serial_from_guarantee?: string
  guarantee_date?: string
  invoice_date?: string
  invoice_number?: string
  invoice_validated?: boolean | null
  date_mismatch_reason?: string
  created_at: string
  updated_at: string
}

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
  return `***.***.${ cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
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
  try {
    const records = await atSelect('VerificationSessions', {
      filterByFormula: `AND({customer_phone}='${customerPhone}', {state}!='completed')`,
      maxRecords: '1',
    })

    if (records.length === 0) return null

    const record = records[0]
    const fields = record.fields as any

    return {
      id: record.id,
      tenant_id: fields.tenant_id,
      customer_phone: fields.customer_phone,
      customer_name: fields.customer_name,
      cpf: fields.cpf,
      customer_stated_model: fields.customer_stated_model,
      state: fields.state,
      watch_photo_url: fields.watch_photo_url,
      guarantee_card_url: fields.guarantee_card_url,
      invoice_url: fields.invoice_url,
      additional_documents: fields.additional_documents,
      reference_from_photo: fields.reference_from_photo,
      reference_from_guarantee: fields.reference_from_guarantee,
      reference_from_invoice: fields.reference_from_invoice,
      serial_from_photo: fields.serial_from_photo,
      serial_from_guarantee: fields.serial_from_guarantee,
      guarantee_date: fields.guarantee_date,
      invoice_date: fields.invoice_date,
      invoice_number: fields.invoice_number,
      invoice_validated: fields.invoice_validated,
      date_mismatch_reason: fields.date_mismatch_reason,
      created_at: fields.created_at,
      updated_at: fields.updated_at,
    }
  } catch (error: any) {
    logError('get-verification-session', error)
    return null
  }
}

/**
 * Create new verification session
 */
export async function createEnhancedVerificationSession(
  tenantId: string,
  customerPhone: string,
  customerName: string
): Promise<EnhancedVerificationSession> {
  const session = {
    tenant_id: tenantId,
    customer_phone: customerPhone,
    customer_name: customerName,
    state: 'awaiting_cpf' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const record = await atCreate('VerificationSessions', session)

  logInfo('verification-session-created', 'New verification session', {
    phone: customerPhone,
    state: session.state,
  })

  return {
    id: record.id,
    ...session,
  }
}

/**
 * Update verification session with new data
 */
export async function updateEnhancedVerificationSession(
  customerPhone: string,
  updates: Partial<EnhancedVerificationSession>
): Promise<EnhancedVerificationSession | null> {
  try {
    const session = await getEnhancedVerificationSession(customerPhone)
    if (!session) return null

    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    await atUpdate('VerificationSessions', session.id, updatedFields)

    logInfo('verification-session-updated', 'Session updated', {
      phone: customerPhone,
      updates: Object.keys(updates),
    })

    return {
      ...session,
      ...updatedFields,
    }
  } catch (error: any) {
    logError('update-verification-session', error)
    return null
  }
}

/**
 * Get next prompt based on session state
 */
export function getVerificationPrompt(session: EnhancedVerificationSession): string {
  switch (session.state) {
    case 'awaiting_cpf':
      return 'Perfeito! Para iniciar a verificação, preciso do seu CPF.'

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
    session.customer_stated_model &&
    session.watch_photo_url &&
    session.guarantee_card_url &&
    session.invoice_url
  )
}

/**
 * Clear/complete verification session
 */
export async function completeVerificationSession(
  customerPhone: string
): Promise<void> {
  const session = await getEnhancedVerificationSession(customerPhone)
  if (!session) return

  await atUpdate('VerificationSessions', session.id, {
    state: 'completed',
    updated_at: new Date().toISOString(),
  })

  logInfo('verification-session-completed', 'Session completed', {
    phone: customerPhone,
  })
}
