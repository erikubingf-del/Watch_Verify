/**
 * Salesperson Feedback System
 *
 * Allows salespeople to enrich customer data after visits via audio or text.
 */

import { chat } from '@/utils/openai'
import { logInfo, logError } from './logger'
import { prisma } from '@/lib/prisma'
import { SessionManager } from './session-manager'

// Initialize session manager for feedback
const sessionManager = new SessionManager<FeedbackSession>('feedback_session')

export interface FeedbackData {
  customer_name: string
  customer_phone?: string
  city?: string // NEW: Customer's city for better matching
  product_interest?: string
  budget_min?: number
  budget_max?: number
  birthday?: string // MM-DD format
  hobbies?: string[]
  visit_notes?: string
  next_action?: string
  visited_at?: string // YYYY-MM-DD
  salesperson_notes?: string
}

export interface FeedbackSession {
  id: string
  tenantId: string
  salespersonPhone: string
  customerPhone?: string
  customerName?: string
  feedbackType: 'audio' | 'text'
  rawInput: string // URL for audio, text for text
  transcription?: string
  extractedData?: FeedbackData
  matchedCustomers?: any[]
  state:
  | 'awaiting_transcription'
  | 'awaiting_extraction'
  | 'awaiting_disambiguation'
  | 'awaiting_confirmation'
  | 'awaiting_new_customer_confirm'
  | 'awaiting_follow_up'
  | 'completed'
  | 'cancelled'
  createdAt: string
  updatedAt: string
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    logInfo('whisper-transcription', 'Starting audio transcription', { audioUrl })

