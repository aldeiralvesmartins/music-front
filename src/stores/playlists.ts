import { defineStore } from 'pinia';
import { ref } from 'vue';
import { playlistsApi, type Playlist, type CreatePlaylistData, type UpdatePlaylistData } from '../api/playlists';
import type { Song } from '../api/music';

export const usePlaylistsStore = defineStore('playlists', () => {
  const playlists = ref<Playlist[]>([]);
  const currentPlaylist = ref<Playlist | null>(null);
  const playlistSongs = ref<Song[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchPlaylists = async () => {
    try {
      loading.value = true;
      error.value = null;
      playlists.value = await playlistsApi.getAll();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch playlists';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPlaylistById = async (id: string) => {
    try {
      loading.value = true;
      error.value = null;
      currentPlaylist.value = await playlistsApi.getById(id);
      return currentPlaylist.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch playlist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPlaylistSongs = async (id: string) => {
    try {
      loading.value = true;
      error.value = null;
      const songs = await playlistsApi.getSongs(id);
      playlistSongs.value = Array.isArray(songs) ? songs : [];
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch playlist songs';
      playlistSongs.value = [];
      console.error('Error fetching playlist songs:', err);
    } finally {
      loading.value = false;
    }
  };

  const createPlaylist = async (data: CreatePlaylistData) => {
    try {
      loading.value = true;
      error.value = null;
      const playlist = await playlistsApi.create(data);
      playlists.value.unshift(playlist);
      return playlist;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create playlist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePlaylist = async (id: string, data: UpdatePlaylistData) => {
    try {
      loading.value = true;
      error.value = null;
      const playlist = await playlistsApi.update(id, data);

      const index = playlists.value.findIndex(p => p.id === id);
      if (index !== -1) {
        playlists.value[index] = playlist;
      }

      if (currentPlaylist.value?.id === id) {
        currentPlaylist.value = playlist;
      }

      return playlist;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update playlist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deletePlaylist = async (id: string) => {
    try {
      loading.value = true;
      error.value = null;
      await playlistsApi.delete(id);
      playlists.value = playlists.value.filter(p => p.id !== id);

      if (currentPlaylist.value?.id === id) {
        currentPlaylist.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete playlist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addSongsToPlaylist = async (id: string, songIds: string[]) => {
    try {
      loading.value = true;
      error.value = null;
      await playlistsApi.addSongs(id, songIds);
      await fetchPlaylistSongs(id);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to add songs to playlist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeSongFromPlaylist = async (id: string, songId: string) => {
    try {
      loading.value = true;
      error.value = null;
      await playlistsApi.removeSong(id, songId);
      playlistSongs.value = playlistSongs.value.filter(s => s.id !== songId);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to remove song from playlist';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    playlists,
    currentPlaylist,
    playlistSongs,
    loading,
    error,
    fetchPlaylists,
    fetchPlaylistById,
    fetchPlaylistSongs,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongsToPlaylist,
    removeSongFromPlaylist,
    clearError,
  };
});
