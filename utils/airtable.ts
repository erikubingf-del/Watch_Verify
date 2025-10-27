const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AT_URL = (table: string) => `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`

type Rec<T> = { id: string, fields: T }

export async function atSelect<T=any>(table: string, params: Record<string,string> = {}): Promise<Rec<T>[]> {
  const url = new URL(AT_URL(table))
  Object.entries(params).forEach(([k,v])=> url.searchParams.set(k, v))
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } })
  if (!res.ok) throw new Error(`Airtable select ${table} → ${res.status}`)
  const data = await res.json()
  return data.records || []
}

export async function atCreate<T=any>(table: string, fields: T): Promise<Rec<T>> {
  const res = await fetch(AT_URL(table), {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'content-type':'application/json' },
    body: JSON.stringify({ records: [{ fields }] })
  })
  if (!res.ok) throw new Error(`Airtable create ${table} → ${res.status}`)
  const data = await res.json()
  return data.records[0]
}

export async function atUpdate<T=any>(table: string, id: string, fields: Partial<T>): Promise<Rec<T>> {
  const res = await fetch(AT_URL(table), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'content-type':'application/json' },
    body: JSON.stringify({ records: [{ id, fields }] })
  })
  if (!res.ok) throw new Error(`Airtable update ${table} → ${res.status}`)
  const data = await res.json()
  return data.records[0]
}