    // Download audio from Twilio
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`)
    }

    const audioBuffer = await response.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' })

    // Create FormData for Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.ogg')
    formData.append('model', 'whisper-1')
    formData.append('language', 'pt') // Portuguese

    // Call Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text()
      throw new Error(`Whisper API error: ${error}`)
    }

    const result = await whisperResponse.json()
    const transcription = result.text

    logInfo('whisper-transcription', 'Transcription successful', {
      audioUrl,
      transcriptionLength: transcription.length,
    })

    return transcription
  } catch (error: any) {
    logError('whisper-transcription', error, { audioUrl })
    throw new Error(`Failed to transcribe audio: ${error.message}`)
  }
}

/**
 * Extract structured data from feedback text using GPT-4
 */
export async function extractFeedbackData(text: string): Promise<FeedbackData> {
  try {
    const today = new Date().toISOString().split('T')[0]

    const prompt = `Extract structured customer feedback from this salesperson's message:

"${text}"

Return ONLY a valid JSON object with these fields (use null if not mentioned):
{
  "customer_name": "string or null",
  "customer_phone": "string or null (format +55XXXXXXXXXXX)",
  "city": "string or null (customer's city if mentioned)",
  "product_interest": "string or null",
  "budget_min": number or null,
  "budget_max": number or null,
  "birthday": "string or null (MM-DD format only, no year)",
  "hobbies": ["string"] or null,
  "visit_notes": "string or null",
  "next_action": "string or null",
  "visited_at": "${today}",
  "salesperson_notes": "string or null"
}

Rules:
- Extract only what was explicitly mentioned
- Extract city if mentioned (e.g., "João de São Paulo" → city: "São Paulo")
- Convert dates to standardized formats (birthday: MM-DD)
- Extract budget ranges if mentioned ("40-60k" → min: 40000, max: 60000)
- Identify product brands and models
- Be conservative - if unsure, use null
- visited_at is always today's date: ${today}

Return ONLY the JSON object, no markdown, no explanations.`

    const response = await chat(
      [
        {
          role: 'system',
          content:
            'You are a data extraction specialist. Extract structured data from salesperson feedback and return ONLY valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      0.1 // Low temperature for consistency
    )

    // Parse JSON response
    const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim()
    const extractedData: FeedbackData = JSON.parse(cleanedResponse)

    logInfo('feedback-extraction', 'Data extracted successfully', {
      customerName: extractedData.customer_name,
      hasProduct: !!extractedData.product_interest,
      hasBudget: !!extractedData.budget_min,
    })

    return extractedData
  } catch (error: any) {
    logError('feedback-extraction', error, { text: text.substring(0, 100) })
    throw new Error(`Failed to extract feedback data: ${error.message}`)
  }
}

/**
 * Search for customers matching name with city filtering for better accuracy
 */
export async function findCustomersByName(
  tenantId: string,
  customerName: string,
  city?: string
): Promise<any[]> {
  try {
    // Prisma search
    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        name: {
          contains: customerName,
          mode: 'insensitive'
        }
      },
      take: 5
    })

    // Map to expected format (Airtable-like structure for compatibility with existing logic if needed, 
    // but better to return clean objects. The service expects .fields property though)
    // We'll map to a structure compatible with the service logic
    const mappedCustomers = customers.map(c => ({
      id: c.id,
      fields: {
        name: c.name,
        phone: c.phone,
        city: (c.profile as any)?.city,
        last_visit: c.lastInteraction ? c.lastInteraction.toISOString().split('T')[0] : null,
        last_interest: (c.profile as any)?.interests?.[0]
      }
    }))

    if (city) {
      const cityMatches = mappedCustomers.filter(
        c => c.fields.city && c.fields.city.toLowerCase() === city.toLowerCase()
      )
      if (cityMatches.length > 0) return cityMatches
    }

    return mappedCustomers
  } catch (error: any) {
    logError('customer-search', error, { customerName, city })
    return []
  }
}

/**
 * Find customer by phone
 */
export async function findCustomerByPhone(tenantId: string, phone: string): Promise<any | null> {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        tenantId_phone: {
          tenantId,
          phone
        }
      }
    })

    if (!customer) return null

    return {
      id: customer.id,
      fields: {
        name: customer.name,
        phone: customer.phone,
        city: (customer.profile as any)?.city,
        last_visit: customer.lastInteraction ? customer.lastInteraction.toISOString().split('T')[0] : null,
        last_interest: (customer.profile as any)?.interests?.[0]
      }
    }
  } catch (error: any) {
    logError('customer-phone-search', error, { phone })
    return null
  }
}

/**
 * Get or create feedback session (Redis)
 */
export async function getFeedbackSession(salespersonPhone: string): Promise<FeedbackSession | null> {
  return await sessionManager.get(salespersonPhone)
}

/**
 * Create new feedback session (Redis)
 */
export async function createFeedbackSession(
  tenantId: string,
  salespersonPhone: string,
  feedbackType: 'audio' | 'text',
  rawInput: string
): Promise<FeedbackSession> {
  const session: FeedbackSession = {
    id: crypto.randomUUID(),
    tenantId,
    salespersonPhone,
    feedbackType,
    rawInput,
    state: feedbackType === 'audio' ? 'awaiting_transcription' : 'awaiting_extraction',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await sessionManager.create(salespersonPhone, session)
  return session
}

/**
 * Update feedback session (Redis)
 */
export async function updateFeedbackSession(
  salespersonPhone: string,
  updates: Partial<FeedbackSession>
): Promise<FeedbackSession | null> {
  const currentSession = await sessionManager.get(salespersonPhone)
  if (!currentSession) return null

  const updatedSession = { ...currentSession, ...updates }
  await sessionManager.create(salespersonPhone, updatedSession) // Overwrite with updates

  return updatedSession
}

/**
 * Update customer with feedback data
 */
export async function updateCustomerWithFeedback(
  customerId: string,
  feedbackData: FeedbackData
): Promise<void> {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) throw new Error('Customer not found')

    const profile = (customer.profile as any) || {}

    // Update profile fields
    if (feedbackData.city) profile.city = feedbackData.city
    if (feedbackData.birthday) profile.birthday = feedbackData.birthday
    if (feedbackData.budget_min) profile.budget_min = feedbackData.budget_min
    if (feedbackData.budget_max) profile.budget_max = feedbackData.budget_max
    if (feedbackData.hobbies) profile.hobbies = feedbackData.hobbies
    if (feedbackData.product_interest) {
      profile.interests = [...(profile.interests || []), feedbackData.product_interest]
    }

    // Update notes
    let notes = (customer.profile as any)?.notes || ''
    if (feedbackData.visit_notes || feedbackData.salesperson_notes) {
      const newNotes = [feedbackData.visit_notes, feedbackData.salesperson_notes].filter(Boolean).join(' | ')
      notes = notes ? `${notes}\n[${new Date().toISOString().split('T')[0]}] ${newNotes}` : `[${new Date().toISOString().split('T')[0]}] ${newNotes}`
      profile.notes = notes
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        profile,
        lastInteraction: new Date()
      }
    })

    // Also add to CustomerMemory if we have interesting facts
    if (feedbackData.product_interest || feedbackData.budget_min || feedbackData.hobbies) {
      const facts = []
      if (feedbackData.product_interest) facts.push(`Interested in ${feedbackData.product_interest}`)
      if (feedbackData.budget_min) facts.push(`Budget range: ${feedbackData.budget_min} - ${feedbackData.budget_max || 'up'}`)
      if (feedbackData.hobbies) facts.push(`Hobbies: ${feedbackData.hobbies.join(', ')}`)

      for (const fact of facts) {
        await prisma.customerMemory.create({
          data: {
            customerId,
            fact,
            source: 'feedback',
            confidence: 0.9
          }
        })
      }
    }

    logInfo('customer-update-feedback', 'Customer updated with feedback', { customerId })
  } catch (error: any) {
    logError('customer-update-feedback', error, { customerId })
    throw error
  }
}

/**
 * Create appointment record for visit
 */
export async function createVisitRecord(
  tenantId: string,
  customerPhone: string,
  customerName: string,
  feedbackData: FeedbackData
): Promise<void> {
  try {
    // Find customer first to link
    const customer = await prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: customerPhone } }
    })

    await prisma.appointment.create({
      data: {
        tenantId,
        customerId: customer?.id, // Link if exists
        salespersonId: 'system', // TODO: Link to actual salesperson user if available
        date: new Date(feedbackData.visited_at || new Date()),
        time: 'N/A (walk-in)',
        status: 'completed',
        notes: feedbackData.visit_notes || undefined,
        metadata: {
          product_interest: feedbackData.product_interest,
          source: 'walk-in'
        }
      }
    })

    logInfo('visit-record-create', 'Visit record created', {
      customerPhone,
      date: feedbackData.visited_at,
    })
  } catch (error: any) {
    logError('visit-record-create', error, { customerPhone })
    // Don't throw - visit record is not critical
  }
}

/**
 * Generate follow-up message suggestion
 */
export async function generateFollowUpMessage(
  customerName: string,
  feedbackData: FeedbackData
): Promise<string> {
  try {
    const prompt = `Generate a friendly, professional WhatsApp follow-up message for a luxury watch/jewelry customer.

Customer: ${customerName}
${feedbackData.product_interest ? `Interested in: ${feedbackData.product_interest}` : ''}
${feedbackData.visit_notes ? `Visit notes: ${feedbackData.visit_notes}` : ''}
${feedbackData.next_action ? `Next action: ${feedbackData.next_action}` : ''}

Requirements:
- Warm and personal tone (use "você")
- Reference the product they were interested in
- Short (2-3 sentences max)
- Include subtle call-to-action
- Brazilian Portuguese
- End with a friendly emoji

Return ONLY the message text, no quotes.`

    const message = await chat(
      [
        {
          role: 'system',
          content:
            'You are a luxury retail sales assistant. Generate warm, personal follow-up messages.',
        },
        { role: 'user', content: prompt },
      ],
      0.7
    )

    return message.trim().replace(/^"|"$/g, '')
  } catch (error: any) {
    logError('follow-up-generation', error)
    // Fallback message
    return `Olá ${customerName}! Foi um prazer recebê-lo. ${feedbackData.product_interest ? `O ${feedbackData.product_interest} que você viu está disponível.` : ''} Quando quiser agendar outra visita, é só me chamar! 😊`
  }
}

/**
 * Format disambiguation options with city for better identification
 */
export function formatDisambiguationOptions(customers: any[]): string {
  let message = `Encontrei ${customers.length} clientes com nome similar. Qual deles?\n\n`

  customers.forEach((customer, index) => {
    const num = index + 1
    const cityInfo = customer.fields.city ? ` - ${customer.fields.city}` : ''
    message += `${num}️⃣ ${customer.fields.name}${cityInfo} - ${customer.fields.phone}\n`

    if (customer.fields.last_visit) {
      message += `   Última visita: ${customer.fields.last_visit}\n`
    }

    if (customer.fields.last_interest) {
      message += `   Interesse: ${customer.fields.last_interest}\n`
    }

    message += `\n`
  })

  message += `Responda com o número (1, 2, 3...) ou "nenhum" se for um cliente novo.`

  return message
}

/**
 * Format confirmation message
 */
export function formatConfirmationMessage(customerName: string, feedbackData: FeedbackData): string {
  let message = `Confirma as informações do ${customerName}?\n\n`

  if (feedbackData.product_interest) {
    message += `✅ Interesse: ${feedbackData.product_interest}\n`
  }

  if (feedbackData.budget_min || feedbackData.budget_max) {
    const budgetText =
      feedbackData.budget_min && feedbackData.budget_max
        ? `R$ ${feedbackData.budget_min.toLocaleString('pt-BR')} - R$ ${feedbackData.budget_max.toLocaleString('pt-BR')}`
        : feedbackData.budget_min
          ? `R$ ${feedbackData.budget_min.toLocaleString('pt-BR')}+`
          : `Até R$ ${feedbackData.budget_max?.toLocaleString('pt-BR')}`

    message += `✅ Budget: ${budgetText}\n`
  }

  if (feedbackData.birthday) {
    const [month, day] = feedbackData.birthday.split('-')
    message += `✅ Aniversário: ${day}/${month}\n`
  }

  if (feedbackData.hobbies && feedbackData.hobbies.length > 0) {
    message += `✅ Hobbies: ${feedbackData.hobbies.join(', ')}\n`
  }

  if (feedbackData.visit_notes) {
    message += `✅ Observação: ${feedbackData.visit_notes}\n`
  }

  if (feedbackData.next_action) {
    message += `✅ Próxima ação: ${feedbackData.next_action}\n`
  }

  message += `\nConfirmar? (Sim/Não)`

  return message
}
