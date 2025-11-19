import { sanitizeForFormula } from '@/lib/validations'
import { logError, logWarn } from '@/lib/logger'

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AT_URL = (table: string) => `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

type Rec<T> = { id: string, fields: T }

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    if (retries === 0) throw error

    // Only retry on rate limits and network errors
    const shouldRetry =
      error.message?.includes('429') ||
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ETIMEDOUT')

    if (!shouldRetry) throw error

    logWarn('airtable-retry', `Retrying after ${delay}ms (${retries} attempts left)`)
    await new Promise(resolve => setTimeout(resolve, delay))
    return withRetry(fn, retries - 1, delay * 2)
  }
}

export async function atSelect<T=any>(table: string, params: Record<string,string> = {}): Promise<Rec<T>[]> {
  return withRetry(async () => {
    const url = new URL(AT_URL(table))
    Object.entries(params).forEach(([k,v])=> url.searchParams.set(k, v))
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Airtable select ${table} → ${res.status}: ${errorText}`)
    }
    const data = await res.json()
    return data.records || []
  })
}

export async function atCreate<T=any>(table: string, fields: T): Promise<Rec<T>> {
  return withRetry(async () => {
    const res = await fetch(AT_URL(table), {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'content-type':'application/json' },
      body: JSON.stringify({ records: [{ fields }] })
    })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Airtable create ${table} → ${res.status}: ${errorText}`)
    }
    const data = await res.json()
    return data.records[0]
  })
}

export async function atUpdate<T=any>(table: string, id: string, fields: Partial<T>): Promise<Rec<T>> {
  return withRetry(async () => {
    const res = await fetch(AT_URL(table), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'content-type':'application/json' },
      body: JSON.stringify({ records: [{ id, fields }] })
    })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Airtable update ${table} → ${res.status}: ${errorText}`)
    }
    const data = await res.json()
    return data.records[0]
  })
}

/**
 * Build safe Airtable formula with injection protection
 * Use this instead of manual string concatenation
 *
 * @example
 * buildFormula('phone', '=', '+5511999999999')
 * // Returns: "({phone}='+5511999999999')"
 */
export function buildFormula(
  field: string,
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'CONTAINS',
  value: string | number
): string {
  // Allow spaces and alphanumeric in field names (Airtable supports spaces)
  const sanitizedField = field.replace(/[^a-zA-Z0-9_ ]/g, '')

  if (typeof value === 'number') {
    return `({${sanitizedField}}${operator}${value})`
  }

  const sanitizedValue = sanitizeForFormula(String(value))
  if (operator === 'CONTAINS') {
    return `FIND('${sanitizedValue}', {${sanitizedField}})`
  }

  return `({${sanitizedField}}${operator}'${sanitizedValue}')`
}

/**
 * Build AND formula
 * @example
 * buildAndFormula(['phone', '=', '+55119...'], ['active', '=', true])
 */
export function buildAndFormula(...conditions: Array<[string, string, any]>): string {
  const formulas = conditions.map(([field, op, value]) =>
    buildFormula(field, op as any, value)
  )
  return `AND(${formulas.join(', ')})`
}

/**
 * Build OR formula
 */
export function buildOrFormula(...conditions: Array<[string, string, any]>): string {
  const formulas = conditions.map(([field, op, value]) =>
    buildFormula(field, op as any, value)
  )
  return `OR(${formulas.join(', ')})`
}
