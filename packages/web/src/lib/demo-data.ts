/**
 * Demo data for Toushe Plumbing — shown when the API returns empty results.
 * This lets the UI render populated screens for demos and onboarding previews.
 */

const NOW = Date.now();
const H = 3_600_000; // 1 hour in ms
const D = 86_400_000; // 1 day in ms

// ---------------------------------------------------------------------------
// Dashboard Overview
// ---------------------------------------------------------------------------
export const DEMO_DASHBOARD_OVERVIEW = {
  metrics: {
    revenue_this_month_cents: 324000,
    lead_conversion_rate: 0.62,
    total_customers: 47,
    active_leads: 5,
    appointments_this_week: 4,
  },
  usage_summary: {
    period_start: NOW - 15 * D,
    period_end: NOW + 15 * D,
    minutes: { used: 141, limit: 300, percent: 47, blocked: false },
    sms: { used: 83, limit: 500, percent: 17, blocked: false },
    contacts: { used: 47, limit: 500, percent: 9, blocked: false },
  },
  quick_insights: {
    unanswered_questions: 0,
    hot_leads_needing_follow_up: 3,
    appointments_next_24h: 1,
    next_appointment_countdown_minutes: 840,
    quick_actions: [
      {
        id: 'qa-1',
        title: 'Hot leads ready to book',
        description: '3 callers showed strong buying intent and haven\'t been followed up yet.',
        severity: 'HIGH' as const,
        count: 3,
        action_url: '/dashboard/lead-inbox',
      },
      {
        id: 'qa-2',
        title: 'Appointment tomorrow',
        description: 'Mike Johnson — water heater replacement at 9 AM.',
        severity: 'MEDIUM' as const,
        count: 1,
        action_url: '/dashboard/appointments',
      },
      {
        id: 'qa-3',
        title: 'Invoice awaiting payment',
        description: 'Sarah Williams has an open invoice for $285.',
        severity: 'LOW' as const,
        count: 1,
        action_url: '/dashboard/invoices',
      },
    ],
  },
  activity_feed: [
    {
      id: 'af-1',
      type: 'CALL' as const,
      title: 'James Patterson called — Re-pipe quote',
      description: 'Whole-house re-pipe inquiry. Ready to book.',
      created_at: NOW - 2 * H,
      action_url: '/dashboard/lead-inbox',
    },
    {
      id: 'af-2',
      type: 'APPOINTMENT' as const,
      title: 'Appointment booked — David Chen',
      description: 'Annual plumbing maintenance scheduled for Thursday.',
      created_at: NOW - 5 * H,
      action_url: '/dashboard/appointments',
    },
    {
      id: 'af-3',
      type: 'PAYMENT' as const,
      title: 'Invoice paid — Lisa Rodriguez',
      description: '$420 paid for kitchen faucet + garbage disposal install.',
      created_at: NOW - 1 * D,
      action_url: '/dashboard/invoices',
    },
    {
      id: 'af-4',
      type: 'LEAD' as const,
      title: 'New lead captured — Sarah Williams',
      description: 'Water heater replacement quote. Intake started.',
      created_at: NOW - 1 * D - 3 * H,
      action_url: '/dashboard/lead-inbox',
    },
    {
      id: 'af-5',
      type: 'CALL' as const,
      title: 'Missed call — anonymous',
      description: 'Caller asked about slab leak detection. AI captured details.',
      created_at: NOW - 2 * D,
      action_url: '/dashboard/calls',
    },
    {
      id: 'af-6',
      type: 'APPOINTMENT' as const,
      title: 'Job completed — Lisa Rodriguez',
      description: 'Kitchen faucet and garbage disposal replaced.',
      created_at: NOW - 2 * D - 4 * H,
      action_url: '/dashboard/appointments',
    },
  ],
};

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------
export const DEMO_CALLS = [
  {
    call_id: 'demo-call-001',
    company_id: 'demo',
    contact_id: 'demo-contact-005',
    caller_phone: '+17025551234',
    caller_name: 'James Patterson',
    created_at: new Date(NOW - 2 * H).toISOString(),
    duration: 247,
    status: 'COMPLETED',
    outcome: 'LEAD',
    lead_captured: true,
    appointment_created: false,
    summary: 'Caller wants a quote for whole-house re-pipe. 1960s copper lines with multiple pinhole leaks. Ready to book as soon as he gets the estimate.',
  },
  {
    call_id: 'demo-call-002',
    company_id: 'demo',
    contact_id: 'demo-contact-001',
    caller_phone: '+17025559876',
    caller_name: 'Mike Johnson',
    created_at: new Date(NOW - 5 * H).toISOString(),
    duration: 183,
    status: 'COMPLETED',
    outcome: 'APPOINTMENT_BOOKED',
    lead_captured: true,
    appointment_created: true,
    appointment_id: 'demo-appt-001',
    summary: 'Water heater making loud popping noises. 12-year-old unit. Booked replacement appointment for tomorrow at 9 AM.',
  },
  {
    call_id: 'demo-call-003',
    company_id: 'demo',
    contact_id: 'demo-contact-002',
    caller_phone: '+17025554567',
    caller_name: 'Sarah Williams',
    created_at: new Date(NOW - 1 * D).toISOString(),
    duration: 312,
    status: 'COMPLETED',
    outcome: 'LEAD',
    lead_captured: true,
    appointment_created: false,
    summary: 'Tankless water heater upgrade inquiry. Currently on 40-gal tank. Wants energy-efficient option. AI captured address and system details.',
  },
  {
    call_id: 'demo-call-004',
    company_id: 'demo',
    contact_id: 'demo-contact-003',
    caller_phone: '+17025558901',
    caller_name: 'David Chen',
    created_at: new Date(NOW - 2 * D).toISOString(),
    duration: 95,
    status: 'COMPLETED',
    outcome: 'APPOINTMENT_BOOKED',
    lead_captured: true,
    appointment_created: true,
    appointment_id: 'demo-appt-002',
    summary: 'Annual plumbing inspection. Existing customer on maintenance plan. Scheduled for Thursday morning.',
  },
  {
    call_id: 'demo-call-005',
    company_id: 'demo',
    contact_id: undefined,
    caller_phone: '+17025553210',
    caller_name: undefined,
    created_at: new Date(NOW - 2 * D - 2 * H).toISOString(),
    duration: 178,
    status: 'COMPLETED',
    outcome: 'LEAD',
    lead_captured: true,
    appointment_created: false,
    summary: 'Caller reported wet spots on living room floor — possible slab leak. Very concerned. Left contact info for callback.',
  },
  {
    call_id: 'demo-call-006',
    company_id: 'demo',
    contact_id: 'demo-contact-004',
    caller_phone: '+17025557890',
    caller_name: 'Lisa Rodriguez',
    created_at: new Date(NOW - 3 * D).toISOString(),
    duration: 204,
    status: 'COMPLETED',
    outcome: 'APPOINTMENT_BOOKED',
    lead_captured: true,
    appointment_created: true,
    appointment_id: 'demo-appt-003',
    summary: 'Kitchen faucet dripping and garbage disposal jammed. Booked for same-day visit.',
  },
  {
    call_id: 'demo-call-007',
    company_id: 'demo',
    contact_id: undefined,
    caller_phone: '+17025556543',
    caller_name: undefined,
    created_at: new Date(NOW - 4 * D).toISOString(),
    duration: 32,
    status: 'COMPLETED',
    outcome: 'NO_LEAD',
    lead_captured: false,
    appointment_created: false,
    summary: 'Caller asked if we serve Henderson, NV. Outside service area — AI politely declined and suggested local alternatives.',
  },
];

