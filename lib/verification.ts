import { calcICD, ICDInput } from '@/utils/icdCalculator'
import { analyzeWatchPhoto, analyzeGuaranteeCard, analyzeInvoice, compareDocuments } from './vision'
import { lookupWatch, verifyDealer, validatePrice } from './chrono24'
import { prisma } from '@/lib/prisma'
import { logInfo, logError, logWarn } from './logger'
import { sendAlertToMake } from '@/utils/alertHandler'
import { uploadVerificationDocuments, isCloudinaryConfigured } from './cloudinary'

/**
 * Complete watch verification workflow
 * Integrates document analysis, market data, and ICD calculation
 *
 * Note: Session management has been moved to ./verification-sessions.ts
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
    // Step 0: Upload media to Cloudinary for permanent storage
    let permanentUrls = {
      watchPhoto: request.watchPhotoUrl,
      guaranteeCard: request.guaranteeCardUrl,
      invoice: request.invoiceUrl,
    }

    if (isCloudinaryConfigured()) {
      try {
        logInfo('verification', 'Uploading documents to Cloudinary')
        // Collect all URLs to upload
        const urlsToUpload: string[] = []
        const urlMapping: { index: number; key: 'watchPhoto' | 'guaranteeCard' | 'invoice' }[] = []

        if (request.watchPhotoUrl) {
          urlMapping.push({ index: urlsToUpload.length, key: 'watchPhoto' })
          urlsToUpload.push(request.watchPhotoUrl)
        }
        if (request.guaranteeCardUrl) {
          urlMapping.push({ index: urlsToUpload.length, key: 'guaranteeCard' })
          urlsToUpload.push(request.guaranteeCardUrl)
        }
        if (request.invoiceUrl) {
          urlMapping.push({ index: urlsToUpload.length, key: 'invoice' })
          urlsToUpload.push(request.invoiceUrl)
        }

        if (urlsToUpload.length > 0) {
          const sessionId = `ver_${Date.now()}`
          const uploadedUrls = await uploadVerificationDocuments(urlsToUpload, sessionId)

          // Map uploaded URLs back to their keys
          urlMapping.forEach(({ index, key }) => {
            if (uploadedUrls[index]) {
              permanentUrls[key] = uploadedUrls[index]
            }
          })
        }
        logInfo('verification', 'Documents uploaded to Cloudinary successfully')
      } catch (error: any) {
        logWarn('verification', 'Failed to upload to Cloudinary, using Twilio URLs', { error: error.message })
        // Continue with Twilio URLs (will expire in 24h)
      }
    } else {
      logWarn('verification', 'Cloudinary not configured, using Twilio URLs (expire in 24h)')
    }

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
    const reference = watchAnalysis?.reference

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

    // Step 9: Save to Airtable with permanent URLs
    // Step 9: Save to Postgres with permanent URLs
    const verification = await prisma.watchVerify.create({
      data: {
        tenantId: request.tenantId,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        brand: brand,
        model: model || '',
        reference: reference || '',
        serial: watchAnalysis?.serial || guaranteeAnalysis?.serial || '',
        icd,
        status,
        photoUrl: permanentUrls.watchPhoto || '',
        guaranteeUrl: permanentUrls.guaranteeCard || '',
        invoiceUrl: permanentUrls.invoice || '',
        notes: issues.join('\n'),
        issues: issues,
        recommendations: recommendations,
      }
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

// Session management has been moved to ./verification-sessions.ts
// Re-export for backwards compatibility
export {
  type VerificationSession,
  createVerificationSession,
  getVerificationSession,
  updateVerificationSession,
  isSessionComplete,
  clearVerificationSession,
  getNextPrompt,
} from './verification-sessions'
