import dotenv from 'dotenv'
import path from 'path'

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

console.log('Worker Environment Loaded')
console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Missing')
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing')

if (!process.env.REDIS_URL) {
    console.error('❌ REDIS_URL is missing! Exiting.')
    process.exit(1)
}

if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing! Exiting.')
    process.exit(1)
}

// Import the worker code AFTER env vars are loaded
// We use dynamic import to prevent hoisting
import('../workers/whatsapp-worker')
