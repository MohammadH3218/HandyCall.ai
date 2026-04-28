// Lead fee amounts in Halalas (1 SAR = 100 Halalas) charged to the pro when they claim an open job post.
// Tiers are driven purely by service category — no new pricing infrastructure needed.

export const LEAD_FEE_TIERS: Record<string, number> = {
  'AC & HVAC': 2500,
  Electrical: 2500,
  Plumbing: 2000,
  'Appliance Repair': 2000,
  'Pest Control': 2000,
  'Moving & Delivery': 2000,
  Handyman: 2000,
  'House Cleaning': 1500,
  Painting: 1500,
  Carpentry: 1500,
  Landscaping: 1500,
  'Network & IT Setup': 2000,
  'Security Systems': 2000,
  'Locksmith & Keys': 2000,
  'Kitchen Renovation': 2500,
  'Bathroom Renovation': 2500,
  'Roofing & Waterproofing': 2500,
  'Solar & Energy': 2500,
  'Gas Services': 2000,
  AC_HVAC: 2500, // SAR 25
  ELECTRICAL: 2500, // SAR 25
  PLUMBING: 2000, // SAR 20
  APPLIANCE_REPAIR: 2000, // SAR 20
  PEST_CONTROL: 2000, // SAR 20
  MOVING: 2000, // SAR 20
  GENERAL_HANDYMAN: 2000, // SAR 20
  PAINTING: 1500, // SAR 15
  CLEANING: 1500, // SAR 15
  CARPENTRY: 1500, // SAR 15
  SATELLITE_DISH: 1500, // SAR 15
  LANDSCAPING: 1500, // SAR 15
  OTHER: 2000, // SAR 20 fallback
};

export function getLeadFeeHalalas(category: string): number {
  const direct = LEAD_FEE_TIERS[category];
  if (direct) return direct;
  const normalized = category.trim().toLowerCase();
  const match = Object.entries(LEAD_FEE_TIERS).find(([key]) => key.toLowerCase() === normalized);
  return match?.[1] ?? LEAD_FEE_TIERS['OTHER'];
}

export function halalasToSar(halalas: number): number {
  return Math.round(halalas) / 100;
}

/** 48-hour TTL for open job posts (in milliseconds) */
export const OPEN_JOB_TTL_MS = 48 * 60 * 60 * 1000;
