import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ToolDefinition, AgentContext } from '../types'

export const checkCatalogTool: ToolDefinition = {
    name: 'check_catalog',
    description: 'Search the product catalog for watches based on brand, model, or keywords.',
    schema: z.object({
        query: z.string().describe('Search keywords (e.g., "Rolex Submariner", "Gold watch")'),
        brand: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional()
    }),
    execute: async (args, context: AgentContext) => {
        const where: any = {
            tenantId: context.tenantId,
            isActive: true,
            stockQuantity: { gt: 0 }
        }

        if (args.brand) {
            where.brand = { contains: args.brand, mode: 'insensitive' }
        }

        if (args.query) {
            where.OR = [
                { title: { contains: args.query, mode: 'insensitive' } },
                { description: { contains: args.query, mode: 'insensitive' } }
            ]
        }

        if (args.minPrice || args.maxPrice) {
            where.price = {}
            if (args.minPrice) where.price.gte = args.minPrice
            if (args.maxPrice) where.price.lte = args.maxPrice
        }

        const products = await prisma.product.findMany({
            where,
            take: 5,
            select: {
                id: true,
                title: true,
                brand: true,
                price: true,
                description: true,
                stockQuantity: true
            }
        })

        return {
            found: products.length,
            products: products.map((p: any) => ({
                ...p,
                price: p.price ? Number(p.price) : null
            }))
        }
    }
}
