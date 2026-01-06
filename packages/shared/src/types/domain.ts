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
  CLEANING = 'CLEANING',
  OTHER = 'OTHER',
}

export interface Company {
  company_id: UUID;
  company_name: string;
  service_type: ServiceType;
  phone_number: PhoneNumber;
  email: string;
  status: CompanyStatus;
  timezone: string; // IANA timezone: America/New_York
  business_hours: BusinessHours;
  created_at: Timestamp;
  updated_at: Timestamp;
  subscription_tier?: string;
  trial_ends_at?: Timestamp;

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

export interface DaySchedule {
  open: string; // HH:mm format: "09:00"
  close: string; // HH:mm format: "17:00"
  closed?: boolean;
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
  weekly_minutes: number;
  sms_limit: number;
  contacts_limit: number;
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
  source: ContactSource;
  lead_status: LeadStatus;
  notes?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_contact_at?: Timestamp;
}

// ============================================================================
// Call
// ============================================================================

export enum CallDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum CallStatus {
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
}

export enum CallIntent {
  QUESTION = 'QUESTION',
  BOOKING = 'BOOKING',
  EMERGENCY = 'EMERGENCY',
  COMPLAINT = 'COMPLAINT',
  GENERAL = 'GENERAL',
  UNKNOWN = 'UNKNOWN',
}

export interface Call {
  call_id: UUID;
  company_id: UUID;
  contact_id?: UUID;
  direction: CallDirection;
  from_number: PhoneNumber;
  to_number: PhoneNumber;
  status: CallStatus;
  intent?: CallIntent;
  duration_seconds?: number;
  recording_url?: string;
  transcript_url?: string;
  summary?: string;
  ai_handled: boolean;
  escalated: boolean;
  appointment_created?: boolean;
  lead_captured?: boolean;
  started_at: Timestamp;
  ended_at?: Timestamp;
  created_at: Timestamp;
}

export interface CallHighlight {
  highlight_id: UUID;
  call_id: UUID;
  company_id: UUID;
  timestamp_seconds: number; // Position in call
  type: 'PRICING' | 'APPOINTMENT' | 'COMPLAINT' | 'UNANSWERED_QUESTION' | 'IMPORTANT';
  description: string;
  created_at: Timestamp;
}

// ============================================================================
// Appointment
// ============================================================================

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum BookingMode {
  PROPOSE_TIMES = 'PROPOSE_TIMES', // AI suggests times, owner confirms
  CALENDAR_BOOKING = 'CALENDAR_BOOKING', // AI books directly into calendar
  INTERNAL_ONLY = 'INTERNAL_ONLY', // AI takes info, creates internal task
}

export interface Appointment {
  appointment_id: UUID;
  company_id: UUID;
  contact_id: UUID;
  call_id?: UUID; // If created via call
  scheduled_start: Timestamp;
  scheduled_end: Timestamp;
  status: AppointmentStatus;
  service_type: string;
  description?: string;
  address?: Address;
  notes?: string;
  created_by: 'AI' | 'USER';
  confirmed: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

// ============================================================================
// Knowledge Base (RAG)
// ============================================================================

export enum KnowledgeItemType {
  FAQ = 'FAQ',
  SERVICE = 'SERVICE',
  POLICY = 'POLICY',
  SAFETY = 'SAFETY',
  WARRANTY = 'WARRANTY',
  PRICING_INFO = 'PRICING_INFO',
}

export enum KnowledgeStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export interface KnowledgeItem {
  knowledge_id: UUID;
  company_id: UUID;
  type: KnowledgeItemType;
  question: string;
  answer: string;
  status: KnowledgeStatus;
  created_by: UUID; // user_id
  source?: 'MANUAL' | 'FLAGGED_QUESTION' | 'IMPORT';
  use_count?: number; // How many times retrieved
  last_used_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface KnowledgeChunk {
  chunk_id: UUID;
  knowledge_id: UUID;
  company_id: UUID;
  chunk_text: string;
  embedding?: number[]; // Vector embedding
  chunk_index: number; // Position in original content
  created_at: Timestamp;
}

// ============================================================================
// Flagged Questions (Learning Loop)
// ============================================================================

export enum FlaggedQuestionStatus {
  PENDING = 'PENDING',
  ANSWERED = 'ANSWERED',
  DISMISSED = 'DISMISSED',
}

export interface FlaggedQuestion {
  flagged_id: UUID;
  company_id: UUID;
  call_id: UUID;
  question_text: string;
  context?: string; // Conversation context
  timestamp_in_call?: number; // Seconds into call
  status: FlaggedQuestionStatus;
  resolved_by?: UUID; // user_id who answered
  resolution_answer?: string;
  knowledge_item_created?: UUID; // knowledge_id if KB entry created
  created_at: Timestamp;
  resolved_at?: Timestamp;
}

// ============================================================================
// Agent Configuration
// ============================================================================

export enum GreetingTone {
  PROFESSIONAL = 'PROFESSIONAL',
  FRIENDLY = 'FRIENDLY',
  CASUAL = 'CASUAL',
}

export interface AgentConfig {
  config_id: UUID;
  company_id: UUID;
  greeting_tone: GreetingTone;
  custom_greeting?: string;
  booking_mode: BookingMode;
  can_discuss_pricing: boolean;
  can_handle_emergencies: boolean;
  escalation_threshold: number; // Confidence threshold 0-1
  require_callback_confirmation: boolean;
  send_sms_summary: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================================================
// Pricing Rules (Structured, not LLM-based)
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
