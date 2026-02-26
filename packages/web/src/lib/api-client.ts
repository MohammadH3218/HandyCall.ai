import {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ConfirmSignUpRequest,
  ConfirmSignUpResponse,
  ResendConfirmationRequest,
  ResendConfirmationResponse,
} from '@handycall/shared';

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

  private isAuthFailureResponse(response: Response, data: any, message: string): boolean {
    if (response.status === 401 || response.status === 403) return true;

    const text = [
      message,
      data?.error?.message,
      data?.message,
      data?.error,
      data?.raw,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      text.includes('invalid or expired token') ||
      text.includes('invalid token') ||
      text.includes('expired token') ||
      text.includes('token expired') ||
      text.includes('jwt expired') ||
      text.includes('unauthorized') ||
      text.includes('not authorized')
    );
  }

  private async forceLogoutToLogin() {
    if (typeof window === 'undefined') return;
    if (this.sessionExpiryRedirecting) return;
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
      window.location.assign('/login?reason=session_expired');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
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

      let data: any;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If response is not JSON, create error response
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
        if (this.isAuthFailureResponse(response, data, errorMessage)) {
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

  // Auth endpoints
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async confirmSignUp(data: ConfirmSignUpRequest): Promise<ConfirmSignUpResponse> {
    const response = await this.request<ConfirmSignUpResponse>('/auth/confirm-signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async resendConfirmation(data: ResendConfirmationRequest): Promise<ResendConfirmationResponse> {
    const response = await this.request<ResendConfirmationResponse>('/auth/resend-confirmation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async login(data: LoginRequest): Promise<any> {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Handle both wrapped (ApiResponse) and unwrapped responses
    return response.data ?? response;
  }

  async changePassword(email: string, newPassword: string, session: string, poolType: 'users' | 'admin' = 'users', firstName?: string, lastName?: string): Promise<any> {
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

  async refreshToken(refreshToken: string, email: string): Promise<{ access_token: string; id_token: string }> {
    const response = await this.request<{ access_token: string; id_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken, email }),
    });
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
  async getAppointments(limit?: number, lastEvaluatedKey?: string): Promise<{ appointments: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

    const response = await this.request<{ appointments: any[]; lastEvaluatedKey?: any }>(`/appointments?${params.toString()}`, {
      method: 'GET',
    });
    const payload: any = response.data ?? response;
    return payload || { appointments: [], lastEvaluatedKey: undefined };
  }

  async getAppointmentsRange(startIso: string, endIso: string): Promise<{ appointments: any[] }> {
    const params = new URLSearchParams({ start: startIso, end: endIso });
    const response = await this.request<{ appointments: any[] }>(`/appointments/range?${params.toString()}`, {
      method: 'GET',
    });
    return (response.data ?? response) as { appointments: any[] };
  }

  async getAppointmentById(appointmentId: string): Promise<any> {
    const response = await this.request<any>(`/appointments/${appointmentId}`, { method: 'GET' });
    return response.data ?? response;
  }

  async createAppointment(data: any): Promise<any> {
    const response = await this.request<any>(`/appointments`, { method: 'POST', body: JSON.stringify(data) });
    return response.data ?? response;
  }

  async cancelAppointment(appointmentId: string): Promise<any> {
    const response = await this.request<any>(`/appointments/${appointmentId}`, { method: 'DELETE' });
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
    const response = await this.request<any>(`/appointments/${appointmentId}`, { method: 'DELETE' });
    return response.data ?? response;
  }

  // Calls endpoints
  async getCalls(limit?: number, lastEvaluatedKey?: string): Promise<{ calls: any[]; lastEvaluatedKey?: any; total?: number }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

    const response = await this.request<{ calls: any[]; lastEvaluatedKey?: any }>(`/calls?${params.toString()}`, {
      method: 'GET',
    });
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
  async getMessageThreads(limit?: number, lastEvaluatedKey?: string): Promise<{ threads: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/messages/threads${suffix}`, { method: 'GET' });
    return (response.data ?? response) as { threads: any[]; lastEvaluatedKey?: any };
  }

  async getMessageThread(contactId: string, limit?: number, lastEvaluatedKey?: string): Promise<{ thread: any; messages: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/messages/threads/${contactId}${suffix}`, { method: 'GET' });
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

  // Telephony endpoints
  async getMyTelephonyNumber(): Promise<any> {
    const response = await this.request<any>('/telephony/my-number', { method: 'GET' });
    return response.data ?? response;
  }

  async getAvailablePhoneNumbers(params: {
    country?: string;
    type?: string;
    maxResults?: number;
    areaCode?: string;
    contains?: string;
  }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params.country) query.append('country', params.country);
    if (params.type) query.append('type', params.type);
    if (typeof params.maxResults === 'number') query.append('maxResults', String(params.maxResults));
    if (params.areaCode) query.append('areaCode', params.areaCode);
    if (params.contains) query.append('contains', params.contains);

    const response = await this.request<any>(`/telephony/available-numbers?${query.toString()}`, { method: 'GET' });
    const payload: any = response.data ?? response;
    return Array.isArray(payload) ? payload : payload?.data || [];
  }

  async claimPhoneNumber(phoneNumber: string, description?: string): Promise<any> {
    const response = await this.request<any>('/telephony/claim-number', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, description }),
    });
    return response.data ?? response;
  }

  async claimDemoPhoneNumber(): Promise<any> {
    const response = await this.request<any>('/telephony/claim-demo', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  // Knowledge endpoints
  async getKnowledgeItems(type?: string, status?: string, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const response = await this.request<any>(`/knowledge-items?${params.toString()}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getKnowledgeItem(knowledgeId: string): Promise<any> {
    const response = await this.request<any>(`/knowledge-items/${knowledgeId}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async createKnowledgeItem(data: any): Promise<any> {
    const response = await this.request<any>('/knowledge-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async updateKnowledgeItem(knowledgeId: string, data: any): Promise<any> {
    const response = await this.request<any>(`/knowledge-items/${knowledgeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async deleteKnowledgeItem(knowledgeId: string): Promise<any> {
    const response = await this.request<any>(`/knowledge-items/${knowledgeId}`, {
      method: 'DELETE',
    });
    return response.data ?? response;
  }

  async searchKnowledge(query: string, topK?: number): Promise<any> {
    const params = new URLSearchParams({ q: query });
    if (topK) params.append('topK', topK.toString());

    const response = await this.request<any>(`/knowledge-items/search?${params.toString()}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  // Flagged Questions endpoints
  async getFlaggedQuestions(status?: string, callId?: string, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (callId) params.append('call_id', callId);
    if (limit) params.append('limit', limit.toString());

    const response = await this.request<any>(`/flagged-questions?${params.toString()}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async getFlaggedQuestion(flaggedId: string): Promise<any> {
    const response = await this.request<any>(`/flagged-questions/${flaggedId}`, {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async resolveFlaggedQuestion(flaggedId: string, data: any): Promise<any> {
    const response = await this.request<any>(`/flagged-questions/${flaggedId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }

  async dismissFlaggedQuestion(flaggedId: string): Promise<any> {
    const response = await this.request<any>(`/flagged-questions/${flaggedId}/dismiss`, {
      method: 'PUT',
    });
    return response.data ?? response;
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
    const response = await this.request<any>(`/contacts/${contactId}/appointments`, { method: 'GET' });
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
    const response = await this.request<any>(`/contacts/${contactId}/calls${suffix}`, { method: 'GET' });
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

  async createSubscription(data: { plan: string; payment_method_id: string }): Promise<any> {
    const response = await this.request<any>('/billing/subscription', {
      method: 'POST',
      body: JSON.stringify(data),
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

  async getInvoices(): Promise<any[]> {
    const response = await this.request<any[]>('/billing/invoices', {
      method: 'GET',
    });
    if (Array.isArray(response)) return response;
    return (response as any)?.data || [];
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

  async setupConnectAccount(): Promise<any> {
    const response = await this.request<any>('/billing/connect/setup', {
      method: 'POST',
    });
    return response.data ?? response;
  }

  async createConnectOnboardingLink(): Promise<any> {
    const response = await this.request<any>('/billing/connect/onboarding-link', {
      method: 'POST',
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
    if (filters?.lastEvaluatedKey) params.append('lastEvaluatedKey', JSON.stringify(filters.lastEvaluatedKey));
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

  // Calendar Integration endpoints
  async getGoogleCalendarAuthUrl(): Promise<{ url: string }> {
    const response = await this.request<{ url: string }>('/calendar-integration/auth/google/url', {
      method: 'GET',
    });
    return (response.data ?? response) as { url: string };
  }

  async getMicrosoftCalendarAuthUrl(): Promise<{ url: string }> {
    const response = await this.request<{ url: string }>('/calendar-integration/auth/microsoft/url', {
      method: 'GET',
    });
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
    return response.data || [];
  }

  async getAdminRevenueMetrics(): Promise<any> {
    const response = await this.request<any>('/billing/admin/revenue', {
      method: 'GET',
    });
    return response.data ?? response;
  }

  async updateMyProfile(data: { first_name?: string; last_name?: string; contact_email?: string; email?: string; phone_number?: string }): Promise<any> {
    const response = await this.request<any>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data ?? response;
  }
}

export const apiClient = new ApiClient(API_URL);
