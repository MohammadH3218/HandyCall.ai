export type MarketplaceCategoryKey =
  | 'AC_HVAC'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'PAINTING'
  | 'CLEANING'
  | 'PEST_CONTROL'
  | 'CARPENTRY'
  | 'MOVING'
  | 'APPLIANCE_REPAIR'
  | 'SATELLITE_DISH'
  | 'LANDSCAPING'
  | 'GENERAL_HANDYMAN';

export interface MarketplaceCategory {
  key: MarketplaceCategoryKey;
  label_en: string;
  label_ar: string;
  description: string;
  bio_template: string;
  preset_skills: string[];
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    key: 'AC_HVAC',
    label_en: 'AC & HVAC',
    label_ar: 'تكييف وتبريد',
    description: 'AC installation, repair, maintenance, and ventilation.',
    bio_template:
      'Experienced AC & HVAC technician specializing in installation, repair, and preventive maintenance for all types of air conditioning systems. Committed to fast response times and quality workmanship.',
    preset_skills: [
      'AC Repair',
      'AC Installation',
      'AC Maintenance',
      'Duct Cleaning',
      'Thermostat Installation',
      'Gas Refill',
      'Ventilation Setup',
      'Central AC Service',
      'Split Unit Installation',
      'AC Deep Cleaning',
    ],
  },
  {
    key: 'PLUMBING',
    label_en: 'Plumbing',
    label_ar: 'سباكة',
    description: 'Pipe repair, water heaters, fixtures, and drain cleaning.',
    bio_template:
      'Professional plumber with hands-on experience in pipe repair, water heater installation, drain cleaning, and all types of plumbing fixtures. Available for both residential and commercial jobs.',
    preset_skills: [
      'Pipe Repair',
      'Pipe Installation',
      'Water Heater Repair',
      'Water Heater Installation',
      'Drain Cleaning',
      'Leak Detection',
      'Faucet Repair',
      'Toilet Repair',
      'Sewage Services',
      'Kitchen Sink Installation',
    ],
  },
  {
    key: 'ELECTRICAL',
    label_en: 'Electrical',
    label_ar: 'كهرباء',
    description: 'Wiring, lighting, circuit breakers, and smart home.',
    bio_template:
      'Licensed electrician specializing in residential and commercial wiring, lighting installation, circuit breaker repair, and smart home systems. Safety-first approach with all work guaranteed.',
    preset_skills: [
      'Wiring & Rewiring',
      'Outlet Installation',
      'Switch Repair',
      'Circuit Breaker Repair',
      'Panel Upgrade',
      'Lighting Installation',
      'Smart Home Wiring',
      'Safety Inspection',
      'Generator Installation',
      'Chandelier Hanging',
    ],
  },
  {
    key: 'PAINTING',
    label_en: 'Painting',
    label_ar: 'دهانات',
    description: 'Interior and exterior painting for homes and offices.',
    bio_template:
      'Skilled painter offering high-quality interior and exterior painting services for homes and offices. Clean work, premium materials, and attention to detail on every project.',
    preset_skills: [
      'Interior Painting',
      'Exterior Painting',
      'Wall Preparation',
      'Texture & Stucco',
      'Ceiling Painting',
      'Wallpaper Removal',
      'Primer Coat',
      'Anti-Mold Paint',
      'Office Painting',
      'Cabinet Painting',
    ],
  },
  {
    key: 'CLEANING',
    label_en: 'Cleaning',
    label_ar: 'تنظيف',
    description: 'Home, office, and deep cleaning services.',
    bio_template:
      'Professional cleaner providing thorough home, office, and deep cleaning services. Using safe, effective products to deliver spotless results every time.',
    preset_skills: [
      'Home Cleaning',
      'Deep Cleaning',
      'Office Cleaning',
      'Move-In / Move-Out Cleaning',
      'Kitchen Deep Clean',
      'Bathroom Deep Clean',
      'Post-Construction Cleaning',
      'Carpet Cleaning',
      'Sofa Cleaning',
      'Mattress Cleaning',
    ],
  },
  {
    key: 'PEST_CONTROL',
    label_en: 'Pest Control',
    label_ar: 'مكافحة حشرات',
    description: 'Insects, rodents, and termite treatment.',
    bio_template:
      'Certified pest control specialist offering safe and effective treatments for insects, rodents, termites, and other pests. Quick response and guaranteed results.',
    preset_skills: [
      'Cockroach Treatment',
      'Termite Treatment',
      'Rodent Control',
      'Ant Treatment',
      'Bed Bug Treatment',
      'Mosquito Spraying',
      'Fumigation',
      'Spider Control',
      'Fly Control',
      'General Pest Inspection',
    ],
  },
  {
    key: 'CARPENTRY',
    label_en: 'Carpentry',
    label_ar: 'نجارة',
    description: 'Furniture assembly, doors, cabinets, and wood repairs.',
    bio_template:
      'Skilled carpenter offering furniture assembly, custom woodwork, door installation, cabinet fitting, and all types of wood repairs. Precise and reliable craftsmanship.',
    preset_skills: [
      'Furniture Assembly',
      'Door Installation',
      'Cabinet Installation',
      'Wardrobe Assembly',
      'Wood Repair',
      'Shelving Installation',
      'Custom Woodwork',
      'Floor Laying',
      'False Ceiling',
      'Partition Walls',
    ],
  },
  {
    key: 'MOVING',
    label_en: 'Moving',
    label_ar: 'نقل عفش',
    description: 'Furniture moving, packing, and relocation services.',
    bio_template:
      'Reliable moving specialist offering furniture moving, packing, and full relocation services within Riyadh. Careful handling and on-time delivery guaranteed.',
    preset_skills: [
      'Apartment Moving',
      'Villa Moving',
      'Office Relocation',
      'Furniture Packing',
      'Furniture Assembly & Disassembly',
      'Storage Solutions',
      'Piano Moving',
      'Heavy Item Moving',
      'Same-Day Moving',
      'Long-Distance Moving',
    ],
  },
  {
    key: 'APPLIANCE_REPAIR',
    label_en: 'Appliance Repair',
    label_ar: 'إصلاح أجهزة',
    description: 'Washing machines, refrigerators, ovens, and more.',
    bio_template:
      'Experienced appliance repair technician for all major brands. Specializing in washing machines, refrigerators, ovens, dishwashers, and other home appliances. Same-day service available.',
    preset_skills: [
      'Washing Machine Repair',
      'Refrigerator Repair',
      'Oven Repair',
      'Dishwasher Repair',
      'Dryer Repair',
      'Microwave Repair',
      'Water Dispenser Repair',
      'Vacuum Cleaner Repair',
      'Freezer Repair',
      'Gas Stove Repair',
    ],
  },
  {
    key: 'SATELLITE_DISH',
    label_en: 'Satellite & TV',
    label_ar: 'دش وتلفزيون',
    description: 'Dish installation, TV mounting, and network setup.',
    bio_template:
      'Technical specialist in satellite dish installation, TV mounting, and home network setup. Fast and clean installation with full configuration included.',
    preset_skills: [
      'Satellite Dish Installation',
      'TV Mounting',
      'Receiver Setup',
      'Internet Router Setup',
      'IPTV Setup',
      'Antenna Installation',
      'Smart TV Setup',
      'Cable Management',
      'Home Theater Setup',
      'CCTV Installation',
    ],
  },
  {
    key: 'LANDSCAPING',
    label_en: 'Landscaping',
    label_ar: 'تنسيق حدائق',
    description: 'Garden design, planting, irrigation, and lawn care.',
    bio_template:
      'Professional landscaper specializing in garden design, planting, irrigation systems, and regular lawn care. Transforming outdoor spaces into beautiful, low-maintenance gardens.',
    preset_skills: [
      'Garden Design',
      'Lawn Mowing',
      'Tree Trimming',
      'Hedge Trimming',
      'Irrigation Installation',
      'Planting & Seeding',
      'Garden Cleanup',
      'Artificial Grass',
      'Outdoor Lighting',
      'Retaining Walls',
    ],
  },
  {
    key: 'GENERAL_HANDYMAN',
    label_en: 'General Handyman',
    label_ar: 'أعمال عامة',
    description: 'General repairs, installations, and home maintenance.',
    bio_template:
      'Versatile handyman available for all types of home repairs, installations, and general maintenance tasks. Quick, reliable, and priced fairly for any job big or small.',
    preset_skills: [
      'General Repairs',
      'Wall Mounting',
      'Door Repair',
      'Lock Repair',
      'Tile Repair',
      'Caulking & Sealing',
      'Assembly Services',
      'Curtain Rod Installation',
      'Minor Plumbing',
      'Minor Electrical',
    ],
  },
];

export function getCategoryByKey(key: string): MarketplaceCategory | undefined {
  return MARKETPLACE_CATEGORIES.find((c) => c.key === key);
}
