import api from './axios';

export interface Category {
  id: number;
  name: string;
  slug?: string;
  is_active?: boolean;
  image?: string;
  company_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryData {
  name: string;
  is_active?: boolean;
  image?: File | string;
}

export interface UpdateCategoryData {
  name?: string;
  is_active?: boolean;
  image?: File | string;
}

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  getById: async (id: number): Promise<Category> => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: CreateCategoryData): Promise<Category> => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.is_active !== undefined) {
      formData.append('is_active', data.is_active ? '1' : '0');
    }
    if (data.image instanceof File) {
      formData.append('image', data.image);
    }

    const response = await api.post<Category>('/categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id: number, data: UpdateCategoryData): Promise<Category> => {
    const formData = new FormData();
    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.is_active !== undefined) {
      formData.append('is_active', data.is_active ? '1' : '0');
    }
    if (data.image instanceof File) {
      formData.append('image', data.image);
    }

    const response = await api.put<Category>(`/categories/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
