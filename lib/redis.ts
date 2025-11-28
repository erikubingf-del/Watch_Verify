import Redis from 'ioredis'
import { logError } from './logger'

console.log('DEBUG: lib/redis.ts evaluating. REDIS_URL:', process.env.REDIS_URL)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
    if (!redisClient) {
        console.log(`🔌 Connecting to Redis at ${REDIS_URL.replace(/:[^:@]*@/, ':****@')}...`)

        redisClient = new Redis(REDIS_URL, {
            family: 4, // Force IPv4
            maxRetriesPerRequest: null, // Required for BullMQ
            enableReadyCheck: false,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000)
                return delay
            },
        })

        redisClient.on('error', (err) => {
            logError('redis-client', err)
        })

        redisClient.on('connect', () => {
            console.log('✅ Redis connected')
        })
    }

    return redisClient
}

export const redisConnection = getRedisClient()
