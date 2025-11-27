import { getRedisClient } from './redis'
import { logInfo, logError } from './logger'

const SESSION_TTL_SECONDS = 30 * 60 // 30 minutes

export interface BaseSession {
    id: string
    tenantId: string
    createdAt: string
    updatedAt: string
}

/**
 * Generic Session Manager using Redis
 */
export class SessionManager<T extends BaseSession> {
    private prefix: string
    private ttl: number

    constructor(prefix: string, ttlSeconds: number = SESSION_TTL_SECONDS) {
        this.prefix = prefix
        this.ttl = ttlSeconds
    }

    private getKey(phone: string): string {
        return `${this.prefix}:${phone}`
    }

    async create(phone: string, data: T): Promise<T> {
        const redis = getRedisClient()
        const key = this.getKey(phone)

        await redis.set(key, JSON.stringify(data), 'EX', this.ttl)
        return data
    }

    async get(phone: string): Promise<T | null> {
        const redis = getRedisClient()
        const key = this.getKey(phone)

        const data = await redis.get(key)
        if (!data) return null

        return JSON.parse(data) as T
    }

    async update(phone: string, updates: Partial<T>): Promise<T | null> {
        const session = await this.get(phone)
        if (!session) return null

        const updatedSession = { ...session, ...updates, updatedAt: new Date().toISOString() }
        await this.create(phone, updatedSession) // Overwrite with new TTL

        return updatedSession
    }

    async clear(phone: string): Promise<void> {
        const redis = getRedisClient()
        const key = this.getKey(phone)
        await redis.del(key)
    }
}
