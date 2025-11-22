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
import {
  getEnhancedVerificationSession,
  createEnhancedVerificationSession,
  updateEnhancedVerificationSession,
  getVerificationPrompt,
  isVerificationComplete,
  isValidCPF,
  maskCPF,
} from '@/lib/enhanced-verification'
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
import { calculateLegalRisk, formatLegalRiskForAirtable } from '@/lib/legal-risk'
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
import {
  getFeedbackSession,
  createFeedbackSession,
  updateFeedbackSession,
  transcribeAudio,
  extractFeedbackData,
  findCustomersByName,
  findCustomerByPhone,
  updateCustomerWithFeedback,
  createVisitRecord,
  generateFollowUpMessage,
  formatDisambiguationOptions,
  formatConfirmationMessage,
} from '@/lib/salesperson-feedback'

// Force dynamic rendering and increase timeout for webhook processing
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for webhook processing
// Updated: 2025-11-22 - Fixed Store Numbers table name

/**
 * Upload media to Cloudinary for permanent storage
 */
async function uploadToCloudinary(twilioMediaUrl: string): Promise<string> {
  try {
    const cloudinary = require('cloudinary').v2

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    // Upload from Twilio URL
    const result = await cloudinary.uploader.upload(twilioMediaUrl, {
      folder: 'watch-verify',
      resource_type: 'auto',
    })

    return result.secure_url
  } catch (error: any) {
    logError('cloudinary-upload', error)
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`)
  }
}

/**
 * Check if tenant has enhanced verification enabled
 */
async function isEnhancedVerificationEnabled(tenantId: string): Promise<boolean> {
  try {
    const settings = await atSelect('Settings', {
      filterByFormula: buildFormula('tenant_id', '=', tenantId),
      maxRecords: '1',
    })

    if (settings.length === 0) {
      return false
    }

    return settings[0].fields.verification_enabled === true
  } catch (error: any) {
    logError('verification-settings-check', error)
    return false
  }
}

/**
 * Check if tenant offers watch purchases
 */
async function offersWatchPurchase(tenantId: string): Promise<boolean> {
  try {
    const settings = await atSelect('Settings', {
      filterByFormula: buildFormula('tenant_id', '=', tenantId),
      maxRecords: '1',
    })

    if (settings.length === 0) {
      return false
    }

    return settings[0].fields.offers_purchase === true
  } catch (error: any) {
    logError('purchase-settings-check', error)
    return false
  }
}

/**
 * Check if phone number belongs to a salesperson
 */
async function isSalesperson(tenantId: string, phone: string): Promise<boolean> {
  try {
    // Check Users table
    const users = await atSelect('Users', {
      filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${phone}')`,
      maxRecords: '1',
    })

    if (users.length > 0) {
      return true
    }

    // Check Salespeople table (if exists)
    try {
      const salespeople = await atSelect('Salespeople', {
        filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${phone}')`,
        maxRecords: '1',
      })

      return salespeople.length > 0
    } catch {
      // Salespeople table might not exist
      return false
    }
  } catch (error: any) {
    logError('salesperson-check', error, { phone })
    return false
  }
}

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

    // Log incoming webhook for debugging
    logInfo('twilio-webhook-received', 'Incoming webhook', {
      url,
      hasSignature: !!signature,
      from: params.From,
      to: params.To,
      body: params.Body?.substring(0, 50),
    })

    // TEMPORARY: Skip signature validation to debug
    // TODO: Remove this after debugging signature issues
    const skipValidation = process.env.TWILIO_SKIP_SIGNATURE_VALIDATION === 'true'
    const isValid = skipValidation ? true : validateTwilioRequest(signature, url, params)

    if (!isValid) {
      logError('twilio-webhook', new Error('Invalid Twilio signature'), {
        url,
        signature: signature ? signature.substring(0, 20) + '...' : 'NO_SIGNATURE',
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        authTokenLength: process.env.TWILIO_AUTH_TOKEN?.length || 0,
        paramsKeys: Object.keys(params),
        skipValidation,
      })
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { status: 403, headers: { 'content-type': 'application/xml' } }
      )
    }

    if (skipValidation) {
      logInfo('twilio-webhook-bypass', 'Signature validation bypassed (TEMPORARY)', { url })
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
      logInfo('tenant-lookup-attempt', 'Looking up tenant', {
        toNumber,
        rawTo: to,
        from: from,
      })

      const storeNumbers = await atSelect('Store Numbers', {
        filterByFormula: buildFormula('Phone Number', '=', toNumber),
        maxRecords: '1'
      })

      logInfo('tenant-lookup-result', 'Store Numbers query result', {
        found: storeNumbers.length,
        hasRecords: storeNumbers.length > 0,
        hasTenantField: storeNumbers.length > 0 ? !!storeNumbers[0].fields.Tenant : false,
      })

      if (storeNumbers.length > 0 && storeNumbers[0].fields.Tenant) {
        // Tenant is a linked record (array), get first element
        const tenantIds = storeNumbers[0].fields.Tenant as any
        tenantId = Array.isArray(tenantIds) ? tenantIds[0] : tenantIds
        logInfo('tenant-lookup', 'Tenant ID resolved', { phone: toNumber, tenantId })
      } else {
        logError('tenant-lookup', new Error('No tenant found for phone number'), {
          phone: toNumber,
          rawTo: to,
          searchedNumber: toNumber,
        })
        // Return error message to user
        return new NextResponse(
          createTwiMLResponse('⚠️ Número não configurado. Por favor, entre em contato com o suporte.'),
          { headers: { 'content-type': 'application/xml' } }
        )
      }
    } catch (error: any) {
      logError('tenant-lookup', error, {
        phone: toNumber,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 200),
      })
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
      tenant_id: [validTenantId], // Linked record field requires array
      phone: wa,
      body,
      direction: 'inbound',
      media_url: mediaUrls[0] || null,
      created_at: new Date().toISOString(),
    } as any)

    let responseMessage = ''

    // Step 5: Check if this is a salesperson giving feedback
    const isFromSalesperson = await isSalesperson(validTenantId, wa)
    let feedbackSession = await getFeedbackSession(wa)

    // Detect feedback intent
    const isFeedback =
      body.toLowerCase().startsWith('/feedback') ||
      (isFromSalesperson &&
        (numMedia > 0 || feedbackSession || body.toLowerCase().includes('atendi')))

    if (isFromSalesperson && isFeedback) {
      // Handle salesperson feedback workflow
      responseMessage = await handleSalespersonFeedback(
        feedbackSession,
        body,
        numMedia,
        mediaUrls,
        validTenantId,
        wa,
        toNumber
      )
    } else {
      // Step 6: Check for enhanced verification flow
      const enhancedVerificationEnabled = await isEnhancedVerificationEnabled(validTenantId)
      const offersWatchPurchaseEnabled = await offersWatchPurchase(validTenantId)
      let enhancedSession = await getEnhancedVerificationSession(wa)

      // Detect if customer wants to sell a watch
      const wantsSellWatch =
        body.toLowerCase().includes('vender') ||
        (body.toLowerCase().includes('comprar') && body.toLowerCase().includes('vocês')) ||
        body.toLowerCase().includes('compram') ||
        (enhancedSession && enhancedSession.state !== 'completed')

      if (enhancedVerificationEnabled && offersWatchPurchaseEnabled && wantsSellWatch) {
        // Handle enhanced verification workflow
        responseMessage = await handleEnhancedVerification(
          enhancedSession,
          body,
          numMedia,
          mediaUrls,
          validTenantId,
          wa
        )
      } else {
        // Step 7: Check if this is part of a booking workflow
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

    // Step 7: Send message via Twilio Messaging API (instead of TwiML)
    // This bypasses sandbox geographic restrictions
    const { sendWhatsAppMessage } = await import('@/lib/twilio')
    const messageSent = await sendWhatsAppMessage(from, responseMessage, to)

    if (messageSent) {
      // Log outbound message only if sent successfully
      await atCreate('Messages', {
        tenant_id: [validTenantId], // Linked record field requires array
        phone: wa,
        body: responseMessage,
        direction: 'outbound',
        created_at: new Date().toISOString(),
      } as any)

      logInfo('twilio-webhook-success', 'Message sent via Messaging API', {
        phone: wa,
        responseLength: responseMessage.length,
      })
    } else {
      logError('twilio-webhook', new Error('Failed to send message via Messaging API'), {
        phone: wa,
      })
    }

    // Step 8: Return empty TwiML (message already sent via API)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'content-type': 'application/xml' },
    })
  } catch (e: any) {
    logError('twilio-webhook', e, {
      errorMessage: e.message,
      errorStack: e.stack?.substring(0, 300),
      errorName: e.name,
    })
    return new NextResponse(createTwiMLResponse('Desculpe, houve um erro. Tente novamente mais tarde.'), {
      status: 500,
      headers: { 'content-type': 'application/xml' },
    })
  }
}

