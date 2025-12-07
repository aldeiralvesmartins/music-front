<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePlaylistsStore } from '../stores/playlists';
import type { CreatePlaylistData } from '../api/playlists';

const router = useRouter();
const playlistsStore = usePlaylistsStore();

const showCreateModal = ref(false);
const formData = ref<CreatePlaylistData>({
  name: '',
  description: '',
});

const loadPlaylists = async () => {
  try {
    await playlistsStore.fetchPlaylists();
  } catch (error) {
    console.error('Failed to load playlists:', error);
  }
};

const openCreateModal = () => {
  formData.value = { name: '', description: '' };
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  formData.value = { name: '', description: '' };
};

const handleCreate = async () => {
  if (!formData.value.name.trim()) return;

  try {
    await playlistsStore.createPlaylist(formData.value);
    closeCreateModal();
  } catch (error) {
    console.error('Failed to create playlist:', error);
  }
};

const handleDelete = async (id: string, event: Event) => {
  event.stopPropagation();

  if (!confirm('Tem certeza que deseja excluir esta playlist?')) return;

  try {
    await playlistsStore.deletePlaylist(id);
  } catch (error) {
    console.error('Failed to delete playlist:', error);
  }
};

const goToPlaylist = (id: string) => {
  router.push(`/playlists/${id}`);
};

onMounted(() => {
  loadPlaylists();
});
</script>

<template>
  <div class="playlists">
    <div class="header">
      <h1>Minhas Playlists</h1>
      <button @click="openCreateModal" class="create-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nova Playlist
      </button>
    </div>

    <div v-if="playlistsStore.loading" class="loading">
      <div class="spinner"></div>
      <p>Carregando playlists...</p>
    </div>

    <div v-else-if="playlistsStore.error" class="error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ playlistsStore.error }}</p>
      <button @click="loadPlaylists" class="retry-btn">Tentar Novamente</button>
    </div>

    <div v-else-if="playlistsStore.playlists.length === 0" class="empty">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
      <h2>Nenhuma Playlist Criada</h2>
      <p>Crie sua primeira playlist para organizar suas músicas favoritas</p>
      <button @click="openCreateModal" class="empty-create-btn">
        Criar Primeira Playlist
      </button>
    </div>

    <div v-else class="playlists-grid">
      <div
        v-for="playlist in playlistsStore.playlists"
        :key="playlist.id"
        class="playlist-card"
        @click="goToPlaylist(playlist.id)"
      >
        <div class="playlist-cover">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
          <div class="play-overlay">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        <div class="playlist-info">
          <h3>{{ playlist.name }}</h3>
          <p v-if="playlist.description" class="description">{{ playlist.description }}</p>
          <p class="songs-count">
            {{ playlist.songs_count || 0 }} {{ playlist.songs_count === 1 ? 'música' : 'músicas' }}
          </p>
        </div>

        <button @click="handleDelete(playlist.id, $event)" class="delete-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>Nova Playlist</h2>
            <button @click="closeCreateModal" class="close-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleCreate" class="modal-form">
            <div class="form-group">
              <label for="name">Nome da Playlist</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                placeholder="Ex: Músicas para Trabalhar"
                required
              />
            </div>

            <div class="form-group">
              <label for="description">Descrição (opcional)</label>
              <textarea
                id="description"
                v-model="formData.description"
                placeholder="Descreva sua playlist..."
                rows="3"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeCreateModal" class="cancel-btn">
                Cancelar
              </button>
              <button type="submit" class="submit-btn" :disabled="!formData.name.trim()">
                Criar Playlist
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.playlists {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
}

.dark .header h1 {
  color: #fff;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.loading,
.error,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 32px;
  color: #666;
}

.dark .loading,
.dark .error,
.dark .empty {
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

.error svg,
.empty svg {
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 12px;
}

.dark .empty h2 {
  color: #ccc;
}

.empty p {
  margin-bottom: 24px;
}

.retry-btn,
.empty-create-btn {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover,
.empty-create-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding-bottom: 32px;
}

.playlist-card {
  position: relative;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.playlist-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: #10b981;
}

.dark .playlist-card {
  background: #181818;
  border-color: #282828;
}

.dark .playlist-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: #34d399;
}

.playlist-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  overflow: hidden;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
}

.playlist-card:hover .play-overlay {
  opacity: 1;
}

.playlist-info {
  flex: 1;
}

.playlist-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .playlist-info h3 {
  color: #fff;
}

.description {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.dark .description {
  color: #999;
}

.songs-count {
  font-size: 13px;
  color: #999;
}

.delete-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.playlist-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #ef4444;
  transform: scale(1.1);
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
  overflow-y: auto;
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
  .playlists {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header h1 {
    font-size: 24px;
  }

  .create-btn {
    width: 100%;
    justify-content: center;
  }

  .playlists-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding-bottom: 80px;
  }

  .modal {
    max-width: 100%;
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }
}
</style>
