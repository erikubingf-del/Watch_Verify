import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tenantSlug = 'dryzun'
    const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
    })

    if (!tenant) {
        console.error(`Tenant ${tenantSlug} not found. Please run setup-dryzun.ts first.`)
        process.exit(1)
    }

    console.log(`Completing setup for tenant: ${tenant.name} (${tenant.id})`)

    // 1. Update Tenant with WhatsApp and Branding
    console.log('Updating Tenant details...')
    await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            whatsappNumber: '+5511999998888', // Sample store number
            config: {
                ...(tenant.config as object),
                branding: {
                    primary_color: '#C4A484', // Light brown/goldish
                    logo_url: 'https://dryzun.com.br/logo.png', // Placeholder
                    font_family: 'Inter, sans-serif'
                }
            }
        }
    })

    // 2. Create Store Availability (Business Hours)
    // Mon-Fri: 10:00 - 18:00 (hourly slots)
    // Sat: 10:00 - 14:00
    console.log('Seeding Store Availability...')

    // Clear existing availability for this tenant to avoid duplicates
    await prisma.storeAvailability.deleteMany({
        where: { tenantId: tenant.id }
    })

    const weekDays = [1, 2, 3, 4, 5] // Mon-Fri
    const saturday = 6

    const slots = []

    // Mon-Fri slots
    for (const day of weekDays) {
        for (let hour = 10; hour < 18; hour++) {
            slots.push({
                tenantId: tenant.id,
                dayOfWeek: day,
                timeSlot: `${hour}:00`,
                maxBookings: 3 // 3 sales reps available generally
            })
        }
    }

    // Saturday slots
    for (let hour = 10; hour < 14; hour++) {
        slots.push({
            tenantId: tenant.id,
            dayOfWeek: saturday,
            timeSlot: `${hour}:00`,
            maxBookings: 2
        })
    }

    await prisma.storeAvailability.createMany({
        data: slots
    })

    console.log(`Created ${slots.length} availability slots.`)
    console.log('✅ Dryzun setup fully complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
