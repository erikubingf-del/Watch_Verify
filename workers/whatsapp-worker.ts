import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config() // Load .env as fallback/supplement
import { Worker, Job } from 'bullmq'
import { redisConnection } from '@/lib/redis'
import { logInfo, logError } from '@/lib/logger'
import { handleSalespersonFeedback } from '@/lib/services/feedback-service'
import { handleEnhancedVerification } from '@/lib/services/verification-service'
import { handleBookingConversation } from '@/lib/services/booking-service'
import { buildRAGContext } from '@/lib/rag'
import { chat } from '@/utils/openai'
import { sendWhatsAppMessage } from '@/lib/twilio'
import { config } from '@/lib/config'
import { canReply } from '@/lib/utils/message-filter'
import { getOrCreateCustomer, updateLastInteraction } from '@/lib/customer'

const QUEUE_NAME = 'whatsapp-messages'

interface WhatsAppJobData {
    messageBody: string
    sender: string // Customer phone
    numMedia: number
    mediaUrls: string[]
    tenantId: string
    storeNumber: string // Store's WhatsApp number
    isSalesperson: boolean
    salespersonPhone?: string
    isGroup?: boolean
    isStatus?: boolean
}

const worker = new Worker<WhatsAppJobData>(
    QUEUE_NAME,
    async (job: Job<WhatsAppJobData>) => {
        const {
            messageBody,
            sender,
            numMedia,
            mediaUrls,
            tenantId,
            storeNumber,
            isSalesperson,
            salespersonPhone,
            isGroup = false,
            isStatus = false,
        } = job.data

        const logContext = { jobId: job.id, sender, tenantId }
        logInfo('worker-process', 'Processing WhatsApp message', logContext)

        // 1. Filter Invalid Messages (Best Practice: Message Filtering)
        if (!canReply({
            chatId: sender,
            fromNumber: sender,
            isGroup,
            isStatus,
            devicePhone: storeNumber
        })) {
            logInfo('worker-skip', 'Skipping message based on filter rules', logContext)
            return
        }

        // 2. Check Limits (Best Practice: Configurable Limits)
        if (messageBody.length > config.limits.maxInputCharacters) {
            logInfo('worker-skip', 'Message exceeds max characters', logContext)
            // Optionally send a warning, but usually better to ignore spam
            return
        }

        // 3. Check Media Support (Best Practice: Multimodal Handling)
        if (numMedia > 0) {
            if (!config.features.imageInput && !config.features.audioInput) {
                // If no media supported, reply with error
                await sendWhatsAppMessage(
                    `whatsapp:${sender}`,
                    config.messages.imageNotSupported, // Generic media error
                    `whatsapp:${storeNumber}`
                )
                return
            }
            // Note: Specific audio/image checks would go here if we distinguished media types in job data
        }

        try {
            let responseText = ''

            // 4. Handle Salesperson Feedback
            if (isSalesperson && salespersonPhone) {
                // Fetch session state
                const { getFeedbackSession } = await import('@/lib/salesperson-feedback')
                const session = await getFeedbackSession(salespersonPhone)

                responseText = await handleSalespersonFeedback(
                    session,
                    messageBody,
                    numMedia,
                    mediaUrls,
                    tenantId,
                    salespersonPhone,
                    storeNumber
                )
            }

            // 5. Handle Customer Flows
            else {
                // Ensure customer exists and check for first interaction
                const { customer, isFirstInteraction } = await getOrCreateCustomer(tenantId, sender)

                // Check for active Verification Session
                const { getEnhancedVerificationSession } = await import('@/lib/enhanced-verification')
                const verificationSession = await getEnhancedVerificationSession(sender)

                if (verificationSession && verificationSession.state !== 'completed') {
                    responseText = await handleEnhancedVerification(
                        verificationSession,
                        messageBody,
                        numMedia,
                        mediaUrls,
                        tenantId,
                        sender
                    )
                }

                // Check for active Booking Session
                else {
                    const { getBookingSession } = await import('@/lib/booking-sessions')
                    const bookingSession = await getBookingSession(sender)

                    if (bookingSession) { // Booking session exists
                        responseText = await handleBookingConversation(
                            bookingSession,
                            messageBody,
                            tenantId,
                            sender
                        )
                    }

                    // Default: RAG / General Conversation
                    else {
                        // Check if user wants to start booking
                        const lowerMsg = messageBody.toLowerCase()
                        if (lowerMsg.includes('agendar') || lowerMsg.includes('visita') || lowerMsg.includes('marcar')) {
                            responseText = await handleBookingConversation(
                                null, // Start new session
                                messageBody,
                                tenantId,
                                sender
                            )
                        }
                        // Check if user wants to start verification
                        else if (lowerMsg.includes('vender') || lowerMsg.includes('avaliar') || lowerMsg.includes('verificar')) {
                            responseText = await handleEnhancedVerification(
                                null, // Start new session
                                messageBody,
                                numMedia,
                                mediaUrls,
                                tenantId,
                                sender
                            )
                        }
                        else {
                            // ---------------------------------------------------------
                            // NEW: Agentic Workflow (Level 3)
                            // ---------------------------------------------------------
                            const { AgentRunner } = await import('@/lib/agent/runner')
                            const runner = new AgentRunner()

                            logInfo('worker-agent-start', 'Starting AgentRunner', { tenantId, customerId: customer.id })

                            responseText = await runner.run(tenantId, customer.id, messageBody)

                            logInfo('worker-agent-end', 'AgentRunner completed', { responseLength: responseText.length })
                        }
                    }
                }
            }

            // Send response via Twilio
            if (responseText) {
                await sendWhatsAppMessage(
                    `whatsapp:${sender}`,
                    responseText,
                    `whatsapp:${storeNumber}`
                )

                // Update last interaction time for customer
                if (!isSalesperson) {
                    await updateLastInteraction(job.data.sender) // Use sender from job data to be safe, though we have customer object
                }

                logInfo('worker-response', 'Response sent', { ...logContext, responseLength: responseText.length })
            }

        } catch (error: any) {
            logError('worker-error', error, logContext)
            // Send generic error message to user if appropriate
            await sendWhatsAppMessage(
                `whatsapp:${sender}`,
                config.messages.error,
                `whatsapp:${storeNumber}`
            )
            throw error // Retry job
        }
    },
    {
        connection: redisConnection,
        concurrency: 5, // Process 5 messages in parallel
        limiter: {
            max: 10,
            duration: 1000, // Rate limit: 10 jobs per second
        },
    }
)

worker.on('completed', (job) => {
    logInfo('worker-job-completed', `Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
    logError('worker-job-failed', err, { jobId: job?.id })
})

export default worker
