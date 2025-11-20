/**
 * Document OCR and Analysis using GPT-4 Vision
 *
 * Extracts structured data from watch verification documents:
 * - Watch photos (reference number, serial, condition)
 * - Guarantee cards (reference, serial, date, store)
 * - Invoices/Nota Fiscal (date, store, amount, reference)
 */

import { logInfo, logError } from './logger'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const VISION_MODEL = 'gpt-4o' // Supports vision

export interface WatchPhotoAnalysis {
  brand?: string
  model?: string
  reference_number?: string
  serial_number?: string
  condition_notes?: string
  authenticity_markers?: string[]
  visible_damage?: string[]
}

export interface GuaranteeCardAnalysis {
  brand?: string
  model?: string
  reference_number?: string
  serial_number?: string
  purchase_date?: string
  store_name?: string
  store_location?: string
  warranty_duration?: string
}

export interface InvoiceAnalysis {
  invoice_number?: string
  invoice_date?: string
  store_name?: string
  store_cnpj?: string
  store_address?: string
  product_description?: string
  reference_number?: string
  serial_number?: string
  amount?: number
  currency?: string
}

/**
 * Analyze watch photo using GPT-4 Vision
 */
export async function analyzeWatchPhoto(imageUrl: string): Promise<WatchPhotoAnalysis> {
  const prompt = `Analyze this luxury watch photo and extract the following information:

1. Brand (Rolex, Patek Philippe, Audemars Piguet, etc.)
2. Model (Submariner, Nautilus, Royal Oak, etc.)
3. Reference number (visible on dial, caseback, or between lugs)
4. Serial number (if visible on caseback or between lugs)
5. Condition notes (scratches, wear, polishing signs)
6. Authenticity markers (correct logo, fonts, dial details, crown guards)
7. Any visible damage or modifications

Return ONLY a JSON object with these fields (use null if not visible):
{
  "brand": "string or null",
  "model": "string or null",
  "reference_number": "string or null",
  "serial_number": "string or null",
  "condition_notes": "string or null",
  "authenticity_markers": ["marker1", "marker2"] or [],
  "visible_damage": ["damage1", "damage2"] or []
}

Be precise. If you cannot clearly read something, return null for that field.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for precision
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    // Parse JSON response
    const analysis = JSON.parse(content)

    logInfo('watch-photo-analysis', 'Photo analyzed', {
      brand: analysis.brand,
      reference: analysis.reference_number,
    })

    return analysis
  } catch (error: any) {
    logError('watch-photo-analysis', error)
    return {}
  }
}

/**
 * Analyze guarantee card using GPT-4 Vision
 */
export async function analyzeGuaranteeCard(imageUrl: string): Promise<GuaranteeCardAnalysis> {
  const prompt = `Analyze this watch guarantee card/warranty certificate and extract:

1. Brand
2. Model
3. Reference number
4. Serial number
5. Purchase date (format: YYYY-MM-DD)
6. Store name (authorized dealer)
7. Store location (city, country)
8. Warranty duration (e.g., "2 years", "5 years")

Return ONLY a JSON object:
{
  "brand": "string or null",
  "model": "string or null",
  "reference_number": "string or null",
  "serial_number": "string or null",
  "purchase_date": "YYYY-MM-DD or null",
  "store_name": "string or null",
  "store_location": "string or null",
  "warranty_duration": "string or null"
}

Be precise with dates (convert to YYYY-MM-DD). If illegible, return null.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    const analysis = JSON.parse(content)

    logInfo('guarantee-card-analysis', 'Guarantee card analyzed', {
      reference: analysis.reference_number,
      date: analysis.purchase_date,
    })

    return analysis
  } catch (error: any) {
    logError('guarantee-card-analysis', error)
    return {}
  }
}

/**
 * Analyze invoice (Nota Fiscal) using GPT-4 Vision
 */
