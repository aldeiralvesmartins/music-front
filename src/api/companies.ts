import api from './axios';

export interface Company {
  id: string;
  name: string;
  industry?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface CreateCompanyPayload {
  name: string;
  industry?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateWithUserPayload {
  company: CreateCompanyPayload;
  user: {
    name: string;
    email: string;
    password: string;
  };
}

export const companiesApi = {
  getAll: async (): Promise<Company[]> => {
    const res = await api.get<Company[]>('/companies');
    return res.data;
  },

  createWithUser: async (payload: CreateWithUserPayload): Promise<{ message: string; company: Company; user: any }> => {
    const res = await api.post('/companies/with-user', payload);
    return res.data;
  },
};
