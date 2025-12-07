<script setup lang="ts">
import { onMounted, computed, ref, watch, onUnmounted } from 'vue';
import { usePlayer } from '../composables/usePlayer';
import { musicApi } from '../api/music';
import { usePlaylistsStore } from '../stores/playlists';

const player = usePlayer();
const playlistsStore = usePlaylistsStore();
const showMoreInfo = ref(false);
const progress = ref(0);
const currentSong = ref<any>(null);
const isPlaying = ref(false);
const intervalId = ref<number | null>(null);
const isDarkMode = ref(false);
const showAddDialog = ref(false);
const selectedPlaylistId = ref<string>('');
const pendingSongToAdd = ref<any | null>(null);
const addingToPlaylist = ref(false);
const searchPlaylist = ref('');
const creatingPlaylist = ref(false);
const newPlaylistName = ref('');

// Observar mudanças no player para evitar reatividade direta
watch(() => player.currentSong.value, (newSong) => {
  currentSong.value = newSong;
}, { immediate: true });

watch(() => player.isPlaying.value, (playing) => {
  isPlaying.value = playing;
}, { immediate: true });

// Verificar tema atual
const checkDarkMode = () => {
  isDarkMode.value = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const backgroundUrl = computed(() => currentSong.value?.cover_url || null);

const nextSongs = computed(() => {
  const list = player.playlist.value || [];
  const current = currentSong.value;
  if (!current || list.length === 0) return [] as any[];
  const idx = list.findIndex(s => s.id === current.id);
  if (idx === -1) return list.slice(0, 5);
  const after = list.slice(idx + 1);
  return after.slice(0, 5);
});

const filteredPlaylists = computed(() => {
  if (!playlistsStore.playlists) return [];
  const search = searchPlaylist.value.toLowerCase();
  return playlistsStore.playlists.filter(playlist =>
      playlist.name.toLowerCase().includes(search)
  );
});

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Data inválida';
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseDuration = (duration: string): number => {
  if (!duration) return 180; // Fallback: 3 minutos

  try {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
  } catch {
    return 180;
  }
  return 180;
};

const getSongDuration = (song: any): number => {
  return parseDuration(song?.duration);
};

const togglePlayPause = () => {
  if (isPlaying.value) {
    player.pause();
  } else {
    player.resume();
  }
};

const skipNext = () => {
  const list = player.playlist.value || [];
  const current = currentSong.value;
  if (!current || list.length === 0) return;

  const idx = list.findIndex(s => s.id === current.id);
  if (idx < list.length - 1) {
    player.playSong(list[idx + 1]);
  }
};

const skipPrevious = () => {
  const list = player.playlist.value || [];
  const current = currentSong.value;
  if (!current || list.length === 0) return;

  const idx = list.findIndex(s => s.id === current.id);
  if (idx > 0) {
    player.playSong(list[idx - 1]);
  }
};

const updateProgress = () => {
  if (isPlaying.value && progress.value < 100) {
    progress.value += 0.5;
  } else if (progress.value >= 100) {
    progress.value = 0;
    skipNext();
  }
};

const startProgressInterval = () => {
  if (intervalId.value) clearInterval(intervalId.value);
  intervalId.value = window.setInterval(updateProgress, 500);
};

const stopProgressInterval = () => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
};

watch(isPlaying, (playing) => {
  if (playing) {
    startProgressInterval();
  } else {
    stopProgressInterval();
  }
});

watch(currentSong, () => {
  progress.value = 0;
});

// Observar mudanças no tema
const observer = new MutationObserver(() => {
  checkDarkMode();
});

const openAddToPlaylist = async (song: any) => {
  try {
    pendingSongToAdd.value = song;

    // Carrega playlists se não estiverem carregadas
    if (!playlistsStore.playlists || playlistsStore.playlists.length === 0) {
      await playlistsStore.fetchPlaylists();
    }

    // Se ainda não houver playlists, cria uma padrão
    if (playlistsStore.playlists.length === 0) {
      const newPlaylist = await playlistsStore.createPlaylist({ name: 'Minhas músicas' });
      selectedPlaylistId.value = newPlaylist.id;
    } else {
      selectedPlaylistId.value = playlistsStore.playlists[0].id;
    }

    showAddDialog.value = true;
  } catch (error) {
    console.error('Erro ao abrir diálogo:', error);
  }
};

