import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/embeddings'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
    const args = process.argv.slice(2)
    const tenantId = args[0] === 'global' ? null : args[0]
    const directory = args[1] || 'knowledge'

    if (!tenantId && args[0] !== 'global') {
        console.error('Usage: tsx scripts/ingest-knowledge.ts <tenant_id|global> [directory]')
        process.exit(1)
    }

    console.log(`Ingesting knowledge from ${directory} for ${tenantId ? 'tenant ' + tenantId : 'GLOBAL'}...`)

    if (!fs.existsSync(directory)) {
        console.error(`Directory ${directory} not found`)
        process.exit(1)
    }

    const files = fs.readdirSync(directory)
    let imported = 0
    let errors = 0

    for (const file of files) {
        const filePath = path.join(directory, file)
        const stats = fs.statSync(filePath)

        if (stats.isDirectory()) continue

        const ext = path.extname(file).toLowerCase()
        if (!['.txt', '.md', '.pdf'].includes(ext)) continue

        console.log(`Processing ${file}...`)

        try {
            let content = ''

            if (ext === '.pdf') {
                const dataBuffer = fs.readFileSync(filePath)
                const data = await pdf(dataBuffer)
                content = data.text
            } else {
                content = fs.readFileSync(filePath, 'utf-8')
            }

            // Chunk content (simple chunking by paragraphs for now)
            // Ideally use a better chunking strategy (e.g. langchain)
            const chunks = content.split(/\n\s*\n/).filter(c => c.trim().length > 50)

            for (const chunk of chunks) {
                const { embedding } = await generateEmbedding(chunk)

                // Use raw SQL for vector insertion since Prisma doesn't fully support it yet in create
                const embeddingString = `[${embedding.join(',')}]`

                await prisma.$executeRaw`
          INSERT INTO knowledge_base (id, "tenantId", title, content, source, embedding, "updatedAt")
          VALUES (gen_random_uuid(), ${tenantId}, ${file}, ${chunk}, ${file}, ${embeddingString}::vector, NOW())
        `
            }

            imported++
        } catch (err) {
            console.error(`Failed to ingest ${file}:`, err)
            errors++
        }
    }

    console.log(`Ingestion complete. Files: ${imported}, Errors: ${errors}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
