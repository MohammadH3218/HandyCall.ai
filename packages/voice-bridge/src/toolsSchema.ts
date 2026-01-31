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
            name: 'send_booking_link',
            description: 'Send a booking link by email so the caller can schedule and fill out details.',
            parameters: {
                type: 'object',
                properties: {
                    email: { type: 'string', description: 'Customer email address to send the booking link to.' }
                },
                required: ['email']
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
        },
        {
            type: 'function',
            name: 'end_call',
            description: 'Politely end the call after the goodbye message.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    ];
}
