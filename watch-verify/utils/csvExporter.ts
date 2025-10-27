export function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return ''
  const cols = Array.from(new Set(rows.flatMap(r=>Object.keys(r))))
  const esc = (v:any)=>{
    if (v==null) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"'
    return s
  }
  const header = cols.join(',')
  const body = rows.map(r => cols.map(c=>esc(r[c])).join(',')).join('\n')
  return header + '\n' + body + '\n'
}
