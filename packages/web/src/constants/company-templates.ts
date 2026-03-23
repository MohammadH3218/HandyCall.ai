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
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you located in?' },
    { field_key: 'pest_type_or_symptoms', label: 'Pest or issue', prompt: 'What pest type or symptoms are you dealing with?' },
    { field_key: 'where_seen', label: 'Where the issue is', prompt: 'Where have you seen the issue — inside, outside, or both?' },
    { field_key: 'severity', label: 'Severity', prompt: 'How severe would you say the problem is: mild, moderate, or severe?' },
    { field_key: 'address', label: 'Service address', prompt: 'What is the service address?' },
    { field_key: 'selected_billing_type', label: 'Service plan', prompt: 'Would you prefer a one-time treatment or a recurring monthly service?' },
  ],
  plumbing: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?', required: false },
    { field_key: 'issue_type', label: 'Issue type', prompt: 'What plumbing issue are you dealing with today?' },
    { field_key: 'urgency', label: 'Urgency', prompt: 'Is this urgent, or is it something that can wait a bit?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  hvac: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?', required: false },
    { field_key: 'system_type', label: 'System type', prompt: 'Is this for your AC, split unit, central system, or another HVAC unit?' },
    { field_key: 'symptoms', label: 'Symptoms', prompt: 'What issue are you noticing with the system — not cooling, strange noise, water leaking, or something else?' },
    { field_key: 'urgency', label: 'Urgency', prompt: 'How urgent does this feel right now?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  electrical: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?', required: false },
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
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?', required: false },
    { field_key: 'cleaning_type', label: 'Cleaning type', prompt: 'What kind of cleaning do you need — regular, deep clean, move-in/out, or post-construction?' },
    { field_key: 'home_size', label: 'Home size', prompt: 'About how large is the home or space in square meters?' },
    { field_key: 'num_rooms', label: 'Number of rooms', prompt: 'How many rooms are there?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  car_wash: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?' },
    { field_key: 'service_type', label: 'Wash type', prompt: 'What kind of car service are you looking for — basic wash, full detail, interior cleaning, polishing, or something else?' },
    { field_key: 'vehicle_make', label: 'Vehicle make/model', prompt: 'What is the make and model of the vehicle?' },
    { field_key: 'location_type', label: 'Location', prompt: 'Would you like us to come to your location, or will you bring the vehicle to us?' },
  ],
  appliance_repair: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?', required: false },
    { field_key: 'appliance_type', label: 'Appliance type', prompt: 'Which appliance needs repair — washing machine, dryer, refrigerator, oven, dishwasher, or something else?' },
    { field_key: 'brand', label: 'Brand', prompt: 'What brand is the appliance?', required: false },
    { field_key: 'issue_summary', label: 'Issue details', prompt: 'What issue are you experiencing with the appliance?' },
    { field_key: 'urgency', label: 'Urgency', prompt: 'Is this urgent or can it wait a day or two?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  moving: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'move_type', label: 'Move type', prompt: 'Is this a home move, office move, or furniture/item delivery?' },
    { field_key: 'from_city', label: 'Moving from', prompt: 'Which city are you moving from?' },
    { field_key: 'to_city', label: 'Moving to', prompt: 'Which city are you moving to?' },
    { field_key: 'property_size', label: 'Property size', prompt: 'About how large is the place — studio, 1-bed, 2-bed, villa, or office?' },
    { field_key: 'preferred_date', label: 'Preferred date', prompt: 'Do you have a preferred date or timeframe for the move?' },
    { field_key: 'special_items', label: 'Special items', prompt: 'Are there any heavy or fragile items like pianos, large appliances, or artwork?', required: false },
  ],
  landscaping: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?', required: false },
    { field_key: 'service_type', label: 'Service type', prompt: 'What kind of landscaping help do you need — garden design, lawn care, tree trimming, irrigation, or something else?' },
    { field_key: 'property_size', label: 'Property size', prompt: 'About how large is the garden or outdoor area?' },
    { field_key: 'service_address', label: 'Service address', prompt: 'What is the service address?' },
  ],
  general: [
    { field_key: 'full_name', label: 'Customer name', prompt: 'What is your full name?' },
    { field_key: 'city', label: 'Service city', prompt: 'Which city are you in?', required: false },
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
  [ServiceType.AUTO_MECHANIC]: 'car_wash',
  [ServiceType.CLEANING]: 'cleaning',
  [ServiceType.CARPET_CLEANING]: 'cleaning',
  [ServiceType.WINDOW_CLEANING]: 'cleaning',
  [ServiceType.PRESSURE_WASHING]: 'cleaning',
  [ServiceType.POOL_SERVICE]: 'general',
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
  [ServiceType.APPLIANCE_REPAIR]: 'appliance_repair',
  [ServiceType.LOCKSMITH]: 'general',
  [ServiceType.MOVING]: 'moving',
  [ServiceType.JUNK_REMOVAL]: 'general',
  [ServiceType.FENCING]: 'general',
  [ServiceType.CONCRETE]: 'general',
  [ServiceType.SOLAR]: 'general',
  [ServiceType.SECURITY]: 'general',
  [ServiceType.OTHER]: 'general',
};

