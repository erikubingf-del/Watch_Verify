import { updateCustomerProfileTool } from './crm-update'
import { checkAvailabilityTool, bookAppointmentTool } from './scheduling'

export interface Tool {
    name: string
    description: string
    parameters: Record<string, any>
    run: (args: any, context: any) => Promise<string>
}

export const tools: Record<string, Tool> = {
    [updateCustomerProfileTool.name]: updateCustomerProfileTool,
    [checkAvailabilityTool.name]: checkAvailabilityTool,
    [bookAppointmentTool.name]: bookAppointmentTool
}

export function registerTool(tool: Tool) {
    tools[tool.name] = tool
}

export function getToolsDefinition() {
    return Object.values(tools).map(t => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }
    }))
}
