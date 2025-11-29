import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

/**
 * GET /api/dashboard/verifications
 * Returns verification history for the logged-in tenant
 * Optional query params: limit (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
    }

    // Get query params
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') || '10'

    // Fetch verifications
    const verifications = await prisma.watchVerify.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    })

    // Map to frontend format
    const mapped = verifications.map((v: any) => {
      // Parse legal risk data if available
      let criticalIssues: string[] = []
      let warnings: string[] = []

      if (Array.isArray(v.issues)) {
        criticalIssues = v.issues as string[]
      }

      if (Array.isArray(v.recommendations)) {
        warnings = v.recommendations as string[]
      }

      // Determine legal risk based on ICD score (simplified - enhance with actual legal_risk_summary field when available)
      let legalRiskLabel = 'Documentação Completa'
      let legalRiskColor: 'green' | 'yellow' | 'orange' | 'red' = 'green'

      const icd = v.icd || 0
      if (icd < 30) {
        legalRiskLabel = 'Documentos Suspeitos'
        legalRiskColor = 'red'
      } else if (icd < 50) {
        legalRiskLabel = 'Informações Inconsistentes'
        legalRiskColor = 'orange'
      } else if (icd < 70) {
        legalRiskLabel = 'Fotos Incompatíveis'
        legalRiskColor = 'yellow'
      } else if (icd < 85) {
        legalRiskLabel = 'Garantia Ausente'
        legalRiskColor = 'yellow'
      }

      return {
        id: v.id,
        customer: v.customerName || 'N/A',
        phone: v.customerPhone || '',
        cpf: v.cpf || null, // Include CPF for masking on frontend
        brand: v.brand || 'N/A',
        model: v.model || '',
        reference: v.reference || '',
        serial: v.serial || '',
        icd: icd,
        status: v.status || 'pending',
        legal_risk_label: legalRiskLabel,
        legal_risk_color: legalRiskColor,
        critical_issues: criticalIssues,
        warnings: warnings,
        date: v.createdAt.toISOString(),
        photo_url: v.photoUrl || '',
        guarantee_url: v.guaranteeUrl || '',
        invoice_url: v.invoiceUrl || '',
        notes: v.notes || '',
      }
    })

    return NextResponse.json({ verifications: mapped })
  } catch (error: any) {
    logError('dashboard-verifications', error)
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    )
  }
}
