import { Queue } from 'bullmq'
import { getRedisClient } from './redis'

export const WHATSAPP_QUEUE_NAME = 'whatsapp-messages'

let whatsappQueue: Queue | null = null

export function getWhatsAppQueue(): Queue {
    if (!whatsappQueue) {
        whatsappQueue = new Queue(WHATSAPP_QUEUE_NAME, {
            connection: getRedisClient(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
                removeOnFail: false, // Keep failed jobs for inspection
            },
        })
    }

    return whatsappQueue
}
