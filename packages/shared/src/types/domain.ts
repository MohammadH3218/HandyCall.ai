/**
 * Core domain types for HandyCall platform
 * These types represent the business entities across the entire system
 */

// ============================================================================
// Base Types
// ============================================================================

export type UUID = string;
export type Timestamp = number; // Unix timestamp in milliseconds
export type PhoneNumber = string; // E.164 format: +1234567890

// ============================================================================
// Company / Tenant
// ============================================================================

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
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

export type CompanyPricingModel =
  | 'FIXED'
  | 'HOURLY'
  | 'SUBSCRIPTION'
  | 'QUOTE_AFTER_INSPECTION'
  | 'MIXED'
  | 'CUSTOM';

export interface CompanyPricingLineItem {
  name: string;
  price_label?: string;
  details?: string;
}

export interface CompanyPricingProfile {
  model?: CompanyPricingModel;
  currency?: string;
  summary?: string;
  starting_price?: number;
  service_call_fee?: number;
  hourly_rate?: number;
  minimum_charge?: number;
  emergency_surcharge?: number;
  estimate_policy?: string;
  prices_start_at_only?: boolean;
  financing_available?: boolean;
  warranty_summary?: string;
  plan_highlights?: string[];
  tiers?: CompanyPricingLineItem[];
  add_ons?: CompanyPricingLineItem[];
  notes?: string;
  updated_at?: Timestamp;
}

export type AppointmentCancellationPolicyMode =
  | 'ANYTIME'
  | 'BEFORE_HOURS'
  | 'NO_CANCELLATIONS';

export interface AppointmentCancellationPolicy {
  mode: AppointmentCancellationPolicyMode;
  window_hours?: number;
}

export interface BookingService {
  service_id: UUID;
  name: string;
  description?: string;
  amount_cents: number;
  currency?: string;
  duration_minutes?: number;
  active?: boolean;
  collect_payment?: boolean;
  billing_type?: 'ONE_TIME' | 'SUBSCRIPTION';
  billing_interval?: 'day' | 'week' | 'month' | 'year';
  billing_interval_count?: number;
  trial_period_days?: number;
}

export interface Company {
  company_id: UUID;
  company_name: string;
  service_type: ServiceType;
  service_template_id?: string;
  /**
   * Company’s primary contact number (not necessarily the inbound DID).
   * This can be unset at account creation time; inbound routing uses company_numbers mapping.
   */
  phone_number?: PhoneNumber;
  email: string;
  status: CompanyStatus;
  timezone: string; // IANA timezone: America/New_York
  business_hours: BusinessHours;
  created_at: Timestamp;
  updated_at: Timestamp;
  subscription_tier?: string;
  trial_ends_at?: Timestamp;
  trial_used_at?: Timestamp;

  // Service toggles
  calls_enabled?: boolean;
  sms_enabled?: boolean;
  usage_service_blocked?: {
    calls?: boolean;
    sms?: boolean;
    updated_at?: Timestamp;
  };
  booking_from_email?: string;
  email_from?: string;
  use_simple_scheduling?: boolean; // Fallback to simple time slots
  service_area_zipcodes?: string[];
  service_area_cities?: string[];
  pricing_profile?: CompanyPricingProfile;
  marketplace_profile?: Record<string, any>;
  company_profile_completed?: boolean;
  service_area_completed?: boolean;
  marketplace_profile_completed?: boolean;

  // Calendar / scheduling setup
  calendar_setup_completed?: boolean;
  schedule_setup_completed?: boolean;
  /**
   * How the company wants to manage appointments:
   * - INTERNAL: manage appointments inside HandyCall only (default)
   * - EXTERNAL: connect an existing calendar provider (future)
   */
  calendar_mode?: 'INTERNAL' | 'EXTERNAL';
  calendar_provider?: 'NONE' | 'GOOGLE' | 'MICROSOFT' | 'APPLE';
  /**
   * Stores provider connection metadata (tokens/credentials should be encrypted at rest).
   * Shape is intentionally loose to allow iterative provider support.
   */
  calendar_connection?: any;
  schedule_overrides?: ScheduleOverride[];
  appointment_duration_minutes?: number;
  slot_interval_minutes?: number;
  appointment_cancellation_policy?: AppointmentCancellationPolicy;

  // Billing fields
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  current_period_start?: Timestamp;
  current_period_end?: Timestamp;
  payment_method_last4?: string;
  payment_method_brand?: string;
  cancel_at_period_end?: boolean;

  // Stripe Connect / customer payments
  stripe_connect_account_id?: string;
  stripe_connect_onboarding_complete?: boolean;
  booking_payment_enabled?: boolean;
  booking_payment_mode?: 'HANDYCALL_MANAGED' | 'SELF_MANAGED';
  booking_payment_mode_confirmed?: boolean;
  booking_services?: BookingService[];

  // Differentiator settings
  follow_up_sequences_enabled?: boolean;
  follow_up_initial_delay_minutes?: number;
  follow_up_second_delay_minutes?: number;
  follow_up_final_delay_minutes?: number;
  follow_up_initial_template?: string;
  follow_up_second_template?: string;
  follow_up_final_template?: string;
  review_request_enabled?: boolean;
  review_request_delay_minutes?: number;
  review_platform_url?: string;
  review_request_template?: string;
  website_widget_enabled?: boolean;
  website_widget_settings?: {
    primary_color?: string;
    position?: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
    greeting?: string;
  };
}

export interface ScheduleOverride {
  date: string; // YYYY-MM-DD
  closed?: boolean;
  segments?: Segment[];
}

export interface BusinessHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface Segment {
  open: string; // HH:mm
  close: string; // HH:mm
}