// ---------------------------------------------------------------------------
// Message Threads
// ---------------------------------------------------------------------------
export const DEMO_THREADS = [
  {
    id: 'demo-thread-001',
    contact_name: 'Mike Johnson',
    contact_phone: '+17025559876',
    last_message: 'Perfect, see you tomorrow at 9! Do you need access to the garage for the water heater?',
    last_at: NOW - 3 * H,
    lead_status: 'CONVERTED',
  },
  {
    id: 'demo-thread-002',
    contact_name: 'Sarah Williams',
    contact_phone: '+17025554567',
    last_message: 'Thanks for the info on the tankless unit. I\'ll think it over and get back to you this week.',
    last_at: NOW - 1 * D + 2 * H,
    lead_status: 'QUALIFIED',
  },
  {
    id: 'demo-thread-003',
    contact_name: 'David Chen',
    contact_phone: '+17025558901',
    last_message: 'Got it, I\'ll be home between 9 and noon. Just ring the doorbell.',
    last_at: NOW - 1 * D - 4 * H,
    lead_status: 'CONVERTED',
  },
  {
    id: 'demo-thread-004',
    contact_name: 'James Patterson',
    contact_phone: '+17025551234',
    last_message: 'Yes, both bathrooms, the kitchen, and the laundry hookup. The house is about 1,800 sq ft.',
    last_at: NOW - 2 * H,
    lead_status: 'QUALIFIED',
  },
  {
    id: 'demo-thread-005',
    contact_name: 'Lisa Rodriguez',
    contact_phone: '+17025557890',
    last_message: 'All fixed! Great work. I\'ll definitely call you again for any plumbing issues.',
    last_at: NOW - 2 * D - 2 * H,
    lead_status: 'CONVERTED',
  },
];

