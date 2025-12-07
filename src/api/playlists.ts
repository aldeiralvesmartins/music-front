import api from './axios';
import type { Song } from './songs';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  songs?: Song[];
  songs_count?: number;
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
}

export interface UpdatePlaylistData {
  name?: string;
  description?: string;
}

export interface AddSongsData {
  song_ids: number[];
}

export const playlistsApi = {
  getAll: async (): Promise<Playlist[]> => {
    const response = await api.get<Playlist[]>('/playlists');
    return response.data;
  },

  getById: async (id: string): Promise<Playlist> => {
    const response = await api.get<Playlist>(`/playlists/${id}`);
    return response.data;
  },

  create: async (data: CreatePlaylistData): Promise<Playlist> => {
    const response = await api.post<Playlist>('/playlists', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePlaylistData): Promise<Playlist> => {
    const response = await api.put<Playlist>(`/playlists/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/playlists/${id}`);
  },

  getSongs: async (id: string): Promise<Song[]> => {
    const response = await api.get<{ songs: Song[] }>(`/playlists/${id}/songs`);
    return response.data.songs;
  },

  addSongs: async (id: string, songIds: number[]): Promise<void> => {
    await api.post(`/playlists/${id}/songs`, { song_ids: songIds });
  },

  removeSong: async (id: string, songId: number): Promise<void> => {
    await api.delete(`/playlists/${id}/songs/${songId}`);
  },
};
