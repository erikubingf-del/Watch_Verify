import { NextRequest, NextResponse } from 'next/server'
import { sendAlertToMake } from '@/utils/alertHandler'

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(()=>({}))
  const sent = await sendAlertToMake(payload)
  return NextResponse.json(sent)
}
