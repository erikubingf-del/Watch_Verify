import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atCreate } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/catalog/upload-csv
 * Uploads products via CSV
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim())
    let imported = 0

    // Parse and import products
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')

      if (values.length < headers.length) continue

      const product: any = {}
      headers.forEach((header, idx) => {
        product[header] = values[idx]?.trim() || ''
      })

      try {
        await atCreate('Catalog', {
          tenant_id: [tenantId],
          title: product.title || '',
          brand: product.brand || '',
          description: product.description || '',
          price: parseFloat(product.price) || 0,
          category: product.category || '',
          image_url: product.image_url || '',
          stock_quantity: parseInt(product.stock_quantity) || 0,
          tags: product.tags || '',
          active: true,
          created_at: new Date().toISOString()
        } as any)

        imported++
      } catch (error) {
        console.error(`Error importing product ${product.title}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      total: lines.length - 1
    })

  } catch (error) {
    console.error('Error uploading CSV:', error)
    return NextResponse.json(
      { error: 'Failed to upload CSV' },
      { status: 500 }
    )
  }
}
