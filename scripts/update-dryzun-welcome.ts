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

    console.log(`Updating welcome message for tenant: ${tenant.name} (${tenant.id})`)

    const newWelcomeMessage = `Olá! Seja muito bem-vindo(a) à Dryzun ✨
Meu nome é Milena e é um prazer ter você aqui. 

Nossa equipe está pronta para te ajudar com qualquer dúvida sobre nossas joias e também sobre nossos relógios, Rolex e Cartier, que você encontra exclusivamente conosco.

Se você estiver buscando um modelo específico, querendo conhecer novidades ou até mesmo vender um relógio seminovo, podemos te orientar em todo o processo com segurança e discrição.

Fique à vontade para me chamar — estou aqui para te ajudar no que precisar. 😊`

    await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            config: {
                ...(tenant.config as object),
                welcome_message: newWelcomeMessage
            }
        }
    })

    console.log('✅ Welcome message updated successfully!')
    console.log('New message preview:')
    console.log(newWelcomeMessage)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
