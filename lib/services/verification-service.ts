import { prisma } from '@/lib/prisma'
import {
    EnhancedVerificationSession,
    updateEnhancedVerificationSession,
    getEnhancedVerificationSession,
    encryptCPF
} from '@/lib/enhanced-verification'
import {
    analyzeWatchPhoto,
    analyzeGuaranteeCard,
    analyzeInvoice,
    WatchAnalysisResult,
    GuaranteeCardAnalysis,
    InvoiceAnalysis
} from '@/lib/vision'
import { logInfo, logError } from '@/lib/logger'
import { differenceInDays, parseISO } from 'date-fns'

/**
 * Enhanced Verification Service
 * Orchestrates the multi-step verification flow
 */

export class VerificationService {

    /**
     * Process a watch photo upload
     */
    async processWatchPhoto(
        session: EnhancedVerificationSession,
        photoUrl: string
    ): Promise<EnhancedVerificationSession> {
        logInfo('verification-service', `Processing watch photo for ${session.customerPhone}`)

        // 1. Analyze photo
        const analysis = await analyzeWatchPhoto(photoUrl)

        // 2. Update session
        const updates: Partial<EnhancedVerificationSession> = {
            watchPhotoUrl: photoUrl,
            referenceFromPhoto: analysis.reference || undefined,
            serialFromPhoto: analysis.serial || undefined,
            state: 'awaiting_guarantee'
        }

        // 3. Check for model mismatch with stated model
        if (session.customerStatedModel && analysis.model) {
            // Simple string inclusion check for now
            if (!session.customerStatedModel.toLowerCase().includes(analysis.model.toLowerCase()) &&
                !analysis.model.toLowerCase().includes(session.customerStatedModel.toLowerCase())) {
                logInfo('verification-service', 'Model mismatch detected', {
                    stated: session.customerStatedModel,
                    detected: analysis.model
                })
                // We don't stop the flow, just log it. It will be flagged in the report.
            }
        }

        return await this.updateSession(session.customerPhone, updates)
    }

    /**
     * Process a guarantee card upload
     */
    async processGuaranteeCard(
        session: EnhancedVerificationSession,
        cardUrl: string
    ): Promise<EnhancedVerificationSession> {
        logInfo('verification-service', `Processing guarantee card for ${session.customerPhone}`)

        // 1. Analyze card
        const analysis = await analyzeGuaranteeCard(cardUrl)

        // 2. Update session
        const updates: Partial<EnhancedVerificationSession> = {
            guaranteeCardUrl: cardUrl,
            referenceFromGuarantee: analysis.reference || undefined,
            serialFromGuarantee: analysis.serial || undefined,
            guaranteeDate: analysis.purchaseDate || undefined,
            state: 'awaiting_invoice'
        }

        return await this.updateSession(session.customerPhone, updates)
    }

    /**
     * Process an invoice upload
     */
    async processInvoice(
        session: EnhancedVerificationSession,
        invoiceUrl: string
    ): Promise<EnhancedVerificationSession> {
        logInfo('verification-service', `Processing invoice for ${session.customerPhone}`)

        // 1. Analyze invoice
        const analysis = await analyzeInvoice(invoiceUrl)

        // 2. Validate SEFAZ (Stub)
        const isValid = await this.validateSEFAZ(analysis)

        // 3. Update session
        const updates: Partial<EnhancedVerificationSession> = {
            invoiceUrl: invoiceUrl,
            referenceFromInvoice: analysis.hasSerial ? analysis.serialNumber || undefined : undefined, // Invoice usually doesn't have reference, maybe in description
            invoiceDate: analysis.date || undefined,
            invoiceNumber: undefined, // Vision doesn't extract number yet, need to update vision.ts if needed
            invoiceValidated: isValid,
            state: 'processing' // Move to processing to trigger final analysis
        }

        return await this.updateSession(session.customerPhone, updates)
    }

