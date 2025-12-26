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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken && !endpoint.includes('/auth/')) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
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
    return response.data!;
  }

  async changePassword(email: string, newPassword: string, session: string): Promise<any> {
    const response = await this.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ email, new_password: newPassword, session }),
    });
    return response.data!;
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
