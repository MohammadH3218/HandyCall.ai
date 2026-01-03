import { ApiResponse, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@handycall/shared';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    // Legacy method - no longer needed with Amplify, but keeping for compatibility
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Get Cognito token from Amplify session for API requests (not auth endpoints)
    if (!endpoint.includes('/auth/') && typeof window !== 'undefined') {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken?.toString();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        // User is not logged in - continue without token
        console.debug('No auth session found');
      }
    }

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

  async changePassword(email: string, newPassword: string, session: string, poolType: 'users' | 'admin' = 'users', companyName?: string, firstName?: string, lastName?: string): Promise<any> {
    const body: any = { email, new_password: newPassword, session, pool_type: poolType };
    // Only include company_name for users pool
    if (companyName && poolType === 'users') {
      body.company_name = companyName;
    }
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
    return response.data;
  }

  async updateMyCompany(updates: any): Promise<any> {
    const response = await this.request<any>('/companies/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
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

  // Calls endpoints
  async getCalls(limit?: number, lastEvaluatedKey?: string): Promise<{ calls: any[]; lastEvaluatedKey?: any }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (lastEvaluatedKey) params.append('lastEvaluatedKey', lastEvaluatedKey);

    const response = await this.request<{ calls: any[]; lastEvaluatedKey?: any }>(`/calls?${params.toString()}`, {
      method: 'GET',
    });
    return response.data || { calls: [], lastEvaluatedKey: undefined };
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
    return response.data || [];
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
}

export const apiClient = new ApiClient(API_URL);
