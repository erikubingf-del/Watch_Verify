import { calcICD, ICDInput } from '@/utils/icdCalculator'
import { analyzeWatchPhoto, analyzeGuaranteeCard, analyzeInvoice, compareDocuments } from './vision'
import { lookupWatch, verifyDealer, validatePrice } from './chrono24'
import { atCreate, atUpdate } from '@/utils/airtable'
import { logInfo, logError } from './logger'
import { sendAlertToMake } from '@/utils/alertHandler'

/**
 * Complete watch verification workflow
 * Integrates document analysis, market data, and ICD calculation
 */

export interface VerificationRequest {
  tenantId: string
  customerName: string
  customerPhone: string
  watchPhotoUrl?: string
  guaranteeCardUrl?: string
  invoiceUrl?: string
}

export interface VerificationResult {
  verificationId: string
  brand: string | null
  model: string | null
  reference: string | null
  serial: string | null
  icd: number
  icdBand: string
  status: 'approved' | 'manual_review' | 'rejected'
  confidence: number
  issues: string[]
  marketData: any
  recommendations: string[]
}

/**
 * Run complete verification workflow
 */
export async function runVerification(request: VerificationRequest): Promise<VerificationResult> {
  logInfo('verification', `Starting verification for ${request.customerName}`)

  try {
    // Step 1: Analyze all documents
    const watchAnalysis = request.watchPhotoUrl
      ? await analyzeWatchPhoto(request.watchPhotoUrl)
      : null

    const guaranteeAnalysis = request.guaranteeCardUrl
      ? await analyzeGuaranteeCard(request.guaranteeCardUrl)
      : null

    const invoiceAnalysis = request.invoiceUrl
      ? await analyzeInvoice(request.invoiceUrl)
      : null

    // Step 2: Cross-check document consistency
    const consistency =
      watchAnalysis && guaranteeAnalysis && invoiceAnalysis
        ? compareDocuments(watchAnalysis, guaranteeAnalysis, invoiceAnalysis)
        : { consistent: true, mismatches: [], confidence: 50 }

    // Step 3: Lookup market data
    const brand = watchAnalysis?.brand || guaranteeAnalysis?.brand || 'Unknown'
    const model = watchAnalysis?.model || guaranteeAnalysis?.model || 'Unknown'
    const reference = watchAnalysis?.reference || guaranteeAnalysis?.reference

    const marketData = await lookupWatch(brand, model, reference || undefined)

    // Step 4: Verify dealer (if invoice present)
    const dealerVerification = invoiceAnalysis?.seller
      ? verifyDealer(invoiceAnalysis.seller)
      : null

    // Step 5: Validate price (if both invoice and market data available)
    const priceValidation =
      invoiceAnalysis?.amount && marketData
        ? validatePrice(invoiceAnalysis.amount, marketData)
        : null

    // Step 6: Calculate ICD score
    const icdInput: ICDInput = {
      nf_missing: !request.invoiceUrl,
      nf_invalid: invoiceAnalysis ? !invoiceAnalysis.isValid : false,
      serial_mismatch: consistency.mismatches.some((m) => m.includes('Serial')),
      issuer_denies: false, // TODO: Implement brand verification API
      nfse_missing: false, // Assume electronic invoice is acceptable
      history_inconsistent: !consistency.consistent,
      seller_unidentified: dealerVerification ? dealerVerification.category === 'unknown' : false,
    }

    const { score: icd, band: icdBand } = calcICD(icdInput)

    // Step 7: Determine status
    let status: 'approved' | 'manual_review' | 'rejected'
    if (icd >= 85) {
      status = 'approved'
    } else if (icd >= 50) {
      status = 'manual_review'
    } else {
      status = 'rejected'
    }

    // Step 8: Compile issues and recommendations
    const issues: string[] = [
      ...consistency.mismatches,
      ...(watchAnalysis?.issues || []),
      ...(guaranteeAnalysis?.issues || []),
      ...(invoiceAnalysis?.issues || []),
    ]

    if (priceValidation?.concern) {
      issues.push(priceValidation.concern)
    }

    if (!marketData) {
      issues.push('No market data available - unable to verify price and provenance')
    }

    const recommendations: string[] = []

    if (status === 'manual_review') {
      recommendations.push('Recommend physical inspection by expert')
      if (!consistency.consistent) {
        recommendations.push('Document inconsistencies require investigation')
      }
    }

    if (status === 'rejected') {
      recommendations.push('DO NOT PROCEED - High risk of counterfeit or fraud')
      recommendations.push('Request additional documentation and verification')
    }

    if (icd < 70 && dealerVerification?.category === 'unknown') {
      recommendations.push('Verify seller authorization with brand directly')
    }

    // Step 9: Save to Airtable
    const verification = await atCreate('WatchVerify', {
      tenant_id: request.tenantId,
      customer: request.customerName,
      phone: request.customerPhone,
      brand: brand,
      model: model || '',
      reference: reference || '',
      serial: watchAnalysis?.serial || guaranteeAnalysis?.serial || '',
      icd,
      status,
      photo_url: request.watchPhotoUrl || '',
      guarantee_url: request.guaranteeCardUrl || '',
      invoice_url: request.invoiceUrl || '',
      notes: issues.join('\n'),
      created_at: new Date().toISOString(),
    })

    // Step 10: Trigger alert if ICD < 80
    if (icd < 80) {
      await sendAlertToMake({
        customer: request.customerName,
        phone: request.customerPhone,
        brand,
        model,
        icd,
        status,
        message: `Verification requires manual review (ICD: ${icd})`,
      })
    }

    logInfo('verification', `Verification complete`, {
      verificationId: verification.id,
      icd,
      status,
    })

    return {
      verificationId: verification.id,
      brand,
      model,
      reference: reference || null,
      serial: watchAnalysis?.serial || guaranteeAnalysis?.serial || null,
      icd,
      icdBand,
      status,
      confidence: consistency.confidence,
      issues,
      marketData,
      recommendations,
    }
  } catch (error: any) {
    logError('verification', error, request)
    throw error
  }
}

