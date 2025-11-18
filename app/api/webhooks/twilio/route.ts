import { NextRequest, NextResponse } from 'next/server'
import { atCreate, atSelect, buildFormula } from '@/utils/airtable'
import { chat } from '@/utils/openai'
import { validateTwilioRequest, createTwiMLResponse } from '@/lib/twilio'
import { logError, logInfo } from '@/lib/logger'
import { runVerification } from '@/lib/verification'
import {
  getVerificationSession,
  createVerificationSession,
  updateVerificationSession,
  isSessionComplete,
  getNextPrompt,
  clearVerificationSession,
} from '@/lib/verification-sessions'
import { buildRAGContext, formatProductsForWhatsApp } from '@/lib/rag'
import {
  getBookingSession,
  createBookingSession,
  updateBookingSession,
  clearBookingSession,
  parseDateFromMessage,
  parseTimeFromMessage,
  getBookingPrompt,
} from '@/lib/booking-sessions'
import { getAvailableSlots, bookAppointment } from '@/lib/scheduling'

// Twilio sends x-www-form-urlencoded; parse using formData() in Next.js
export async function POST(req: NextRequest) {
  try {
    // Step 1: Verify Twilio signature for security
    const signature = req.headers.get('x-twilio-signature') || ''
    const url = req.url
    const form = await req.formData()

    // Convert FormData to plain object for validation
    const params: Record<string, string> = {}
    form.forEach((value, key) => {
      params[key] = String(value)
    })

    const isValid = validateTwilioRequest(signature, url, params)

    if (!isValid) {
      logError('twilio-webhook', new Error('Invalid Twilio signature'), { url })
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { status: 403, headers: { 'content-type': 'application/xml' } }
      )
    }

    // Step 2: Extract message data
    const from = String(form.get('From') || '')
    const body = String(form.get('Body') || '')
    const to = String(form.get('To') || '')
    const wa = from.replace('whatsapp:', '')
    const toNumber = to.replace('whatsapp:', '')

    // Check for media (photos/documents)
    const numMedia = parseInt(String(form.get('NumMedia') || '0'))
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = String(form.get(`MediaUrl${i}`) || '')
      if (mediaUrl) mediaUrls.push(mediaUrl)
    }

    // Step 3: Get tenant_id from Twilio number mapping
    let tenantId: string | null = null

    try {
      const storeNumbers = await atSelect('StoreNumbers', {
        filterByFormula: buildFormula('phone', '=', toNumber),
        maxRecords: '1'
      })

      if (storeNumbers.length > 0 && storeNumbers[0].fields.tenant_id) {
        // tenant_id is a linked record (array), get first element
        const tenantIds = storeNumbers[0].fields.tenant_id as any
        tenantId = Array.isArray(tenantIds) ? tenantIds[0] : tenantIds
        logInfo('tenant-lookup', 'Tenant ID resolved', { phone: toNumber, tenantId })
      } else {
        logError('tenant-lookup', new Error('No tenant found for phone number'), { phone: toNumber })
        // Return error message to user
        return new NextResponse(
          createTwiMLResponse('⚠️ Número não configurado. Por favor, entre em contato com o suporte.'),
          { headers: { 'content-type': 'application/xml' } }
        )
      }
    } catch (error: any) {
      logError('tenant-lookup', error, { phone: toNumber })
      return new NextResponse(
        createTwiMLResponse('❌ Erro ao processar sua mensagem. Tente novamente mais tarde.'),
        { status: 500, headers: { 'content-type': 'application/xml' } }
      )
    }

    // At this point, tenantId is guaranteed to be non-null (early return above if null)
    // TypeScript doesn't infer this, so we assert it
    const validTenantId: string = tenantId!

    // Step 4: Log message
    await atCreate('Messages', {
      tenant_id: validTenantId,
      phone: wa,
      body,
      direction: 'inbound',
      media_url: mediaUrls[0] || null,
      created_at: new Date().toISOString(),
    } as any)

    let responseMessage = ''

    // Step 5: Check if this is part of a verification workflow
    let session = await getVerificationSession(wa)

    // Detect verification intent from message
    const wantsVerification =
      body.toLowerCase().includes('verificar') ||
      body.toLowerCase().includes('verificação') ||
      body.toLowerCase().includes('autenticar') ||
      body.toLowerCase().includes('validar') ||
      (session && session.state !== 'completed')

    if (wantsVerification) {
      // Handle verification workflow
      if (!session && numMedia === 0) {
        // User wants to start verification
        session = await createVerificationSession(validTenantId, wa, 'Cliente')
        responseMessage = `✅ Vou iniciar a verificação do seu relógio!\n\n${getNextPrompt(session)}`
      } else if (session && numMedia > 0) {
        // User sent a document
        const mediaUrl = mediaUrls[0]

        // Determine document type based on session state
        if (session.state === 'awaiting_watch_photo') {
          session = await updateVerificationSession(wa, 'watch', mediaUrl)
          responseMessage = `✅ Foto do relógio recebida!\n\n${getNextPrompt(session!)}`
        } else if (session.state === 'awaiting_guarantee') {
          session = await updateVerificationSession(wa, 'guarantee', mediaUrl)
          responseMessage = `✅ Certificado recebido!\n\n${getNextPrompt(session!)}`
        } else if (session.state === 'awaiting_invoice') {
          session = await updateVerificationSession(wa, 'invoice', mediaUrl)

          // Check if we have all documents
          if (isSessionComplete(session!)) {
            responseMessage = '⏳ Analisando todos os documentos... Isso levará alguns instantes.'

            // Run verification asynchronously
            try {
              const result = await runVerification({
                tenantId: validTenantId,
                customerName: session!.customerName,
                customerPhone: wa,
                watchPhotoUrl: session!.watchPhotoUrl,
                guaranteeCardUrl: session!.guaranteeCardUrl,
                invoiceUrl: session!.invoiceUrl,
              })

              // Format result message
              let resultMessage = `\n\n📊 *RESULTADO DA VERIFICAÇÃO*\n\n`
              resultMessage += `Relógio: ${result.brand || 'N/A'} ${result.model || ''}\n`
              if (result.reference) resultMessage += `Referência: ${result.reference}\n`
              if (result.serial) resultMessage += `Serial: ${result.serial}\n`
              resultMessage += `\n*ICD Score: ${result.icd}/100*\n`
              resultMessage += `Status: ${result.icdBand}\n\n`

              if (result.status === 'approved') {
                resultMessage += `✅ *APROVADO* - Documentação consistente\n\n`
              } else if (result.status === 'manual_review') {
                resultMessage += `⚠️ *REVISÃO MANUAL NECESSÁRIA*\n\n`
              } else {
                resultMessage += `❌ *NÃO APROVADO* - Inconsistências detectadas\n\n`
              }

              if (result.issues.length > 0) {
                resultMessage += `Observações:\n`
                result.issues.slice(0, 3).forEach((issue) => {
                  resultMessage += `• ${issue}\n`
                })
              }

              if (result.recommendations.length > 0) {
                resultMessage += `\nRecomendações:\n`
                result.recommendations.forEach((rec) => {
                  resultMessage += `• ${rec}\n`
                })
              }

              resultMessage += `\nID da verificação: ${result.verificationId}`

              responseMessage += resultMessage

              // Clear session
              await clearVerificationSession(wa)
            } catch (error: any) {
              logError('verification-webhook', error)
              responseMessage += `\n\n❌ Erro ao processar verificação. Por favor, tente novamente ou entre em contato com nossa equipe.`
            }
          }
        }
      } else if (session && numMedia === 0) {
        // User sent text during verification
        responseMessage = getNextPrompt(session)
      } else {
        // Start new verification
        session = await createVerificationSession(validTenantId, wa, 'Cliente')
        responseMessage = `✅ Vou iniciar a verificação do seu relógio!\n\n${getNextPrompt(session)}`
      }
    } else {
      // Step 6: Check if this is part of a booking workflow
      let bookingSession = await getBookingSession(wa)

      // Detect booking intent from message
      const wantsBooking =
        body.toLowerCase().includes('agendar') ||
        body.toLowerCase().includes('marcar') ||
        body.toLowerCase().includes('visita') ||
        body.toLowerCase().includes('horário') ||
        body.toLowerCase().includes('horario') ||
        (bookingSession && bookingSession.state !== 'completed')

      if (wantsBooking) {
        // Handle booking workflow
        responseMessage = await handleBookingConversation(bookingSession, body, validTenantId, wa)
      } else {
        // Step 7: Regular conversation with RAG (product recommendations)
        try {
          // Build RAG context with semantic search
          const ragContext = await buildRAGContext(body, {
            tenantId: validTenantId,
            customerPhone: wa,
            includeConversationHistory: true,
            maxHistoryMessages: 10,
          })

          // Generate AI response with catalog context
          responseMessage = await chat(
            [
              {
                role: 'system',
                content: ragContext.systemPrompt,
              },
              { role: 'user', content: body },
            ],
            0.65
          )

          // Optionally append product recommendations in structured format
          if (ragContext.relevantProducts.length > 0 && ragContext.searchPerformed) {
            logInfo('whatsapp-rag-recommendation', 'RAG product recommendations sent', {
              phone: wa,
              productsFound: ragContext.relevantProducts.length,
            })
          }
        } catch (error: any) {
          // Fallback to basic conversation if RAG fails
          logError('whatsapp-rag', error, { phone: wa })
          responseMessage = await chat(
            [
              {
                role: 'system',
                content:
                  'Você é um concierge humano, educado e objetivo. Se o cliente pedir verificação de relógio, explique os passos e peça confirmação antes de iniciar.',
              },
              { role: 'user', content: body },
            ],
            0.65
          )
        }
      }
    }

    // Step 7: Log outbound message
    await atCreate('Messages', {
      tenant_id: tenantId,
      phone: wa,
      body: responseMessage,
      direction: 'outbound',
      created_at: new Date().toISOString(),
    } as any)

    // Step 8: Return TwiML
    return new NextResponse(createTwiMLResponse(responseMessage), {
      headers: { 'content-type': 'application/xml' },
    })
  } catch (e: any) {
    logError('twilio-webhook', e)
    return new NextResponse(createTwiMLResponse('Desculpe, houve um erro. Tente novamente mais tarde.'), {
      status: 500,
      headers: { 'content-type': 'application/xml' },
    })
  }
}

