import { logError, logInfo } from './logger'

/**
 * Watch analysis using GPT-4 Vision
 * Extracts brand, model, reference, serial, and condition from photos
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const VISION_MODEL = 'gpt-4o' // GPT-4 Turbo with vision

export interface WatchAnalysisResult {
  brand: string | null
  model: string | null
  reference: string | null
  serial: string | null
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  confidence: number // 0-100
  details: string
  issues: string[]
}

export interface GuaranteeCardAnalysis {
  serial: string | null
  brand: string | null
  model: string | null
  purchaseDate: string | null
  dealer: string | null
  isValid: boolean
  confidence: number
  issues: string[]
}

export interface InvoiceAnalysis {
  amount: number | null
  date: string | null
  seller: string | null
  items: string[]
  hasSerial: boolean
  serialNumber: string | null
  isValid: boolean
  confidence: number
  issues: string[]
}

/**
 * Analyze watch photo using GPT-4 Vision
 */
export async function analyzeWatchPhoto(imageUrl: string): Promise<WatchAnalysisResult> {
  try {
    logInfo('vision', `Analyzing watch photo: ${imageUrl}`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a luxury watch expert. Analyze this watch photo and extract:
1. Brand (e.g., Rolex, Patek Philippe, Audemars Piguet)
2. Model (e.g., Submariner, Nautilus, Royal Oak)
3. Reference number (visible on dial, case, or documentation)
4. Serial number (if visible)
5. Condition (excellent/good/fair/poor)
6. Any authenticity concerns or red flags

Return ONLY a JSON object with this structure:
{
  "brand": "Brand name or null",
  "model": "Model name or null",
  "reference": "Reference number or null",
  "serial": "Serial number or null",
  "condition": "excellent|good|fair|poor|unknown",
  "confidence": 0-100,
  "details": "Brief description of the watch",
  "issues": ["list", "of", "concerns"]
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high', // High detail for better accuracy
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3, // Low temperature for consistent output
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    // Parse JSON response
    const result = JSON.parse(content) as WatchAnalysisResult

    logInfo('vision', `Watch analysis complete`, { brand: result.brand, confidence: result.confidence })

    return result
  } catch (error: any) {
    logError('vision', error, { imageUrl })
    // Return default result on error
    return {
      brand: null,
      model: null,
      reference: null,
      serial: null,
      condition: 'unknown',
      confidence: 0,
      details: 'Failed to analyze image',
      issues: [error.message],
    }
  }
}

/**
 * Analyze guarantee card using GPT-4 Vision
 */
export async function analyzeGuaranteeCard(imageUrl: string): Promise<GuaranteeCardAnalysis> {
  try {
    logInfo('vision', `Analyzing guarantee card: ${imageUrl}`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a document verification expert for luxury watches. Analyze this guarantee/warranty card and extract:
1. Serial number
2. Brand
3. Model
4. Purchase date
5. Authorized dealer name
6. Any signs of tampering or forgery

Return ONLY a JSON object:
{
  "serial": "Serial number or null",
  "brand": "Brand or null",
  "model": "Model or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "dealer": "Dealer name or null",
  "isValid": true/false,
  "confidence": 0-100,
  "issues": ["list", "of", "concerns"]
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const result = JSON.parse(content) as GuaranteeCardAnalysis

    logInfo('vision', `Guarantee card analysis complete`, { isValid: result.isValid, confidence: result.confidence })

    return result
  } catch (error: any) {
    logError('vision', error, { imageUrl })
    return {
      serial: null,
      brand: null,
      model: null,
      purchaseDate: null,
      dealer: null,
      isValid: false,
      confidence: 0,
      issues: [error.message],
    }
  }
}

/**
 * Analyze invoice/receipt using GPT-4 Vision
 */
export async function analyzeInvoice(imageUrl: string): Promise<InvoiceAnalysis> {
  try {
    logInfo('vision', `Analyzing invoice: ${imageUrl}`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a financial document verification expert. Analyze this invoice/receipt and extract:
1. Total amount (number only)
2. Date (YYYY-MM-DD format)
3. Seller/company name
4. List of items purchased
5. Serial number (if mentioned)
6. Whether it appears to be a legitimate invoice

Return ONLY a JSON object:
{
  "amount": number or null,
  "date": "YYYY-MM-DD or null",
  "seller": "Seller name or null",
  "items": ["item1", "item2"],
  "hasSerial": true/false,
  "serialNumber": "Serial or null",
  "isValid": true/false,
  "confidence": 0-100,
  "issues": ["list", "of", "concerns"]
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Vision API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const result = JSON.parse(content) as InvoiceAnalysis

    logInfo('vision', `Invoice analysis complete`, { isValid: result.isValid, amount: result.amount })

    return result
  } catch (error: any) {
    logError('vision', error, { imageUrl })
    return {
      amount: null,
      date: null,
      seller: null,
      items: [],
      hasSerial: false,
      serialNumber: null,
      isValid: false,
      confidence: 0,
      issues: [error.message],
    }
  }
}

/**
 * Compare data consistency across documents
 */
export function compareDocuments(
  watchData: WatchAnalysisResult,
  guaranteeData: GuaranteeCardAnalysis,
  invoiceData: InvoiceAnalysis
): {
  consistent: boolean
  mismatches: string[]
  confidence: number
} {
  const mismatches: string[] = []

  // Compare brand
  if (watchData.brand && guaranteeData.brand && watchData.brand !== guaranteeData.brand) {
    mismatches.push(`Brand mismatch: Watch shows "${watchData.brand}", guarantee shows "${guaranteeData.brand}"`)
  }

  // Compare model
  if (watchData.model && guaranteeData.model && watchData.model !== guaranteeData.model) {
    mismatches.push(`Model mismatch: Watch shows "${watchData.model}", guarantee shows "${guaranteeData.model}"`)
  }

  // Compare serial numbers
  if (watchData.serial && guaranteeData.serial && watchData.serial !== guaranteeData.serial) {
    mismatches.push(`Serial number mismatch: Watch shows "${watchData.serial}", guarantee shows "${guaranteeData.serial}"`)
  }

  if (guaranteeData.serial && invoiceData.serialNumber && guaranteeData.serial !== invoiceData.serialNumber) {
    mismatches.push(`Serial number mismatch: Guarantee shows "${guaranteeData.serial}", invoice shows "${invoiceData.serialNumber}"`)
  }

  // Calculate confidence
  const avgConfidence = (watchData.confidence + guaranteeData.confidence + invoiceData.confidence) / 3
  const consistencyPenalty = mismatches.length * 15
  const finalConfidence = Math.max(0, avgConfidence - consistencyPenalty)

  return {
    consistent: mismatches.length === 0,
    mismatches,
    confidence: Math.round(finalConfidence),
  }
}
