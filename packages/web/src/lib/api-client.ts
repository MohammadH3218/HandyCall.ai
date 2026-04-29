import {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ConfirmSignUpRequest,
  ConfirmSignUpResponse,
  ResendConfirmationRequest,
  ResendConfirmationResponse,
} from '@/types/shared';
import { isCustomerProfileComplete, normalizeCustomerProfile } from '@/lib/customer-profile';

// BFF Pattern: Point to Next.js internal API proxy instead of external NestJS
// The proxy handles authentication server-side using NextAuth cookies
const API_URL = '/api/proxy';

const ADMIN_PATH_PREFIX = '/admin';

const getAdminCompanyId = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('handycall-admin-company');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.companyId || parsed?.companyId || null;
  } catch {
    return null;
  }
};

const isAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith(ADMIN_PATH_PREFIX);
};

class ApiClient {
  private baseUrl: string;
  private sessionExpiryRedirecting = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    // Legacy method - no longer needed with BFF pattern
    // Tokens are handled server-side via NextAuth cookies
  }

  private async hasActiveSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!response.ok) return false;
      const session = await response.json();
      return Boolean((session as any)?.idToken || (session as any)?.accessToken);
    } catch {
      return false;
    }
  }

  private isAuthFailureResponse(response: Response, data: any, message: string): boolean {
    const text = [message, data?.error?.message, data?.message, data?.error, data?.raw]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const tokenAuthFailure =
      text.includes('invalid or expired token') ||
      text.includes('invalid token') ||
      text.includes('expired token') ||
      text.includes('token expired') ||
      text.includes('jwt expired') ||
      text.includes('invalid signature') ||
      text.includes('token is not valid yet');

    if (response.status === 403) {
      // Do not force logout for feature/plan gates (forbidden without auth expiry).
      return tokenAuthFailure;
    }

    return tokenAuthFailure;
  }

  private async forceLogoutToLogin() {
    if (typeof window === 'undefined') return;
    if (this.sessionExpiryRedirecting) return;
    // Never force-logout during onboarding — the user is actively filling out
    // a multi-step form and a background API failure should not interrupt them.
    // If the token truly expires, the next step submission will fail with a visible error.
    const path = window.location.pathname;
    if (path.startsWith('/onboarding') || path.startsWith('/pro/dashboard')) return;
    this.sessionExpiryRedirecting = true;

    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('email');
      localStorage.removeItem('user_role');
      localStorage.removeItem('handycall-admin-company');
    } catch {
      // no-op
    }

    try {
      window.dispatchEvent(new CustomEvent('handycall:session-expired'));
    } catch {
      // no-op
    }

    try {
      const auth = await import('next-auth/react');
      await auth.signOut({ redirect: false });
    } catch {
      // no-op
    } finally {
      const isCustomerPath =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/customer');
      const loginUrl = isCustomerPath
        ? '/customer/login?reason=session_expired'
        : '/pro/login?reason=session_expired';
      window.location.assign(loginUrl);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseUrl}/${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (isAdminRoute()) {
      const adminCompanyId = getAdminCompanyId();
      if (adminCompanyId) {
        headers['x-company-id'] = adminCompanyId;
      }
    }

    // No need to add Authorization header here!
    // The Next.js proxy (/api/proxy/[...path]) handles authentication server-side
    // using NextAuth session cookies

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Read body once as text, then parse — avoids "body stream already read"
      const rawText = await response.text();
      let data: any;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(`Invalid JSON response: ${rawText.substring(0, 100)}`);
      }

      if (!response.ok) {
        const normalizedMessage = Array.isArray(data?.message)
          ? data.message.filter(Boolean).join(', ')
          : typeof data?.message === 'string'
            ? data.message
            : undefined;

        const errorMessage =
          normalizedMessage ||
          data?.error?.message ||
          (typeof data?.error === 'string' && data.error !== 'Bad Request'
            ? data.error
            : undefined) ||
          data?.raw ||
          `Request failed with status ${response.status}`;

        const isTokenAuthFailure = this.isAuthFailureResponse(response, data, errorMessage);
        const shouldForceLogout =
          isTokenAuthFailure || (response.status === 401 && !(await this.hasActiveSession()));

        if (shouldForceLogout) {
          await this.forceLogoutToLogin();
        }
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
    return (response as any)?.data ?? (response as any);
  }

  async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: 'POST',
    };
    if (body !== undefined) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const response = await this.request<T>(endpoint, requestOptions);
    return (response as any)?.data ?? (response as any);
  }

  async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: 'PUT',
    };
    if (body !== undefined) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const response = await this.request<T>(endpoint, requestOptions);
    return (response as any)?.data ?? (response as any);
  }

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
    return (response as any)?.data ?? (response as any);
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const isCustomer = data.pool_type === 'customer';
    const endpoint = isCustomer ? '/auth/customer/register' : '/auth/pro/register';
    const response = await this.request<RegisterResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      }),
    });
    return ((response as any).data ?? response) as RegisterResponse;
  }

  async confirmSignUp(data: ConfirmSignUpRequest): Promise<ConfirmSignUpResponse> {
    const response = await this.request<ConfirmSignUpResponse>('/auth/confirm-signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async verifyEmailToken(token: string): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
      }
    );
    return ((response as any).data ?? response) as { message: string };
  }

  async resendConfirmation(data: ResendConfirmationRequest): Promise<ResendConfirmationResponse> {
    const response = await this.request<ResendConfirmationResponse>('/auth/resend-confirmation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return ((response as any).data ?? response) as ResendConfirmationResponse;
  }

  async deleteMyAccount(): Promise<{ message: string }> {
    return this.delete<{ message: string }>('/pros/me/account');
  }

  async deleteMyCustomerAccount(): Promise<{ message: string }> {
    // Use a direct fetch here to avoid the force-logout behavior on 401.
    // The settings page handles the error and shows it in-place.
    const url = `${this.baseUrl}/customers/me`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) {
      const msg =
        (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) ||
        data?.error?.message ||
        (typeof data?.error === 'string' ? data.error : undefined) ||
        `Request failed with status ${response.status}`;
      throw new Error(msg);
    }
    return data?.data ?? data;
  }

  async sendPhoneCode(
    email: string,
    poolType: 'users' | 'customer'
  ): Promise<{ ok: boolean; phone_hint: string }> {
    return this.post('/auth/send-phone-code', { email, pool_type: poolType });
  }

  async verifyPhoneCode(
    email: string,
    code: string,
    poolType: 'users' | 'customer'
  ): Promise<{ ok: boolean }> {
    return this.post('/auth/verify-phone-code', { email, code, pool_type: poolType });
  }

  async updatePhone(
    email: string,
    phoneNumber: string,
    poolType: 'users' | 'customer'
  ): Promise<{ ok: boolean; phone_hint: string }> {
    return this.post('/auth/update-phone', {
      email,
      phone_number: phoneNumber,
      pool_type: poolType,
    });
  }

  async deleteUnverifiedAccount(
    email: string,
    poolType: 'users' | 'customer'
  ): Promise<{ ok: boolean }> {
    const response = await this.request<{ ok: boolean }>('/auth/delete-unverified', {
      method: 'DELETE',
      body: JSON.stringify({ email, pool_type: poolType }),
    });
    return (response as any)?.data ?? (response as any);
  }

  async login(data: LoginRequest): Promise<any> {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Handle both wrapped (ApiResponse) and unwrapped responses
    return response.data ?? response;
  }

  async changePassword(
    email: string,
    newPassword: string,
    session: string,
    poolType: 'users' | 'admin' | 'customer' = 'users',
    firstName?: string,
    lastName?: string
  ): Promise<any> {
    const body: any = { email, new_password: newPassword, session, pool_type: poolType };
    // Include first_name and last_name if provided
    if (firstName) {
      body.first_name = firstName;
    }
    if (lastName) {
      body.last_name = lastName;
    }
    const response = await this.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    // Handle both wrapped (ApiResponse) and unwrapped responses
    return response.data ?? response;
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<any> {
    const response = await this.request<any>('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return response.data ?? response;
  }

  async refreshToken(
    refreshToken: string,
    email: string,
    poolType: 'auto' | 'users' | 'admin' | 'customer' = 'auto'
  ): Promise<{ access_token: string; id_token: string }> {
    const response = await this.request<{ access_token: string; id_token: string }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken, email, pool_type: poolType }),
      }
    );
    return response.data!;
  }

  async requestPasswordReset(email: string): Promise<any> {
    const response = await this.request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response.data ?? response;
  }

  // Company endpoints
  async getMyCompany(): Promise<any> {
    const response = await this.request<any>('/companies/me', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async updateMyCompany(updates: any): Promise<any> {
    const response = await this.request<any>('/companies/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data ?? response;
  }

  async getMyUser(): Promise<any> {
    const response = await this.request<any>('/users/me', { method: 'GET' });
    return response.data ?? response;
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<any> {
    const response = await this.request<any>('/dashboard/stats', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getDashboardInsights(): Promise<any> {
    const response = await this.request<any>('/dashboard/insights', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getRecentCalls(): Promise<any> {
    const response = await this.request<any>('/dashboard/recent-calls', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getUpcomingAppointments(): Promise<any> {
    const response = await this.request<any>('/dashboard/upcoming-appointments', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  // Appointments endpoints
  async getAppointments(
    limit?: number,
    lastEvaluatedKey?: string
  ): Promise<{ appointments: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

    const response = await this.request<{ appointments: any[]; lastEvaluatedKey?: any }>(
      `/appointments?${params.toString()}`,
      {
        method: 'GET',
      }
    );
    const payload: any = response.data ?? response;
    return payload || { appointments: [], lastEvaluatedKey: undefined };
  }

  async getAppointmentsRange(startIso: string, endIso: string): Promise<{ appointments: any[] }> {
    const params = new URLSearchParams({ start: startIso, end: endIso });
    const response = await this.request<{ appointments: any[] }>(
      `/appointments/range?${params.toString()}`,
      {
        method: 'GET',
      }
    );
    return (response.data ?? response) as { appointments: any[] };
  }

  async getCustomerAppointments(): Promise<{ appointments: any[] }> {
    const response = await this.request<{ appointments: any[] }>(`/customer/appointments`, {
      method: 'GET',
    });
    return (response.data ?? response) as { appointments: any[] };
  }

  async cancelCustomerAppointment(appointmentId: string, reason?: string): Promise<any> {
    const response = await this.request<any>(`/customer/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
    return response.data ?? response;
  }

  async getAppointmentById(appointmentId: string): Promise<any> {
    const response = await this.request<any>(`/appointments/${appointmentId}`, { method: 'GET' });
    return response.data ?? response;
  }

  async createAppointment(data: any): Promise<any> {
    const response = await this.request<any>(`/appointments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async cancelAppointment(appointmentId: string): Promise<any> {
    const response = await this.request<any>(`/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
    return response.data ?? response;
  }

  async updateAppointment(appointmentId: string, data: any): Promise<any> {
    const response = await this.request<any>(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async deleteAppointment(appointmentId: string): Promise<any> {
    const response = await this.request<any>(`/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
    return response.data ?? response;
  }

  // Calls endpoints
  async getCalls(
    limit?: number,
    lastEvaluatedKey?: string
  ): Promise<{ calls: any[]; lastEvaluatedKey?: any; total?: number }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

    const response = await this.request<{ calls: any[]; lastEvaluatedKey?: any }>(
      `/calls?${params.toString()}`,
      {
        method: 'GET',
      }
    );
    const payload: any = response.data ?? response;
    return payload || { calls: [], lastEvaluatedKey: undefined };
  }

  async getCallsCount(): Promise<{ total: number }> {
    const response = await this.request<{ total: number }>('/calls/count', { method: 'GET' });
    const payload: any = response.data ?? response;
    return payload as { total: number };
  }

  async getCallById(callId: string): Promise<any> {
    const response = await this.request<any>(`/calls/${callId}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getCallRecordingUrl(callId: string): Promise<any> {
    const response = await this.request<any>(`/calls/${callId}/recording`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  // Messages endpoints
  async getMessageThreads(
    limit?: number,
    lastEvaluatedKey?: string
  ): Promise<{ threads: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/messages/threads${suffix}`, { method: 'GET' });
    return (response.data ?? response) as { threads: any[]; lastEvaluatedKey?: any };
  }

  async getMessageThread(
    contactId: string,
    limit?: number,
    lastEvaluatedKey?: string
  ): Promise<{ thread: any; messages: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/messages/threads/${contactId}${suffix}`, {
      method: 'GET',
    });
    return (response.data ?? response) as { thread: any; messages: any[]; lastEvaluatedKey?: any };
  }

  async searchCalls(query: string, limit?: number): Promise<any[]> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());

    const response = await this.request<any[]>(`/calls/search?${params.toString()}`, {
      method: 'GET',
    });
    const payload: any = response.data ?? response;
    return payload || [];
  }

  // Contacts endpoints
  async getContacts(limit?: number, lastEvaluatedKey?: string): Promise<any> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

    const response = await this.request<any>(`/contacts?${params.toString()}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getContact(contactId: string): Promise<any> {
    const response = await this.request<any>(`/contacts/${contactId}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getContactAppointments(contactId: string): Promise<{ appointments: any[] }> {
    const response = await this.request<any>(`/contacts/${contactId}/appointments`, {
      method: 'GET',
    });
    return (response.data ?? response) as { appointments: any[] };
  }

  async getContactCalls(
    contactId: string,
    limit?: number,
    lastEvaluatedKey?: string
  ): Promise<{ calls: any[]; lastEvaluatedKey?: any; total?: number }> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/contacts/${contactId}/calls${suffix}`, {
      method: 'GET',
    });
    return (response.data ?? response) as { calls: any[]; lastEvaluatedKey?: any; total?: number };
  }

  async createContact(data: any): Promise<any> {
    const response = await this.request<any>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async updateContact(contactId: string, data: any): Promise<any> {
    const response = await this.request<any>(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async deleteContact(contactId: string): Promise<any> {
    const response = await this.request<any>(`/contacts/${contactId}`, {
      method: 'DELETE',
    });
    return response.data ?? response;
  }

  async searchContacts(query: string, limit?: number): Promise<any> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());

    const response = await this.request<any>(`/contacts/search?${params.toString()}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  // Billing endpoints
  async createSetupIntent(): Promise<{ client_secret: string }> {
    const response = await this.request<{ client_secret: string }>('/billing/setup-intent', {
      method: 'POST',
    });
    return (response.data ?? response) as { client_secret: string };
  }

  async getBillingConfig(): Promise<{ publishable_key: string | null }> {
    const response = await this.request<{ publishable_key: string | null }>('/billing/config', {
      method: 'GET',
    });
    return (response.data ?? response) as { publishable_key: string | null };
  }

  async createSubscription(data: { plan: string; payment_method_id: string }): Promise<any> {
    const response = await this.request<any>('/billing/subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async activateStarterPlan(): Promise<any> {
    const response = await this.request<any>('/billing/subscription/starter', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async getMySubscription(): Promise<any> {
    const response = await this.request<any>('/billing/subscription', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async updateSubscription(data: { plan: string }): Promise<any> {
    const response = await this.request<any>('/billing/subscription', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async cancelSubscription(): Promise<any> {
    const response = await this.request<any>('/billing/subscription', {
      method: 'DELETE',
    });
    return response.data ?? response;
  }

  async getUsageMetrics(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/billing/usage${suffix}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getBillingInvoices(): Promise<any[]> {
    const response = await this.request<any[]>('/billing/invoices', {
      method: 'GET',
    });
    if (Array.isArray(response)) return response;
    return (response as any)?.data || [];
  }

  async createCurrentBillingInvoice(): Promise<any> {
    const response = await this.request<any>('/billing/invoices/current', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async payCurrentBillingBalance(): Promise<any> {
    const response = await this.request<any>('/billing/pay-current', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async updatePaymentMethod(paymentMethodId: string): Promise<any> {
    const response = await this.request<any>('/billing/payment-method', {
      method: 'PUT',
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    });
    return response.data ?? response;
  }

  async getPaymentMethods(): Promise<any> {
    const response = await this.request<any>('/billing/payment-methods', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<any> {
    const response = await this.request<any>('/billing/payment-methods/default', {
      method: 'POST',
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    });
    return response.data ?? response;
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<any> {
    const response = await this.request<any>(`/billing/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    });
    return response.data ?? response;
  }

  async setupConnectAccount(options?: { refresh_url?: string; return_url?: string }): Promise<any> {
    const response = await this.request<any>('/billing/connect/setup', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    return response.data ?? response;
  }

  async createConnectOnboardingLink(options?: {
    refresh_url?: string;
    return_url?: string;
  }): Promise<any> {
    const response = await this.request<any>('/billing/connect/onboarding-link', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    return response.data ?? response;
  }

  async getConnectStatus(): Promise<any> {
    const response = await this.request<any>('/billing/connect/status', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getCustomerPayments(filters?: {
    status?: string;
    type?: string;
    contact_id?: string;
    start?: number;
    end?: number;
    limit?: number;
    lastEvaluatedKey?: any;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.contact_id) params.append('contact_id', filters.contact_id);
    if (typeof filters?.start === 'number') params.append('start', String(filters.start));
    if (typeof filters?.end === 'number') params.append('end', String(filters.end));
    if (typeof filters?.limit === 'number') params.append('limit', String(filters.limit));
    if (filters?.lastEvaluatedKey)
      params.append('lastEvaluatedKey', JSON.stringify(filters.lastEvaluatedKey));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/billing/customer-payments${suffix}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getCustomerPaymentStats(options?: { start?: number; end?: number }): Promise<any> {
    const params = new URLSearchParams();
    if (typeof options?.start === 'number') params.append('start', String(options.start));
    if (typeof options?.end === 'number') params.append('end', String(options.end));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/billing/customer-payments/stats${suffix}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getCustomerPaymentById(paymentId: string): Promise<any> {
    const response = await this.request<any>(`/billing/customer-payments/${paymentId}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  // Calendar Integration endpoints
  async getGoogleCalendarAuthUrl(): Promise<{ url: string }> {
    const response = await this.request<{ url: string }>('/calendar-integration/auth/google/url', {
      method: 'GET',
    });
    return (response.data ?? response) as { url: string };
  }

  async getMicrosoftCalendarAuthUrl(): Promise<{ url: string }> {
    const response = await this.request<{ url: string }>(
      '/calendar-integration/auth/microsoft/url',
      {
        method: 'GET',
      }
    );
    return (response.data ?? response) as { url: string };
  }

  async connectAppleCalendar(email: string, appSpecificPassword: string): Promise<any> {
    const response = await this.request<any>('/calendar-integration/auth/apple/connect', {
      method: 'POST',
      body: JSON.stringify({ email, appSpecificPassword }),
    });
    return response.data ?? response;
  }

  async syncCalendar(): Promise<any> {
    const response = await this.request<any>('/calendar-integration/sync', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async getCalendarConnectionStatus(): Promise<any> {
    const response = await this.request<any>('/calendar-integration/status', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async disconnectCalendar(): Promise<any> {
    const response = await this.request<any>('/calendar-integration/disconnect', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  // Webhooks endpoints
  async getWebhookEvents(): Promise<any> {
    const response = await this.request<any>('/webhooks/events', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getWebhookConfig(): Promise<any> {
    const response = await this.request<any>('/webhooks/config', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async updateWebhookConfig(data: {
    webhook_url?: string;
    enabled_events?: string[];
    is_enabled?: boolean;
  }): Promise<any> {
    const response = await this.request<any>('/webhooks/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async testWebhook(): Promise<any> {
    const response = await this.request<any>('/webhooks/test', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async rotateWebhookSecret(): Promise<any> {
    const response = await this.request<any>('/webhooks/rotate-secret', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  // Notifications endpoints
  async getNotificationEvents(): Promise<any> {
    const response = await this.request<any>('/notifications/events', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getNotificationPreferences(): Promise<any> {
    const response = await this.request<any>('/notifications/preferences', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async updateNotificationPreferences(preferences: any): Promise<any> {
    const response = await this.request<any>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
    return response.data ?? response;
  }

  async listNotifications(limit = 25, unreadOnly = false, lastEvaluatedKey?: any): Promise<any> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('unread_only', String(unreadOnly));
    if (lastEvaluatedKey) {
      params.append('lastEvaluatedKey', JSON.stringify(lastEvaluatedKey));
    }
    const response = await this.request<any>(`/notifications?${params.toString()}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getUnreadNotificationCount(): Promise<any> {
    const response = await this.request<any>('/notifications/unread-count', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async markNotificationRead(notificationId: string): Promise<any> {
    const response = await this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async markNotificationUnread(notificationId: string): Promise<any> {
    const response = await this.request<any>(`/notifications/${notificationId}/unread`, {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async markAllNotificationsRead(): Promise<any> {
    const response = await this.request<any>('/notifications/read-all', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async registerNotificationDevice(payload: {
    device_id: string;
    platform: 'IOS';
    apns_token: string;
    apns_environment?: 'sandbox' | 'production';
    app_version?: string;
    device_model?: string;
    locale?: string;
    push_enabled?: boolean;
  }): Promise<any> {
    const response = await this.request<any>('/notifications/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data ?? response;
  }

  async removeNotificationDevice(deviceId: string): Promise<any> {
    const response = await this.request<any>(`/notifications/devices/${deviceId}`, {
      method: 'DELETE',
    });
    return response.data ?? response;
  }

  // Admin billing endpoints
  async getAdminSubscriptions(): Promise<any[]> {
    const response = await this.request<any[]>('/billing/admin/subscriptions', {
      method: 'GET',
    });
    return (response as any)?.data ?? (response as any) ?? [];
  }

  async getAdminRevenueMetrics(): Promise<any> {
    const response = await this.request<any>('/billing/admin/revenue', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async listAdminPayments(params?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<any> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    const response = await this.request<any>(`/billing/admin/payments${qs.toString() ? `?${qs}` : ''}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getAdminProBilling(proId: string): Promise<any> {
    const response = await this.request<any>(`/billing/admin/pro/${proId}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async refundAdminBillingInvoice(
    invoiceId: string,
    data?: { amount_halalas?: number; reason?: string }
  ): Promise<any> {
    const response = await this.request<any>(`/billing/admin/invoices/${invoiceId}/refund`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
    return response.data ?? response;
  }

  async getAdminCompanyBilling(companyId: string): Promise<any> {
    const response = await this.request<any>(`/billing/admin/company/${companyId}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async updateAdminCompanySubscription(companyId: string, plan: string): Promise<any> {
    const response = await this.request<any>(`/billing/admin/company/${companyId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    });
    return response.data ?? response;
  }

  async cancelAdminCompanySubscription(companyId: string, immediate: boolean): Promise<any> {
    const response = await this.request<any>(
      `/billing/admin/company/${companyId}/subscription?immediate=${immediate ? 'true' : 'false'}`,
      {
        method: 'DELETE',
      }
    );
    return response.data ?? response;
  }

  async reactivateAdminCompanySubscription(companyId: string): Promise<any> {
    const response = await this.request<any>(
      `/billing/admin/company/${companyId}/subscription/reactivate`,
      {
        method: 'POST',
      }
    );
    return response.data ?? response;
  }

  async getMyProfile(): Promise<any> {
    const response = await this.request<any>('/users/me', { method: 'GET' });
    return response.data ?? response;
  }

  // Pro endpoints
  async getMyPro(): Promise<any> {
    const response = await this.request<any>('/pros/me', { method: 'GET' });
    return response.data ?? response;
  }

  async proOnboardingAccountSetup(dto: {
    id_type?: 'NATIONAL_ID' | 'IQAMA';
    id_number?: string;
    phone_number?: string;
    national_address_short?: string;
    national_address_building?: string;
    national_address_street?: string;
    national_address_district?: string;
    national_address_city?: string;
    national_address_postal_code?: string;
  }): Promise<any> {
    const response = await this.request<any>('/pros/onboarding/account-setup', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return response.data ?? response;
  }

  async proOnboardingIdentity(dto: { cr_number?: string; vat_number?: string }): Promise<any> {
    const response = await this.request<any>('/pros/onboarding/identity', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return response.data ?? response;
  }

  async proOnboardingProfile(dto: {
    bio?: string;
    years_experience?: number;
    speaks_arabic: boolean;
    speaks_english: boolean;
    speaks_urdu?: boolean;
    speaks_hindi?: boolean;
  }): Promise<any> {
    const response = await this.request<any>('/pros/onboarding/profile', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return response.data ?? response;
  }

  async proOnboardingServices(dto: { services: any[] }): Promise<any> {
    const response = await this.request<any>('/pros/onboarding/services', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return response.data ?? response;
  }

  async proOnboardingPayout(dto: {
    iban?: string;
    bank_name?: string;
    service_districts: string[];
    availability: Array<{
      day_of_week: string;
      open_time: string;
      close_time: string;
      is_available: boolean;
    }>;
  }): Promise<any> {
    const response = await this.request<any>('/pros/onboarding/payout', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return response.data ?? response;
  }

  async searchPros(q: string, district?: string): Promise<any[]> {
    const params = new URLSearchParams({ q });
    if (district) params.set('district', district);
    const response = await this.request<any[]>(`/marketplace/search?${params.toString()}`, {
      method: 'GET',
    });
    const data = response.data ?? response;
    return Array.isArray(data) ? data : ((data as any)?.results ?? []);
  }

  async updateMyProMarketplaceProfile(data: Record<string, any>): Promise<any> {
    const response = await this.request<any>('/pros/me/marketplace-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async createMyProMarketplaceMediaUpload(data: {
    kind: 'profile_photo' | 'work_photo';
    content_type: string;
    file_name?: string;
  }): Promise<{ upload_url: string; key: string }> {
    const response = await this.request<{ upload_url: string; key: string }>(
      '/pros/me/marketplace-media/presign',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data ?? response;
  }

  async updateMyProfile(data: {
    first_name?: string;
    last_name?: string;
    contact_email?: string;
    email?: string;
    phone_number?: string;
  }): Promise<any> {
    const response = await this.request<any>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }
  // Analytics
  async getCallAnalytics(days = 30) {
    return this.request<any>(`/analytics/calls?days=${days}`);
  }

  async getSmsAnalytics(days = 30) {
    return this.request<any>(`/analytics/sms?days=${days}`);
  }

  // Outbound calls
  async createOutboundCall(data: {
    to_number: string;
    context?: string;
    contact_id?: string;
    appointment_id?: string;
    custom_message?: string;
  }) {
    return this.request<any>('/outbound-calls', { method: 'POST', body: JSON.stringify(data) });
  }

  async getOutboundCalls(limit = 25) {
    return this.request<any>(`/outbound-calls?limit=${limit}`);
  }

  // SMS Automation
  async getSmsTemplates() {
    return this.request<any[]>('/sms-automation/templates');
  }

  async createSmsTemplate(data: { name: string; category: string; body: string }) {
    return this.request<any>('/sms-automation/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSmsTemplate(templateId: string) {
    return this.request<any>(`/sms-automation/templates/${templateId}`, { method: 'DELETE' });
  }

  async sendSmsCampaign(data: {
    template_id: string;
    contact_ids: string[];
    scheduled_at?: number;
  }) {
    return this.request<any>('/sms-automation/campaign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getScheduledMessages(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<any[]>(`/sms-automation/scheduled${qs}`);
  }

  async cancelScheduledMessage(messageId: string) {
    return this.request<any>(`/sms-automation/scheduled/${messageId}`, { method: 'DELETE' });
  }

  // Billing Add-on Packs
  async getAddonCatalog() {
    const res = await this.request<any>('/billing/addons');
    return (res as any)?.addons ?? res;
  }

  async purchaseAddonPack(packId: string) {
    return this.request<any>('/billing/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({ pack_id: packId }),
    });
  }

  // Invoices
  async getInvoices(): Promise<any[]> {
    const res = await this.request<any>('/invoices');
    return (res as any)?.items ?? res ?? [];
  }

  async getInvoiceStats(): Promise<any> {
    const res = await this.request<any>('/invoices/stats');
    return (res as any)?.data ?? res;
  }

  async createInvoice(data: any): Promise<any> {
    return this.request<any>('/invoices', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateInvoice(invoiceId: string, data: any): Promise<any> {
    return this.request<any>(`/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async markInvoiceSent(invoiceId: string): Promise<any> {
    return this.request<any>(`/invoices/${invoiceId}/send`, { method: 'POST' });
  }

  async markInvoicePaid(invoiceId: string): Promise<any> {
    return this.request<any>(`/invoices/${invoiceId}/paid`, { method: 'POST' });
  }

  async deleteInvoice(invoiceId: string): Promise<any> {
    return this.request<any>(`/invoices/${invoiceId}`, { method: 'DELETE' });
  }

  // Team Management
  async getTeamMembers(): Promise<any[]> {
    const res = await this.request<any>('/team');
    return (res as any)?.members ?? res ?? [];
  }

  async inviteTeamMember(data: { email: string; name: string; role: string }): Promise<any> {
    return this.request<any>('/team/invite', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTeamMember(memberId: string, data: { role?: string; name?: string }): Promise<any> {
    return this.request<any>(`/team/${memberId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async removeTeamMember(memberId: string): Promise<any> {
    return this.request<any>(`/team/${memberId}`, { method: 'DELETE' });
  }

  // Leads
  async getLeads(): Promise<any[]> {
    const res = await this.request<any>('/leads');
    return (res as any)?.leads ?? res ?? [];
  }

  // Marketplace / Provider Search
  async searchProviders(query?: string, category?: string, zipcode?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (zipcode) params.set('zipcode', zipcode);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<any>(`/marketplace/search${qs}`);
    return (res as any)?.providers ?? res ?? [];
  }

  async getProviderCategories(): Promise<string[]> {
    const res = await this.request<any>('/marketplace/categories');
    return (res as any)?.categories ?? res ?? [];
  }

  async getProviderBySlug(slug: string): Promise<any> {
    const res = await this.request<any>(`/marketplace/providers/${slug}`);
    return (res as any)?.provider ?? res;
  }

  async getProviderById(id: string): Promise<any> {
    const res = await this.request<any>(`/pros/${id}`);
    return (res as any)?.provider ?? res;
  }

  async getMyMarketplaceProfile(): Promise<any> {
    const res = await this.request<any>('/marketplace/profile');
    return (res as any)?.profile ?? res;
  }

  async updateMarketplaceProfile(data: any): Promise<any> {
    return this.request<any>('/marketplace/profile', { method: 'PUT', body: JSON.stringify(data) });
  }

  // Reviews
  async getProviderReviews(companyId: string): Promise<any[]> {
    const res = await this.request<any>(`/reviews/provider/${companyId}`);
    return (res as any)?.reviews ?? res ?? [];
  }

  async getMyReviews(): Promise<any[]> {
    const res = await this.request<any>('/reviews/my-reviews');
    return (res as any)?.reviews ?? res ?? [];
  }

  async respondToReview(reviewId: string, response: string): Promise<any> {
    return this.request<any>(`/reviews/${reviewId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  }

  // Follow-up Sequences settings
  async getFollowUpSettings(): Promise<any> {
    const res = await this.request<any>('/follow-up-sequences/settings');
    return (res as any)?.data ?? res;
  }

  async updateFollowUpSettings(data: any): Promise<any> {
    return this.request<any>('/follow-up-sequences/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async listFollowUpSequences(): Promise<any[]> {
    const res = await this.request<any>('/follow-up-sequences');
    return Array.isArray(res) ? res : ((res as any)?.items ?? []);
  }

  // Quote Requests (marketplace)
  async submitQuoteRequest(data: any): Promise<any> {
    return this.request<any>('/customer/quote-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomerQuoteRequests(): Promise<any[]> {
    const res = await this.request<any>('/customer/quote-requests');
    return (res as any)?.quotes ?? res ?? [];
  }

  async updateCustomerQuoteRequest(quoteId: string, data: any): Promise<any> {
    const res = await this.request<any>(`/customer/quote-requests/${quoteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return (res as any)?.quote ?? res;
  }

  async browseQuoteRequests(category?: string, zipcode?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (zipcode) params.set('zipcode', zipcode);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<any>(`/quote-requests${qs}`);
    return (res as any)?.quotes ?? res ?? [];
  }

  async getQuoteRequest(quoteId: string): Promise<any> {
    const res = await this.request<any>(`/quote-requests/${quoteId}`);
    return (res as any)?.quote ?? res;
  }

  async getAvailableQuotes(): Promise<any[]> {
    const res = await this.request<any>('/quote-requests/pro/available');
    return (res as any)?.quotes ?? res ?? [];
  }

  async getPastQuoteRequests(): Promise<any[]> {
    const res = await this.request<any>('/quote-requests/pro/past');
    return (res as any)?.quotes ?? res ?? [];
  }

  async respondToQuoteRequest(quoteId: string, data: any): Promise<any> {
    return this.request<any>(`/quote-requests/${quoteId}/respond`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Jobs Board
  async getJobsBoard(filters?: { category?: string; district?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.district) params.set('district', filters.district);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<any>(`/quote-requests/pro/jobs-board${query}`);
    return (res as any)?.jobs ?? res ?? [];
  }

  async claimJob(quoteId: string): Promise<any> {
    return this.request<any>(`/quote-requests/${quoteId}/claim`, { method: 'POST' });
  }

  async getProLeadFees(): Promise<any> {
    return this.request<any>('/quote-requests/pro/lead-fees');
  }

  async postOpenJob(data: {
    job_title: string;
    service_category: string;
    job_description: string;
    district: string;
    photos?: string[];
  }): Promise<any> {
    return this.request<any>('/customer/quote-requests/open', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomerOpenJobs(): Promise<any[]> {
    const res = await this.request<any>('/customer/quote-requests/open');
    return (res as any)?.quotes ?? res ?? [];
  }

  // Portal Messaging
  async getProThreads(): Promise<any[]> {
    const res = await this.request<any>('/portal-messaging/pro/threads');
    return (res as any)?.threads ?? res ?? [];
  }

  async getProThreadMessages(threadId: string): Promise<any[]> {
    const res = await this.request<any>(`/portal-messaging/pro/threads/${threadId}`);
    return (res as any)?.messages ?? res ?? [];
  }

  async sendProMessage(
    threadId: string,
    data: {
      message: string;
      customer_email?: string;
      customer_name?: string;
      customer_phone?: string;
      customer_user_id?: string;
      request_status?: string;
      quote_context?: any;
      attachments?: Array<{
        url: string;
        width?: number;
        height?: number;
        mime_type?: string;
        name?: string;
      }>;
      message_type?: string;
      system_event?: string;
    }
  ): Promise<any> {
    return this.request<any>(`/portal-messaging/pro/threads/${threadId}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendCustomerMessage(companyId: string, data: any): Promise<any> {
    return this.request<any>(`/portal-messaging/customer/send/${companyId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomerThreads(identity: { email?: string; userId?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (identity.email) params.set('email', identity.email);
    if (identity.userId) params.set('user_id', identity.userId);
    const res = await this.request<any>(`/portal-messaging/customer/threads?${params.toString()}`);
    return (res as any)?.threads ?? res ?? [];
  }

  async getCustomerThreadMessages(threadId: string, companyId: string): Promise<any[]> {
    const res = await this.request<any>(
      `/portal-messaging/customer/threads/${threadId}?company_id=${encodeURIComponent(companyId)}`
    );
    return (res as any)?.messages ?? res ?? [];
  }

  async getCustomerProfile(): Promise<{ profile: any; is_complete: boolean }> {
    const res = await this.request<any>('/customers/me');
    const rawProfile = (res as any)?.data ?? res ?? {};
    const profile = normalizeCustomerProfile(rawProfile);
    return {
      profile,
      is_complete: isCustomerProfileComplete(profile),
    };
  }

  async updateCustomerProfile(data: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    preferred_language?: 'ar' | 'en';
    marketing_consent?: boolean;
    address_line1?: string;
    address_line2?: string;
    district?: string;
    address_latitude?: number;
    address_longitude?: number;
    // Legacy compatibility inputs
    name?: string;
    phone?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  }): Promise<{ profile: any; is_complete: boolean }> {
    const normalizedName = String(data.name || '').trim();
    const firstName =
      data.first_name || (normalizedName ? normalizedName.split(/\s+/)[0] : undefined);
    const lastName =
      data.last_name ||
      (normalizedName ? normalizedName.split(/\s+/).slice(1).join(' ') : undefined);

    const payload = {
      ...(firstName ? { first_name: firstName.trim() } : {}),
      ...(lastName ? { last_name: lastName.trim() } : {}),
      ...(data.phone_number ? { phone_number: data.phone_number } : {}),
      ...(!data.phone_number && data.phone ? { phone_number: data.phone } : {}),
      ...(data.address_line1 ? { address_line1: data.address_line1 } : {}),
      ...(data.address_line2 !== undefined ? { address_line2: data.address_line2 } : {}),
      ...(data.district ? { district: data.district } : {}),
      ...(!data.district && data.state ? { district: data.state } : {}),
      ...(data.address_latitude !== undefined ? { address_latitude: data.address_latitude } : {}),
      ...(data.address_longitude !== undefined
        ? { address_longitude: data.address_longitude }
        : {}),
      ...(data.preferred_language ? { preferred_language: data.preferred_language } : {}),
      ...(data.marketing_consent !== undefined
        ? { marketing_consent: data.marketing_consent }
        : {}),
    };

    const res = await this.request<any>('/customers/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const rawProfile = (res as any)?.data ?? res ?? {};
    const profile = normalizeCustomerProfile(rawProfile);
    return {
      profile,
      is_complete: isCustomerProfileComplete(profile),
    };
  }

  // Refunds
  async refundCustomerPayment(
    paymentId: string,
    data?: { amount_cents?: number; reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' }
  ): Promise<any> {
    const res = await this.request<any>(`/billing/customer-payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
    return res;
  }

  // Service Products (pricing catalog)
  async listServiceProducts(includeInactive = false): Promise<any[]> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    const res = await this.request<any>(`/billing/service-products${qs}`);
    return (res as any)?.products ?? res ?? [];
  }

  async getServiceProduct(productId: string): Promise<any> {
    const res = await this.request<any>(`/billing/service-products/${productId}`);
    return (res as any)?.product ?? res;
  }

  async createServiceProduct(data: {
    name: string;
    description?: string;
    price_type: 'ONE_TIME' | 'SUBSCRIPTION';
    amount_cents: number;
    currency?: string;
    billing_interval?: 'day' | 'week' | 'month' | 'year';
    billing_interval_count?: number;
    trial_period_days?: number;
    active?: boolean;
  }): Promise<any> {
    const res = await this.request<any>('/billing/service-products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  }

  async updateServiceProduct(productId: string, data: any): Promise<any> {
    const res = await this.request<any>(`/billing/service-products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  }

  async deleteServiceProduct(productId: string, hard = false): Promise<any> {
    const qs = hard ? '?hard=true' : '';
    const res = await this.request<any>(`/billing/service-products/${productId}${qs}`, {
      method: 'DELETE',
    });
    return res;
  }

  async createProductCheckout(
    productId: string,
    data: {
      customer_email?: string;
      contact_id?: string;
      success_url?: string;
      cancel_url?: string;
    }
  ): Promise<any> {
    const res = await this.request<any>(`/billing/service-products/${productId}/checkout`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async adminGetStats(): Promise<any> {
    return this.request<any>('/admin/stats');
  }

  // Pros
  async adminListPros(params?: { status?: string; limit?: number }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    return this.request<any[]>(`/admin/pros${qs.toString() ? `?${qs}` : ''}`);
  }

  async adminGetPro(proId: string): Promise<any> {
    return this.request<any>(`/admin/pros/${proId}`);
  }

  async adminApprovePro(proId: string): Promise<any> {
    return this.request<any>(`/admin/pros/${proId}/approve`, { method: 'PATCH' });
  }

  async adminRejectPro(proId: string, reason?: string): Promise<any> {
    return this.request<any>(`/admin/pros/${proId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async adminSuspendPro(proId: string): Promise<any> {
    return this.request<any>(`/admin/pros/${proId}/suspend`, { method: 'PATCH' });
  }

  async adminReactivatePro(proId: string): Promise<any> {
    return this.request<any>(`/admin/pros/${proId}/reactivate`, { method: 'PATCH' });
  }

  async adminDeletePro(proId: string): Promise<any> {
    return this.request<any>(`/admin/pros/${proId}`, { method: 'DELETE' });
  }

  // Customers
  async adminListCustomers(params?: { status?: string; limit?: number }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    return this.request<any[]>(`/admin/customers${qs.toString() ? `?${qs}` : ''}`);
  }

  async adminGetCustomer(customerId: string): Promise<any> {
    return this.request<any>(`/admin/customers/${customerId}`);
  }

  async adminSuspendCustomer(customerId: string): Promise<any> {
    return this.request<any>(`/admin/customers/${customerId}/suspend`, { method: 'PATCH' });
  }

  async adminReactivateCustomer(customerId: string): Promise<any> {
    return this.request<any>(`/admin/customers/${customerId}/reactivate`, { method: 'PATCH' });
  }

  async adminDeleteCustomer(customerId: string): Promise<any> {
    return this.request<any>(`/admin/customers/${customerId}`, { method: 'DELETE' });
  }

  // Bookings
  async adminListBookings(params?: { status?: string; limit?: number }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    return this.request<any[]>(`/admin/bookings${qs.toString() ? `?${qs}` : ''}`);
  }

  async adminGetBooking(bookingId: string): Promise<any> {
    return this.request<any>(`/admin/bookings/${bookingId}`);
  }

  async adminCancelBooking(bookingId: string, reason?: string): Promise<any> {
    return this.request<any>(`/admin/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  // Reviews
  async adminListReviews(params?: { visible?: boolean; limit?: number }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.visible !== undefined) qs.set('visible', String(params.visible));
    if (params?.limit) qs.set('limit', String(params.limit));
    return this.request<any[]>(`/admin/reviews${qs.toString() ? `?${qs}` : ''}`);
  }

  async adminSetReviewVisibility(reviewId: string, isVisible: boolean): Promise<any> {
    return this.request<any>(`/admin/reviews/${reviewId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ is_visible: isVisible }),
    });
  }

  async adminDeleteReview(reviewId: string): Promise<any> {
    return this.request<any>(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
  }

  // Platform config
  async adminGetConfig(): Promise<any> {
    return this.request<any>('/admin/platform-config');
  }

  async adminUpdateConfig(key: string, value: any): Promise<any> {
    return this.request<any>(`/admin/platform-config/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  }

  // Reviews
  async getProReviews(proId: string): Promise<any[]> {
    const res = await this.request<any>(`/reviews/pro/${proId}`);
    return Array.isArray(res) ? res : ((res as any)?.reviews ?? (res as any)?.data ?? []);
  }

  // Generic fallback POST for legacy onboarding endpoints
  async postLegacyOnboardingProfile(data: Record<string, any>): Promise<any> {
    return this.request<any>('/pros/onboarding/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_URL);
