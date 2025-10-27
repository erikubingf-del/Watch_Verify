export type ICDInput = {
  nf_missing?: boolean
  nf_invalid?: boolean
  serial_mismatch?: boolean
  issuer_denies?: boolean
  nfse_missing?: boolean
  history_inconsistent?: boolean
  seller_unidentified?: boolean
}
export function calcICD(inp: ICDInput) {
  let score = 100
  if (inp.nf_missing) score -= 30
  if (inp.nf_invalid) score -= 20
  if (inp.serial_mismatch) score -= 25
  if (inp.issuer_denies) score -= 15
  if (inp.nfse_missing) score -= 20
  if (inp.history_inconsistent) score -= 30
  if (inp.seller_unidentified) score -= 50
  if (score < 0) score = 0
  let band = 'Inconclusivo'
  if (score >= 90) band = 'Consistente (validado)'
  else if (score >= 70) band = 'Consistente (sem validação)'
  else if (score >= 41) band = 'Inconclusivo'
  else band = 'Inconsistente'
  return { score, band }
}