/**
 * State machine for multi-step verification workflow
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

// In-memory session store (TODO: Move to Redis or Airtable for production)
const sessions = new Map<string, VerificationSession>()

/**
 * Create new verification session
 */
export function createVerificationSession(
  tenantId: string,
  customerPhone: string,
  customerName: string
): VerificationSession {
  const session: VerificationSession = {
    id: crypto.randomUUID(),
    tenantId,
    customerPhone,
    customerName,
    state: 'awaiting_watch_photo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  sessions.set(customerPhone, session)
  logInfo('verification-session', `Created session for ${customerPhone}`)
  return session
}

/**
 * Get existing session
 */
export function getVerificationSession(customerPhone: string): VerificationSession | null {
  return sessions.get(customerPhone) || null
}

/**
 * Update session with new document
 */
export function updateVerificationSession(
  customerPhone: string,
  documentType: 'watch' | 'guarantee' | 'invoice',
  documentUrl: string
): VerificationSession | null {
  const session = sessions.get(customerPhone)
  if (!session) return null

  // Update document URL
  if (documentType === 'watch') {
    session.watchPhotoUrl = documentUrl
    session.state = 'awaiting_guarantee'
  } else if (documentType === 'guarantee') {
    session.guaranteeCardUrl = documentUrl
    session.state = 'awaiting_invoice'
  } else if (documentType === 'invoice') {
    session.invoiceUrl = documentUrl
    session.state = 'processing'
  }

  session.updatedAt = new Date().toISOString()
  sessions.set(customerPhone, session)

  logInfo('verification-session', `Updated session for ${customerPhone}`, {
    state: session.state,
  })

  return session
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
export function clearVerificationSession(customerPhone: string): void {
  sessions.delete(customerPhone)
  logInfo('verification-session', `Cleared session for ${customerPhone}`)
}

/**
 * Get next prompt for user based on session state
 */
export function getNextPrompt(session: VerificationSession): string {
  switch (session.state) {
    case 'awaiting_watch_photo':
      return '📸 Por favor, envie uma foto clara do seu relógio (mostrand o dial e a caixa).'
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
