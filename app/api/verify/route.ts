import { NextRequest, NextResponse } from 'next/server'
import { runVerification, VerificationRequest } from '@/lib/verification'
import { logError } from '@/lib/logger'
import { rateLimitMiddleware } from '@/lib/ratelimit'

/**
 * Watch verification API endpoint
 *
 * POST /api/verify
 *
 * Request body:
 * {
 *   "tenantId": "tenant-id",
 *   "customerName": "João Silva",
 *   "customerPhone": "+5511999999999",
 *   "watchPhotoUrl": "https://...",
 *   "guaranteeCardUrl": "https://...",
 *   "invoiceUrl": "https://..."
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "verificationId": "rec123",
 *   "icd": 85,
 *   "icdBand": "Consistente (validado)",
 *   "status": "approved",
 *   "brand": "Rolex",
 *   "model": "Submariner",
 *   "issues": [],
 *   "recommendations": []
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(req, 'API')
    if (rateLimitResponse) return rateLimitResponse

    // Parse request
    const body = await req.json()

    // Validate required fields
    if (!body.tenantId || !body.customerPhone) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: tenantId, customerPhone' },
        { status: 400 }
      )
    }

    if (!body.watchPhotoUrl && !body.guaranteeCardUrl && !body.invoiceUrl) {
      return NextResponse.json(
        { ok: false, error: 'At least one document (watch photo, guarantee, or invoice) is required' },
        { status: 400 }
      )
    }

    // Build verification request
    const request: VerificationRequest = {
      tenantId: body.tenantId,
      customerName: body.customerName || 'Cliente',
      customerPhone: body.customerPhone,
      watchPhotoUrl: body.watchPhotoUrl,
      guaranteeCardUrl: body.guaranteeCardUrl,
      invoiceUrl: body.invoiceUrl,
    }

    // Run verification
    const result = await runVerification(request)

    // Return result
    return NextResponse.json({
      ok: true,
      verificationId: result.verificationId,
      brand: result.brand,
      model: result.model,
      reference: result.reference,
      serial: result.serial,
      icd: result.icd,
      icdBand: result.icdBand,
      status: result.status,
      confidence: result.confidence,
      issues: result.issues,
      recommendations: result.recommendations,
      marketData: result.marketData,
    })
  } catch (error: any) {
    logError('verify-api', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/verify?verificationId=rec123
 *
 * Retrieve verification result by ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const verificationId = searchParams.get('verificationId')

    if (!verificationId) {
      return NextResponse.json(
        { ok: false, error: 'Missing verificationId parameter' },
        { status: 400 }
      )
    }

    // TODO: Implement retrieval from Airtable
    // For now, return placeholder

    return NextResponse.json({
      ok: true,
      message: 'Verification retrieval not yet implemented',
      verificationId,
    })
  } catch (error: any) {
    logError('verify-api-get', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
