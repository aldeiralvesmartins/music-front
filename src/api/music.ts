import api from './axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface Category {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  image?: string;
  company_id?: number;
  created_at: string;
}

export interface Song {
  id: number;
  title: string;
  url: string;
  cover_url?: string;
  size_mb?: number;
  duration?: number;
  duration_seconds?: number;
  anuncio?: boolean;
  category_id: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  ads_every: number;
  category_id?: string;
  count?: number;
  next_token?: string;
}

export interface SongsApiResponse {
  data: Song[];
  meta: PaginationMeta;
}

export interface NextTokenPayload {
  category_id?: string;
  page: number;
  per_page: number;
  ads_every: number;
}

export interface UploadResponse {
  message: string;
  song: Song;
}

export interface CategoryWithSongs {
  category: Category;
  songs: Song[];
}

export const musicApi = {
  getAllSongs: async (): Promise<Song[]> => {
    const response = await api.get<Song[]>('/songs');
    return response.data;
  },

  getAllSongsPaginated: async (params: {
    page?: number;
    per_page?: number;
    ads_every?: number;
  } = {}): Promise<SongsApiResponse> => {
    const { page = 1, per_page = 30, ads_every = 3 } = params;
    const response = await api.get<SongsApiResponse>('/songs', {
      params: { page, per_page, ads_every }
    });
    return response.data;
  },

  getNextSongs: async (token: string): Promise<SongsApiResponse> => {
    const response = await api.get<SongsApiResponse>('/songs/next', {
      params: { token }
    });
    return response.data;
  },

  decodeToken: (token: string): NextTokenPayload => {
    try {
      const decoded = atob(token);
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  },

  encodeToken: (payload: NextTokenPayload): string => {
    return btoa(JSON.stringify(payload));
  },

  getAllCategories: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  getSongsByCategory: async (categoryId: string): Promise<Song[]> => {
    const response = await api.get<{ data: Song[] }>('/songs/by-category', {
      params: { category_id: categoryId }
    });
    return response.data.data;
  },

  getSongsByCategoryPaginated: async (categoryId: string, params: {
    page?: number;
    per_page?: number;
    ads_every?: number;
  } = {}): Promise<SongsApiResponse> => {
    const { page = 1, per_page = 30, ads_every = 3 } = params;
    const response = await api.get<SongsApiResponse>('/songs/by-category', {
      params: { category_id: categoryId, page, per_page, ads_every }
    });
    return response.data;
  },

  getNextSongsByCategory: async (token: string): Promise<SongsApiResponse> => {
    const response = await api.get<SongsApiResponse>('/songs/by-category/next', {
      params: { token }
    });
    return response.data;
  },

  getSongById: async (id: number): Promise<Song> => {
    const response = await api.get<Song>(`/songs/${id}`);
    return response.data;
  },

  uploadSong: async (
    title: string,
    categoryId: number,
    file: File,
    onProgress?: (progress: number) => void,
    options: { anuncio?: boolean; company_id?: string } = {}
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category_id', categoryId.toString());
    formData.append('file', file);

    if (options.anuncio) {
      formData.append('anuncio', '1');
      if (options.company_id) {
        formData.append('company_id', options.company_id);
      }
    }

    const response = await api.post<UploadResponse>('/songs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  getPlayUrl: (id: number): string => {
    const token = localStorage.getItem('auth_token');
    return `${API_BASE_URL}/songs/${id}/play${token ? `?token=${token}` : ''}`;
  },
};