export interface DaySchedule {
  open?: string; // HH:mm format: "09:00"
  close?: string; // HH:mm format: "17:00"
  closed?: boolean;
  segments?: Segment[];
}

// ============================================================================
// Billing & Subscriptions
// ============================================================================

export enum SubscriptionPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  MAX = 'MAX',
}

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID',
  INCOMPLETE = 'INCOMPLETE',
}

export interface PlanLimits {
  monthly_minutes: number;
  sms_limit: number;
  contacts_limit: number;
}

export interface PlanFeatures {
  transcripts: boolean;
  call_summaries: boolean;
  after_hours_routing: boolean;
  crm_integrations: boolean;
  advanced_routing: boolean;
  human_transfer: boolean;
  sms_reminders: boolean;
  follow_up_sequences: boolean;
  recording_retention_days: number;
  priority_support: boolean;
  website_widget: boolean;
}

export interface UsageMetrics {
  company_id: UUID;
  date: string; // YYYY-MM-DD (sort key)
  minutes_used: number;
  calls_count: number;
  sms_sent_count: number;
  contacts_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface BillingEvent {
  company_id: UUID;
  event_id: string; // timestamp-uuid format for sorting
  event_type: string; // subscription.created, invoice.paid, etc.
  stripe_event_id?: string;
  data: any; // Event payload
  created_at: Timestamp;
}

export type CustomerPaymentStatus =
  | 'REQUIRES_PAYMENT_METHOD'
  | 'REQUIRES_CONFIRMATION'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type CustomerPaymentType = 'BOOKING' | 'MANUAL' | 'DEPOSIT' | 'SUBSCRIPTION';

export interface CustomerPayment {
  company_id: UUID;
  payment_id: UUID;
  contact_id?: UUID;
  appointment_id?: UUID;
  customer_name?: string;
  customer_email?: string;
  service_name?: string;
  payment_type: CustomerPaymentType;
  payment_status: CustomerPaymentStatus;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  stripe_subscription_id?: string;
  stripe_charge_id?: string;
  billing_type?: 'ONE_TIME' | 'SUBSCRIPTION';
  billing_interval?: 'day' | 'week' | 'month' | 'year';
  billing_interval_count?: number;
  metadata?: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
  paid_at?: Timestamp;
}

// ============================================================================
// User
// ============================================================================

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

export interface User {
  user_id: UUID;
  company_id: UUID;
  email: string;
  phone_number?: PhoneNumber;
  phone_verified_at?: Timestamp;
  contact_email?: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login_at?: Timestamp;
}

// ============================================================================
// Contact / Lead
// ============================================================================

export enum ContactSource {
  INBOUND_CALL = 'INBOUND_CALL',
  INBOUND_SMS = 'INBOUND_SMS',
  MANUAL = 'MANUAL',
  IMPORT = 'IMPORT',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export interface Contact {
  contact_id: UUID;
  company_id: UUID;
  phone_number: PhoneNumber;
  email?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  source: ContactSource;
  source_call_id?: UUID; // Call that created this contact
  lead_status: LeadStatus;
  notes?: string;
  sms_consent?: boolean;
  sms_consent_at?: Timestamp;
  sms_consent_source?: 'WEB_BOOKING' | 'VERBAL_CALL' | 'MANUAL' | 'IMPORT';
  sms_opted_out?: boolean;
  sms_opted_out_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_contact_at?: Timestamp;
}

// ============================================================================
// Call
// ============================================================================

// ============================================================================
// Appointment
// ============================================================================

export enum AppointmentStatus {
  PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE', // Waiting for provider to accept/decline
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface Appointment {
  appointment_id: UUID;
  company_id: UUID;
  contact_id?: UUID;
  call_id?: UUID; // If created via call
  scheduled_start: Timestamp;
  scheduled_end: Timestamp;
  status: AppointmentStatus;
  service_type: string;
  description?: string;
  address?: Address;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: PhoneNumber;
  notes?: string;
  created_by: 'AI' | 'USER';
  confirmed: boolean;
  // Recurrence (optional)
  series_id?: UUID;
  is_series_master?: boolean;
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval?: number; // default 1
    count?: number; // max occurrences
    until?: Timestamp; // end date (inclusive)
  };
  // Optional billing context (not Stripe subscription)
  price_cents?: number;
  currency?: string;
  payment_status?: 'UNPAID' | 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  payment_id?: UUID;
  amount_due_cents?: number;
  amount_paid_cents?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AppointmentCancellationInfo {
  can_cancel: boolean;
  policy_mode: AppointmentCancellationPolicyMode;
  policy_hours?: number;
  cutoff_at?: Timestamp;
  reason_code?:
    | 'ALLOWED'
    | 'NO_CANCELLATIONS'
    | 'WINDOW_PASSED'
    | 'ALREADY_STARTED'
    | 'ALREADY_CANCELLED'
    | 'ALREADY_COMPLETED';
  message: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

// ============================================================================
// Pricing Rules
// ============================================================================

export interface PricingRule {
  pricing_id: UUID;
  company_id: UUID;
  service_name: string;
  base_price?: number;
  price_range_min?: number;
  price_range_max?: number;
  unit?: string; // e.g., "per hour", "flat rate"
  description: string;
  can_quote_exact: boolean; // If true, AI can give exact price
  requires_inspection: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================================================
// SMS
// ============================================================================

export enum SMSDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum SMSStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface SMS {
  sms_id: UUID;
  company_id: UUID;
  contact_id?: UUID;
  direction: SMSDirection;
  from_number: PhoneNumber;
  to_number: PhoneNumber;
  message_body: string;
  status: SMSStatus;
  ai_handled: boolean;
  call_id?: UUID; // If part of call follow-up
  created_at: Timestamp;
  updated_at: Timestamp;
}
