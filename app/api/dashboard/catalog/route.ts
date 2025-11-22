import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect, atCreate } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/catalog
 * Fetches all products for the tenant
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Fetch products
    const products = await atSelect('Catalog', {
      filterByFormula: `{tenant_id} = '${tenantId}'`,
      sort: JSON.stringify([{ field: 'created_at', direction: 'desc' }])
    })

    // Map to frontend format
    const mapped = products.map((p: any) => ({
      id: p.id,
      title: p.fields.title || '',
      brand: p.fields.brand || '',
      description: p.fields.description || '',
      price: p.fields.price || 0,
      category: p.fields.category || '',
      image_url: p.fields.image_url || '',
      stock_quantity: p.fields.stock_quantity || 0,
      tags: p.fields.tags ? (Array.isArray(p.fields.tags) ? p.fields.tags : p.fields.tags.split(',').map((t: string) => t.trim())) : [],
      active: p.fields.active !== false,
      has_embedding: !!p.fields.embedding,
      embedding_status: p.fields.embedding ? 'synced' : 'missing',
      created_at: p.fields.created_at || new Date().toISOString()
    }))

    return NextResponse.json({
      products: mapped,
      total: mapped.length
    })

  } catch (error) {
    console.error('Error fetching catalog:', error)
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/catalog
 * Creates a new product
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()

    // Create product
    const product = await atCreate('Catalog', {
      tenant_id: [tenantId],
      title: body.title,
      brand: body.brand,
      description: body.description,
      price: body.price,
      category: body.category,
      image_url: body.image_url || '',
      stock_quantity: body.stock_quantity || 0,
      tags: Array.isArray(body.tags) ? body.tags.join(', ') : body.tags,
      active: body.active !== false,
      created_at: new Date().toISOString()
    } as any)

    return NextResponse.json({ success: true, id: product.id })

  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