// ---------------------------------------------------------------------------
// Contacts (Customers)
// ---------------------------------------------------------------------------
export const DEMO_CONTACTS = [
  {
    contact_id: 'demo-contact-001',
    company_id: 'demo',
    phone_number: '+17025559876',
    first_name: 'Mike',
    last_name: 'Johnson',
    name: 'Mike Johnson',
    phone: '+17025559876',
    email: 'mike.johnson@email.com',
    lead_status: 'CONVERTED',
    created_at: NOW - 30 * D,
    updated_at: NOW - 5 * H,
    last_contact_at: NOW - 5 * H,
    source: 'phone',
  },
  {
    contact_id: 'demo-contact-002',
    company_id: 'demo',
    phone_number: '+17025554567',
    first_name: 'Sarah',
    last_name: 'Williams',
    name: 'Sarah Williams',
    phone: '+17025554567',
    email: 'sarah.w@gmail.com',
    lead_status: 'QUALIFIED',
    created_at: NOW - 1 * D,
    updated_at: NOW - 1 * D,
    last_contact_at: NOW - 1 * D,
    source: 'phone',
  },
  {
    contact_id: 'demo-contact-003',
    company_id: 'demo',
    phone_number: '+17025558901',
    first_name: 'David',
    last_name: 'Chen',
    name: 'David Chen',
    phone: '+17025558901',
    email: 'dchen@outlook.com',
    lead_status: 'CONVERTED',
    created_at: NOW - 90 * D,
    updated_at: NOW - 2 * D,
    last_contact_at: NOW - 2 * D,
    source: 'phone',
  },
  {
    contact_id: 'demo-contact-004',
    company_id: 'demo',
    phone_number: '+17025557890',
    first_name: 'Lisa',
    last_name: 'Rodriguez',
    name: 'Lisa Rodriguez',
    phone: '+17025557890',
    email: 'lisarodriguez@yahoo.com',
    lead_status: 'CONVERTED',
    created_at: NOW - 60 * D,
    updated_at: NOW - 3 * D,
    last_contact_at: NOW - 3 * D,
    source: 'phone',
  },
  {
    contact_id: 'demo-contact-005',
    company_id: 'demo',
    phone_number: '+17025551234',
    first_name: 'James',
    last_name: 'Patterson',
    name: 'James Patterson',
    phone: '+17025551234',
    email: 'james.p@hotmail.com',
    lead_status: 'NEW',
    created_at: NOW - 2 * H,
    updated_at: NOW - 2 * H,
    last_contact_at: NOW - 2 * H,
    source: 'phone',
  },
];

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export const DEMO_LEADS: Array<{
  call_id: string;
  contact_id?: string;
  phone_number: string;
  contact_name?: string;
  summary?: string;
  lead_reason?: string;
  lead_progress_stage: 'INTERESTED' | 'INTAKE_STARTED' | 'READY_TO_BOOK';
  created_at: number;
  duration_seconds?: number;
}> = [
  {
    call_id: 'demo-call-001',
    contact_id: 'demo-contact-005',
    phone_number: '+17025551234',
    contact_name: 'James Patterson',
    summary: 'Whole-house re-pipe for 1960s home with pinhole copper leaks. 1,800 sq ft, 3 bed/2 bath. Caller has multiple active leaks and is ready to move forward once he gets an estimate.',
    lead_reason: 'Multiple active pinhole leaks — urgent repair needed.',
    lead_progress_stage: 'READY_TO_BOOK',
    created_at: NOW - 2 * H,
    duration_seconds: 247,
  },
  {
    call_id: 'demo-call-003',
    contact_id: 'demo-contact-002',
    phone_number: '+17025554567',
    contact_name: 'Sarah Williams',
    summary: 'Interested in upgrading from a 40-gallon tank water heater to a tankless Navien unit. AI captured address (4821 Sunrise Ave, Las Vegas), current unit age (8 years), and family size (4 people).',
    lead_reason: 'High energy bills and wanting to upgrade to tankless.',
    lead_progress_stage: 'INTAKE_STARTED',
    created_at: NOW - 1 * D,
    duration_seconds: 312,
  },
  {
    call_id: 'demo-call-005',
    contact_id: undefined,
    phone_number: '+17025553210',
    contact_name: undefined,
    summary: 'Caller noticed wet spots under living room flooring. Possible slab leak — described discoloration and warm spot on tile. Left callback number but did not provide full address.',
    lead_reason: 'Suspected slab leak causing floor damage.',
    lead_progress_stage: 'INTERESTED',
    created_at: NOW - 2 * D - 2 * H,
    duration_seconds: 178,
  },
];

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export const DEMO_APPOINTMENTS = [
  {
    appointment_id: 'demo-appt-001',
    contact_name: 'Mike Johnson',
    contact_email: 'mike.johnson@email.com',
    contact_phone: '+17025559876',
    service_type: 'Water Heater Replacement',
    status: 'CONFIRMED',
    scheduled_start: NOW + 1 * D - 3 * H, // tomorrow ~9 AM
    scheduled_end: NOW + 1 * D,
    address: { street: '2310 Desert Wind Dr', city: 'Las Vegas', state: 'NV', zip: '89101' },
    notes: 'Replace 12-year-old 50-gal gas water heater. Customer wants to discuss tankless upgrade option on site.',
    is_series_master: false,
    price_cents: 89500,
  },
  {
    appointment_id: 'demo-appt-002',
    contact_name: 'David Chen',
    contact_email: 'dchen@outlook.com',
    contact_phone: '+17025558901',
    service_type: 'Annual Plumbing Inspection',
    status: 'SCHEDULED',
    scheduled_start: NOW + 3 * D + 0.5 * H,
    scheduled_end: NOW + 3 * D + 2.5 * H,
    address: { street: '915 Jade Mountain Ct', city: 'Henderson', state: 'NV', zip: '89002' },
    notes: 'Annual maintenance plan customer. Check all fixtures, water pressure, and under-sink shutoffs.',
    is_series_master: false,
    price_cents: 14900,
  },
  {
    appointment_id: 'demo-appt-004',
    contact_name: 'James Patterson',
    contact_email: 'james.p@hotmail.com',
    contact_phone: '+17025551234',
    service_type: 'Whole-House Re-pipe Estimate',
    status: 'SCHEDULED',
    scheduled_start: NOW + 6 * D + H,
    scheduled_end: NOW + 6 * D + 2 * H,
    address: { street: '7702 Cactus Ave', city: 'Las Vegas', state: 'NV', zip: '89117' },
    notes: '1960s home, ~1,800 sq ft. Multiple pinhole leaks in copper lines. Customer wants full PEX re-pipe quote.',
    is_series_master: false,
    price_cents: 0,
  },
  {
    appointment_id: 'demo-appt-003',
    contact_name: 'Lisa Rodriguez',
    contact_email: 'lisarodriguez@yahoo.com',
    contact_phone: '+17025557890',
    service_type: 'Kitchen Faucet & Disposal Install',
    status: 'COMPLETED',
    scheduled_start: NOW - 2 * D + H,
    scheduled_end: NOW - 2 * D + 3 * H,
    address: { street: '3388 Palomino Ln', city: 'North Las Vegas', state: 'NV', zip: '89030' },
    notes: 'Replaced Moen kitchen faucet (customer-supplied) and installed new Insinkerator 3/4 HP disposal.',
    is_series_master: false,
    price_cents: 42000,
  },
];

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export const DEMO_INVOICES: Array<{
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  total_cents: number;
  status: string;
  created_at: number;
  due_date?: number;
}> = [
  {
    invoice_id: 'demo-inv-001',
    invoice_number: 'INV-0041',
    customer_name: 'Mike Johnson',
    customer_email: 'mike.johnson@email.com',
    total_cents: 89500,
    status: 'SENT',
    created_at: NOW - 1 * D,
    due_date: NOW + 14 * D,
  },
  {
    invoice_id: 'demo-inv-002',
    invoice_number: 'INV-0040',
    customer_name: 'Lisa Rodriguez',
    customer_email: 'lisarodriguez@yahoo.com',
    total_cents: 42000,
    status: 'PAID',
    created_at: NOW - 3 * D,
    due_date: NOW - 3 * D + 7 * D,
  },
  {
    invoice_id: 'demo-inv-003',
    invoice_number: 'INV-0039',
    customer_name: 'Sarah Williams',
    customer_email: 'sarah.w@gmail.com',
    total_cents: 28500,
    status: 'SENT',
    created_at: NOW - 2 * D,
    due_date: NOW + 12 * D,
  },
  {
    invoice_id: 'demo-inv-004',
    invoice_number: 'INV-0038',
    customer_name: 'David Chen',
    customer_email: 'dchen@outlook.com',
    total_cents: 14900,
    status: 'PAID',
    created_at: NOW - 10 * D,
    due_date: NOW - 3 * D,
  },
  {
    invoice_id: 'demo-inv-005',
    invoice_number: 'INV-0037',
    customer_name: 'James Patterson',
    customer_email: 'james.p@hotmail.com',
    total_cents: 0,
    status: 'DRAFT',
    created_at: NOW - 2 * H,
    due_date: undefined,
  },
];

