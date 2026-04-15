/**
 * API request/response types
 * Standard patterns for all API endpoints
 */

import type {
  Company,
  User,
  Contact,
  Appointment,
  PricingRule,
  AppointmentCancellationPolicy,
  UUID,
  Timestamp,
} from './domain';
import type { AuthPoolType } from './auth';


import type {
  NotificationDevice,
  NotificationDeviceRegistration,
  NotificationItem,
  NotificationPreferencesMap,
} from './notifications';

// ============================================================================
// Standard API Response Wrapper
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: Timestamp;
  request_id?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// Pagination & Filtering
// ============================================================================

export interface PaginationParams {
  page?: number;
  page_size?: number;
  cursor?: string; // For DynamoDB cursor-based pagination
}

export interface DateRangeFilter {
  start_date?: Timestamp;
  end_date?: Timestamp;
}

// ============================================================================
// Auth Endpoints
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  pool_type?: AuthPoolType | 'auto';
}

export interface LoginResponse {
  user: User;
  company: Company;
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export interface RegisterRequest {
  company_name?: string;
  service_type?: string;
  email: string;
  password: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  timezone?: string;
  pool_type?: 'users' | 'customer';
}

export interface RegisterResponse {
  ok: true;
  email: string;
  requires_email_verification: true;
}

export interface ConfirmSignUpRequest {
  email: string;
  code: string;
  pool_type?: 'users' | 'customer';
}

export interface ConfirmSignUpResponse {
  ok: true;
}

export interface ResendConfirmationRequest {
  email: string;
  pool_type?: 'users' | 'customer';
}

export interface ResendConfirmationResponse {
  ok: true;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  email?: string;
  pool_type?: AuthPoolType | 'auto';
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

// ============================================================================
// Company Endpoints
// ============================================================================

export interface UpdateCompanyRequest {
  company_name?: string;
  service_type?: string;
  phone_number?: string;
  email?: string;
  timezone?: string;
  business_hours?: Company['business_hours'];
  service_area_zipcodes?: string[];
  service_area_cities?: string[];
  pricing_profile?: Company['pricing_profile'];
  appointment_cancellation_policy?: AppointmentCancellationPolicy;
  company_profile_completed?: boolean;
  service_area_completed?: boolean;
}

export type GetCompanyResponse = Company;

// ============================================================================
// Contact/Lead Endpoints
// ============================================================================

export interface CreateContactRequest {
  phone_number: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  sms_consent?: boolean;
  sms_consent_source?: 'WEB_BOOKING' | 'VERBAL_CALL' | 'MANUAL' | 'IMPORT';
  sms_opted_out?: boolean;
}

export interface ListContactsRequest extends PaginationParams {
  lead_status?: string;
  search?: string;
}

export interface ListContactsResponse {
  contacts: Contact[];
  pagination: PaginationMeta;
}

// ============================================================================
// Appointment Endpoints
// ============================================================================

export interface CreateAppointmentRequest {
  contact_id: UUID;
  scheduled_start: Timestamp;
  scheduled_end: Timestamp;
  service_type: string;
  description?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface ListAppointmentsRequest extends PaginationParams, DateRangeFilter {
  status?: string;
  contact_id?: UUID;
}

export interface ListAppointmentsResponse {
  appointments: Appointment[];
  pagination: PaginationMeta;
}

export interface UpdateAppointmentRequest {
  status?: string;
  scheduled_start?: Timestamp;
  scheduled_end?: Timestamp;
  notes?: string;
}

// ============================================================================
// Pricing Rules Endpoints
// ============================================================================

export interface CreatePricingRuleRequest {
  service_name: string;
  base_price?: number;
  price_range_min?: number;
  price_range_max?: number;
  unit?: string;
  description: string;
  can_quote_exact?: boolean;
  requires_inspection?: boolean;
}

export interface ListPricingRulesResponse {
  pricing_rules: PricingRule[];
}

// ============================================================================
// Dashboard/Analytics
// ============================================================================

export interface DashboardStatsResponse {
  today: {
    new_leads: number;
    appointments_scheduled: number;
  };
  week: {
    new_leads: number;
    appointments_scheduled: number;
  };
  recent_leads: Contact[];
  urgent_items: UrgentItem[];
}

export interface UrgentItem {
  type: 'COMPLAINT';
  id: UUID;
  description: string;
  created_at: Timestamp;
}

// ============================================================================
// Notifications
// ============================================================================

export interface ListNotificationsResponse {
  notifications: NotificationItem[];
  lastEvaluatedKey?: Record<string, any>;
}

export interface GetNotificationPreferencesResponse {
  preferences: NotificationPreferencesMap;
}

export interface UpdateNotificationPreferencesRequest {
  preferences: Partial<NotificationPreferencesMap>;
}

export interface RegisterNotificationDeviceRequest extends NotificationDeviceRegistration {}

export interface RegisterNotificationDeviceResponse {
  device: NotificationDevice;
}
