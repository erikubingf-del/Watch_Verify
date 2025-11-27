import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = global as unknown as { prisma: any }

// Patch DATABASE_URL for Accelerate if needed
const url = process.env.DATABASE_URL?.startsWith('prisma+postgres://')
    ? process.env.DATABASE_URL.replace('prisma+postgres://', 'prisma://')
    : process.env.DATABASE_URL

const isAccelerate = url?.startsWith('prisma://')

const baseClient = new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
        db: {
            url
        }
    }
})

export const prisma = globalForPrisma.prisma ||
    (isAccelerate ? baseClient.$extends(withAccelerate()) : baseClient)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