export const COMPANY_TEMPLATE_OPTIONS: CompanyTemplateOption[] = [
  {
    serviceType: ServiceType.HVAC,
    title: 'AC & HVAC',
    category: 'Home services',
    description: 'AC repair, installation, maintenance, and duct cleaning.',
    highlights: ['System type capture', 'Symptom intake', 'Urgency triage'],
  },
  {
    serviceType: ServiceType.PLUMBING,
    title: 'Plumbing',
    category: 'Home services',
    description: 'Pipe repair, leaks, drains, water heaters, and fixtures.',
    highlights: ['Issue type intake', 'Urgency capture', 'Fast booking flow'],
  },
  {
    serviceType: ServiceType.ELECTRICIAN,
    title: 'Electrical',
    category: 'Home services',
    description: 'Wiring, outlets, circuit breakers, lighting, and smart home.',
    highlights: ['Safety-first phrasing', 'Urgency capture', 'Service address'],
  },
  {
    serviceType: ServiceType.CLEANING,
    title: 'House Cleaning',
    category: 'Home services',
    description: 'Regular, deep clean, move-in/out, post-construction, and maid service.',
    highlights: ['Cleaning type', 'Home size & rooms', 'Address capture'],
  },
  {
    serviceType: ServiceType.AUTO_MECHANIC,
    title: 'Car Washing & Detailing',
    category: 'Auto services',
    description: 'Mobile car wash, full detail, polishing, and interior cleaning.',
    highlights: ['Wash type', 'Vehicle make/model', 'Mobile or drop-off'],
  },
  {
    serviceType: ServiceType.APPLIANCE_REPAIR,
    title: 'Appliance Repair',
    category: 'Home services',
    description: 'Washing machine, dryer, fridge, oven, dishwasher, and more.',
    highlights: ['Appliance type', 'Brand intake', 'Issue details & urgency'],
  },
  {
    serviceType: ServiceType.MOVING,
    title: 'Moving & Delivery',
    category: 'Logistics',
    description: 'Home moving, office relocation, furniture delivery, and packing.',
    highlights: ['From/to cities', 'Property size', 'Special items note'],
  },
  {
    serviceType: ServiceType.PEST_CONTROL,
    title: 'Pest Control',
    category: 'Home services',
    description: 'Cockroach, termite, scorpion, rodent, and mosquito treatment.',
    highlights: ['Pest type & severity', 'Location in home', 'One-time vs recurring'],
  },
  {
    serviceType: ServiceType.PAINTING,
    title: 'Painting',
    category: 'Home services',
    description: 'Interior, exterior, texture, epoxy, and decorative finishes.',
    highlights: ['Flexible intake', 'Address capture', 'Easy to customize'],
  },
  {
    serviceType: ServiceType.LANDSCAPING,
    title: 'Landscaping & Garden',
    category: 'Outdoor services',
    description: 'Garden design, lawn care, tree trimming, and irrigation.',
    highlights: ['Service type', 'Property size', 'Address capture'],
  },
  {
    serviceType: ServiceType.HANDYMAN,
    title: 'Handyman & General Repairs',
    category: 'Home services',
    description: 'Furniture assembly, mounting, carpentry, tiling, and general fixes.',
    highlights: ['Flexible intake', 'Address capture', 'Easy to customize'],
  },
  {
    serviceType: ServiceType.OTHER,
    title: 'Other / Custom',
    category: 'Flexible template',
    description: 'Start from a general template and tailor the call flow yourself.',
    highlights: ['Generic intake', 'Editable questions', 'Works for niche services'],
  },
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
      'What should the AI say about prep steps, pets on-site, re-service policies, and fumigation certificates?',
    ];
  }
  if (serviceType === ServiceType.HVAC) {
    return [
      ...base,
      'What AC systems do you service, and what emergency or after-hours rules apply?',
      'What maintenance plans, diagnostic fees, or seasonal tune-up offers should the AI know?',
    ];
  }
  if (serviceType === ServiceType.APPLIANCE_REPAIR) {
    return [
      ...base,
      'Which brands and appliance types do you repair?',
      'What is your diagnostic fee policy, and do you offer warranties on repairs?',
    ];
  }
  if (serviceType === ServiceType.MOVING) {
    return [
      ...base,
      'What is your pricing model — flat rate, hourly, or by volume?',
      'Which cities or routes do you cover, and do you offer packing materials or storage?',
    ];
  }
  if (serviceType === ServiceType.CLEANING) {
    return [
      ...base,
      'What types of cleaning do you offer — regular, deep, move-in/out, post-construction?',
      'Do you bring your own supplies, and are there any surfaces or items you do not clean?',
    ];
  }
  return base;
}
