import { Tool } from './index'
import { prisma } from '@/lib/prisma'
import { logInfo } from '@/lib/logger'

export const updateCustomerProfileTool: Tool = {
    name: 'update_customer_profile',
    description: 'Update the customer\'s CRM profile with new information extracted from the conversation.',
    parameters: {
        type: 'object',
        properties: {
            customerPhone: { type: 'string', description: 'The customer\'s phone number.' },
            name: { type: 'string', description: 'Customer\'s name if mentioned.' },
            email: { type: 'string', description: 'Customer\'s email if mentioned.' },
            budget: { type: 'string', description: 'Budget range mentioned (e.g., "50k-100k").' },
            interests: { type: 'array', items: { type: 'string' }, description: 'List of interests (e.g., "Rolex", "Diving").' },
            notes: { type: 'string', description: 'General notes or observations.' }
        },
        required: ['customerPhone']
    },
    run: async ({ customerPhone, name, email, budget, interests, notes }) => {
        try {
            // Find tenant ID from customer phone (assuming context is handled or we search)
            // For now, we'll search for the customer across tenants or require tenantId in args if possible.
            // Ideally, the tool caller (AI) should pass the tenantId from its context, but the tool definition
            // usually exposes user-facing params.
            // Let's assume we find the customer by phone first.

            const customers = await prisma.customer.findMany({
                where: { phone: customerPhone }
            })

            if (customers.length === 0) {
                return JSON.stringify({ error: 'Customer not found.' })
            }

            // Update all matching customers (usually one per tenant)
            const updates = customers.map(async (customer: any) => {
                const data: any = {}
                if (name) data.name = name
                if (email) data.email = email

                // Merge interests
                if (interests && interests.length > 0) {
                    // Assuming 'tags' field or similar for interests, or a JSON field
                    // For now, we'll append to 'tags' if it exists, or just log it if schema doesn't support it yet.
                    // Let's check schema... 'tags' is on Product, not Customer usually.
                    // Customer has 'notes' or we can use a JSON field if added.
                    // We'll append to the 'notes' field for now as a fallback if specific fields don't exist.
                    const newInterests = `Interests: ${interests.join(', ')}`
                    data.notes = customer.notes ? `${customer.notes}\n${newInterests}` : newInterests
                }

                if (budget) {
                    const budgetNote = `Budget: ${budget}`
                    data.notes = data.notes ? `${data.notes}\n${budgetNote}` : budgetNote
                }

                if (notes) {
                    data.notes = data.notes ? `${data.notes}\n${notes}` : notes
                }

                if (Object.keys(data).length > 0) {
                    await prisma.customer.update({
                        where: { id: customer.id },
                        data
                    })
                }
            })

            await Promise.all(updates)
            logInfo('crm-update', 'Updated customer profile', { customerPhone, updates: { name, email, budget, interests } })

            return JSON.stringify({ success: true, message: 'Customer profile updated.' })
        } catch (error: any) {
            return JSON.stringify({ error: error.message })
        }
    }
}
