import { config } from '../config'

interface MessageContext {
    chatId: string
    fromNumber: string
    isGroup: boolean
    isStatus: boolean
    devicePhone: string
}

/**
 * Determines if the bot should reply to a message.
 * Filters out:
 * - Self-replies (loops)
 * - Group chats (unless explicitly allowed)
 * - Status updates
 * - Blacklisted numbers (placeholder for future implementation)
 */
export function canReply(context: MessageContext): boolean {
    const { chatId, fromNumber, isGroup, isStatus, devicePhone } = context

    // 1. Prevent Self-Reply Loops
    // Normalize numbers to ensure accurate comparison
    const normalizedFrom = fromNumber.replace(/\D/g, '')
    const normalizedDevice = devicePhone.replace(/\D/g, '')

    if (normalizedFrom === normalizedDevice) {
        console.log(`[Filter] Skipping self-reply: ${fromNumber}`)
        return false
    }

    // 2. Skip Status Updates
    if (isStatus || chatId === 'status@broadcast') {
        return false
    }

    // 3. Skip Group Chats (for now, can be configurable later)
    if (isGroup) {
        console.log(`[Filter] Skipping group chat: ${chatId}`)
        return false
    }

    // 4. Check Blacklist (Placeholder)
    // if (config.blacklist.includes(fromNumber)) return false

    return true
}
