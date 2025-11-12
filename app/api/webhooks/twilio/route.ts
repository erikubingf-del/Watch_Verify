import { NextRequest, NextResponse } from 'next/server'
import { atCreate } from '@/utils/airtable'
import { chat } from '@/utils/openai'
import { validateTwilioRequest, createTwiMLResponse } from '@/lib/twilio'
import { logError, logInfo } from '@/lib/logger'
import {
  getVerificationSession,
  createVerificationSession,
  updateVerificationSession,
  isSessionComplete,
  getNextPrompt,
  clearVerificationSession,
  runVerification,
} from '@/lib/verification'

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
    // TODO: Look up from StoreNumbers table
    const tenantId = 'temp-tenant-id'

    // Step 4: Log message
    await atCreate('Messages', {
      tenant_id: tenantId,
      phone: wa,
      body,
      direction: 'inbound',
      media_url: mediaUrls[0] || null,
      created_at: new Date().toISOString(),
    } as any)

    let responseMessage = ''

    // Step 5: Check if this is part of a verification workflow
    let session = getVerificationSession(wa)

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
        session = createVerificationSession(tenantId, wa, 'Cliente')
        responseMessage = `✅ Vou iniciar a verificação do seu relógio!\n\n${getNextPrompt(session)}`
      } else if (session && numMedia > 0) {
        // User sent a document
        const mediaUrl = mediaUrls[0]

        // Determine document type based on session state
        if (session.state === 'awaiting_watch_photo') {
          session = updateVerificationSession(wa, 'watch', mediaUrl)
          responseMessage = `✅ Foto do relógio recebida!\n\n${getNextPrompt(session!)}`
        } else if (session.state === 'awaiting_guarantee') {
          session = updateVerificationSession(wa, 'guarantee', mediaUrl)
          responseMessage = `✅ Certificado recebido!\n\n${getNextPrompt(session!)}`
        } else if (session.state === 'awaiting_invoice') {
          session = updateVerificationSession(wa, 'invoice', mediaUrl)

          // Check if we have all documents
          if (isSessionComplete(session!)) {
            responseMessage = '⏳ Analisando todos os documentos... Isso levará alguns instantes.'

            // Run verification asynchronously
            try {
              const result = await runVerification({
                tenantId,
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
              clearVerificationSession(wa)
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
        session = createVerificationSession(tenantId, wa, 'Cliente')
        responseMessage = `✅ Vou iniciar a verificação do seu relógio!\n\n${getNextPrompt(session)}`
      }
    } else {
      // Step 6: Regular conversation (not verification)
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
