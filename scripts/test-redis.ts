import { getRedisClient } from '../lib/redis'
import dotenv from 'dotenv'

// Load env vars
const result = dotenv.config()
if (result.error) {
    console.error('Dotenv error:', result.error)
}

import fs from 'fs'

async function testRedis() {
    const log = (msg: string) => fs.appendFileSync('redis-debug.log', msg + '\n')

    log('STARTING TEST')
    log(`Current directory: ${process.cwd()}`)
    log(`REDIS_URL from env: ${process.env.REDIS_URL}`)
    log('Testing Redis connection...')
    log(`REDIS_URL masked: ${process.env.REDIS_URL?.replace(/:[^:@]*@/, ':****@')}`)

    try {
        const redis = getRedisClient()

        // Test set/get
        await redis.set('test-key', 'hello world')
        const value = await redis.get('test-key')

        console.log('Set/Get result:', value)

        if (value === 'hello world') {
            console.log('✅ Redis connection successful!')
        } else {
            console.error('❌ Redis set/get failed.')
        }

        process.exit(0)
    } catch (error) {
        console.error('❌ Redis connection error:', error)
        process.exit(1)
    }
}

testRedis()