const addToPlaylist = async () => {
  if (!pendingSongToAdd.value || !selectedPlaylistId.value) return;

  try {
    addingToPlaylist.value = true;
    await playlistsStore.addSongsToPlaylist(selectedPlaylistId.value, [pendingSongToAdd.value.id]);
    showAddDialog.value = false;
    pendingSongToAdd.value = null;
    searchPlaylist.value = '';
  } catch (error) {
    console.error('Erro ao adicionar à playlist:', error);
  } finally {
    addingToPlaylist.value = false;
  }
};

const createNewPlaylist = async () => {
  if (!newPlaylistName.value.trim()) return;

  try {
    creatingPlaylist.value = true;
    const newPlaylist = await playlistsStore.createPlaylist({
      name: newPlaylistName.value
    });

    // Seleciona a nova playlist automaticamente
    selectedPlaylistId.value = newPlaylist.id;
    newPlaylistName.value = '';
    creatingPlaylist.value = false;

    // Foca no search para continuar
    searchPlaylist.value = '';
  } catch (error) {
    console.error('Erro ao criar playlist:', error);
    creatingPlaylist.value = false;
  }
};

onMounted(async () => {
  checkDarkMode();

  // Observar mudanças na classe do documento
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  try {
    // Carrega playlists para o diálogo de adicionar
    try { await playlistsStore.fetchPlaylists(); } catch {}
    if (!currentSong.value) {
      const response = await musicApi.getAllSongsPaginated({
        page: 1,
        per_page: 30,
        ads_every: 3
      });

      if (response.data.length > 0) {
        player.setPlaylist(response.data, response.meta);
        player.playSong(response.data[0]);
      }
    }
  } catch (error) {
    console.error('Failed to load songs:', error);
  }

  // Start progress interval if playing
  if (isPlaying.value) {
    startProgressInterval();
  }
});

onUnmounted(() => {
  stopProgressInterval();
  observer.disconnect();
});
</script>

