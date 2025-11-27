import {
    createFeedbackSession,
    updateFeedbackSession,
    transcribeAudio,
    extractFeedbackData,
    findCustomerByPhone,
    findCustomersByName,
    formatConfirmationMessage,
    formatDisambiguationOptions,
    updateCustomerWithFeedback,
    createVisitRecord,
    generateFollowUpMessage,
} from '@/lib/salesperson-feedback'
import { atCreate } from '@/utils/airtable'
import { logError } from '@/lib/logger'
import { sendWhatsAppMessage } from '@/lib/twilio'

export async function handleSalespersonFeedback(
    session: any,
    message: string,
    numMedia: number,
    mediaUrls: string[],
    tenantId: string,
    salespersonPhone: string,
    storeNumber: string
): Promise<string> {
    try {
        // Start new session if none exists
        if (!session) {
            // Remove /feedback prefix if present
            const cleanMessage = message.replace(/^\/feedback\s*/i, '').trim()

            if (numMedia > 0 && mediaUrls[0]) {
                // Audio feedback
                session = await createFeedbackSession(tenantId, salespersonPhone, 'audio', mediaUrls[0])
                return '⏳ Transcrevendo áudio... Aguarde um instante.'
            } else if (cleanMessage) {
                // Text feedback
                session = await createFeedbackSession(tenantId, salespersonPhone, 'text', cleanMessage)
                return '⏳ Processando feedback... Aguarde.'
            } else {
                return 'Para enviar feedback, você pode:\n\n📱 Enviar um áudio descrevendo a visita\n📝 Ou escrever os detalhes\n\nExemplo: "Atendi o João Silva hoje, ele adorou o Submariner preto, aniversário 15/03"'
            }
        }

        const lowerMsg = message.toLowerCase()

        // State: awaiting_transcription (audio)
        if (session.state === 'awaiting_transcription') {
            try {
                const transcription = await transcribeAudio(session.raw_input)
                await updateFeedbackSession(salespersonPhone, {
                    transcription,
                    state: 'awaiting_extraction',
                })

                return `Transcrição: "${transcription}"\n\n⏳ Extraindo informações...`
            } catch (error: any) {
                return `❌ Erro ao transcrever áudio. Pode enviar o feedback como texto?\n\nExemplo: "João Silva - Submariner - budget 50k"`
            }
        }

        // State: awaiting_extraction
        if (session.state === 'awaiting_extraction') {
            const textToExtract = session.transcription || session.raw_input

            try {
                const feedbackData = await extractFeedbackData(textToExtract)

                if (!feedbackData.customer_name) {
                    return '❌ Não consegui identificar o nome do cliente. Pode enviar novamente com o nome?\n\nExemplo: "João Silva gostou do Submariner"'
                }

                // Try to find customer
                let matchedCustomers: any[] = []

                if (feedbackData.customer_phone) {
                    const customerByPhone = await findCustomerByPhone(tenantId, feedbackData.customer_phone)
                    if (customerByPhone) {
                        matchedCustomers = [customerByPhone]
                    }
                }

                if (matchedCustomers.length === 0) {
                    matchedCustomers = await findCustomersByName(
                        tenantId,
                        feedbackData.customer_name,
                        feedbackData.city // Pass city for better matching
                    )
                }

                await updateFeedbackSession(salespersonPhone, {
                    extracted_data: feedbackData,
                    matched_customers: matchedCustomers,
                    customer_name: feedbackData.customer_name,
                    state:
                        matchedCustomers.length === 1
                            ? 'awaiting_confirmation'
                            : matchedCustomers.length > 1
                                ? 'awaiting_disambiguation'
                                : 'awaiting_new_customer_confirm',
                })

                // Single match - go straight to confirmation
                if (matchedCustomers.length === 1) {
                    const customer = matchedCustomers[0]
                    return (
                        `Encontrei este cliente:\n\n${customer.fields.name} - ${customer.fields.phone}\n` +
                        (customer.fields.last_visit
                            ? `Última visita: ${customer.fields.last_visit}\n`
                            : 'Primeira visita\n') +
                        `\n${formatConfirmationMessage(customer.fields.name, feedbackData)}`
                    )
                }

                // Multiple matches - need disambiguation
                if (matchedCustomers.length > 1) {
                    return formatDisambiguationOptions(matchedCustomers)
                }

                // No match - ask if new customer
                return `${feedbackData.customer_name} não encontrado no sistema. É um cliente novo? (Sim/Não)`
            } catch (error: any) {
                logError('feedback-extraction-error', error)
                return '❌ Erro ao processar feedback. Pode tentar enviar novamente?'
            }
        }

        // State: awaiting_disambiguation
        if (session.state === 'awaiting_disambiguation') {
            const choice = parseInt(message.trim())

            if (lowerMsg === 'nenhum' || lowerMsg === 'nao' || lowerMsg === 'não') {
                await updateFeedbackSession(salespersonPhone, {
                    state: 'awaiting_new_customer_confirm',
                })
                return 'Entendi. Qual o telefone do cliente?'
            }

            if (
                isNaN(choice) ||
                choice < 1 ||
                choice > (session.matched_customers?.length || 0)
            ) {
                return `Por favor, responda com o número (1-${session.matched_customers?.length}) ou "nenhum".`
            }

            const selectedCustomer = session.matched_customers[choice - 1]

            await updateFeedbackSession(salespersonPhone, {
                customer_phone: selectedCustomer.fields.phone,
                state: 'awaiting_confirmation',
            })

            return formatConfirmationMessage(
                selectedCustomer.fields.name,
                session.extracted_data
            )
        }

        // State: awaiting_new_customer_confirm
        if (session.state === 'awaiting_new_customer_confirm') {
            if (lowerMsg === 'sim' || lowerMsg === 's') {
                return 'Qual o telefone do cliente?'
            }

            // Assume message is phone number
            const phone = message.replace(/\D/g, '')

            if (phone.length < 10) {
                return 'Telefone inválido. Por favor, envie o número completo:\n\nExemplo: +5511999999999 ou 11999999999'
            }

            const formattedPhone = phone.startsWith('55') ? `+${phone}` : `+55${phone}`

            // Create new customer
            try {
                await atCreate('Customers', {
                    tenant_id: [tenantId],
                    phone: formattedPhone,
                    name: session.customer_name || session.extracted_data.customer_name,
                    created_at: new Date().toISOString(),
                } as any)

                await updateFeedbackSession(salespersonPhone, {
                    customer_phone: formattedPhone,
                    state: 'awaiting_confirmation',
                })

                return `✅ Cliente criado!\n\n${formatConfirmationMessage(session.customer_name, session.extracted_data)}`
            } catch (error: any) {
                logError('customer-creation-error', error)
                return '❌ Erro ao criar cliente. Por favor, tente novamente.'
            }
        }

        // State: awaiting_confirmation
        if (session.state === 'awaiting_confirmation') {
            if (lowerMsg === 'sim' || lowerMsg === 's') {
                // Update customer
                try {
                    const customer = session.matched_customers
                        ? session.matched_customers.find(
                            (c: any) => c.fields.phone === session.customer_phone
                        )
                        : await findCustomerByPhone(tenantId, session.customer_phone)

                    if (!customer) {
                        return '❌ Cliente não encontrado. Vamos começar de novo? Envie /feedback'
                    }

                    await updateCustomerWithFeedback(customer.id, session.extracted_data)
                    await createVisitRecord(
                        tenantId,
                        session.customer_phone,
                        customer.fields.name,
                        session.extracted_data
                    )

                    await updateFeedbackSession(salespersonPhone, {
                        state: 'awaiting_follow_up',
                    })

                    return `✅ Dados atualizados!\n\nQuer que eu envie uma mensagem de follow-up para ${customer.fields.name}? (Sim/Não)`
                } catch (error: any) {
                    logError('feedback-update-error', error)
                    return '❌ Erro ao atualizar dados. Por favor, tente novamente.'
                }
            } else if (lowerMsg === 'não' || lowerMsg === 'nao' || lowerMsg === 'n') {
                await updateFeedbackSession(salespersonPhone, {
                    state: 'cancelled',
                })
                return 'Feedback cancelado. Envie /feedback para começar de novo.'
            } else {
                return 'Por favor, responda "Sim" para confirmar ou "Não" para cancelar.'
            }
        }

        // State: awaiting_follow_up
        if (session.state === 'awaiting_follow_up') {
            if (lowerMsg === 'sim' || lowerMsg === 's') {
                // Generate and show follow-up message
                const customer = await findCustomerByPhone(tenantId, session.customer_phone)
                const followUpMessage = await generateFollowUpMessage(
                    customer?.fields?.name || session.customer_name,
                    session.extracted_data
                )

                // Send to customer
                await sendWhatsAppMessage(
                    `whatsapp:${session.customer_phone}`,
                    followUpMessage,
                    `whatsapp:${storeNumber}` // Store number
                )

                // Mark session complete
                await updateFeedbackSession(salespersonPhone, {
                    state: 'completed',
                })

                return `✅ Mensagem enviada para ${customer?.fields?.name || session.customer_name}!\n\n"${followUpMessage}"\n\nFeedback concluído! 🎯`
            } else if (lowerMsg === 'não' || lowerMsg === 'nao' || lowerMsg === 'n') {
                await updateFeedbackSession(salespersonPhone, {
                    state: 'completed',
                })
                return '✅ Feedback salvo sem enviar mensagem. Obrigado!'
            } else {
                return 'Quer enviar mensagem de follow-up? (Sim/Não)'
            }
        }

        // Fallback
        return 'Não entendi. Envie /feedback para começar de novo.'
    } catch (error: any) {
        logError('feedback-handler-error', error, { salespersonPhone })
        return 'Desculpe, tive um problema ao processar o feedback. Tente novamente com /feedback'
    }
}