// ==========================================
// Booking Conversation Handler
// ==========================================

async function handleBookingConversation(
  session: any,
  message: string,
  tenantId: string,
  customerPhone: string
): Promise<string> {
  try {
    // Start new booking if no session exists
    if (!session) {
      session = await createBookingSession(tenantId, customerPhone, 'Cliente')
      return getBookingPrompt(session)
    }

    const lowerMsg = message.toLowerCase()

    // State: awaiting_date
    if (session.state === 'awaiting_date') {
      const date = parseDateFromMessage(message)

      if (!date) {
        return `Não entendi a data. Pode me dizer de outra forma?\n\nExemplos: "amanhã", "sexta-feira", ou "25/01"`
      }

      // Get available slots
      const slots = await getAvailableSlots(tenantId, date)

      if (slots.length === 0) {
        return `Infelizmente não temos horários disponíveis para ${formatDatePT(date)}. 😔\n\nPoderia escolher outro dia?`
      }

      // Update session with date and slots
      await updateBookingSession(customerPhone, {
        preferredDate: date,
        availableSlots: slots,
        state: 'awaiting_time',
      })

      // Format human-like slot message (NO quantities shown!)
      return formatHumanSlots(slots, date)
    }

    // State: awaiting_time
    if (session.state === 'awaiting_time') {
      const time = parseTimeFromMessage(message, session.availableSlots || [])

      if (!time) {
        return `Desculpe, não entendi o horário. Escolha um dos horários disponíveis acima, ou diga algo como "manhã" ou "tarde".`
      }

      // Update session with time
      await updateBookingSession(customerPhone, {
        preferredTime: time,
        state: 'awaiting_product',
      })

      return `Perfeito! ${time} está reservado para você. 🎯\n\nO que gostaria de ver na visita? (opcional)`
    }

    // State: awaiting_product
    if (session.state === 'awaiting_product') {
      const skipProduct = lowerMsg === 'não' || lowerMsg === 'nao' || lowerMsg === 'pular' || lowerMsg === 'skip'
      const productInterest = skipProduct ? undefined : message

      // Book the appointment
      const booking = await bookAppointment({
        tenantId,
        customerPhone,
        customerName: session.customerName,
        date: session.preferredDate!,
        time: session.preferredTime!,
        productInterest,
      })

      // Clear session
      await clearBookingSession(customerPhone)

      if (!booking) {
        return `Ops, houve um problema ao confirmar o agendamento. Pode tentar novamente?`
      }

      // Return confirmation (salesperson name from booking)
      return formatBookingConfirmation(booking)
    }

    // Fallback
    return getBookingPrompt(session)
  } catch (error: any) {
    logError('booking-conversation', error, { customerPhone })
    return `Desculpe, tive um problema ao processar o agendamento. Vamos tentar de novo?`
  }
}

