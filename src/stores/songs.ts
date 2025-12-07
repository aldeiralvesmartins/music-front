import { defineStore } from 'pinia';
import { ref } from 'vue';
import { songsApi, type Song, type UploadSongData, type PaginationMeta } from '../api/songs';

export const useSongsStore = defineStore('songs', () => {
  const songs = ref<Song[]>([]);
  const currentSong = ref<Song | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const nextToken = ref<string | null>(null);
  const paginationMeta = ref<PaginationMeta | null>(null);
  const hasMoreSongs = ref(true);

  const fetchSongs = async () => {
    try {
      loading.value = true;
      error.value = null;
      songs.value = await songsApi.getAll();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch songs';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSongById = async (id: number) => {
    try {
      loading.value = true;
      error.value = null;
      currentSong.value = await songsApi.getById(id);
      return currentSong.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch song';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSongsByCategory = async (categoryId: number | string, params: {
    page?: number;
    per_page?: number;
    ads_every?: number;
    reset?: boolean;
  } = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const { reset = false, ...apiParams } = params;

      const response = await songsApi.getByCategory(categoryId, apiParams);

      const songData = Array.isArray(response.data) ? response.data : [];

      if (reset) {
        songs.value = songData;
      } else {
        songs.value.push(...songData);
      }

      paginationMeta.value = response.meta;
      nextToken.value = response.meta.next_token || null;
      hasMoreSongs.value = !!response.meta.next_token;

      return response;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch songs by category';
      if (params.reset) {
        songs.value = [];
      }
      console.error('Error fetching songs by category:', err);
    } finally {
      loading.value = false;
    }
  };

  const uploadSong = async (data: UploadSongData) => {
    try {
      loading.value = true;
      error.value = null;
      const song = await songsApi.upload(data);
      songs.value.unshift(song);
      return song;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to upload song';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getPlayUrl = (id: number): string => {
    return songsApi.getPlayUrl(id);
  };

  const fetchSongsPaginated = async (params: {
    page?: number;
    per_page?: number;
    ads_every?: number;
    reset?: boolean;
  } = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const { reset = false, ...apiParams } = params;

      const response = await songsApi.getAllPaginated(apiParams);

      if (reset) {
        songs.value = response.data;
      } else {
        songs.value.push(...response.data);
      }

      paginationMeta.value = response.meta;
      nextToken.value = response.meta.next_token || null;
      hasMoreSongs.value = !!response.meta.next_token;

      return response;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch songs';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchNextSongs = async () => {
    if (!nextToken.value || !hasMoreSongs.value) {
      return null;
    }

    try {
      loading.value = true;
      error.value = null;

      const response = await songsApi.getNext(nextToken.value);

      songs.value.push(...response.data);

      paginationMeta.value = response.meta;
      nextToken.value = response.meta.next_token || null;
      hasMoreSongs.value = !!response.meta.next_token;

      return response;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch next songs';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const resetPagination = () => {
    songs.value = [];
    nextToken.value = null;
    paginationMeta.value = null;
    hasMoreSongs.value = true;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    songs,
    currentSong,
    loading,
    error,
    nextToken,
    paginationMeta,
    hasMoreSongs,
    fetchSongs,
    fetchSongsPaginated,
    fetchNextSongs,
    fetchSongById,
    fetchSongsByCategory,
    uploadSong,
    getPlayUrl,
    resetPagination,
    clearError,
  };
});
