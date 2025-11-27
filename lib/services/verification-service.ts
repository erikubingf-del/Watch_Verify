import {
    createEnhancedVerificationSession,
    updateEnhancedVerificationSession,
    getEnhancedVerificationSession,
    getVerificationPrompt,
    isValidCPF,
} from '@/lib/enhanced-verification'
import { uploadToCloudinary } from '@/lib/cloudinary'
import {
    analyzeWatchPhoto,
    analyzeGuaranteeCard,
    analyzeInvoice,
    crossReferenceDocuments,
} from '@/lib/document-ocr'
import {
    generateVerificationReport,
    generateCustomerSummary,
    generateStoreNotification,
} from '@/lib/verification-report'
import { calculateLegalRisk } from '@/lib/legal-risk'
import { calcICD } from '@/utils/icdCalculator'
import { logInfo, logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

export async function handleEnhancedVerification(
    session: any,
    message: string,
    numMedia: number,
    mediaUrls: string[],
    tenantId: string,
    customerPhone: string
): Promise<string> {
    try {
        // Start new session if none exists
        if (!session) {
            session = await createEnhancedVerificationSession(tenantId, customerPhone, 'Cliente')
            return getVerificationPrompt(session)
        }

        const lowerMsg = message.toLowerCase()

        // State: awaiting_cpf
        if (session.state === 'awaiting_cpf') {
            // Extract CPF from message
            const cpf = message.replace(/\D/g, '')

            if (!isValidCPF(cpf)) {
                return 'CPF inválido. Por favor, envie um CPF válido no formato XXX.XXX.XXX-XX ou apenas números.'
            }

            // Update session with CPF
            await updateEnhancedVerificationSession(customerPhone, {
                cpf,
                state: 'awaiting_watch_info',
            })

            return 'Perfeito! Qual relógio você gostaria de vender? (marca e modelo)'
        }

        // State: awaiting_watch_info
        if (session.state === 'awaiting_watch_info') {
            // Store customer's stated model
            await updateEnhancedVerificationSession(customerPhone, {
                customerStatedModel: message,
                state: 'awaiting_watch_photo',
            })

            return `Ótimo! Vou precisar de algumas fotos e documentos.

Primeiro, envie uma foto clara do relógio mostrando o mostrador e a caixa.

💡 *Dica:* Se conseguir visualizar o número de série (geralmente está na parte de trás da caixa ou próximo ao número 6 no mostrador), tente incluir na foto. Isso ajuda na verificação, mas não é obrigatório!`
        }

        // State: awaiting_watch_photo
        if (session.state === 'awaiting_watch_photo') {
            if (numMedia === 0) {
                return 'Por favor, envie uma foto do relógio.'
            }

            // Upload to Cloudinary
            const photoUrl = await uploadToCloudinary(mediaUrls[0])

            // Analyze with GPT-4 Vision
            const photoAnalysis = await analyzeWatchPhoto(photoUrl)

            // Log analysis for debugging
            logInfo('watch-photo-analyzed', 'Watch photo analyzed', {
                brand: photoAnalysis.brand,
                model: photoAnalysis.model,
                reference: photoAnalysis.reference,
                confidence: photoAnalysis.confidence,
            })

            // Update session
            await updateEnhancedVerificationSession(customerPhone, {
                watchPhotoUrl: photoUrl,
                state: 'awaiting_guarantee',
            })

            // Build intelligent response based on analysis
            let response = 'Recebi a foto do seu relógio! '

            if (photoAnalysis.brand || photoAnalysis.model) {
                response += `Identifico um ${photoAnalysis.brand || 'relógio'}${photoAnalysis.model ? ` ${photoAnalysis.model}` : ''}. `
            }

            if (photoAnalysis.reference) {
                response += `Referência: ${photoAnalysis.reference}. `
            }

            response += '\n\nAgora envie uma foto do certificado de garantia (guarantee card).\n\n📋 *Importante:* Preciso verificar o número de referência, número de série e data de compra para confirmar autenticidade.'

            return response
        }

        // State: awaiting_guarantee
        if (session.state === 'awaiting_guarantee') {
            if (numMedia === 0) {
                return 'Por favor, envie uma foto do certificado de garantia.'
            }

            // Upload to Cloudinary
            const guaranteeUrl = await uploadToCloudinary(mediaUrls[0])

            // Analyze with GPT-4 Vision
            const guaranteeAnalysis = await analyzeGuaranteeCard(guaranteeUrl)

            // Refresh session to get latest data
            const currentSession = await getEnhancedVerificationSession(customerPhone)
            const photoAnalysis = currentSession?.watchPhotoUrl
                ? await analyzeWatchPhoto(currentSession.watchPhotoUrl)
                : null

            // Cross-reference: check if reference numbers match
            if (
                photoAnalysis?.reference &&
                guaranteeAnalysis.reference &&
                photoAnalysis.reference !== guaranteeAnalysis.reference
            ) {
                return `⚠️ Notei que o certificado indica referência **${guaranteeAnalysis.reference}** mas a foto mostra **${photoAnalysis.reference}**. Você tem certeza que enviou os documentos do relógio correto? Se sim, responda "sim" para continuar.`
            }

            // Update session
            await updateEnhancedVerificationSession(customerPhone, {
                guaranteeCardUrl: guaranteeUrl,
                state: 'awaiting_invoice',
            })

            return 'Ótimo! Agora envie a Nota Fiscal de compra original.'
        }

        // State: awaiting_invoice
        if (session.state === 'awaiting_invoice') {
            if (numMedia === 0) {
                return 'Por favor, envie a Nota Fiscal.'
            }

            // Upload to Cloudinary
            const invoiceUrl = await uploadToCloudinary(mediaUrls[0])

            // Analyze with GPT-4 Vision
            const invoiceAnalysis = await analyzeInvoice(invoiceUrl)

            // Refresh session to get all documents
            const currentSession = await getEnhancedVerificationSession(customerPhone)
            const photoAnalysis = currentSession?.watchPhotoUrl
                ? await analyzeWatchPhoto(currentSession.watchPhotoUrl)
                : null
            const guaranteeAnalysis = currentSession?.guaranteeCardUrl
                ? await analyzeGuaranteeCard(currentSession.guaranteeCardUrl)
                : null

            // ===== COMPREHENSIVE CROSS-REFERENCE CHECKS =====

            const mismatches: string[] = []

            // 1. Check SERIAL NUMBER consistency across all documents
            const serials = {
                photo: photoAnalysis?.serial,
                guarantee: guaranteeAnalysis?.serial,
                invoice: invoiceAnalysis.serialNumber,
            }

            // Compare serials (allow for partial matches - some invoices abbreviate)
            if (serials.guarantee && serials.invoice) {
                if (serials.guarantee !== serials.invoice &&
                    !serials.guarantee.includes(serials.invoice) &&
                    !serials.invoice.includes(serials.guarantee)) {
                    mismatches.push(`📌 Serial no certificado: **${serials.guarantee}**\n📌 Serial na Nota Fiscal: **${serials.invoice}**`)
                }
            }

            if (serials.photo && serials.guarantee) {
                if (serials.photo !== serials.guarantee &&
                    !serials.photo.includes(serials.guarantee) &&
                    !serials.guarantee.includes(serials.photo)) {
                    mismatches.push(`📌 Serial na foto: **${serials.photo}**\n📌 Serial no certificado: **${serials.guarantee}**`)
                }
            }

            // 2. Check REFERENCE NUMBER consistency
            const references = {
                photo: photoAnalysis?.reference,
                guarantee: guaranteeAnalysis?.reference,
            }

            if (references.photo && references.guarantee) {
                if (references.photo !== references.guarantee) {
                    mismatches.push(`📌 Referência na foto: **${references.photo}**\n📌 Referência no certificado: **${references.guarantee}**`)
                }
            }

            // 3. Check if invoice is missing watch details
            const invoiceMissingDetails: string[] = []

            if (!invoiceAnalysis.hasSerial && !invoiceAnalysis.serialNumber) {
                invoiceMissingDetails.push('- Número de série não encontrado na Nota Fiscal')
            }

            // Check if invoice mentions watch/relógio at all
            const hasWatchReference = invoiceAnalysis.items?.some((item: string) =>
                item.toLowerCase().includes('relógio') ||
                item.toLowerCase().includes('relogio') ||
                item.toLowerCase().includes('watch')
            )

            if (!hasWatchReference && invoiceAnalysis.items && invoiceAnalysis.items.length > 0) {
                invoiceMissingDetails.push('- Nota Fiscal não menciona especificamente "relógio"')
            }

            // 4. Check DATE mismatch (>60 days difference)
            if (guaranteeAnalysis?.purchaseDate && invoiceAnalysis.date) {
                const guaranteeDate = new Date(guaranteeAnalysis.purchaseDate)
                const invoiceDate = new Date(invoiceAnalysis.date)
                const daysDiff = Math.abs((guaranteeDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))

                if (daysDiff > 60) {
                    mismatches.push(`📅 Data no certificado: **${guaranteeAnalysis.purchaseDate}**\n📅 Data na Nota Fiscal: **${invoiceAnalysis.date}**`)
                }
            }

            // ===== HANDLE MISMATCHES =====

            // If there are mismatches, ask for confirmation
            if (mismatches.length > 0) {
                await updateEnhancedVerificationSession(customerPhone, {
                    invoiceUrl: invoiceUrl,
                    state: 'awaiting_date_explanation',  // Reuse this state for mismatch confirmation
                })

                let response = '⚠️ **Encontrei algumas diferenças entre os documentos:**\n\n'
                response += mismatches.join('\n\n')

                // Check if this could be 2 different watches
                const hasMajorMismatch = mismatches.length >= 2

                if (hasMajorMismatch) {
                    response += '\n\n🤔 **Isso pode indicar:**'
                    response += '\n1️⃣ Você está tentando vender **2 relógios diferentes** (envie os documentos de cada um separadamente)'
                    response += '\n2️⃣ Houve um **erro ao enviar** os documentos (documentos misturados)'
                    response += '\n3️⃣ Os documentos estão **corretos mas com informações diferentes** (explique o motivo)'
                    response += '\n\n👉 Responda qual é o caso para continuar.'
                } else {
                    response += '\n\n**Os documentos estão corretos?** Se sim, responda "sim" para continuar.'
                }

                return response
            }

            // If invoice is missing details but no other mismatches, ask for confirmation
            if (invoiceMissingDetails.length > 0) {
                await updateEnhancedVerificationSession(customerPhone, {
                    invoiceUrl: invoiceUrl,
                    state: 'awaiting_date_explanation',
                })

                let response = '⚠️ **Notei que a Nota Fiscal:**\n\n'
                response += invoiceMissingDetails.join('\n')
                response += '\n\n**Essa Nota Fiscal é do relógio que você enviou?** Se sim, responda "sim" para continuar. Vou incluir no relatório que faltavam essas informações na NF.'

                return response
            }

            // No mismatches - proceed to optional docs
            await updateEnhancedVerificationSession(customerPhone, {
                invoiceUrl: invoiceUrl,
                state: 'awaiting_optional_docs',
            })

            // Ask customer if they want to send additional documents or complete now
            return `Recebi todos os documentos principais! Para fortalecer a verificação, você pode enviar documentos adicionais (opcional):
- Fatura do cartão de crédito (comprovando a compra)
- Comprovante de viagem (se comprou no exterior)
- Box original do relógio
- Outros certificados ou documentos

Prefere enviar agora ou que eu envie o relatório atual para a boutique?`
        }

        // State: awaiting_date_explanation
        if (session.state === 'awaiting_date_explanation') {
            // Store customer's explanation
            await updateEnhancedVerificationSession(customerPhone, {
                dateMismatchReason: message,
                state: 'awaiting_optional_docs',
            })

            return `Entendi! Vou incluir essa informação no relatório. ✅

Quer enviar documentos adicionais (fatura cartão, comprovante viagem, box) ou prefere que eu envie o relatório agora para a boutique?`
        }

        // State: awaiting_optional_docs
        if (session.state === 'awaiting_optional_docs') {
            // Customer wants to send report now
            if (
                lowerMsg.includes('enviar') ||
                lowerMsg.includes('relatório') ||
                lowerMsg.includes('agora') ||
                lowerMsg.includes('boutique')
            ) {
                return await finalizeEnhancedVerification(customerPhone, tenantId)
            }

            // Customer sends additional document
            if (numMedia > 0) {
                const additionalUrl = await uploadToCloudinary(mediaUrls[0])

                // Add to additional_documents array
                const currentSession = await getEnhancedVerificationSession(customerPhone)
                const additionalDocs = currentSession?.additionalDocuments || []
                additionalDocs.push(additionalUrl)

                await updateEnhancedVerificationSession(customerPhone, {
                    additionalDocuments: additionalDocs,
                })

                return `✅ Documento adicional recebido! Quer enviar mais documentos ou prefere que eu envie o relatório para a boutique?`
            }

            return `Não entendi. Responda "enviar relatório" para finalizar ou envie outro documento.`
        }

        // Fallback
        return getVerificationPrompt(session)
    } catch (error: any) {
        logError('enhanced-verification-handler', error, { customerPhone })
        return 'Desculpe, tive um problema ao processar a verificação. Vamos tentar de novo?'
    }
}

/**
 * Finalize verification and generate report
 */
async function finalizeEnhancedVerification(customerPhone: string, tenantId: string): Promise<string> {
    try {
        // Get session
        const session = await getEnhancedVerificationSession(customerPhone)
        if (!session) {
            return 'Não encontrei sua verificação. Vamos começar de novo?'
        }

        // Update state
        await updateEnhancedVerificationSession(customerPhone, {
            state: 'processing',
        })

        // Analyze all documents
        const photoAnalysis = session.watchPhotoUrl
            ? await analyzeWatchPhoto(session.watchPhotoUrl)
            : ({} as any)

        const guaranteeAnalysis = session.guaranteeCardUrl
            ? await analyzeGuaranteeCard(session.guaranteeCardUrl)
            : ({} as any)

        const invoiceAnalysis = session.invoiceUrl ? await analyzeInvoice(session.invoiceUrl) : ({} as any)

        // Cross-reference
        const crossReference = crossReferenceDocuments(
            photoAnalysis,
            guaranteeAnalysis,
            invoiceAnalysis,
            session.customerStatedModel || ''
        )

        // Calculate ICD score
        const { score: icd, band: icdBand } = calcICD({
            nf_missing: !invoiceAnalysis,
            nf_invalid: invoiceAnalysis ? !invoiceAnalysis.valid : false,
            serial_mismatch: !crossReference.serial_match,
            nfse_missing: !guaranteeAnalysis,
            history_inconsistent: !crossReference.model_match || !crossReference.date_match,
        })

        // Calculate legal risk assessment
        const legalRisk = calculateLegalRisk(
            icd,
            crossReference,
            photoAnalysis,
            guaranteeAnalysis,
            invoiceAnalysis
        )

        // Generate report
        const report = generateVerificationReport({
            session,
            photoAnalysis,
            guaranteeAnalysis,
            invoiceAnalysis,
            crossReference,
            nfValidated: null, // TODO: Add SEFAZ validation
            legalRisk,
        })

        // Store report in WatchVerify table (Prisma)
        await prisma.watchVerify.create({
            data: {
                tenantId,
                customerName: session.customerName || 'Cliente',
                customerPhone,
                cpf: session.cpf,
                brand: photoAnalysis.brand || guaranteeAnalysis.brand || '',
                model: photoAnalysis.model || guaranteeAnalysis.model || session.customerStatedModel || '',
                reference: photoAnalysis.reference_number || guaranteeAnalysis.reference_number || '',
                serial: photoAnalysis.serial_number || guaranteeAnalysis.serial_number || '',
                icd: legalRisk.icd,
                status: legalRisk.color === 'red' ? 'rejected' : legalRisk.color === 'green' ? 'approved' : 'manual_review',
                photoUrl: session.watchPhotoUrl,
                guaranteeUrl: session.guaranteeCardUrl,
                invoiceUrl: session.invoiceUrl,
                issues: legalRisk.criticalIssues, // Prisma handles Json type
                recommendations: legalRisk.warnings,
                notes: report,
                completedAt: new Date(),
            }
        })

        const verificationId = session.id.substring(0, 8).toUpperCase()

        // Send notification to store owner
        const storeNotification = generateStoreNotification(
            session.customerName || 'Cliente',
            `${photoAnalysis.brand || ''} ${photoAnalysis.model || ''}`,
            crossReference.issues.length === 0 ? 'approved' : 'review',
            verificationId
        )

        // TODO: Send WhatsApp to store owner using sendWhatsAppMessage
        logInfo('verification-complete', 'Report generated', {
            verificationId,
            customerPhone,
            status: crossReference.issues.length === 0 ? 'approved' : 'review',
        })

        // Mark session as completed
        await updateEnhancedVerificationSession(customerPhone, {
            state: 'completed',
        })

        // Return customer summary
        return generateCustomerSummary(session, verificationId)
    } catch (error: any) {
        logError('verification-finalization', error, { customerPhone })
        return '❌ Erro ao finalizar verificação. Por favor, entre em contato com nossa equipe.'
    }
}
