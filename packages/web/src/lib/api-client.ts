import { ApiResponse, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@handycall/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to load token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
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

    if (this.accessToken && !endpoint.includes('/auth/')) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
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

  async changePassword(email: string, newPassword: string, session: string, poolType: 'users' | 'admin' = 'users', companyName?: string): Promise<any> {
    const body: any = { email, new_password: newPassword, session, pool_type: poolType };
    // Only include company_name for users pool
    if (companyName && poolType === 'users') {
      body.company_name = companyName;
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
  async getMyCompany() {
    const response = await this.request('/companies/me', {
      method: 'GET',
    });
    return response.data;
  }

  async updateMyCompany(updates: any) {
    const response = await this.request('/companies/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }
}

export const apiClient = new ApiClient(API_URL);
