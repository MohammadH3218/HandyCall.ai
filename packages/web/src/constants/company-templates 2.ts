import { ServiceType } from '@handycall/shared';

export type CompanyTemplateOption = {
  serviceType: ServiceType;
  title: string;
  category: string;
  description: string;
  highlights: string[];
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

