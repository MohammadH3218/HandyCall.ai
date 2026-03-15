import { CompanyCallFlowQuestion, ServiceType } from '@handycall/shared';

export type CompanyTemplateOption = {
  serviceType: ServiceType;
  title: string;
  category: string;
  description: string;
  highlights: string[];
};

type QuestionSeed = {
  field_key: string;
  label: string;
  prompt: string;
  helper_text?: string;
  required?: boolean;
};

const questionSeeds = {
  pest: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'zip', label: 'Service ZIP code', prompt: 'Could you give me your 5-digit ZIP code?' },
    { field_key: 'pest_type_or_symptoms', label: 'Pest or issue', prompt: 'What pest type or symptoms are you dealing with?' },
    { field_key: 'where_seen', label: 'Where the issue is', prompt: 'Where have you seen the issue?' },
    { field_key: 'severity', label: 'Severity', prompt: 'How severe would you say the problem is: mild, moderate, or severe?' },
    { field_key: 'address', label: 'Service address', prompt: 'What is the service address?' },
    { field_key: 'selected_billing_type', label: 'Service plan', prompt: 'Would you like a one-time treatment or recurring monthly service?' },
  ],
  plumbing: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'zip', label: 'Service ZIP code', prompt: 'Could you give me your 5-digit ZIP code?', required: false },
    { field_key: 'issue_type', label: 'Issue type', prompt: 'What plumbing issue are you dealing with today?' },
    { field_key: 'urgency', label: 'Urgency', prompt: 'Is this urgent, or is it something that can wait a bit?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  hvac: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'zip', label: 'Service ZIP code', prompt: 'Could you give me your 5-digit ZIP code?', required: false },
    { field_key: 'system_type', label: 'System type', prompt: 'Is this for your AC, heater, or another HVAC system?' },
    { field_key: 'symptoms', label: 'Symptoms', prompt: 'What issue are you noticing with the system?' },
    { field_key: 'urgency', label: 'Urgency', prompt: 'How urgent does this feel right now?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  electrical: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'zip', label: 'Service ZIP code', prompt: 'Could you give me your 5-digit ZIP code?', required: false },
    { field_key: 'issue_summary', label: 'Issue summary', prompt: 'What electrical issue are you calling about?' },
    { field_key: 'urgency', label: 'Urgency', prompt: 'Is this urgent or more routine?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  mechanic: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'service_request_type', label: 'Service request', prompt: 'What do you need help with for your vehicle today?' },
    { field_key: 'vehicle_make', label: 'Vehicle make', prompt: 'What is the make of the vehicle?' },
    { field_key: 'vehicle_model', label: 'Vehicle model', prompt: 'What is the model of the vehicle?' },
    { field_key: 'vehicle_year', label: 'Vehicle year', prompt: 'What year is the vehicle?' },
    { field_key: 'issue_summary', label: 'Issue details', prompt: 'What issue are you noticing with the vehicle?' },
  ],
  cleaning: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'zip', label: 'Service ZIP code', prompt: 'Could you give me your 5-digit ZIP code?', required: false },
    { field_key: 'home_size_sqft', label: 'Home size', prompt: 'About how large is the home in square feet?' },
    { field_key: 'num_beds', label: 'Bedrooms', prompt: 'How many bedrooms are there?' },
    { field_key: 'num_baths', label: 'Bathrooms', prompt: 'How many bathrooms are there?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  landscaping: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'zip', label: 'Service ZIP code', prompt: 'Could you give me your 5-digit ZIP code?', required: false },
    { field_key: 'service_type', label: 'Service type', prompt: 'What kind of landscaping or lawn care help do you need?' },
    { field_key: 'lot_approx_size', label: 'Property size', prompt: 'About how large is the property or yard?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  general: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'zip', label: 'Service ZIP code', prompt: 'Could you give me your 5-digit ZIP code?', required: false },
    { field_key: 'service_request_type', label: 'Service needed', prompt: 'What can we help you with today?' },
    { field_key: 'issue_summary', label: 'Issue details', prompt: 'Can you tell me a little more about the job or issue?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
} satisfies Record<string, QuestionSeed[]>;

const templateFamilyByServiceType: Record<ServiceType, keyof typeof questionSeeds> = {
  [ServiceType.PEST_CONTROL]: 'pest',
  [ServiceType.PLUMBING]: 'plumbing',
  [ServiceType.HVAC]: 'hvac',
  [ServiceType.ELECTRICIAN]: 'electrical',
  [ServiceType.AUTO_MECHANIC]: 'mechanic',
  [ServiceType.CLEANING]: 'cleaning',
  [ServiceType.CARPET_CLEANING]: 'cleaning',
  [ServiceType.WINDOW_CLEANING]: 'cleaning',
  [ServiceType.PRESSURE_WASHING]: 'cleaning',
  [ServiceType.POOL_SERVICE]: 'cleaning',
  [ServiceType.LANDSCAPING]: 'landscaping',
  [ServiceType.LAWN_CARE]: 'landscaping',
  [ServiceType.TREE_SERVICE]: 'landscaping',
  [ServiceType.IRRIGATION]: 'landscaping',
  [ServiceType.SNOW_REMOVAL]: 'landscaping',
  [ServiceType.HANDYMAN]: 'general',
  [ServiceType.ROOFING]: 'general',
  [ServiceType.PAINTING]: 'general',
  [ServiceType.FLOORING]: 'general',
  [ServiceType.REMODELING]: 'general',
  [ServiceType.GARAGE_DOOR]: 'general',
  [ServiceType.APPLIANCE_REPAIR]: 'general',
  [ServiceType.LOCKSMITH]: 'general',
  [ServiceType.MOVING]: 'general',
  [ServiceType.JUNK_REMOVAL]: 'general',
  [ServiceType.FENCING]: 'general',
  [ServiceType.CONCRETE]: 'general',
  [ServiceType.SOLAR]: 'general',
  [ServiceType.SECURITY]: 'general',
  [ServiceType.OTHER]: 'general',
};

export const COMPANY_TEMPLATE_OPTIONS: CompanyTemplateOption[] = [
  { serviceType: ServiceType.PEST_CONTROL, title: 'Pest Control', category: 'Home services', description: 'Built for treatments, inspections, and recurring plans.', highlights: ['ZIP check first', 'Pest and severity intake', 'One-time vs recurring'] },
  { serviceType: ServiceType.PLUMBING, title: 'Plumbing', category: 'Home services', description: 'Focused on issue type, urgency, and the job address.', highlights: ['Leak / clog triage', 'Urgency capture', 'Fast booking'] },
  { serviceType: ServiceType.HVAC, title: 'HVAC', category: 'Home services', description: 'Covers AC, heating, tune-ups, and emergency symptoms.', highlights: ['System type', 'Symptoms', 'Urgency'] },
  { serviceType: ServiceType.ELECTRICIAN, title: 'Electrical', category: 'Home services', description: 'Collects issue details safely before booking.', highlights: ['Safety-first phrasing', 'Urgency capture', 'Service address'] },
  { serviceType: ServiceType.CLEANING, title: 'Cleaning', category: 'Home services', description: 'Good for one-time, deep clean, and recurring home cleaning.', highlights: ['Beds and baths', 'Home size', 'Address'] },
  { serviceType: ServiceType.LANDSCAPING, title: 'Landscaping', category: 'Outdoor services', description: 'Quote-oriented flow for lawn care and property work.', highlights: ['Service type', 'Property size', 'Address'] },
  { serviceType: ServiceType.AUTO_MECHANIC, title: 'Auto Repair', category: 'Auto services', description: 'Captures vehicle details before offering a slot.', highlights: ['Make / model / year', 'Issue summary', 'Service request type'] },
  { serviceType: ServiceType.HANDYMAN, title: 'General Home Services', category: 'Flexible template', description: 'Broad template for handyman, remodeling, garage door, and similar work.', highlights: ['Flexible intake', 'Address capture', 'Easy to customize'] },
  { serviceType: ServiceType.OTHER, title: 'Other / Custom', category: 'Flexible template', description: 'Start from a general template and tailor the call flow yourself.', highlights: ['Generic intake', 'Editable questions', 'Works for niche services'] },
];

export function createDefaultCallFlowQuestions(serviceType: ServiceType): CompanyCallFlowQuestion[] {
  const family = templateFamilyByServiceType[serviceType] || 'general';
  return questionSeeds[family].map((seed, index) => ({
    id: `${serviceType.toLowerCase()}-${seed.field_key}-${index + 1}`,
    field_key: seed.field_key,
    label: seed.label,
    prompt: seed.prompt,
    helper_text: seed.helper_text,
    required: seed.required !== false,
    enabled: true,
    order: index,
  }));
}

export function getKnowledgeBasePromptSuggestions(serviceType?: ServiceType | null): string[] {
  const base = [
    'What services do you offer, and how should the AI explain them?',
    'What pricing, fees, minimums, or quote rules should callers hear?',
    'What service-area, hours, or scheduling policies should the AI know?',
    'What should the AI say about warranties, cancellations, deposits, or payment terms?',
    'What are the most common customer questions you want answered consistently?',
  ];
  if (serviceType === ServiceType.PEST_CONTROL) {
    return [
      ...base,
      'Which pests do you treat, and do you offer one-time vs recurring plans?',
      'What should the AI say about inspection timing, prep steps, pets, and re-service policies?',
    ];
  }
  if (serviceType === ServiceType.HVAC) {
    return [
      ...base,
      'What systems do you service, and what emergency or after-hours rules apply?',
      'What maintenance plans, diagnostic fees, or seasonal tune-up offers should the AI know?',
    ];
  }
  return base;
}
