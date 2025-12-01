import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ToolDefinition, AgentContext } from '../types'

export const updateProfileTool: ToolDefinition = {
    name: 'update_profile',
    description: 'Update the customer\'s profile with new information (interests, hobbies, style preferences, etc.).',
    schema: z.object({
        interests: z.array(z.string()).optional(),
        hobbies: z.array(z.string()).optional(),
        stylePreferences: z.array(z.string()).optional(),
        budgetRange: z.string().optional(),
        preferredBrands: z.array(z.string()).optional()
    }),
    execute: async (args, context: AgentContext) => {
        const customer = await prisma.customer.findUnique({
            where: { id: context.customerId }
        })

        if (!customer) throw new Error('Customer not found')

        const currentProfile = (customer.profile as any) || {}

        // Merge logic
        const newProfile = {
            ...currentProfile,
            ...args,
            // Append arrays instead of overwriting if desired, but for now simple merge
            interests: [...(currentProfile.interests || []), ...(args.interests || [])],
            hobbies: [...(currentProfile.hobbies || []), ...(args.hobbies || [])],
            stylePreferences: [...(currentProfile.stylePreferences || []), ...(args.stylePreferences || [])],
            preferredBrands: [...(currentProfile.preferredBrands || []), ...(args.preferredBrands || [])]
        }

        // Deduplicate arrays
        newProfile.interests = [...new Set(newProfile.interests)]
        newProfile.hobbies = [...new Set(newProfile.hobbies)]
        newProfile.stylePreferences = [...new Set(newProfile.stylePreferences)]
        newProfile.preferredBrands = [...new Set(newProfile.preferredBrands)]

        await prisma.customer.update({
            where: { id: context.customerId },
            data: { profile: newProfile }
        })

        return { success: true, message: 'Profile updated', profile: newProfile }
    }
}

export const logMemoryTool: ToolDefinition = {
    name: 'log_memory',
    description: 'Log a specific fact or memory about the customer that is not a structured profile field.',
    schema: z.object({
        fact: z.string().describe('The fact to remember, e.g., "Customer mentioned they are going to Paris next month"'),
        source: z.string().optional().default('conversation')
    }),
    execute: async (args, context: AgentContext) => {
        await prisma.customerMemory.create({
            data: {
                customerId: context.customerId,
                fact: args.fact,
                source: args.source,
                confidence: 1.0
            }
        })

        return { success: true, message: 'Memory logged' }
    }
}
