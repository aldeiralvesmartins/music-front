import api from './axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface Song {
  id: string;
  title: string;
  category_id: string;
  url: string;
  duration?: number;
  duration_seconds?: number;
  size_mb?: number;
  anuncio?: boolean;
  category?: {
    id: string;
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
  next_token?: string;
}

export interface SongsApiResponse {
  data: Song[];
  meta: PaginationMeta;
}

export interface NextTokenPayload {
  page: number;
  per_page: number;
  ads_every: number;
}

export interface UploadSongData {
  title: string;
  category_id: string;
  file: File;
}

export const songsApi = {
  getAll: async (): Promise<Song[]> => {
    const response = await api.get<Song[]>('/songs');
    return response.data;
  },

  getAllPaginated: async (params: {
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

  getNext: async (token: string): Promise<SongsApiResponse> => {
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

  getById: async (id: number): Promise<Song> => {
    const response = await api.get<Song>(`/songs/${id}`);
    return response.data;
  },

  getByCategory: async (categoryId: string | number, params: {
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

  upload: async (data: UploadSongData): Promise<Song> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('category_id', data.category_id.toString());
    formData.append('file', data.file);

    const response = await api.post<Song>('/songs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  play: async (id: string): Promise<Blob> => {
    const response = await api.get(`/songs/${id}/play`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getPlayUrl: (id: string): string => {
    const token = localStorage.getItem('auth_token');
    return `${API_BASE_URL}/songs/${id}/play${token ? `?token=${token}` : ''}`;
  },
};