<template>
  <div class="music-player-app" :class="{ 'dark': isDarkMode, 'light': !isDarkMode }">
    <!-- Background Overlay -->
    <div
        v-if="backgroundUrl"
        class="background-overlay"
        :style="{ backgroundImage: `url(${backgroundUrl})` }"
    ></div>
    <div class="background-overlay-gradient"></div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Loading State -->
      <div v-if="!currentSong" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Carregando músicas...</p>
      </div>

      <!-- Mobile Layout -->
      <div v-else class="mobile-layout">
        <!-- Now Playing Card -->
        <div class="now-playing-card">
          <!-- Album Cover with Play Animation -->
          <div class="album-cover-container">
            <div
                class="album-cover"
                :style="{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none' }"
                :class="{ 'playing': isPlaying }"
            >
              <div v-if="!backgroundUrl" class="album-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M10 16.5l6-4.5-6-4.5z"/>
                </svg>
              </div>
            </div>

            <!-- Song Info -->
            <div class="song-info">
              <div class="song-title-container">
                <h1 class="song-title">{{ currentSong.title || 'Sem título' }}</h1>
                <p class="song-artist">{{ currentSong.artist || 'Artista desconhecido' }}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Queue Section -->
        <div v-if="nextSongs.length" class="queue-section">
          <div class="section-header">
            <h3>Próximas na fila</h3>
            <button class="text-btn">Ver todas</button>
          </div>

          <div class="queue-list">
            <div
                v-for="(song, i) in nextSongs"
                :key="song.id"
                class="queue-item"
                @click="player.playSong?.(song)"
            >
              <div class="queue-item-number">{{ i + 1 }}</div>

              <div
                  class="queue-item-cover"
                  :style="{ backgroundImage: song.cover_url ? `url(${song.cover_url})` : 'none' }"
              >
                <div v-if="!song.cover_url" class="cover-placeholder">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    <path d="M10 16.5l6-4.5-6-4.5z"/>
                  </svg>
                </div>
              </div>

              <div class="queue-item-info">
                <div class="queue-item-title">{{ song.title || 'Sem título' }}</div>
                <div class="queue-item-artist">{{ song.artist || 'Artista desconhecido' }}</div>
              </div>

              <div class="queue-item-duration">{{ song.duration || '3:00' }}</div>
              <!-- Botão Moderno de Adicionar à Playlist -->
              <button
                  class="queue-item-action-btn"
                  @click.stop="openAddToPlaylist(song)"
                  :title="`Adicionar '${song.title}' à playlist`"
              >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Layout -->
      <div v-if="currentSong" class="desktop-layout">
        <!-- Left Column - Now Playing -->
        <div class="left-column">
          <div class="desktop-now-playing">
            <!-- Album Cover -->
            <div
                class="desktop-album-cover"
                :style="{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none' }"
                :class="{ 'playing': isPlaying }"
            >
              <div v-if="!backgroundUrl" class="album-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M10 16.5l6-4.5-6-4.5z"/>
                </svg>
              </div>
            </div>

            <!-- Song Details -->
            <div class="desktop-song-details">
              <div class="now-playing-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>TOCANDO AGORA</span>
              </div>

              <h1 class="desktop-song-title">{{ currentSong.title || 'Sem título' }}</h1>
              <p class="desktop-song-artist">{{ currentSong.artist || 'Artista desconhecido' }}</p>
            </div>
          </div>
        </div>

        <!-- Right Column - Queue -->
        <div v-if="nextSongs.length" class="right-column">
          <div class="queue-section">
            <div class="section-header">
              <h3>Próximas na fila</h3>
              <span class="queue-count">{{ nextSongs.length }} músicas</span>
            </div>

            <div class="queue-list">
              <div
                  v-for="(song, i) in nextSongs"
                  :key="song.id"
                  class="queue-item"
                  @click="player.playSong?.(song)"
              >
                <div class="queue-item-number">{{ i + 1 }}</div>

                <div
                    class="queue-item-cover"
                    :style="{ backgroundImage: song.cover_url ? `url(${song.cover_url})` : 'none' }"
                >
                  <div v-if="!song.cover_url" class="cover-placeholder">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      <path d="M10 16.5l6-4.5-6-4.5z"/>
                    </svg>
                  </div>
                </div>

                <div class="queue-item-info">
                  <div class="queue-item-title">{{ song.title || 'Sem título' }}</div>
                  <div class="queue-item-artist">{{ song.artist || 'Artista desconhecido' }}</div>
                </div>

                <div class="queue-item-duration">{{ song.duration || '3:00' }}</div>

                <!-- Botão Moderno de Adicionar à Playlist -->
                <button
                    class="queue-item-action-btn"
                    @click.stop="openAddToPlaylist(song)"
                    :title="`Adicionar '${song.title}' à playlist`"
                >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fixed Mini Player -->
      <div v-if="currentSong" class="mini-player">
        <div class="mini-player-content">
          <div class="mini-player-info">
            <div
                class="mini-player-cover"
                :style="{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none' }"
            ></div>
            <div class="mini-player-text">
              <div class="mini-player-title">{{ currentSong.title || 'Sem título' }}</div>
              <div class="mini-player-artist">{{ currentSong.artist || 'Artista desconhecido' }}</div>
            </div>
          </div>

          <div class="mini-player-controls">
            <button class="mini-control-btn" @click="togglePlayPause">
              <svg v-if="!isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>

            <button class="mini-control-btn" @click="skipNext">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="mini-player-progress">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Moderno para Adicionar à Playlist -->
  <div v-if="showAddDialog" class="modern-modal-backdrop" @click.self="showAddDialog = false">
    <div class="modern-modal" :class="{ 'dark': isDarkMode, 'light': !isDarkMode }">
      <!-- Cabeçalho do Modal -->
      <div class="modal-header">
        <div class="modal-header-content">
          <h3 class="modal-title">Adicionar à playlist</h3>
          <p class="modal-subtitle" v-if="pendingSongToAdd">
            Adicionar "{{ pendingSongToAdd.title }}" à sua playlist
          </p>
        </div>
        <button class="modal-close-btn" @click="showAddDialog = false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Corpo do Modal -->
      <div class="modal-body">
        <!-- Criar Nova Playlist -->
        <div class="create-playlist-section">
          <div class="create-playlist-input">
            <input
                v-model="newPlaylistName"
                type="text"
                placeholder="Criar nova playlist..."
                @keyup.enter="createNewPlaylist"
            >
            <button
                class="create-btn"
                @click="createNewPlaylist"
                :disabled="!newPlaylistName.trim() || creatingPlaylist"
            >
              <span v-if="!creatingPlaylist">Criar</span>
              <span v-else class="loading-dots">Criando</span>
            </button>
          </div>
        </div>

        <!-- Buscar Playlists -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
                v-model="searchPlaylist"
                type="text"
                placeholder="Buscar playlists..."
                class="search-input"
            >
          </div>
        </div>

        <!-- Lista de Playlists -->
        <div class="playlists-list">
          <div
              v-if="filteredPlaylists.length === 0"
              class="empty-state"
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <p>Nenhuma playlist encontrada</p>
          </div>

          <div
              v-else
              class="playlist-scroll-container"
          >
            <div
                v-for="playlist in filteredPlaylists"
                :key="playlist.id"
                class="playlist-item"
                :class="{ 'selected': selectedPlaylistId === playlist.id }"
                @click="selectedPlaylistId = playlist.id"
            >
              <div class="playlist-item-left">
                <div class="playlist-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                  </svg>
                </div>
                <div class="playlist-info">
                  <span class="playlist-name">{{ playlist.name }}</span>
                  <span class="playlist-song-count">{{ playlist.song_count || 0 }} músicas</span>
                </div>
              </div>
              <div class="playlist-item-right">
                <div class="selection-indicator">
                  <div
                      class="selection-circle"
                      :class="{ 'selected': selectedPlaylistId === playlist.id }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé do Modal -->
      <div class="modal-footer">
        <button
            class="modal-btn secondary"
            @click="showAddDialog = false"
        >
          Cancelar
        </button>
        <button
            class="modal-btn primary"
            @click="addToPlaylist"
            :disabled="!selectedPlaylistId || addingToPlaylist"
            :class="{ 'loading': addingToPlaylist }"
        >
          <span v-if="!addingToPlaylist">
            Adicionar à playlist
          </span>
          <span v-else class="loading-dots">
            Adicionando
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos base para ambos os temas */
.music-player-app {
  position: relative;
  min-height: 100vh;
  transition: background-color 0.3s ease;
}