export const DEMO_INVOICE_STATS: {
  total_invoices: number;
  paid_invoices: number;
  outstanding_invoices: number;
  total_revenue_cents: number;
  outstanding_amount_cents: number;
} = {
  total_invoices: 5,
  paid_invoices: 2,
  outstanding_invoices: 2,
  total_revenue_cents: 56900,
  outstanding_amount_cents: 118000,
};

// ---------------------------------------------------------------------------
// Payments (Stripe-backed)
// ---------------------------------------------------------------------------
export const DEMO_PAYMENTS: Array<{
  payment_id: string;
  contact_id?: string;
  customer_name?: string;
  customer_email?: string;
  service_name?: string;
  amount_cents: number;
  currency: string;
  payment_type: string;
  payment_status: string;
  created_at: number;
  paid_at?: number;
}> = [
  {
    payment_id: 'demo-pay-001',
    contact_id: 'demo-contact-001',
    customer_name: 'Mike Johnson',
    customer_email: 'mike.johnson@email.com',
    service_name: 'Water Heater Replacement',
    amount_cents: 89500,
    currency: 'usd',
    payment_type: 'BOOKING',
    payment_status: 'SUCCEEDED',
    created_at: NOW - 1 * D,
    paid_at: NOW - 1 * D,
  },
  {
    payment_id: 'demo-pay-002',
    contact_id: 'demo-contact-004',
    customer_name: 'Lisa Rodriguez',
    customer_email: 'lisarodriguez@yahoo.com',
    service_name: 'Kitchen Faucet & Disposal Install',
    amount_cents: 42000,
    currency: 'usd',
    payment_type: 'BOOKING',
    payment_status: 'SUCCEEDED',
    created_at: NOW - 3 * D,
    paid_at: NOW - 3 * D,
  },
  {
    payment_id: 'demo-pay-003',
    contact_id: 'demo-contact-003',
    customer_name: 'David Chen',
    customer_email: 'dchen@outlook.com',
    service_name: 'Annual Plumbing Inspection',
    amount_cents: 14900,
    currency: 'usd',
    payment_type: 'BOOKING',
    payment_status: 'SUCCEEDED',
    created_at: NOW - 10 * D,
    paid_at: NOW - 10 * D,
  },
  {
    payment_id: 'demo-pay-004',
    contact_id: 'demo-contact-002',
    customer_name: 'Sarah Williams',
    customer_email: 'sarah.w@gmail.com',
    service_name: 'Tankless Water Heater Quote',
    amount_cents: 0,
    currency: 'usd',
    payment_type: 'DEPOSIT',
    payment_status: 'REQUIRES_PAYMENT_METHOD',
    created_at: NOW - 1 * D,
    paid_at: undefined,
  },
];