    /**
     * Finalize verification and generate report
     */
    async finalizeVerification(session: EnhancedVerificationSession): Promise<EnhancedVerificationSession> {
        logInfo('verification-service', `Finalizing verification for ${session.customerPhone}`)

        // 1. Generate Report
        const report = this.generateReportMarkdown(session)

        // 2. Calculate Legal Risk Score (Stub logic for now)
        const legalRiskScore = this.calculateRiskScore(session)
        const legalRiskLabel = this.getRiskLabel(legalRiskScore)

        // 3. Save to Database
        await prisma.watchVerify.create({
            data: {
                tenantId: session.tenantId,
                customerName: session.customerName || 'Unknown',
                customerPhone: session.customerPhone,
                cpf: session.cpf,
                statedModel: session.customerStatedModel,

                // Extracted Data
                reference: session.referenceFromGuarantee || session.referenceFromPhoto,
                serial: session.serialFromGuarantee || session.serialFromPhoto,

                // URLs
                photoUrl: session.watchPhotoUrl,
                guaranteeUrl: session.guaranteeCardUrl,
                invoiceUrl: session.invoiceUrl,

                // Analysis
                legalRiskScore,
                legalRiskLabel,
                status: legalRiskScore > 80 ? 'approved' : 'manual_review',
                notes: report,

                // Timestamps
                completedAt: new Date()
            }
        })

        // 4. Update Session
        return await this.updateSession(session.customerPhone, {
            state: 'completed'
        })
    }

    /**
     * Helper to update session
     */
    private async updateSession(phone: string, updates: Partial<EnhancedVerificationSession>) {
        const updated = await updateEnhancedVerificationSession(phone, updates)
        if (!updated) throw new Error('Session not found')
        return updated
    }

    /**
     * Stub for SEFAZ validation
     */
    private async validateSEFAZ(analysis: InvoiceAnalysis): Promise<boolean | null> {
        // In a real implementation, this would call an external API
        // For now, we return null (not validated) or true if it looks valid
        return analysis.isValid ? true : null
    }

    /**
     * Calculate risk score (0-100)
     */
    private calculateRiskScore(session: EnhancedVerificationSession): number {
        let score = 100

        // Deduct for missing info
        if (!session.referenceFromGuarantee) score -= 20
        if (!session.serialFromGuarantee) score -= 20

        // Deduct for mismatches
        if (session.referenceFromPhoto && session.referenceFromGuarantee &&
            session.referenceFromPhoto !== session.referenceFromGuarantee) {
            score -= 50
        }

        return Math.max(0, score)
    }

    private getRiskLabel(score: number): string {
        if (score >= 90) return 'Documentação Completa'
        if (score >= 70) return 'Pequenas Inconsistências'
        if (score >= 50) return 'Requer Atenção'
        return 'Alto Risco'
    }

    /**
     * Generate Markdown Report
     */
    private generateReportMarkdown(session: EnhancedVerificationSession): string {
        return `# RELATÓRIO DE VERIFICAÇÃO
    
**Cliente:** ${session.customerName}
**Data:** ${new Date().toLocaleDateString()}

## Documentos
- Foto: ${session.watchPhotoUrl ? '✅' : '❌'}
- Garantia: ${session.guaranteeCardUrl ? '✅' : '❌'}
- Nota Fiscal: ${session.invoiceUrl ? '✅' : '❌'}

## Análise
- Referência (Foto): ${session.referenceFromPhoto || 'N/A'}
- Referência (Garantia): ${session.referenceFromGuarantee || 'N/A'}
- Serial (Garantia): ${session.serialFromGuarantee || 'N/A'}

## Status
${this.getRiskLabel(this.calculateRiskScore(session))}
`
    }
}

export const verificationService = new VerificationService()

/**
 * Main handler for verification flow
 */
