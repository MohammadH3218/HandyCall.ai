// ─── Enums ────────────────────────────────────────────────────────────────────

export type IdType = 'NATIONAL_ID' | 'IQAMA';
export type PreferredLanguage = 'ar' | 'en';

export type CustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type ProStatus = 'ONBOARDING' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type UserType = 'CUSTOMER' | 'PRO' | 'ADMIN';

export type ServiceCategory = string;

export type PricingType = 'FIXED' | 'HOURLY' | 'QUOTE';

export type BookingStatus =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';
export type PaymentMethod = 'MADA' | 'APPLE_PAY' | 'CREDIT_CARD';
export type CancelledBy = 'CUSTOMER' | 'PRO' | 'PLATFORM';

// ─── JWT Auth Context ─────────────────────────────────────────────────────────

export interface MarketplaceAuthContext {
  user_id: string;
  user_type: UserType;
  email: string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface Customer {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string; // +966XXXXXXXXX
  national_id?: string; // 10 digits, Saudi citizens
  iqama_number?: string; // 10 digits, expat residents
  id_type?: IdType;
  id_verified: boolean;
  district?: string; // Riyadh district (حي)
  address_line1?: string; // map-selected address label
  address_line2?: string; // apartment / villa / compound details
  address_latitude?: number;
  address_longitude?: number;
  city: string; // default "Riyadh"
  preferred_language?: PreferredLanguage;
  status: CustomerStatus;
  email_verified: boolean;
  pdpl_consent: boolean;
  pdpl_consent_at: number; // Unix ms — PDPL Royal Decree M/19
  marketing_consent: boolean; // separate from pdpl_consent
  created_at: number;
  updated_at: number;
  last_login_at?: number;
}

// ─── Pro (Service Provider) ───────────────────────────────────────────────────

export interface Pro {
  pro_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  national_id?: string;
  iqama_number?: string;
  id_type?: IdType;
  id_verified: boolean;
  id_verification_provider?: 'NAFATH' | 'MANUAL_REVIEW';
  id_verification_status?: 'UNVERIFIED' | 'VERIFIED' | 'PENDING' | 'MANUAL_REVIEW' | 'FAILED';
  id_verification_reference?: string;
  id_document_s3_key?: string; // uploaded ID scan
  cr_number?: string; // Commercial Registration (optional)
  vat_number?: string; // if VAT-registered
  national_address?: string;
  national_address_verified?: boolean;
  national_address_verification_provider?: 'SPL' | 'MANUAL_REVIEW';
  national_address_verification_status?:
    | 'UNVERIFIED'
    | 'VERIFIED'
    | 'PENDING'
    | 'MANUAL_REVIEW'
    | 'FAILED';
  national_address_verification_reference?: string;
  iban?: string; // SA + 22 digits (total 24 chars)
  iban_verified: boolean;
  bank_name?: string;
  bio?: string;
  bio_ar?: string;
  profile_photo_s3_key?: string;
  service_category?: ServiceCategory;
  services_offered?: string[];
  property_types?: string[];
  payment_methods?: string[];
  instagram_handle?: string;
  snapchat_handle?: string;
  twitter_handle?: string;
  website_url?: string;
  contact_for_price?: boolean;
  starting_price_sar?: number; // Halalas
  work_photo_s3_keys?: string[];
  years_experience?: number;
  employee_count_range?: string;
  speaks_arabic: boolean;
  speaks_english: boolean;
  speaks_urdu?: boolean;
  speaks_hindi?: boolean;
  service_districts: string[]; // Riyadh districts covered
  city: string;
  status: ProStatus;
  onboarding_step: number; // 1 account setup, 2 marketplace setup in progress, 5 submitted for review
  is_available: boolean;
  average_rating: number; // stored as integer * 100 (e.g. 450 = 4.50★)
  total_reviews: number;
  total_bookings: number;
  completion_rate: number; // 0–100
  rejection_reason?: string;
  suspension_reason?: string;
  pdpl_consent: boolean;
  pdpl_consent_at: number;
  marketing_consent: boolean;
  email_verified: boolean;
  created_at: number;
  updated_at: number;
  last_login_at?: number;
}

// ─── Service (Pro's listed service) ──────────────────────────────────────────

export interface ProService {
  pro_id: string;
  service_id: string;
  category: ServiceCategory;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  pricing_type: PricingType;
  price_sar?: number; // Halalas (1 SAR = 100 Halalas)
  min_price_sar?: number; // Halalas — for QUOTE type
  max_price_sar?: number; // Halalas — for QUOTE type
  vat_included: boolean;
  estimated_duration_minutes?: number;
  photos_s3_keys: string[];
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface Booking {
  booking_id: string;
  customer_id: string;
  pro_id: string;
  service_id: string;
  scheduled_start: number; // Unix ms
  scheduled_end: number; // Unix ms
  address_district: string;
  address_detail?: string;
  address_notes?: string;
  city: string;
  status: BookingStatus;
  cancellation_reason?: string;
  cancelled_by?: CancelledBy;
  cancelled_at?: number;

  // All financial amounts in Halalas (integers) — never floats
  service_price_sar: number; // price locked at booking time
  vat_amount_sar: number; // 15% of service_price_sar
  platform_fee_sar: number; // 15% commission
  pro_payout_sar: number; // service_price_sar - platform_fee_sar
  // Customer pays: service_price_sar + vat_amount_sar

  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_reference?: string; // HyperPay / Moyasar reference
  started_at?: number;
  completed_at?: number;
  pro_notes?: string;
  created_at: number;
  updated_at: number;
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface Review {
  review_id: string;
  booking_id: string; // unique — one review per booking
  customer_id: string;
  pro_id: string;
  service_id: string;
  rating: number; // 1–5 integer
  comment?: string;
  comment_ar?: string;
  is_visible: boolean;
  pro_reply?: string;
  pro_reply_at?: number;
  created_at: number;
  updated_at: number;
}

// ─── Pro Availability ─────────────────────────────────────────────────────────

export type DayOfWeek = 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export interface ProAvailability {
  pro_id: string;
  day_of_week: DayOfWeek;
  open_time: string; // 'HH:MM' e.g. '09:00'
  close_time: string; // 'HH:MM' e.g. '18:00'
  is_available: boolean;
  updated_at: number;
}

// ─── Platform Config ──────────────────────────────────────────────────────────

export interface PlatformConfig {
  config_key: string;
  config_value: string; // JSON-serialized
  updated_at: number;
  updated_by: string;
}

// ─── Validation Regexes ───────────────────────────────────────────────────────

export const SAUDI_PHONE_REGEX = /^\+9665\d{8}$/;
export const NATIONAL_ID_REGEX = /^\d{10}$/;
export const IBAN_REGEX = /^SA\d{22}$/;
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

// ─── Financial Helpers ────────────────────────────────────────────────────────

/** Convert SAR (user-facing) to Halalas (storage). Never use floats for money. */
export function sarToHalalas(sar: number): number {
  return Math.round(sar * 100);
}

/** Convert Halalas (storage) to SAR for display. */
export function halalaToSar(halalas: number): number {
  return halalas / 100;
}

/** Calculate booking financials. All values in Halalas. */
export function calculateBookingFinancials(servicePriceHalalas: number): {
  service_price_sar: number;
  vat_amount_sar: number;
  platform_fee_sar: number;
  pro_payout_sar: number;
  customer_total_sar: number;
} {
  const vat = Math.round(servicePriceHalalas * 0.15);
  const fee = Math.round(servicePriceHalalas * 0.15);
  return {
    service_price_sar: servicePriceHalalas,
    vat_amount_sar: vat,
    platform_fee_sar: fee,
    pro_payout_sar: servicePriceHalalas - fee,
    customer_total_sar: servicePriceHalalas + vat,
  };
}

// ─── Supported Riyadh Districts ───────────────────────────────────────────────

export const RIYADH_DISTRICTS = [
  'Al Olaya',
  'Al Malaz',
  'Al Murabbah',
  'Al Rawdah',
  'Al Sulaymaniyah',
  'Al Nakheel',
  'Al Hamra',
  'Al Sahafa',
  'Al Shuhada',
  'Al Wizarat',
  'Al Madinah',
  'Al Aziziyah',
  'Al Batha',
  'Al Dirah',
  'Al Faisaliyah',
  'Al Ghadir',
  'Al Jazirah',
  'Al Malqa',
  'Al Mansourah',
  'Al Murabba',
  'Al Naseem',
  'Al Qirawan',
  'Al Rabwah',
  'Al Uraija',
  'Al Yasmin',
  'Hittin',
  'Ishbiliyah',
  'King Fahd',
  'Qurtubah',
  'Salam',
] as const;

export type RiyadhDistrict = (typeof RIYADH_DISTRICTS)[number];