export const DEMO_PAYMENT_STATS = {
  total_revenue_cents: 146400,
  this_month_revenue_cents: 131500,
  successful_payments: 3,
  average_ticket_cents: 48800,
};

// ---------------------------------------------------------------------------
// Analytics (call metrics)
// ---------------------------------------------------------------------------
export const DEMO_ANALYTICS: {
  period_days: number;
  total_calls: number;
  completed_calls: number;
  completion_rate: number;
  lead_capture_rate: number;
  booking_conversion_rate: number;
  inbound_calls: number;
  outbound_calls: number;
  avg_duration_seconds: number;
  sentiment: { positive: number; neutral: number; negative: number; unknown: number };
  lead_quality: Record<string, number>;
  daily_breakdown: Array<{ date: string; calls: number; leads: number; bookings: number }>;
} = {
  period_days: 30,
  total_calls: 7,
  completed_calls: 7,
  completion_rate: 100,
  lead_capture_rate: 71,
  booking_conversion_rate: 43,
  inbound_calls: 7,
  outbound_calls: 0,
  avg_duration_seconds: 178,
  sentiment: { positive: 5, neutral: 1, negative: 1, unknown: 0 },
  lead_quality: { HIGH: 3, MEDIUM: 2, LOW: 1 },
  daily_breakdown: (() => {
    const days: Array<{ date: string; calls: number; leads: number; bookings: number }> = [];
    const sampleCalls = [0,0,1,0,2,0,1,0,0,0,1,0,0,2,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(NOW - i * D);
      const idx = 29 - i;
      const calls = sampleCalls[idx] || 0;
      days.push({
        date: d.toISOString().slice(0, 10),
        calls,
        leads: Math.floor(calls * 0.7),
        bookings: Math.floor(calls * 0.4),
      });
    }
    return days;
  })(),
};

