<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlaylistsStore } from '../stores/playlists';
import { useSongsStore } from '../stores/songs';
import { useCategoriesStore } from '../stores/categories';
import { usePlayer } from '../composables/usePlayer';
import type { Song } from '../api/music';

const route = useRoute();
const router = useRouter();
const playlistsStore = usePlaylistsStore();
const songsStore = useSongsStore();
const categoriesStore = useCategoriesStore();
const player = usePlayer();

const showAddSongsModal = ref(false);
const showEditModal = ref(false);
const editFormData = ref({
  name: '',
  description: '',
});
const selectedSongs = ref<Set<string>>(new Set());
const searchQuery = ref('');
const selectedCategoryId = ref<number | null>(null);

const playlistId = computed(() => route.params.id as string);

const availableSongs = computed(() => {
  const playlistSongIds = new Set(
    playlistsStore.playlistSongs.filter(s => s).map(s => s.id)
  );

  return songsStore.songs.filter(song => !playlistSongIds.has(song.id));
});

const filteredAvailableSongs = computed(() => {
  if (!searchQuery.value.trim()) return availableSongs.value;

  const query = searchQuery.value.toLowerCase();
  return availableSongs.value.filter(song =>
    song.title.toLowerCase().includes(query)
  );
});

const validPlaylistSongs = computed(() => {
  const songs = playlistsStore.playlistSongs;
  if (!Array.isArray(songs)) return [];
  return songs.filter(song => song !== null && song !== undefined);
});

const loadPlaylist = async () => {
  try {
    await playlistsStore.fetchPlaylistById(playlistId.value);
    await playlistsStore.fetchPlaylistSongs(playlistId.value);
  } catch (error) {
    console.error('Failed to load playlist:', error);
  }
};

