import 'dotenv/config'
import { getWhatsAppQueue } from '../lib/queue'
import { logInfo } from '../lib/logger'

async function testWorker() {
    console.log('Adding test job to queue...')
    const queue = getWhatsAppQueue()

    const job = await queue.add('process-message', {
        messageBody: 'Test message from script',
        sender: 'whatsapp:+1234567890', // Fake number
        numMedia: 0,
        mediaUrls: [],
        tenantId: 'test-tenant',
        storeNumber: 'whatsapp:+0987654321',
        isSalesperson: false
    })

    console.log(`Job added with ID: ${job.id}`)
    console.log('Check worker logs now.')

    // Wait a bit then exit
    setTimeout(() => {
        process.exit(0)
    }, 5000)
}

testWorker()
