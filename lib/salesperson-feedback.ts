/**
 * Salesperson Feedback System
 *
 * Allows salespeople to enrich customer data after visits via audio or text.
 */

import { atSelect, atCreate, atUpdate, buildFormula } from '@/utils/airtable'
import { chat } from '@/utils/openai'
import { logInfo, logError } from './logger'

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
  tenant_id: string
  salesperson_phone: string
  customer_phone?: string
  customer_name?: string
  feedback_type: 'audio' | 'text'
  raw_input: string // URL for audio, text for text
  transcription?: string
  extracted_data?: FeedbackData
  matched_customers?: any[]
  state:
    | 'awaiting_transcription'
    | 'awaiting_extraction'
    | 'awaiting_disambiguation'
    | 'awaiting_confirmation'
    | 'awaiting_new_customer_confirm'
    | 'awaiting_follow_up'
    | 'completed'
    | 'cancelled'
  created_at: string
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
    const escapedName = customerName.replace(/'/g, "\\'")
    const firstName = customerName.split(' ')[0].replace(/'/g, "\\'")

    // Priority 1: Exact name + city match (highest confidence)
    if (city) {
      const escapedCity = city.replace(/'/g, "\\'")
      const exactMatchWithCity = await atSelect('Customers', {
        filterByFormula: `AND({tenant_id}='${tenantId}', LOWER({name})=LOWER('${escapedName}'), LOWER({city})=LOWER('${escapedCity}'))`,
      })

      if (exactMatchWithCity.length > 0) {
        logInfo('customer-search', 'Exact match with city found', {
          searchName: customerName,
          city,
          matches: exactMatchWithCity.length,
        })
        return exactMatchWithCity
      }
    }

    // Priority 2: Exact name match (any city)
    const exactMatches = await atSelect('Customers', {
      filterByFormula: `AND({tenant_id}='${tenantId}', LOWER({name})=LOWER('${escapedName}'))`,
    })

    if (exactMatches.length === 1) {
      // Single exact match - return it
      logInfo('customer-search', 'Single exact name match found', {
        searchName: customerName,
        matches: 1,
      })
      return exactMatches
    }

    if (exactMatches.length > 1 && city) {
      // Multiple exact matches, filter by city
      const cityMatches = exactMatches.filter(
        (c) => c.fields.city && c.fields.city.toLowerCase() === city.toLowerCase()
      )
      if (cityMatches.length > 0) {
        logInfo('customer-search', 'Filtered exact matches by city', {
          searchName: customerName,
          city,
          totalMatches: exactMatches.length,
          cityMatches: cityMatches.length,
        })
        return cityMatches
      }
    }

    if (exactMatches.length > 0) {
      // Return all exact matches for disambiguation
      return exactMatches
    }

    // Priority 3: Partial name + city match
    if (city) {
      const escapedCity = city.replace(/'/g, "\\'")
      const partialMatchWithCity = await atSelect('Customers', {
        filterByFormula: `AND({tenant_id}='${tenantId}', SEARCH(LOWER('${firstName}'), LOWER({name})) > 0, LOWER({city})=LOWER('${escapedCity}'))`,
        maxRecords: '5',
      })

      if (partialMatchWithCity.length > 0) {
        logInfo('customer-search', 'Partial match with city found', {
          searchName: customerName,
          city,
          matches: partialMatchWithCity.length,
        })
        return partialMatchWithCity
      }
    }

    // Priority 4: Partial name match (any city)
    const partialMatches = await atSelect('Customers', {
      filterByFormula: `AND({tenant_id}='${tenantId}', SEARCH(LOWER('${firstName}'), LOWER({name})) > 0)`,
      maxRecords: '5', // Limit to 5 matches
    })

    logInfo('customer-search', 'Customer search results', {
      searchName: customerName,
      city: city || 'not provided',
      partialMatches: partialMatches.length,
    })

    return partialMatches
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
    const customers = await atSelect('Customers', {
      filterByFormula: buildFormula('tenant_id', '=', tenantId) + `, {phone}='${phone}'`,
      maxRecords: '1',
    })

    return customers.length > 0 ? customers[0] : null
  } catch (error: any) {
    logError('customer-phone-search', error, { phone })
    return null
  }
}

/**
 * Get or create feedback session
 */
export async function getFeedbackSession(salespersonPhone: string): Promise<FeedbackSession | null> {
  try {
    const sessions = await atSelect<any>('FeedbackSessions', {
      filterByFormula: `AND({salesperson_phone}='${salespersonPhone}', {state}!='completed', {state}!='cancelled')`,
      maxRecords: '1',
    })

    if (sessions.length === 0) {
      return null
    }

    const record = sessions[0]
    return {
      id: record.id,
      tenant_id: record.fields.tenant_id,
      salesperson_phone: record.fields.salesperson_phone,
      customer_phone: record.fields.customer_phone,
      customer_name: record.fields.customer_name,
      feedback_type: record.fields.feedback_type,
      raw_input: record.fields.raw_input,
      transcription: record.fields.transcription,
      extracted_data: record.fields.extracted_data
        ? JSON.parse(record.fields.extracted_data)
        : undefined,
      matched_customers: record.fields.matched_customers
        ? JSON.parse(record.fields.matched_customers)
        : undefined,
      state: record.fields.state,
      created_at: record.fields.created_at,
    }
  } catch (error: any) {
    logError('feedback-session-get', error, { salespersonPhone })
    return null
  }
}

/**
 * Create new feedback session
 */
export async function createFeedbackSession(
  tenantId: string,
  salespersonPhone: string,
  feedbackType: 'audio' | 'text',
  rawInput: string
): Promise<FeedbackSession> {
  try {
    const record = await atCreate('FeedbackSessions', {
      tenant_id: [tenantId],
      salesperson_phone: salespersonPhone,
      feedback_type: feedbackType,
      raw_input: rawInput,
      state: feedbackType === 'audio' ? 'awaiting_transcription' : 'awaiting_extraction',
      created_at: new Date().toISOString(),
    } as any)

    logInfo('feedback-session-create', 'Feedback session created', {
      sessionId: record.id,
      type: feedbackType,
    })

    return {
      id: record.id,
      tenant_id: tenantId,
      salesperson_phone: salespersonPhone,
      feedback_type: feedbackType,
      raw_input: rawInput,
      state: feedbackType === 'audio' ? 'awaiting_transcription' : 'awaiting_extraction',
      created_at: new Date().toISOString(),
    }
  } catch (error: any) {
    logError('feedback-session-create', error)
    throw error
  }
}

/**
 * Update feedback session
 */
export async function updateFeedbackSession(
  salespersonPhone: string,
  updates: Partial<FeedbackSession>
): Promise<FeedbackSession | null> {
  try {
    // Get current session
    const currentSession = await getFeedbackSession(salespersonPhone)
    if (!currentSession) {
      return null
    }

    // Build update object
    const updateData: any = {}

    if (updates.transcription) updateData.transcription = updates.transcription
    if (updates.extracted_data)
      updateData.extracted_data = JSON.stringify(updates.extracted_data)
    if (updates.matched_customers)
      updateData.matched_customers = JSON.stringify(updates.matched_customers)
    if (updates.customer_phone) updateData.customer_phone = updates.customer_phone
    if (updates.customer_name) updateData.customer_name = updates.customer_name
    if (updates.state) updateData.state = updates.state

    await atUpdate('FeedbackSessions', currentSession.id, updateData)

    logInfo('feedback-session-update', 'Session updated', {
      sessionId: currentSession.id,
      newState: updates.state,
    })

    // Return updated session
    return await getFeedbackSession(salespersonPhone)
  } catch (error: any) {
    logError('feedback-session-update', error, { salespersonPhone })
    return null
  }
}

/**
 * Update customer with feedback data
 */
export async function updateCustomerWithFeedback(
  customerId: string,
  feedbackData: FeedbackData
): Promise<void> {
  try {
    const updateData: any = {}

    if (feedbackData.product_interest) {
      updateData.last_interest = feedbackData.product_interest
    }

    if (feedbackData.budget_min !== undefined) {
      updateData.budget_min = feedbackData.budget_min
    }

    if (feedbackData.budget_max !== undefined) {
      updateData.budget_max = feedbackData.budget_max
    }

    if (feedbackData.birthday) {
      updateData.birthday = feedbackData.birthday
    }

    if (feedbackData.city) {
      updateData.city = feedbackData.city
    }

    if (feedbackData.hobbies && feedbackData.hobbies.length > 0) {
      updateData.hobbies = feedbackData.hobbies.join(', ')
    }

    if (feedbackData.visit_notes || feedbackData.salesperson_notes) {
      // Get existing notes
      const customer = await atSelect('Customers', {
        filterByFormula: `RECORD_ID()='${customerId}'`,
        maxRecords: '1',
      })

      const existingNotes = customer[0]?.fields?.notes || ''
      const newNotes = [feedbackData.visit_notes, feedbackData.salesperson_notes]
        .filter(Boolean)
        .join(' | ')

      updateData.notes = existingNotes
        ? `${existingNotes}\n[${new Date().toISOString().split('T')[0]}] ${newNotes}`
        : `[${new Date().toISOString().split('T')[0]}] ${newNotes}`
    }

    updateData.last_visit = feedbackData.visited_at || new Date().toISOString().split('T')[0]
    updateData.updated_at = new Date().toISOString()

    await atUpdate('Customers', customerId, updateData)

    logInfo('customer-update-feedback', 'Customer updated with feedback', {
      customerId,
      fieldsUpdated: Object.keys(updateData),
    })
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
    await atCreate('Appointments', {
      tenant_id: [tenantId],
      customer_phone: customerPhone,
      customer_name: customerName,
      date: feedbackData.visited_at || new Date().toISOString().split('T')[0],
      time: 'N/A (walk-in)',
      product_interest: feedbackData.product_interest || null,
      status: 'completed',
      notes: feedbackData.visit_notes || null,
      created_at: new Date().toISOString(),
    } as any)

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
