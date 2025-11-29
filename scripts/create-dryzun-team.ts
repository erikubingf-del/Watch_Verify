
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tenantSlug = 'dryzun'
    const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
    })

    if (!tenant) {
        console.error(`Tenant ${tenantSlug} not found.Please run setup - dryzun.ts first.`)
        process.exit(1)
    }

    console.log(`Creating sales team for tenant: ${tenant.name} (${tenant.id})`)

    const teamMembers = [
        {
            name: 'Maria',
            email: 'maria@dryzun.com.br',
            whatsapp: '+5511999990001',
            shift: {
                monday: 'morning',
                tuesday: 'morning',
                wednesday: 'morning',
                thursday: 'morning',
                friday: 'morning',
                saturday: 'off',
                sunday: 'off'
            }
        },
        {
            name: 'Gabriela',
            email: 'gabriela@dryzun.com.br',
            whatsapp: '+5511999990002',
            shift: {
                monday: 'afternoon',
                tuesday: 'afternoon',
                wednesday: 'afternoon',
                thursday: 'afternoon',
                friday: 'afternoon',
                saturday: 'all_day',
                sunday: 'off'
            }
        },
        {
            name: 'Fernanda',
            email: 'fernanda@dryzun.com.br',
            whatsapp: '+5511999990003',
            shift: {
                monday: 'off',
                tuesday: 'morning',
                wednesday: 'morning',
                thursday: 'morning',
                friday: 'morning',
                saturday: 'morning',
                sunday: 'off'
            }
        },
        {
            name: 'Don',
            email: 'don@dryzun.com.br',
            whatsapp: '+5511999990004',
            shift: {
                monday: 'all_day',
                tuesday: 'all_day',
                wednesday: 'all_day',
                thursday: 'all_day',
                friday: 'all_day',
                saturday: 'off',
                sunday: 'off'
            }
        }
    ]

    for (const member of teamMembers) {
        const user = await prisma.user.upsert({
            where: {
                tenantId_email: {
                    tenantId: tenant.id,
                    email: member.email
                }
            },
            update: {
                name: member.name,
                whatsapp: member.whatsapp,
                role: UserRole.SALESPERSON,
                tenantId: tenant.id,
                shiftSchedule: member.shift,
                isActive: true
            },
            create: {
                email: member.email,
                name: member.name,
                whatsapp: member.whatsapp,
                role: UserRole.SALESPERSON,
                tenantId: tenant.id,
                shiftSchedule: member.shift,
                isActive: true,
                passwordHash: 'hashed_password_placeholder' // Placeholder for seeding
            }
        })
        console.log(`Upserted salesperson: ${user.name} with shift: ${JSON.stringify(member.shift)} `)
    }

    console.log('Sales team creation complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
