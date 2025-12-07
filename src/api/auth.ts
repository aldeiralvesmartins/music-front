import api from './axios';

export interface User {
  id: number;
  name: string;
  email: string;
  document?: string;
  company_id?: number;
  is_admin?: boolean;
  is_super_admin?: boolean;
  type?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token?: string;
  token_type?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  document?: string;
  password: string;
  password_confirmation: string;
  is_admin?: boolean;
  type?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/register', data);
    if (response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordData): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordData): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/reset-password', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/user');
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/me');
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string; document?: string }): Promise<User> => {
    const response = await api.put<User>('/profile', data);
    return response.data;
  },

  changePassword: async (data: { current_password: string; password: string; password_confirmation: string }): Promise<void> => {
    await api.put('/change-password', data);
  },
};