// ==========================================
// Human-Like Formatting
// ==========================================

function formatHumanSlots(slots: any[], date: string): string {
  const datePT = formatDatePT(date)
  const dayOfWeek = new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' })

  let message = `Ótimo! Para ${dayOfWeek}, ${datePT}, temos:\n\n`

  slots.forEach((slot, i) => {
    // Show time only, NO quantities (more human)
    const period = getTimePeriod(slot.time)
    message += `• ${slot.time} ${period}\n`
  })

  message += `\nQual horário funciona melhor para você?`

  return message
}

function formatBookingConfirmation(booking: any): string {
  const datePT = formatDatePT(booking.date)
  const dayOfWeek = new Date(booking.date).toLocaleDateString('pt-BR', { weekday: 'long' })

  let message = `✅ *Agendamento Confirmado*\n\n`
  message += `📅 ${dayOfWeek}, ${datePT}\n`
  message += `🕒 ${booking.time}\n`
  message += `👤 ${booking.salespersonName} aguarda você\n`

  if (booking.productInterest) {
    message += `💎 ${booking.productInterest}\n`
  }

  message += `\nNos vemos em breve! 🎯`

  return message
}

function formatDatePT(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })
}

function getTimePeriod(time: string): string {
  const hour = parseInt(time.split(':')[0])

  if (hour < 12) return '(manhã)'
  if (hour < 18) return '(tarde)'
  return '(noite)'
}