// ---------------------------------------------------------------------------
// Flagged Questions
// ---------------------------------------------------------------------------
export const DEMO_FLAGGED_QUESTIONS: Array<{
  flagged_id: string;
  call_id: string;
  question: string;
  context?: string;
  ai_attempted_answer?: string;
  confidence_score?: number;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  answer?: string;
  created_at: number;
}> = [
  {
    flagged_id: 'demo-flag-001',
    call_id: 'demo-call-001',
    question: 'Do you offer financing for larger jobs like a whole-house re-pipe?',
    context: 'Customer asked during a re-pipe quote call. Was interested in payment plan options.',
    ai_attempted_answer: 'We may have financing options available — please ask when we visit for your estimate.',
    confidence_score: 0.42,
    status: 'OPEN',
    created_at: NOW - 2 * H,
  },
  {
    flagged_id: 'demo-flag-002',
    call_id: 'demo-call-003',
    question: 'Can you install a tankless water heater in a home that runs on propane instead of natural gas?',
    context: 'Customer has propane tank. Wanted to know if Navien units are compatible.',
    ai_attempted_answer: 'Yes, many tankless units including Navien offer propane models — I recommend confirming with our tech.',
    confidence_score: 0.58,
    status: 'OPEN',
    created_at: NOW - 1 * D,
  },
  {
    flagged_id: 'demo-flag-003',
    call_id: 'demo-call-005',
    question: 'How long does a slab leak detection typically take, and is it destructive?',
    context: 'Caller was worried about having to tear up their floors for a slab leak diagnosis.',
    ai_attempted_answer: 'Slab leak detection usually takes 1–2 hours and we use electronic methods that are non-destructive.',
    confidence_score: 0.71,
    status: 'RESOLVED',
    answer: 'We use electronic leak detection equipment that pinpoints the leak without opening the slab. The process takes about 1–2 hours. Repairs may require some concrete cutting, but we minimize disruption.',
    created_at: NOW - 2 * D - 2 * H,
  },
];

