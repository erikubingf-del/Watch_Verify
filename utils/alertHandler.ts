export async function sendAlertToMake(payload: any) {
  const url = process.env.MAKE_WEBHOOK_ALERT
  if (!url) return { ok:false, error:'MAKE_WEBHOOK_ALERT not set' }
  const res = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) })
  return { ok: res.ok }
}