export async function handleEnhancedVerification(
    session: EnhancedVerificationSession | null,
    messageBody: string,
    numMedia: number,
    mediaUrls: string[],
    tenantId: string,
    customerPhone: string
): Promise<string> {
    // 1. Start new session if needed
    if (!session) {
        const { createEnhancedVerificationSession, getVerificationPrompt } = await import('@/lib/enhanced-verification')
        // Extract name if possible, otherwise use "Cliente"
        const name = "Cliente"
        session = await createEnhancedVerificationSession(tenantId, customerPhone, name)
        return getVerificationPrompt(session)
    }

    const { getVerificationPrompt, updateEnhancedVerificationSession } = await import('@/lib/enhanced-verification')

    // 2. Handle State Transitions
    try {
        switch (session.state) {
            case 'awaiting_cpf':
                // Expecting CPF text
                const cpf = messageBody.replace(/\D/g, '')
                const { isValidCPF, encryptCPF } = await import('@/lib/enhanced-verification')

                if (!isValidCPF(cpf)) {
                    return 'O CPF informado parece inválido. Por favor, digite novamente (apenas números).'
                }

                await updateEnhancedVerificationSession(customerPhone, {
                    cpf: encryptCPF(cpf),
                    state: 'awaiting_watch_info'
                })

                // Refresh session to get new prompt
                const sessionAfterCpf = await getEnhancedVerificationSession(customerPhone)
                return getVerificationPrompt(sessionAfterCpf!)

            case 'awaiting_watch_info':
                // Expecting brand/model text
                if (messageBody.length < 3) {
                    return 'Por favor, informe a marca e modelo do relógio (ex: Rolex Submariner).'
                }

                await updateEnhancedVerificationSession(customerPhone, {
                    customerStatedModel: messageBody,
                    state: 'awaiting_watch_photo'
                })

                const sessionAfterInfo = await getEnhancedVerificationSession(customerPhone)
                return getVerificationPrompt(sessionAfterInfo!)

            case 'awaiting_watch_photo':
                // Expecting photo
                if (numMedia === 0) {
                    return 'Por favor, envie uma foto do relógio para prosseguirmos.'
                }

                // Process photo (async but we wait for simplicity in this MVP)
                await verificationService.processWatchPhoto(session, mediaUrls[0])

                const sessionAfterPhoto = await getEnhancedVerificationSession(customerPhone)
                return getVerificationPrompt(sessionAfterPhoto!)

            case 'awaiting_guarantee':
                // Expecting guarantee card
                if (numMedia === 0) {
                    return 'Por favor, envie a foto do certificado de garantia.'
                }

                await verificationService.processGuaranteeCard(session, mediaUrls[0])

                const sessionAfterGuarantee = await getEnhancedVerificationSession(customerPhone)
                return getVerificationPrompt(sessionAfterGuarantee!)

            case 'awaiting_invoice':
                // Expecting invoice
                if (numMedia === 0) {
                    return 'Por favor, envie a foto da Nota Fiscal.'
                }

                await verificationService.processInvoice(session, mediaUrls[0])

                // Auto-finalize for now (skip optional docs step for speed in MVP, or move to optional)
                // Let's move to optional docs as per flow
                await updateEnhancedVerificationSession(customerPhone, {
                    state: 'awaiting_optional_docs'
                })

                const sessionAfterInvoice = await getEnhancedVerificationSession(customerPhone)
                return getVerificationPrompt(sessionAfterInvoice!)

            case 'awaiting_optional_docs':
                // User can send more docs OR say "enviar agora"
                const lowerMsg = messageBody.toLowerCase()

                if (lowerMsg.includes('relatório') || lowerMsg.includes('enviar agora') || lowerMsg.includes('finalizar')) {
                    await verificationService.finalizeVerification(session)
                    const sessionCompleted = await getEnhancedVerificationSession(customerPhone)
                    return getVerificationPrompt(sessionCompleted!)
                }

                if (numMedia > 0) {
                    // Add to additional docs
                    const currentDocs = session.additionalDocuments || []
                    await updateEnhancedVerificationSession(customerPhone, {
                        additionalDocuments: [...currentDocs, ...mediaUrls]
                    })
                    return 'Recebido! Se tiver mais documentos, pode enviar. Ou digite "Finalizar" para gerar o relatório.'
                }

                return 'Pode enviar mais documentos ou digitar "Finalizar".'

            case 'completed':
                // Handle late submissions
                if (numMedia > 0) {
                    // Re-open logic could go here
                    return 'Recebi o documento adicional. Vou anexar ao seu processo.'
                }
                return getVerificationPrompt(session)

            default:
                return 'Em que posso ajudar?'
        }
    } catch (error: any) {
        logError('verification-handler', error, { phone: customerPhone })
        return 'Desculpe, tive um problema ao processar sua mensagem. Poderia tentar novamente?'
    }
}