.music-player-app.dark {
  background: #121212;
  color: #ffffff;
}

.music-player-app.light {
  background: #ffffff;
  color: #121212;
}

.background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.6;
  z-index: 0;
}

.dark .background-overlay {
  filter: blur(80px) brightness(0.4);
}

.light .background-overlay {
  filter: blur(80px) brightness(0.8);
}

.background-overlay-gradient {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.dark .background-overlay-gradient {
  background: linear-gradient(180deg, rgba(18, 18, 18, 0) 0%, #121212 100%);
}

.light .background-overlay-gradient {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #ffffff 100%);
}

.main-content {
  position: relative;
  z-index: 2;
  padding: 16px;
  padding-bottom: 100px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 16px;
}

.dark .loading-spinner {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #1DB954;
}

.light .loading-spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #1DB954;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  font-size: 16px;
}

.dark .loading-state p {
  color: #b3b3b3;
}

.light .loading-state p {
  color: #666666;
}

/* Mobile Layout */
.mobile-layout {
  display: block;
}

.desktop-layout {
  display: none;
}

/* Now Playing Card */
.now-playing-card {
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.dark .now-playing-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light .now-playing-card {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.album-cover-container {
  margin-bottom: 32px;
}

.album-cover {
  width: 280px;
  height: 280px;
  margin: 0 auto 24px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dark .album-cover {
  background-color: #282828;
}

.light .album-cover {
  background-color: #f0f0f0;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.album-cover.playing {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 20px 60px rgba(29, 185, 84, 0.3);
  }
  50% {
    box-shadow: 0 20px 80px rgba(29, 185, 84, 0.6);
  }
}

.album-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.dark .album-placeholder {
  background: linear-gradient(135deg, #1DB954 0%, #191414 100%);
}

.light .album-placeholder {
  background: linear-gradient(135deg, #1DB954 0%, #4CAF50 100%);
}

.song-info {
  text-align: center;
}

.song-title-container {
  margin-bottom: 24px;
}

.song-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.3;
}

.dark .song-title {
  color: #ffffff;
}

.light .song-title {
  color: #121212;
}

.song-artist {
  font-size: 16px;
  font-weight: 500;
}

.dark .song-artist {
  color: #b3b3b3;
}

.light .song-artist {
  color: #666666;
}

/* Queue Section */
.queue-section {
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  transition: all 0.3s ease;
}

.dark .queue-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.light .queue-section {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 700;
}

.dark .section-header h3 {
  color: #ffffff;
}

.light .section-header h3 {
  color: #121212;
}

.text-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
}

.dark .text-btn {
  color: #b3b3b3;
}

.light .text-btn {
  color: #666666;
}

.text-btn:hover {
  color: #1DB954;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dark .queue-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.light .queue-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.queue-item-number {
  width: 24px;
  font-size: 14px;
}

.dark .queue-item-number {
  color: #b3b3b3;
}

.light .queue-item-number {
  color: #666666;
}

.queue-item-cover {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.dark .queue-item-cover {
  background-color: #282828;
}

.light .queue-item-cover {
  background-color: #f0f0f0;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .cover-placeholder {
  color: #b3b3b3;
}

.light .cover-placeholder {
  color: #666666;
}

.queue-item-info {
  flex: 1;
  min-width: 0;
}

.queue-item-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .queue-item-title {
  color: #ffffff;
}

.light .queue-item-title {
  color: #121212;
}

.queue-item-artist {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .queue-item-artist {
  color: #b3b3b3;
}

.light .queue-item-artist {
  color: #666666;
}

.queue-item-duration {
  font-size: 12px;
  flex-shrink: 0;
}

.dark .queue-item-duration {
  color: #b3b3b3;
}

.light .queue-item-duration {
  color: #666666;
}

/* Botão de Ação Moderno */
.queue-item-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dark .queue-item-action-btn {
  color: #b3b3b3;
}

.light .queue-item-action-btn {
  color: #666666;
}

.queue-item-action-btn:hover {
  transform: scale(1.1);
}

.dark .queue-item-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.light .queue-item-action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #121212;
}

.queue-count {
  font-size: 12px;
}

.dark .queue-count {
  color: #b3b3b3;
}

.light .queue-count {
  color: #666666;
}

/* Fixed Mini Player */
.mini-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  backdrop-filter: blur(20px);
  padding: 12px 16px;
  z-index: 1000;
  transition: all 0.3s ease;
}

.dark .mini-player {
  background: rgba(40, 40, 40, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.light .mini-player {
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
}

.mini-player-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mini-player-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.mini-player-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.dark .mini-player-cover {
  background-color: #282828;
}

.light .mini-player-cover {
  background-color: #f0f0f0;
}

.mini-player-text {
  min-width: 0;
}

.mini-player-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .mini-player-title {
  color: #ffffff;
}

.light .mini-player-title {
  color: #121212;
}

.mini-player-artist {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .mini-player-artist {
  color: #b3b3b3;
}

.light .mini-player-artist {
  color: #666666;
}

.mini-player-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mini-control-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.mini-control-btn:hover {
  transform: scale(1.05);
}

.dark .mini-control-btn {
  color: #ffffff;
}

.light .mini-control-btn {
  color: #121212;
}

.mini-player-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
}

.dark .mini-player-progress {
  background: rgba(255, 255, 255, 0.1);
}

.light .mini-player-progress {
  background: rgba(0, 0, 0, 0.1);
}

.mini-player-progress .progress-fill {
  height: 100%;
  background: #1DB954;
  transition: width 0.1s linear;
}

/* Desktop Layout */
@media (min-width: 1024px) {
  .mobile-layout {
    display: none;
  }

  .desktop-layout {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 32px;
    max-width: 1400px;
    margin: 0 auto;
    padding-top: 32px;
  }

  .main-content {
    padding-bottom: 120px;
  }

  .desktop-now-playing {
    backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: 40px;
    transition: all 0.3s ease;
  }

  .dark .desktop-now-playing {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .light .desktop-now-playing {
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .desktop-album-cover {
    width: 320px;
    height: 320px;
    margin: 0 auto 32px;
    border-radius: 16px;
    background-size: cover;
    background-position: center;
    position: relative;
    overflow: hidden;
    transition: transform 0.3s ease;
  }

  .dark .desktop-album-cover {
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
    background-color: #282828;
  }

  .light .desktop-album-cover {
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
    background-color: #f0f0f0;
  }

  .desktop-album-cover.playing {
    animation: pulse 2s infinite;
  }

  .now-playing-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 24px;
  }

  .dark .now-playing-badge {
    background: rgba(29, 185, 84, 0.1);
    color: #1DB954;
  }

  .light .now-playing-badge {
    background: rgba(29, 185, 84, 0.1);
    color: #1DB954;
  }

  .desktop-song-title {
    font-size: 40px;
    font-weight: 800;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .dark .desktop-song-title {
    color: #ffffff;
  }

  .light .desktop-song-title {
    color: #121212;
  }

  .desktop-song-artist {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 32px;
  }

  .dark .desktop-song-artist {
    color: #b3b3b3;
  }

  .light .desktop-song-artist {
    color: #666666;
  }

  .queue-section {
    height: calc(100vh - 200px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .queue-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
  }

  .queue-list::-webkit-scrollbar {
    width: 6px;
  }

  .dark .queue-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  .light .queue-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
  }

  .queue-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .light .queue-list::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
  }

  .mini-player {
    bottom: 80px;
    border-radius: 16px;
    margin: 0 32px 32px;
    width: calc(100% - 64px);
    transform: translateY(100px);
    transition: transform 0.3s ease;
  }

  .mini-player:hover {
    transform: translateY(0);
  }

  .dark .mini-player {
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .light .mini-player {
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .mini-player-progress {
    border-radius: 0 0 16px 16px;
  }
}

/* Modal Moderno */
.modern-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modern-modal {
  width: 90%;
  max-width: 480px;
  border-radius: 20px;
  overflow: hidden;
  animation: slideUp 0.3s ease;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modern-modal.dark {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.modern-modal.light {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  color: #121212;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

/* Cabeçalho do Modal */
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid;
}

.dark .modal-header {
  border-color: rgba(255, 255, 255, 0.1);
}

.light .modal-header {
  border-color: rgba(0, 0, 0, 0.1);
}

.modal-header-content {
  flex: 1;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.modal-subtitle {
  font-size: 14px;
  margin: 0;
  opacity: 0.7;
}

.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 12px;
  flex-shrink: 0;
}

.dark .modal-close-btn {
  color: #b3b3b3;
}

.light .modal-close-btn {
  color: #666666;
}

.modal-close-btn:hover {
  transform: scale(1.1);
}

.dark .modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.light .modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #121212;
}

/* Corpo do Modal */
.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
}

/* Criar Playlist */
.create-playlist-section {
  padding: 20px 0;
  border-bottom: 1px solid;
}

.dark .create-playlist-section {
  border-color: rgba(255, 255, 255, 0.1);
}

.light .create-playlist-section {
  border-color: rgba(0, 0, 0, 0.1);
}

.create-playlist-input {
  display: flex;
  gap: 12px;
  align-items: center;
}

.create-playlist-input input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid;
  font-size: 14px;
  transition: all 0.2s ease;
  outline: none;
}

.dark .create-playlist-input input {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.light .create-playlist-input input {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.2);
  color: #121212;
}

.dark .create-playlist-input input:focus {
  border-color: #1DB954;
  background: rgba(255, 255, 255, 0.08);
}

.light .create-playlist-input input:focus {
  border-color: #1DB954;
  background: rgba(0, 0, 0, 0.05);
}

.create-playlist-input input::placeholder {
  opacity: 0.6;
}

.create-btn {
  padding: 12px 20px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  background: #1DB954;
  color: white;
}

.create-btn:hover:not(:disabled) {
  background: #1ed760;
  transform: translateY(-1px);
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Buscar Playlists */
.search-section {
  padding: 20px 0;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.6;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border-radius: 12px;
  border: 2px solid;
  font-size: 14px;
  transition: all 0.2s ease;
  outline: none;
}

.dark .search-input {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.light .search-input {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.2);
  color: #121212;
}

.dark .search-input:focus {
  border-color: #1DB954;
  background: rgba(255, 255, 255, 0.08);
}

.light .search-input:focus {
  border-color: #1DB954;
  background: rgba(0, 0, 0, 0.05);
}

.search-input::placeholder {
  opacity: 0.6;
}

/* Lista de Playlists */
.playlists-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  opacity: 0.7;
}

.playlist-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 20px;
  margin-right: -8px;
  padding-right: 8px;
}

.playlist-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.dark .playlist-scroll-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.light .playlist-scroll-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.playlist-scroll-container::-webkit-scrollbar-thumb {
  border-radius: 3px;
}

.dark .playlist-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.light .playlist-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
}

.playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.dark .playlist-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.light .playlist-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.dark .playlist-item.selected {
  background: rgba(29, 185, 84, 0.1);
  border: 1px solid rgba(29, 185, 84, 0.3);
}

.light .playlist-item.selected {
  background: rgba(29, 185, 84, 0.08);
  border: 1px solid rgba(29, 185, 84, 0.3);
}

.playlist-item-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.playlist-avatar {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dark .playlist-avatar {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.light .playlist-avatar {
  background: rgba(0, 0, 0, 0.05);
  color: #121212;
}

.dark .playlist-item.selected .playlist-avatar {
  background: rgba(29, 185, 84, 0.2);
}

.light .playlist-item.selected .playlist-avatar {
  background: rgba(29, 185, 84, 0.15);
}

.playlist-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.playlist-name {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-song-count {
  font-size: 12px;
  opacity: 0.7;
}

.playlist-item-right {
  display: flex;
  align-items: center;
}

.selection-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid;
  transition: all 0.2s ease;
}

.dark .selection-circle {
  border-color: rgba(255, 255, 255, 0.3);
}

.light .selection-circle {
  border-color: rgba(0, 0, 0, 0.3);
}

.dark .selection-circle.selected {
  border-color: #1DB954;
  background: #1DB954;
  box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.2);
}

.light .selection-circle.selected {
  border-color: #1DB954;
  background: #1DB954;
  box-shadow: 0 0 0 4px rgba(29, 185, 84, 0.2);
}

/* Rodapé do Modal */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid;
}

.dark .modal-footer {
  border-color: rgba(255, 255, 255, 0.1);
}

.light .modal-footer {
  border-color: rgba(0, 0, 0, 0.1);
}

.modal-btn {
  flex: 1;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.modal-btn.secondary {
  background: transparent;
}

.dark .modal-btn.secondary {
  color: #b3b3b3;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.light .modal-btn.secondary {
  color: #666666;
  border: 2px solid rgba(0, 0, 0, 0.2);
}

.dark .modal-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.light .modal-btn.secondary:hover {
  background: rgba(0, 0, 0, 0.03);
  color: #121212;
}

.modal-btn.primary {
  background: #1DB954;
  color: white;
  border: 2px solid #1DB954;
}

.modal-btn.primary:hover:not(:disabled) {
  background: #1ed760;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(29, 185, 84, 0.3);
}

.modal-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.modal-btn.loading {
  position: relative;
  color: transparent;
}

/* Loading dots animation */
.loading-dots:after {
  content: '...';
  animation: dots 1.5s steps(4, end) infinite;
  display: inline-block;
  width: 20px;
  text-align: left;
}

@keyframes dots {
  0%, 20% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
  80%, 100% { content: '...'; }
}

/* Tablet */
@media (max-width: 1023px) and (min-width: 768px) {
  .album-cover {
    width: 320px;
    height: 320px;
  }

  .song-title {
    font-size: 28px;
  }

  .modern-modal {
    width: 95%;
    max-width: 400px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .album-cover {
    width: 240px;
    height: 240px;
  }

  .song-title {
    font-size: 20px;
  }

  .modern-modal {
    width: 95%;
    max-height: 85vh;
    border-radius: 16px;
  }

  .modal-header {
    padding: 20px;
  }

  .modal-body {
    padding: 0 20px;
  }

  .create-playlist-input {
    flex-direction: column;
    gap: 12px;
  }

  .create-playlist-input input,
  .create-btn {
    width: 100%;
  }

  .modal-footer {
    padding: 20px;
    flex-direction: column;
  }

  .modal-footer .modal-btn {
    width: 100%;
  }
}
</style>