// ---------------------------------------------------------------------------
// Outbound Calls
// ---------------------------------------------------------------------------
export const DEMO_OUTBOUND_CALLS: Array<{
  call_id: string;
  twilio_call_sid: string;
  to_number: string;
  from_number: string;
  context: string;
  status: string;
  created_at: number;
  custom_message?: string;
}> = [
  {
    call_id: 'demo-out-001',
    twilio_call_sid: 'CA000demo001',
    to_number: '+17025551234',
    from_number: '+17025550000',
    context: 'FOLLOW_UP',
    status: 'COMPLETED',
    created_at: NOW - 3 * H,
    custom_message: 'Follow up with James Patterson about his re-pipe estimate request. He called earlier today.',
  },
  {
    call_id: 'demo-out-002',
    twilio_call_sid: 'CA000demo002',
    to_number: '+17025554567',
    from_number: '+17025550000',
    context: 'FOLLOW_UP',
    status: 'COMPLETED',
    created_at: NOW - 1 * D + H,
    custom_message: 'Follow up with Sarah Williams about the tankless water heater quote.',
  },
  {
    call_id: 'demo-out-003',
    twilio_call_sid: 'CA000demo003',
    to_number: '+17025557890',
    from_number: '+17025550000',
    context: 'REVIEW_REQUEST',
    status: 'COMPLETED',
    created_at: NOW - 2 * D - H,
  },
];

