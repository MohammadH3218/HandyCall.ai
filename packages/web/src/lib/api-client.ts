import { ApiResponse, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@handycall/shared';

// BFF Pattern: Point to Next.js internal API proxy instead of external NestJS
// The proxy handles authentication server-side using NextAuth cookies
const API_URL = '/api/proxy';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    // Legacy method - no longer needed with BFF pattern
    // Tokens are handled server-side via NextAuth cookies
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
        // Handle 401 Unauthorized - user needs to log in again
        if (response.status === 401 || response.status === 403) {
          console.warn('[API Client] Authentication failed - clearing tokens');

          // Clear all auth data from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('id_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('email');
            localStorage.removeItem('user_role');

            // Only redirect if not already on login or register page
            // Use a timeout to prevent redirect loops during login flow
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/register') {
              // Delay redirect slightly to allow any in-flight auth to complete
              setTimeout(() => {
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                  window.location.href = '/login';
                }
              }, 100);
            }
          }
        }

        const errorMessage = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
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

  async refreshToken(refreshToken: string, email: string): Promise<{ access_token: string; id_token: string }> {
    const response = await this.request<{ access_token: string; id_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken, email }),
    });
    return response.data!;
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

  // Dashboard endpoints
  async getDashboardStats(): Promise<any> {
    const response = await this.request<any>('/dashboard/stats', {
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
  async getCalls(limit?: number, lastEvaluatedKey?: string): Promise<{ calls: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

    const response = await this.request<{ calls: any[]; lastEvaluatedKey?: any }>(`/calls?${params.toString()}`, {
      method: 'GET',
    });
    const payload: any = response.data ?? response;
    return payload || { calls: [], lastEvaluatedKey: undefined };
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

  async getContactCalls(contactId: string, limit?: number): Promise<{ calls: any[] }> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.append('limit', limit.toString());
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/contacts/${contactId}/calls${suffix}`, { method: 'GET' });
    return (response.data ?? response) as { calls: any[] };
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

  async getUsageMetrics(): Promise<any> {
    const response = await this.request<any>('/billing/usage', {
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

  // Demo endpoints
  async logDemoGoogleAttempt(payload: { step: 'signin' | 'password' | 'code'; email?: string; code?: string; passwordProvided?: boolean }): Promise<void> {
    await this.request<any>('/public/demo/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient(API_URL);
