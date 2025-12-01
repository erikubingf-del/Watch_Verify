import { getRedisClient } from '@/lib/redis'
import { Thread, AgentEvent } from './types'
import { v4 as uuidv4 } from 'uuid'

const redis = getRedisClient()
const THREAD_PREFIX = 'agent:thread:'
const THREAD_TTL = 60 * 60 * 24 * 7 // 7 days

export async function createThread(tenantId: string, customerId: string): Promise<Thread> {
    const thread: Thread = {
        id: uuidv4(),
        tenantId,
        customerId,
        status: 'active',
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
    }

    await saveThread(thread)
    return thread
}

export async function loadThread(threadId: string): Promise<Thread | null> {
    const data = await redis.get(`${THREAD_PREFIX}${threadId}`)
    if (!data) return null

    const thread = JSON.parse(data)

    // Revive dates
    thread.createdAt = new Date(thread.createdAt)
    thread.updatedAt = new Date(thread.updatedAt)
    thread.events.forEach((e: any) => {
        e.timestamp = new Date(e.timestamp)
    })

    return thread
}

export async function saveThread(thread: Thread): Promise<void> {
    thread.updatedAt = new Date()
    await redis.set(
        `${THREAD_PREFIX}${thread.id}`,
        JSON.stringify(thread),
        'EX',
        THREAD_TTL
    )
}

export async function appendEvent(threadId: string, event: AgentEvent): Promise<void> {
    const thread = await loadThread(threadId)
    if (!thread) throw new Error(`Thread ${threadId} not found`)

    thread.events.push(event)
    await saveThread(thread)
}

export async function getActiveThreadForCustomer(customerId: string): Promise<Thread | null> {
    // In a real production app, we might want a secondary index or a lookup table.
    // For now, we'll assume the caller tracks the threadId or we scan (inefficient) 
    // OR we store a mapping "customer:active_thread:{customerId}" -> threadId

    const threadId = await redis.get(`agent:active_customer:${customerId}`)
    if (!threadId) return null

    return loadThread(threadId)
}

export async function setActiveThreadForCustomer(customerId: string, threadId: string): Promise<void> {
    await redis.set(`agent:active_customer:${customerId}`, threadId, 'EX', THREAD_TTL)
}