const loadCategories = async () => {
  try {
    if (categoriesStore.categories.length === 0) {
      await categoriesStore.fetchCategories();
    }
    if (categoriesStore.categories.length > 0) {
      selectedCategoryId.value = categoriesStore.categories[0].id;
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
};

const loadSongsByCategory = async (categoryId: number, reset = true) => {
  try {
    await songsStore.fetchSongsByCategory(categoryId, { reset, per_page: 20, ads_every: 5 });
  } catch (error) {
    console.error('Failed to load songs by category:', error);
  }
};

const loadMoreSongs = async () => {
  if (songsStore.hasMoreSongs && !songsStore.loading && selectedCategoryId.value) {
    await loadSongsByCategory(selectedCategoryId.value, false);
  }
};

watch(selectedCategoryId, (newCategoryId) => {
  if (newCategoryId && showAddSongsModal.value) {
    loadSongsByCategory(newCategoryId, true);
  }
});

const openEditModal = () => {
  if (playlistsStore.currentPlaylist) {
    editFormData.value = {
      name: playlistsStore.currentPlaylist.name,
      description: playlistsStore.currentPlaylist.description || '',
    };
    showEditModal.value = true;
  }
};

const closeEditModal = () => {
  showEditModal.value = false;
};

const handleEdit = async () => {
  if (!editFormData.value.name.trim()) return;

  try {
    await playlistsStore.updatePlaylist(playlistId.value, editFormData.value);
    closeEditModal();
  } catch (error) {
    console.error('Failed to update playlist:', error);
  }
};

const openAddSongsModal = async () => {
  selectedSongs.value.clear();
  searchQuery.value = '';
  songsStore.resetPagination();
  showAddSongsModal.value = true;

  try {
    await loadCategories();

    if (selectedCategoryId.value) {
      await loadSongsByCategory(selectedCategoryId.value, true);
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
};

const closeAddSongsModal = () => {
  showAddSongsModal.value = false;
  selectedSongs.value.clear();
  searchQuery.value = '';
  songsStore.resetPagination();
};

const toggleSongSelection = (songId: string) => {
  if (selectedSongs.value.has(songId)) {
    selectedSongs.value.delete(songId);
  } else {
    selectedSongs.value.add(songId);
  }
};

const handleAddSongs = async () => {
  if (selectedSongs.value.size === 0) return;

  try {
    await playlistsStore.addSongsToPlaylist(
      playlistId.value,
      Array.from(selectedSongs.value)
    );
    closeAddSongsModal();
  } catch (error) {
    console.error('Failed to add songs:', error);
  }
};

const handleRemoveSong = async (songId: string) => {
  if (!confirm('Remover esta música da playlist?')) return;

  try {
    await playlistsStore.removeSongFromPlaylist(playlistId.value, songId);
  } catch (error) {
    console.error('Failed to remove song:', error);
  }
};

const handlePlaySong = (song: Song) => {
  player.setPlaylist(validPlaylistSongs.value);
  player.playSong(song);
};

const handlePlayAll = () => {
  if (validPlaylistSongs.value.length > 0) {
    player.setPlaylist(validPlaylistSongs.value);
    player.playSong(validPlaylistSongs.value[0]);
  }
};

const goBack = () => {
  router.push('/playlists');
};

onMounted(async () => {
  await loadPlaylist();
});
</script>

<template>
  <div class="playlist-details">
    <div v-if="playlistsStore.loading && !playlistsStore.currentPlaylist" class="loading">
      <div class="spinner"></div>
      <p>Carregando playlist...</p>
    </div>

    <div v-else-if="!playlistsStore.currentPlaylist" class="error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>Playlist não encontrada</p>
      <button @click="goBack" class="back-btn">Voltar</button>
    </div>

    <div v-else>
      <div class="playlist-header">
        <button @click="goBack" class="back-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div class="playlist-cover">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
        </div>

        <div class="playlist-info">
          <div class="info-content">
            <span class="playlist-label">PLAYLIST</span>
            <h1>{{ playlistsStore.currentPlaylist.name }}</h1>
            <p v-if="playlistsStore.currentPlaylist.description" class="description">
              {{ playlistsStore.currentPlaylist.description }}
            </p>
            <p class="songs-count">
              {{ validPlaylistSongs.length }} {{ validPlaylistSongs.length === 1 ? 'música' : 'músicas' }}
            </p>
          </div>

          <div class="action-buttons">
            <button
              v-if="validPlaylistSongs.length > 0"
              @click="handlePlayAll"
              class="play-all-btn"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Tocar Tudo
            </button>
            <button @click="openAddSongsModal" class="add-songs-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Adicionar Músicas
            </button>
            <button @click="openEditModal" class="edit-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="validPlaylistSongs.length === 0" class="empty-playlist">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <h2 v-if="playlistsStore.error">{{ playlistsStore.error }}</h2>
        <h2 v-else>Playlist Vazia</h2>
        <p v-if="!playlistsStore.error">Adicione músicas para começar a ouvir</p>
        <button v-if="!playlistsStore.error" @click="openAddSongsModal" class="add-songs-empty-btn">
          Adicionar Músicas
        </button>
      </div>

      <div v-else class="songs-list">
        <div class="list-header">
          <div class="col-title">#</div>
          <div class="col-title">Título</div>
          <div class="col-title">Duração</div>
          <div class="col-title"></div>
        </div>

        <div
          v-for="(song, index) in validPlaylistSongs"
          :key="song.id"
          class="song-row"
          :class="{ playing: player.currentSong.value?.id === song.id }"
          @click="handlePlaySong(song)"
        >
          <div class="song-number">
            <span v-if="player.currentSong.value?.id !== song.id">{{ index + 1 }}</span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>

          <div class="song-title">
            <span>{{ song.title }}</span>
            <span v-if="song.anuncio" class="ad-badge">Anúncio</span>
          </div>

          <div class="song-duration">
            {{ song.duration || '-' }}
          </div>

          <div class="song-actions">
            <button @click.stop="handleRemoveSong(song.id)" class="remove-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showAddSongsModal" class="modal-overlay" @click="closeAddSongsModal">
        <div class="modal large" @click.stop>
          <div class="modal-header">
            <h2>Adicionar Músicas</h2>
            <button @click="closeAddSongsModal" class="close-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-filters">
            <div class="category-filter">
              <label for="category-select">Categoria:</label>
              <div v-if="categoriesStore.loading" class="category-loading">
                <div class="spinner-small"></div>
                <span>Carregando categorias...</span>
              </div>
              <select
                v-else-if="categoriesStore.categories.length > 0"
                id="category-select"
                v-model="selectedCategoryId"
                class="category-select"
              >
                <option
                  v-for="category in categoriesStore.categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
              <div v-else class="no-categories">
                <span v-if="categoriesStore.error">Erro ao carregar categorias: {{ categoriesStore.error }}</span>
                <span v-else>Nenhuma categoria disponível</span>
              </div>
            </div>

            <div class="modal-search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar músicas..."
              />
            </div>
          </div>

          <div class="modal-content">
            <div v-if="songsStore.loading" class="no-songs">
              <div class="spinner"></div>
              <p>Carregando músicas...</p>
            </div>

            <div v-else-if="filteredAvailableSongs.length === 0" class="no-songs">
              <p>{{ searchQuery ? 'Nenhuma música encontrada' : 'Nenhuma música disponível nesta categoria' }}</p>
            </div>

            <div v-else class="songs-selection">
              <div
                v-for="song in filteredAvailableSongs"
                :key="song.id"
                class="song-select-item"
                :class="{ selected: selectedSongs.has(song.id) }"
                @click="toggleSongSelection(song.id)"
              >
                <div class="checkbox">
                  <svg v-if="selectedSongs.has(song.id)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div class="song-info-select">
                  <span class="title">{{ song.title }}</span>
                  <span class="meta">{{ song.duration || '-' }}</span>
                </div>
              </div>

              <div v-if="songsStore.hasMoreSongs && !searchQuery" class="load-more-songs">
                <button
                  @click="loadMoreSongs"
                  class="load-more-songs-btn"
                  :disabled="songsStore.loading"
                >
                  <div v-if="songsStore.loading" class="spinner-small"></div>
                  <span v-else>Carregar Mais</span>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="closeAddSongsModal" class="cancel-btn">
              Cancelar
            </button>
            <button
              @click="handleAddSongs"
              class="submit-btn"
              :disabled="selectedSongs.size === 0"
            >
              Adicionar {{ selectedSongs.size > 0 ? `(${selectedSongs.size})` : '' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>Editar Playlist</h2>
            <button @click="closeEditModal" class="close-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleEdit" class="modal-form">
            <div class="form-group">
              <label for="edit-name">Nome da Playlist</label>
              <input
                id="edit-name"
                v-model="editFormData.name"
                type="text"
                placeholder="Ex: Músicas para Trabalhar"
                required
              />
            </div>

            <div class="form-group">
              <label for="edit-description">Descrição (opcional)</label>
              <textarea
                id="edit-description"
                v-model="editFormData.description"
                placeholder="Descreva sua playlist..."
                rows="3"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeEditModal" class="cancel-btn">
                Cancelar
              </button>
              <button type="submit" class="submit-btn" :disabled="!editFormData.name.trim()">
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.playlist-details {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}

.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 32px;
  color: #666;
}

.dark .loading,
.dark .error {
  color: #999;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.dark .spinner {
  border-color: #282828;
  border-top-color: #34d399;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.back-btn {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 16px;
}

.back-btn:hover {
  background: #059669;
}

.playlist-header {
  display: flex;
  align-items: flex-start;
  gap: 32px;
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e0e0e0;
}

.dark .playlist-header {
  border-bottom-color: #282828;
}

.back-button {
  width: 40px;
  height: 40px;
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-button:hover {
  background: #f0f0f0;
  border-color: #10b981;
  color: #10b981;
}

.dark .back-button {
  background: #181818;
  border-color: #282828;
  color: #999;
}

.dark .back-button:hover {
  background: #282828;
  border-color: #34d399;
  color: #34d399;
}

.playlist-cover {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.playlist-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-content {
  flex: 1;
}

.playlist-label {
  font-size: 12px;
  font-weight: 700;
  color: #666;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.dark .playlist-label {
  color: #999;
}

.playlist-info h1 {
  font-size: 48px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 12px 0;
  line-height: 1.2;
}

.dark .playlist-info h1 {
  color: #fff;
}

.playlist-info .description {
  font-size: 16px;
  color: #666;
  margin-bottom: 12px;
  line-height: 1.6;
}

.dark .playlist-info .description {
  color: #999;
}

.songs-count {
  font-size: 14px;
  color: #999;
}

.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.play-all-btn,
.add-songs-btn,
.edit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.play-all-btn {
  background: #10b981;
  color: white;
}

.play-all-btn:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.add-songs-btn {
  background: white;
  color: #10b981;
  border: 1px solid #10b981;
}

.add-songs-btn:hover {
  background: #10b981;
  color: white;
}

.dark .add-songs-btn {
  background: #181818;
  color: #34d399;
  border-color: #34d399;
}

.dark .add-songs-btn:hover {
  background: #34d399;
  color: #181818;
}

.edit-btn {
  background: white;
  color: #666;
  border: 1px solid #e0e0e0;
  padding: 12px;
}

.edit-btn:hover {
  background: #f0f0f0;
  border-color: #10b981;
  color: #10b981;
}

.dark .edit-btn {
  background: #181818;
  border-color: #282828;
  color: #999;
}

.dark .edit-btn:hover {
  background: #282828;
  border-color: #34d399;
  color: #34d399;
}

.empty-playlist {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 32px;
  color: #666;
}

.dark .empty-playlist {
  color: #999;
}

.empty-playlist svg {
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-playlist h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 12px;
}

.dark .empty-playlist h2 {
  color: #ccc;
}

.empty-playlist p {
  margin-bottom: 24px;
}

.add-songs-empty-btn {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-songs-empty-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.songs-list {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.dark .songs-list {
  background: #181818;
  border-color: #282828;
}

.list-header {
  display: grid;
  grid-template-columns: 60px 1fr 120px 60px;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dark .list-header {
  border-bottom-color: #282828;
}

.song-row {
  display: grid;
  grid-template-columns: 60px 1fr 120px 60px;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
  align-items: center;
}

.dark .song-row {
  border-bottom-color: #282828;
}

.song-row:hover {
  background: #f9fafb;
}

.dark .song-row:hover {
  background: #1f1f1f;
}

.song-row.playing {
  background: rgba(16, 185, 129, 0.05);
}

.dark .song-row.playing {
  background: rgba(52, 211, 153, 0.1);
}

.song-row:last-child {
  border-bottom: none;
}

.song-number {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #999;
}

.song-row.playing .song-number {
  color: #10b981;
}

.dark .song-row.playing .song-number {
  color: #34d399;
}

.song-title {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dark .song-title {
  color: #fff;
}

.ad-badge {
  display: inline-flex;
  padding: 2px 8px;
  background: #fbbf24;
  color: #78350f;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
}

.song-duration {
  font-size: 14px;
  color: #666;
}

.dark .song-duration {
  color: #999;
}

.song-actions {
  display: flex;
  justify-content: center;
}

.remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.song-row:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.dark .remove-btn:hover {
  background: #3f1515;
  color: #f87171;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal.large {
  max-width: 700px;
}

.dark .modal {
  background: #1a1a1a;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.dark .modal-header {
  border-bottom-color: #282828;
}

.modal-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.dark .modal-header h2 {
  color: #fff;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.dark .close-btn {
  color: #999;
}

.dark .close-btn:hover {
  background: #282828;
  color: #fff;
}

.modal-filters {
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.dark .modal-filters {
  border-bottom-color: #282828;
}

.category-filter {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.dark .category-filter {
  border-bottom-color: #282828;
}

.category-filter label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.dark .category-filter label {
  color: #ccc;
}

.category-loading {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  color: #666;
  font-size: 14px;
}

.dark .category-loading {
  color: #999;
}

.no-categories {
  flex: 1;
  padding: 10px 12px;
  color: #999;
  font-size: 14px;
  font-style: italic;
}

.category-select {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.category-select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.dark .category-select {
  background: #181818;
  border-color: #282828;
  color: #fff;
}

.dark .category-select:focus {
  border-color: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
}

.modal-search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  flex-shrink: 0;
}

.modal-search svg {
  color: #999;
  flex-shrink: 0;
}

.modal-search input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 14px;
  color: #333;
}

.dark .modal-search input {
  color: #fff;
}

.modal-search input::placeholder {
  color: #999;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.no-songs {
  padding: 48px 24px;
  text-align: center;
  color: #999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.no-songs .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.dark .no-songs .spinner {
  border-color: #282828;
  border-top-color: #34d399;
}

.songs-selection {
  padding: 8px;
}

.load-more-songs {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.load-more-songs-btn {
  padding: 10px 28px;
  background: white;
  color: #10b981;
  border: 1px solid #10b981;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.load-more-songs-btn:hover:not(:disabled) {
  background: #10b981;
  color: white;
}

.load-more-songs-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dark .load-more-songs-btn {
  background: #1a1a1a;
  color: #34d399;
  border-color: #34d399;
}

.dark .load-more-songs-btn:hover:not(:disabled) {
  background: #34d399;
  color: #1a1a1a;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #e0e0e0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.dark .spinner-small {
  border-color: #282828;
  border-top-color: #34d399;
}

.song-select-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.song-select-item:hover {
  background: #f9fafb;
}

.dark .song-select-item:hover {
  background: #1f1f1f;
}

.song-select-item.selected {
  background: rgba(16, 185, 129, 0.1);
}

.dark .song-select-item.selected {
  background: rgba(52, 211, 153, 0.15);
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.song-select-item.selected .checkbox {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.dark .checkbox {
  border-color: #282828;
}

.dark .song-select-item.selected .checkbox {
  background: #34d399;
  border-color: #34d399;
}

.song-info-select {
  flex: 1;
  min-width: 0;
}

.song-info-select .title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .song-info-select .title {
  color: #fff;
}

.song-info-select .meta {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.dark .modal-footer {
  border-top-color: #282828;
}

.modal-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.dark .form-group label {
  color: #ccc;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  background: white;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.dark .form-group input,
.dark .form-group textarea {
  background: #181818;
  border-color: #282828;
  color: #fff;
}

.dark .form-group input:focus,
.dark .form-group textarea:focus {
  border-color: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn,
.submit-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f0f0f0;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.dark .cancel-btn {
  background: #282828;
  color: #999;
}

.dark .cancel-btn:hover {
  background: #333;
  color: #fff;
}

.submit-btn {
  background: #10b981;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #059669;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .playlist-details {
    padding: 16px;
  }

  .playlist-header {
    flex-direction: column;
    gap: 20px;
  }

  .playlist-cover {
    width: 120px;
    height: 120px;
  }

  .playlist-info h1 {
    font-size: 32px;
  }

  .action-buttons {
    flex-wrap: wrap;
  }

  .list-header {
    grid-template-columns: 40px 1fr 80px 40px;
    gap: 8px;
    padding: 12px 16px;
  }

  .song-row {
    grid-template-columns: 40px 1fr 80px 40px;
    gap: 8px;
    padding: 12px 16px;
  }

  .song-title {
    font-size: 14px;
  }

  .song-duration {
    font-size: 13px;
  }

  .modal {
    max-width: 100%;
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }
}
</style>