export async function analyzeInvoice(imageUrl: string): Promise<InvoiceAnalysis> {
  const prompt = `Analyze this invoice/Nota Fiscal and extract:

1. Invoice number
2. Invoice date (format: YYYY-MM-DD)
3. Store/Company name
4. CNPJ (Brazilian company ID, if present)
5. Store address
6. Product description (should mention watch brand/model)
7. Reference number (if mentioned in product description)
8. Serial number (if mentioned)
9. Total amount
10. Currency (BRL, USD, EUR, etc.)

Return ONLY a JSON object:
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "store_name": "string or null",
  "store_cnpj": "string or null",
  "store_address": "string or null",
  "product_description": "string or null",
  "reference_number": "string or null",
  "serial_number": "string or null",
  "amount": number or null,
  "currency": "string or null"
}

Be precise with dates and numbers. If illegible, return null.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    const analysis = JSON.parse(content)

    logInfo('invoice-analysis', 'Invoice analyzed', {
      number: analysis.invoice_number,
      date: analysis.invoice_date,
      amount: analysis.amount,
    })

    return analysis
  } catch (error: any) {
    logError('invoice-analysis', error)
    return {}
  }
}

/**
 * Cross-reference all documents and identify mismatches
 */
export interface CrossReferenceResult {
  reference_match: boolean
  reference_mismatch_details?: string
  serial_match: boolean
  serial_mismatch_details?: string
  date_match: boolean
  date_mismatch_details?: string
  model_match: boolean
  model_mismatch_details?: string
  issues: string[]
  warnings: string[]
  passed_checks: string[]
}

export function crossReferenceDocuments(
  photo: WatchPhotoAnalysis,
  guarantee: GuaranteeCardAnalysis,
  invoice: InvoiceAnalysis,
  customerStatedModel: string
): CrossReferenceResult {
  const issues: string[] = []
  const warnings: string[] = []
  const passed: string[] = []

  // Reference number check
  const refs = [
    photo.reference_number,
    guarantee.reference_number,
    invoice.reference_number,
  ].filter(Boolean)

  const uniqueRefs = [...new Set(refs)]
  const reference_match = uniqueRefs.length <= 1

  if (!reference_match && uniqueRefs.length > 1) {
    issues.push(
      `Referência inconsistente: Foto="${photo.reference_number}", Garantia="${guarantee.reference_number}", NF="${invoice.reference_number}"`
    )
  } else if (reference_match && refs.length > 0) {
    passed.push(`Referência consistente: ${uniqueRefs[0]}`)
  }

  // Serial number check
  const serials = [photo.serial_number, guarantee.serial_number, invoice.serial_number].filter(
    Boolean
  )

  const uniqueSerials = [...new Set(serials)]
  const serial_match = uniqueSerials.length <= 1

  if (!serial_match && uniqueSerials.length > 1) {
    issues.push(
      `Serial inconsistente: Foto="${photo.serial_number}", Garantia="${guarantee.serial_number}"`
    )
  } else if (serial_match && serials.length > 0) {
    passed.push(`Serial consistente: ${uniqueSerials[0]}`)
  }

  // Date check (guarantee vs invoice)
  let date_match = true
  if (guarantee.purchase_date && invoice.invoice_date) {
    const guaranteeDate = new Date(guarantee.purchase_date)
    const invoiceDate = new Date(invoice.invoice_date)
    const diffDays = Math.abs(
      (guaranteeDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays > 60) {
      date_match = false
      warnings.push(
        `Datas divergem: Garantia=${guarantee.purchase_date}, NF=${invoice.invoice_date} (${Math.round(diffDays)} dias de diferença)`
      )
    } else {
      passed.push(`Datas consistentes (${Math.round(diffDays)} dias de diferença)`)
    }
  }

  // Model check (customer stated vs documents)
  const models = [photo.model, guarantee.model].filter(Boolean)
  const model_match = models.every(
    (m) => customerStatedModel.toLowerCase().includes(m!.toLowerCase()) ||
      m!.toLowerCase().includes(customerStatedModel.toLowerCase())
  )

  if (!model_match && models.length > 0) {
    warnings.push(
      `Cliente mencionou "${customerStatedModel}" mas documentos mostram "${models.join(', ')}"`
    )
  } else if (model_match) {
    passed.push(`Modelo consistente com declaração do cliente`)
  }

  return {
    reference_match,
    reference_mismatch_details: !reference_match ? issues.join('; ') : undefined,
    serial_match,
    serial_mismatch_details: !serial_match ? issues.join('; ') : undefined,
    date_match,
    date_mismatch_details: !date_match ? warnings.join('; ') : undefined,
    model_match,
    model_mismatch_details: !model_match ? warnings.join('; ') : undefined,
    issues,
    warnings,
    passed_checks: passed,
  }
}
