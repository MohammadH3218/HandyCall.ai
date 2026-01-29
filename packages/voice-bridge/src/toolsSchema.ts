export function toolsSchema() {
    return [
        {
            type: 'function',
            name: 'knowledge_search',
            description: 'Search company knowledge base for FAQs, policies, pricing ranges, services.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    top_k: { type: 'number' }
                },
                required: ['query']
            }
        },
        {
            type: 'function',
            name: 'check_service_area',
            description: 'Check whether the company services the provided ZIP code.',
            parameters: {
                type: 'object',
                properties: {
                    zip: { type: 'string' }
                },
                required: ['zip']
            }
        },
        {
            type: 'function',
            name: 'get_availability',
            description: 'Find available appointment slots.',
            parameters: {
                type: 'object',
                properties: {
                    start_time: { type: 'string', description: 'Requested time or day (ISO or natural language).' },
                    end_time: { type: 'string', description: 'Optional end of the window (ISO or natural language).' },
                    timezone: { type: 'string' }
                },
                required: ['start_time']
            }
        },
        {
            type: 'function',
            name: 'create_booking',
            description: 'Create an appointment booking. MUST ONLY be called after user confirms details.',
            parameters: {
                type: 'object',
                properties: {
                    full_name: { type: 'string' },
                    service_type: { type: 'string' },
                    details: { type: 'object', additionalProperties: true },
                    start_time: { type: 'string' },
                    end_time: { type: 'string' },
                    timezone: { type: 'string' },
                    confirmed: { type: 'boolean', description: 'Must be true only after explicit user confirmation.' }
                },
                required: ['full_name', 'service_type', 'details', 'start_time', 'timezone', 'confirmed']
            }
        },
        {
            type: 'function',
            name: 'list_appointments_by_phone',
            description: 'List caller appointments (for: what did I book last time? reschedule/cancel).',
            parameters: {
                type: 'object',
                properties: {
                    range_days: { type: 'number', description: 'How many days back/forward to search. Default 90.' }
                },
                required: []
            }
        },
        {
            type: 'function',
            name: 'cancel_appointment',
            description: 'Cancel an appointment.',
            parameters: {
                type: 'object',
                properties: {
                    appointment_id: { type: 'string' },
                    reason: { type: 'string' }
                },
                required: ['appointment_id']
            }
        },
        {
            type: 'function',
            name: 'reschedule_appointment',
            description: 'Reschedule an appointment to a new start time.',
            parameters: {
                type: 'object',
                properties: {
                    appointment_id: { type: 'string' },
                    new_start_time: { type: 'string' },
                    timezone: { type: 'string' },
                    duration_minutes: { type: 'number' }
                },
                required: ['appointment_id', 'new_start_time', 'timezone']
            }
        }
    ];
}
