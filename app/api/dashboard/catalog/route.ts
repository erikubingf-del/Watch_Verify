import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const products = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    // Map to frontend format
    const mapped = products.map((p: any) => ({
      id: p.id,
      title: p.title,
      brand: p.brand || '',
      description: p.description || '',
      price: Number(p.price) || 0,
      category: p.category || '',
      image_url: p.imageUrl || '',
      stock_quantity: p.stockQuantity || 0,
      tags: p.tags,
      active: p.isActive,
      has_embedding: false, // TODO: Check embedding status
      embedding_status: 'missing', // TODO: Check embedding status
      created_at: p.createdAt.toISOString()
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
    const product = await prisma.product.create({
      data: {
        tenantId,
        title: body.title,
        brand: body.brand,
        description: body.description,
        price: body.price,
        category: body.category,
        imageUrl: body.image_url || '',
        stockQuantity: body.stock_quantity || 0,
        tags: Array.isArray(body.tags) ? body.tags : (body.tags ? [body.tags] : []),
        isActive: body.active !== false,
      }
    })

    return NextResponse.json({ success: true, id: product.id })

  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