// ==========================================
// Salesperson Feedback Handler
// ==========================================

async function handleSalespersonFeedback(
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
        let matchedCustomers = []

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
        choice > session.matched_customers.length
      ) {
        return `Por favor, responda com o número (1-${session.matched_customers.length}) ou "nenhum".`
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
        const { sendWhatsAppMessage } = await import('@/lib/twilio')
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

// ==========================================
// Enhanced Verification Handler
// ==========================================

async function handleEnhancedVerification(
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
        customer_stated_model: message,
        state: 'awaiting_watch_photo',
      })

      return 'Ótimo! Vou precisar de algumas fotos e documentos. Primeiro, envie uma foto clara do relógio, mostrando o mostrador e a caixa.'
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

      // Update session
      await updateEnhancedVerificationSession(customerPhone, {
        watch_photo_url: photoUrl,
        state: 'awaiting_guarantee',
      })

      return 'Perfeito! Agora envie uma foto do certificado de garantia (guarantee card).'
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
      const photoAnalysis = currentSession?.watch_photo_url
        ? await analyzeWatchPhoto(currentSession.watch_photo_url)
        : null

      // Cross-reference: check if reference numbers match
      if (
        photoAnalysis?.reference_number &&
        guaranteeAnalysis.reference_number &&
        photoAnalysis.reference_number !== guaranteeAnalysis.reference_number
      ) {
        return `⚠️ Notei que o certificado indica referência **${guaranteeAnalysis.reference_number}** mas a foto mostra **${photoAnalysis.reference_number}**. Você tem certeza que enviou os documentos do relógio correto? Se sim, responda "sim" para continuar.`
      }

      // Update session
      await updateEnhancedVerificationSession(customerPhone, {
        guarantee_card_url: guaranteeUrl,
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
      const photoAnalysis = currentSession?.watch_photo_url
        ? await analyzeWatchPhoto(currentSession.watch_photo_url)
        : null
      const guaranteeAnalysis = currentSession?.guarantee_card_url
        ? await analyzeGuaranteeCard(currentSession.guarantee_card_url)
        : null

      // Cross-reference: check date mismatch
      if (guaranteeAnalysis?.purchase_date && invoiceAnalysis.invoice_date) {
        const guaranteeDate = new Date(guaranteeAnalysis.purchase_date)
        const invoiceDate = new Date(invoiceAnalysis.invoice_date)
        const daysDiff = Math.abs((guaranteeDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff > 60) {
          await updateEnhancedVerificationSession(customerPhone, {
            invoice_url: invoiceUrl,
            state: 'awaiting_date_explanation',
          })

          return `A Nota Fiscal é de **${invoiceAnalysis.invoice_date}** mas o certificado de garantia é **${guaranteeAnalysis.purchase_date}**. Qual o motivo dessa diferença?`
        }
      }

      // Update session
      await updateEnhancedVerificationSession(customerPhone, {
        invoice_url: invoiceUrl,
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
        date_mismatch_reason: message,
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
        const additionalDocs = currentSession?.additional_documents || []
        additionalDocs.push(additionalUrl)

        await updateEnhancedVerificationSession(customerPhone, {
          additional_documents: additionalDocs,
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
    const photoAnalysis = session.watch_photo_url
      ? await analyzeWatchPhoto(session.watch_photo_url)
      : ({} as any)

    const guaranteeAnalysis = session.guarantee_card_url
      ? await analyzeGuaranteeCard(session.guarantee_card_url)
      : ({} as any)

    const invoiceAnalysis = session.invoice_url ? await analyzeInvoice(session.invoice_url) : ({} as any)

    // Cross-reference
    const crossReference = crossReferenceDocuments(
      photoAnalysis,
      guaranteeAnalysis,
      invoiceAnalysis,
      session.customer_stated_model || ''
    )

    // Calculate legal risk assessment
    const legalRisk = calculateLegalRisk(
      crossReference.icd,
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

    // Store report in WatchVerify table
    const verificationId = session.id.substring(0, 8).toUpperCase()

    await atCreate('WatchVerify', {
      tenant_id: [tenantId],
      customer: session.customer_name,
      phone: customerPhone,
      cpf: session.cpf,
      brand: photoAnalysis.brand || guaranteeAnalysis.brand || '',
      model: photoAnalysis.model || guaranteeAnalysis.model || session.customer_stated_model || '',
      reference: photoAnalysis.reference_number || guaranteeAnalysis.reference_number || '',
      serial: photoAnalysis.serial_number || guaranteeAnalysis.serial_number || '',
      icd: legalRisk.icd, // NEW: Store ICD score
      status: legalRisk.color === 'red' ? 'rejected' : legalRisk.color === 'green' ? 'approved' : 'manual_review',
      photo_url: session.watch_photo_url,
      guarantee_url: session.guarantee_card_url,
      invoice_url: session.invoice_url,
      issues: JSON.stringify(legalRisk.criticalIssues), // Store as JSON
      recommendations: JSON.stringify(legalRisk.warnings), // Store as JSON
      notes: report,
      created_at: session.created_at,
      completed_at: new Date().toISOString(),
    } as any)

    // Send notification to store owner
    const storeNotification = generateStoreNotification(
      session.customer_name,
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
