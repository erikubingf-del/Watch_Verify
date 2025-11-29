import { prisma } from '@/lib/prisma'
import { logInfo, logError } from '@/lib/logger'

export interface CustomerResult {
    customer: any
    isNew: boolean
    isFirstInteraction: boolean
}

/**
 * Get or create a customer record based on phone number and tenant.
 * Also determines if this is the customer's first interaction.
 */
export async function getOrCreateCustomer(
    tenantId: string,
    phone: string,
    name?: string
): Promise<CustomerResult> {
    try {
        // 1. Try to find existing customer
        let customer = await prisma.customer.findUnique({
            where: {
                tenantId_phone: {
                    tenantId,
                    phone,
                },
            },
        })

        let isNew = false
        let isFirstInteraction = false

        if (!customer) {
            // 2. Create new customer if not found
            logInfo('customer-service', 'Creating new customer', { tenantId, phone })
            customer = await prisma.customer.create({
                data: {
                    tenantId,
                    phone,
                    name: name || undefined,
                    lastInteraction: new Date(), // Set initial interaction
                },
            })
            isNew = true
            isFirstInteraction = true
        } else {
            // 3. Check if this is effectively a first interaction (e.g. created by script but never chatted)
            // If lastInteraction is null, treat as first interaction
            if (!customer.lastInteraction) {
                isFirstInteraction = true
            }

            // Update name if provided and currently missing
            if (name && !customer.name) {
                customer = await prisma.customer.update({
                    where: { id: customer.id },
                    data: { name },
                })
            }
        }

        return { customer, isNew, isFirstInteraction }
    } catch (error: any) {
        logError('customer-service', 'Failed to get/create customer', { tenantId, phone, error: error.message })
        throw error
    }
}

/**
 * Update the last interaction timestamp for a customer
 */
export async function updateLastInteraction(customerId: string): Promise<void> {
    try {
        await prisma.customer.update({
            where: { id: customerId },
            data: { lastInteraction: new Date() },
        })
    } catch (error: any) {
        logError('customer-service', 'Failed to update last interaction', { customerId, error: error.message })
    }
}
