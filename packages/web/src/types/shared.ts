// Local replacements for @handycall/shared types used in legacy admin/dashboard pages.
// These pages are legacy (old AI receptionist era) and will be replaced.

export enum UserRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
  STAFF = 'STAFF',
}

export enum SubscriptionPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  MAX = 'MAX',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  UNPAID = 'UNPAID',
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
}

export type AppointmentCancellationPolicyMode =
  | 'ANYTIME'
  | 'BEFORE_HOURS'
  | 'NO_CANCELLATIONS';

export interface AppointmentCancellationPolicy {
  mode: AppointmentCancellationPolicyMode;
  window_hours?: number;
}

export enum CallHandlingMode {
  ALWAYS = 'ALWAYS',
  AI = 'AI',
  HUMAN = 'HUMAN',
  HYBRID = 'HYBRID',
  MISSED = 'MISSED',
  AFTER_HOURS = 'AFTER_HOURS',
}

export interface User {
  id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  contact_email?: string;
  role: UserRole;
}

export interface Company {
  id: string;
  name: string;
  company_id?: string;
  company_name?: string;
  email?: string;
  phone_number?: string;
  owner_name?: string;
  service_type?: string;
  timezone?: string;
  status?: string;
  call_handling_mode?: string;
  transfer_enabled?: boolean;
  transfer_number?: string;
  booking_services?: unknown[];
  payment_method_brand?: string;
  payment_method_last4?: string;
  company_profile_completed?: boolean;
  service_area_completed?: boolean;
  calendar_setup_completed?: boolean;
  service_area_zipcodes?: string[];
  service_area_cities?: string[];
  business_hours?: Record<string, unknown>;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  stripe_subscription_id?: string;
  trial_ends_at?: number;
  pricing_profile?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type CompanyPricingModel =
  | 'FIXED'
  | 'HOURLY'
  | 'SUBSCRIPTION'
  | 'QUOTE_AFTER_INSPECTION'
  | 'MIXED'
  | 'CUSTOM'
  | string;

export interface CompanyPricingLineItem {
  name: string;
  price_label?: string;
  details?: string;
}

export interface CompanyPricingProfile {
  model?: CompanyPricingModel;
  summary?: string;
  estimate_policy?: string;
  starting_price?: number;
  service_call_fee?: number;
  hourly_rate?: number;
  minimum_charge?: number;
  emergency_surcharge?: number;
  tiers?: CompanyPricingLineItem[];
  add_ons?: CompanyPricingLineItem[];
  plan_highlights?: string[];
  warranty_summary?: string;
  notes?: string;
  financing_available?: boolean;
  prices_start_at_only?: boolean;
  currency?: string;
  updated_at?: number;
  [key: string]: unknown;
}

export enum ServiceType {
  HANDYMAN = 'HANDYMAN',
  PEST_CONTROL = 'PEST_CONTROL',
  ELECTRICIAN = 'ELECTRICIAN',
  PLUMBING = 'PLUMBING',
  HVAC = 'HVAC',
  LANDSCAPING = 'LANDSCAPING',
  LAWN_CARE = 'LAWN_CARE',
  CLEANING = 'CLEANING',
  CARPET_CLEANING = 'CARPET_CLEANING',
  WINDOW_CLEANING = 'WINDOW_CLEANING',
  PRESSURE_WASHING = 'PRESSURE_WASHING',
  POOL_SERVICE = 'POOL_SERVICE',
  TREE_SERVICE = 'TREE_SERVICE',
  ROOFING = 'ROOFING',
  PAINTING = 'PAINTING',
  FLOORING = 'FLOORING',
  REMODELING = 'REMODELING',
  GARAGE_DOOR = 'GARAGE_DOOR',
  APPLIANCE_REPAIR = 'APPLIANCE_REPAIR',
  AUTO_MECHANIC = 'AUTO_MECHANIC',
  LOCKSMITH = 'LOCKSMITH',
  MOVING = 'MOVING',
  JUNK_REMOVAL = 'JUNK_REMOVAL',
  IRRIGATION = 'IRRIGATION',
  SNOW_REMOVAL = 'SNOW_REMOVAL',
  FENCING = 'FENCING',
  CONCRETE = 'CONCRETE',
  SOLAR = 'SOLAR',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER',
}

export type ProStatus =
  | 'ONBOARDING'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

export type ServiceCategory =
  | 'CLEANING'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'PAINTING'
  | 'CARPENTRY'
  | 'AC_REPAIR'
  | 'PEST_CONTROL'
  | 'LANDSCAPING'
  | 'APPLIANCE_REPAIR'
  | 'HANDYMAN';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type PaymentStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';
export type PaymentMethod = 'MADA' | 'APPLE_PAY' | 'CREDIT_CARD';

export interface ReviewDto {
  review_id: string;
  booking_id?: string;
  customer_id?: string;
  pro_id?: string;
  rating: number;
  comment?: string;
  created_at?: number;
  updated_at?: number;
}

export interface PlanFeatures {
  aiReceptionist: boolean;
  smsFollowUp: boolean;
  calendarIntegration: boolean;
  analytics: boolean;
  teamMembers: boolean;
  customGreeting: boolean;
  callRecording: boolean;
  prioritySupport: boolean;
  follow_up_sequences: boolean;
  crm_integrations: boolean;
  website_widget: boolean;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  STARTER: {
    aiReceptionist: true,
    smsFollowUp: false,
    calendarIntegration: false,
    analytics: false,
    teamMembers: false,
    customGreeting: false,
    callRecording: false,
    prioritySupport: false,
    follow_up_sequences: false,
    crm_integrations: false,
    website_widget: false,
  },
  PRO: {
    aiReceptionist: true,
    smsFollowUp: true,
    calendarIntegration: true,
    analytics: true,
    teamMembers: true,
    customGreeting: true,
    callRecording: true,
    prioritySupport: false,
    follow_up_sequences: true,
    crm_integrations: true,
    website_widget: true,
  },
  MAX: {
    aiReceptionist: true,
    smsFollowUp: true,
    calendarIntegration: true,
    analytics: true,
    teamMembers: true,
    customGreeting: true,
    callRecording: true,
    prioritySupport: true,
    follow_up_sequences: true,
    crm_integrations: true,
    website_widget: true,
  },
};

// Auth API types (legacy)
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password?: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  agreed?: boolean;
}

export interface RegisterResponse {
  user?: User;
  email?: string;
  message?: string;
}

export interface ConfirmSignUpRequest {
  email: string;
  code: string;
  pool_type?: string;
}

export interface ConfirmSignUpResponse {
  message?: string;
}

export interface ResendConfirmationRequest {
  email: string;
  pool_type?: string;
}

export interface ResendConfirmationResponse {
  message?: string;
}