// ---------------------------------------------------------------------------
// SMS Templates
// ---------------------------------------------------------------------------
export const DEMO_SMS_TEMPLATES: Array<{
  template_id: string;
  name: string;
  category: string;
  body: string;
  created_at: number;
}> = [
  {
    template_id: 'demo-tpl-001',
    name: 'Appointment Reminder — Day Before',
    category: 'APPOINTMENT_REMINDER',
    body: 'Hi {{contact_name}}, just a reminder that your appointment with {{company_name}} is tomorrow. Reply CONFIRM to confirm or call us to reschedule. See you then!',
    created_at: NOW - 14 * D,
  },
  {
    template_id: 'demo-tpl-002',
    name: 'Lead Follow-up — First Touch',
    category: 'FOLLOW_UP',
    body: "Hi {{contact_name}}, this is {{company_name}}. Thanks for reaching out! Here's your booking link to schedule at your convenience: {{booking_link}}",
    created_at: NOW - 14 * D,
  },
  {
    template_id: 'demo-tpl-003',
    name: 'Review Request — Post Job',
    category: 'REVIEW_REQUEST',
    body: "Hi {{contact_name}}, hope everything went great! If you're happy with our work, we'd really appreciate a quick Google review: {{booking_link}} — it means a lot. Thanks, {{company_name}}!",
    created_at: NOW - 7 * D,
  },
];

// ---------------------------------------------------------------------------
// Scheduled SMS Messages
// ---------------------------------------------------------------------------
export const DEMO_SCHEDULED_MESSAGES: Array<{
  message_id: string;
  to_number: string;
  body: string;
  send_at: number;
  status: string;
  message_type: string;
}> = [
  {
    message_id: 'demo-sched-001',
    to_number: '+17025559876',
    body: "Hi Mike, just a reminder that your appointment with Toushe Plumbing is tomorrow at 9 AM. Reply CONFIRM to confirm. See you then!",
    send_at: NOW + 12 * H,
    status: 'PENDING',
    message_type: 'APPOINTMENT_REMINDER',
  },
  {
    message_id: 'demo-sched-002',
    to_number: '+17025551234',
    body: "Hi James, this is Toushe Plumbing. Haven't heard back — we'd love to get you that re-pipe estimate. Book here: your booking link",
    send_at: NOW + 24 * H,
    status: 'PENDING',
    message_type: 'FOLLOW_UP',
  },
];

// ---------------------------------------------------------------------------
// Follow-up Sequences
// ---------------------------------------------------------------------------
export const DEMO_SEQUENCES: Array<{
  sequence_id: string;
  to_number: string;
  status: string;
  created_at: number;
  steps: Array<{ step: number; send_at: number; body: string }>;
}> = [
  {
    sequence_id: 'demo-seq-001',
    to_number: '+17025551234',
    status: 'SCHEDULED',
    created_at: NOW - 2 * H,
    steps: [
      { step: 1, send_at: NOW + 5 * 60_000, body: "Hi James, thanks for calling Toushe Plumbing! Here's your booking link: your booking link" },
      { step: 2, send_at: NOW + 1 * D, body: "Hey James, just checking in — ready to schedule that re-pipe estimate?" },
      { step: 3, send_at: NOW + 3 * D, body: "Last check-in from Toushe Plumbing — let us know if you'd like that estimate: your booking link" },
    ],
  },
  {
    sequence_id: 'demo-seq-002',
    to_number: '+17025554567',
    status: 'SCHEDULED',
    created_at: NOW - 1 * D,
    steps: [
      { step: 1, send_at: NOW - 1 * D + 5 * 60_000, body: "Hi Sarah, thanks for calling Toushe Plumbing! Book your tankless water heater consultation here: your booking link" },
      { step: 2, send_at: NOW + 12 * H, body: "Hi Sarah, still interested in upgrading to tankless? We'd love to help — your booking link" },
    ],
  },
  {
    sequence_id: 'demo-seq-003',
    to_number: '+17025557890',
    status: 'COMPLETED',
    created_at: NOW - 3 * D,
    steps: [
      { step: 1, send_at: NOW - 3 * D + 5 * 60_000, body: "Hi Lisa, thanks for calling Toushe Plumbing! Book your service here: your booking link" },
      { step: 2, send_at: NOW - 2 * D, body: "Hi Lisa, just a quick follow-up — ready to get that faucet and disposal fixed?" },
    ],
  },
];
