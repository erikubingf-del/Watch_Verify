import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
    const args = process.argv.slice(2)

    if (args.length < 4) {
        console.error('Usage: tsx scripts/create-salesperson.ts <tenant_id> <name> <email> <whatsapp_number>')
        console.error('Example: tsx scripts/create-salesperson.ts 123e4567-e89b... "John Doe" john@store.com +5511999999999')
        process.exit(1)
    }

    const [tenantId, name, email, whatsapp] = args

    console.log(`Creating salesperson for tenant ${tenantId}...`)

    try {
        // Check if tenant exists
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        })

        if (!tenant) {
            console.error(`Tenant ${tenantId} not found!`)
            process.exit(1)
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                tenantId,
                name,
                email,
                whatsapp,
                role: UserRole.SALESPERSON,
                isActive: true,
                shiftSchedule: {
                    monday: 'all_day',
                    tuesday: 'all_day',
                    wednesday: 'all_day',
                    thursday: 'all_day',
                    friday: 'all_day',
                    saturday: 'morning',
                    sunday: 'off'
                }
            }
        })

        console.log(`✅ Salesperson created successfully!`)
        console.log(`ID: ${user.id}`)
        console.log(`Name: ${user.name}`)
        console.log(`WhatsApp: ${user.whatsapp}`)

    } catch (error: any) {
        console.error('Failed to create salesperson:', error)
        if (error.code === 'P2002') {
            console.error('Error: Email already exists.')
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
