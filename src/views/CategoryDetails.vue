<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { musicApi, type Song, type PaginationMeta } from '../api/music';
import { usePlayer } from '../composables/usePlayer';
import { useCategoriesStore } from '../stores/categories';

const route = useRoute();
const router = useRouter();
const player = usePlayer();
const categoriesStore = useCategoriesStore();

const songs = ref<Song[]>([]);
const loading = ref(true);
const error = ref('');
const meta = ref<PaginationMeta | null>(null);
const totalSongs = ref(0);

const categoryId = computed(() => route.params.id as string);

const currentPage = computed(() => {
  const page = parseInt(route.query.page as string) || 1;
  return page > 0 ? page : 1;
});

const perPage = computed(() => {
  const limit = parseInt(route.query.per_page as string) || 20;
  return limit > 0 && limit <= 100 ? limit : 20;
});

const category = computed(() =>
  categoriesStore.categories.find(c => c.id.toString() === categoryId.value)
);

const totalPages = computed(() => {
  if (!meta.value?.count) return 1;
  return Math.ceil(meta.value.count / perPage.value);
});

const hasNextPage = computed(() => currentPage.value < totalPages.value);
const hasPrevPage = computed(() => currentPage.value > 1);

const paginationRange = computed(() => {
  const range: (number | string)[] = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      range.push(i);
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 5; i++) range.push(i);
      range.push('...');
      range.push(total);
    } else if (current >= total - 2) {
      range.push(1);
      range.push('...');
      for (let i = total - 4; i <= total; i++) range.push(i);
    } else {
      range.push(1);
      range.push('...');
      for (let i = current - 1; i <= current + 1; i++) range.push(i);
      range.push('...');
      range.push(total);
    }
  }

  return range;
});

const loadSongs = async () => {
  try {
    loading.value = true;
    error.value = '';

    const response = await musicApi.getSongsByCategoryPaginated(
      categoryId.value,
      {
        page: currentPage.value,
        per_page: perPage.value,
        ads_every: 5
      }
    );

    songs.value = response.data;
    meta.value = response.meta;
    totalSongs.value = response.meta.count || 0;

  } catch (err: any) {
    error.value = err.message || 'Falha ao carregar músicas';
    console.error('Failed to load songs:', err);
  } finally {
    loading.value = false;
  }
};

const goToPage = (page: number | string) => {
  if (typeof page === 'string') return;

  if (page < 1 || page > totalPages.value) return;

  router.push({
    path: route.path,
    query: {
      ...route.query,
      page: page.toString(),
    }
  });
};

const nextPage = () => {
  if (hasNextPage.value) {
    goToPage(currentPage.value + 1);
  }
};

const prevPage = () => {
  if (hasPrevPage.value) {
    goToPage(currentPage.value - 1);
  }
};

const changePerPage = (newPerPage: number) => {
  router.push({
    path: route.path,
    query: {
      page: '1',
      per_page: newPerPage.toString(),
    }
  });
};

const handlePlaySong = (song: Song) => {
  player.setPlaylist(songs.value);
  player.playSong(song);
};

const handlePlayAll = () => {
  if (songs.value.length > 0) {
    player.setPlaylist(songs.value);
    player.playSong(songs.value[0]);
  }
};

const goBack = () => {
  router.push('/search');
};

watch([categoryId, currentPage, perPage], () => {
  loadSongs();
});

onMounted(async () => {
  if (categoriesStore.categories.length === 0) {
    await categoriesStore.fetchCategories();
  }
  loadSongs();
});
</script>

<template>
  <div class="category-details">
    <div v-if="loading && songs.length === 0" class="loading">
      <div class="spinner"></div>
      <p>Carregando músicas...</p>
    </div>

    <div v-else-if="error && songs.length === 0" class="error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button @click="loadSongs()" class="retry-btn">Tentar Novamente</button>
    </div>

    <div v-else>
      <div class="category-header">
        <button @click="goBack" class="back-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div class="category-info">
          <div class="category-icon-large">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <div class="info-content">
            <span class="category-label">CATEGORIA</span>
            <h1>{{ category?.name || 'Carregando...' }}</h1>
            <p class="songs-count">
              {{ songs.length }} {{ songs.length === 1 ? 'música' : 'músicas' }}
            </p>
          </div>
        </div>

        <button
          v-if="songs.length > 0"
          @click="handlePlayAll"
          class="play-all-btn"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Tocar Tudo
        </button>
      </div>

      <div v-if="songs.length === 0" class="empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <p>Nenhuma música encontrada nesta categoria</p>
      </div>

      <div v-else>
        <div class="controls-bar">
          <div class="items-info">
            <span>{{ totalSongs }} {{ totalSongs === 1 ? 'música' : 'músicas' }} no total</span>
          </div>
          <div class="per-page-selector">
            <label>Itens por página:</label>
            <select :value="perPage" @change="changePerPage(parseInt(($event.target as HTMLSelectElement).value))">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="30">30</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <div class="songs-grid">
          <div
            v-for="song in songs"
            :key="song.id"
            class="song-card"
            :class="{ playing: player.currentSong.value?.id === song.id }"
            @click="handlePlaySong(song)"
          >
            <div class="song-cover">
              <img v-if="song.cover_url" :src="song.cover_url" :alt="song.title" />
              <div v-else class="cover-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <div class="play-overlay">
                <div class="play-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              <span v-if="song.anuncio" class="ad-badge-card">Anúncio</span>
            </div>
            <div class="song-info">
              <h3 class="song-title-card">{{ song.title }}</h3>
              <p class="song-duration-card">{{ song.duration || '-' }}</p>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination-container">
          <button
            @click="prevPage"
            class="pagination-btn"
            :disabled="!hasPrevPage"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Anterior
          </button>

          <div class="pagination-numbers">
            <button
              v-for="(page, index) in paginationRange"
              :key="index"
              @click="goToPage(page)"
              class="pagination-number"
              :class="{ active: page === currentPage, dots: page === '...' }"
              :disabled="page === '...'"
            >
              {{ page }}
            </button>
          </div>

          <button
            @click="nextPage"
            class="pagination-btn"
            :disabled="!hasNextPage"
          >
            Próxima
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-details {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 120px;
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

.retry-btn {
  margin-top: 16px;
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #059669;
}

.category-header {
  display: flex;
  align-items: flex-start;
  gap: 32px;
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e0e0e0;
}

.dark .category-header {
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

.category-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 24px;
}

.category-icon-large {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.dark .category-icon-large {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
}

.info-content {
  flex: 1;
}

.category-label {
  font-size: 12px;
  font-weight: 700;
  color: #666;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.dark .category-label {
  color: #999;
}

.category-info h1 {
  font-size: 48px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 12px 0;
  line-height: 1.2;
}

.dark .category-info h1 {
  color: #fff;
}

.songs-count {
  font-size: 14px;
  color: #999;
}

.play-all-btn {
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
  flex-shrink: 0;
}

.play-all-btn:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 32px;
  color: #666;
}

.dark .empty {
  color: #999;
}

.empty svg {
  margin-bottom: 24px;
  opacity: 0.5;
}

.songs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.song-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.song-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #10b981;
}

.dark .song-card {
  background: #181818;
  border-color: #282828;
}

.dark .song-card:hover {
  border-color: #34d399;
}

.song-card.playing {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.dark .song-card.playing {
  border-color: #34d399;
  box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.2);
}

.song-cover {
  position: relative;
  width: 100%;
  padding-top: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.song-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.song-card:hover .play-overlay {
  opacity: 1;
}

.song-card.playing .play-overlay {
  opacity: 1;
  background: rgba(16, 185, 129, 0.8);
}

.dark .song-card.playing .play-overlay {
  background: rgba(52, 211, 153, 0.8);
}

.play-icon {
  width: 56px;
  height: 56px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  transition: transform 0.2s;
}

.song-card:hover .play-icon {
  transform: scale(1.1);
}

.song-card.playing .play-icon {
  background: white;
  color: #10b981;
}

.ad-badge-card {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: #fbbf24;
  color: #78350f;
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.song-info {
  padding: 16px;
}

.song-title-card {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .song-title-card {
  color: #fff;
}

.song-duration-card {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.dark .song-duration-card {
  color: #999;
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.dark .controls-bar {
  border-bottom-color: #282828;
}

.items-info {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.dark .items-info {
  color: #999;
}

.per-page-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.per-page-selector label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.dark .per-page-selector label {
  color: #999;
}

.per-page-selector select {
  padding: 8px 32px 8px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%23666' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.per-page-selector select:hover {
  border-color: #10b981;
}

.per-page-selector select:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.dark .per-page-selector select {
  background: #181818;
  border-color: #282828;
  color: #fff;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%23999' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
}

.dark .per-page-selector select:hover {
  border-color: #34d399;
}

.dark .per-page-selector select:focus {
  border-color: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 32px 0;
  flex-wrap: wrap;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  color: #333;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #10b981;
  color: #10b981;
  background: #f0fdf4;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dark .pagination-btn {
  background: #181818;
  border-color: #282828;
  color: #fff;
}

.dark .pagination-btn:hover:not(:disabled) {
  border-color: #34d399;
  color: #34d399;
  background: #1a2e23;
}

.pagination-numbers {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagination-number {
  min-width: 40px;
  height: 40px;
  padding: 0 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  color: #333;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-number:hover:not(:disabled):not(.active) {
  border-color: #10b981;
  color: #10b981;
  background: #f0fdf4;
}

.pagination-number.active {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.pagination-number.dots {
  border: none;
  background: transparent;
  cursor: default;
}

.pagination-number:disabled {
  cursor: default;
}

.dark .pagination-number {
  background: #181818;
  border-color: #282828;
  color: #fff;
}

.dark .pagination-number:hover:not(:disabled):not(.active) {
  border-color: #34d399;
  color: #34d399;
  background: #1a2e23;
}

.dark .pagination-number.active {
  background: #34d399;
  border-color: #34d399;
  color: #000;
}

.dark .pagination-number.dots {
  background: transparent;
  border: none;
}

@media (max-width: 1024px) {
  .songs-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .category-details {
    padding: 16px;
    padding-bottom: 100px;
  }

  .category-header {
    flex-direction: column;
    gap: 20px;
  }

  .category-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .category-icon-large {
    width: 80px;
    height: 80px;
  }

  .category-icon-large svg {
    width: 48px;
    height: 48px;
  }

  .category-info h1 {
    font-size: 32px;
  }

  .controls-bar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .per-page-selector {
    width: 100%;
    justify-content: space-between;
  }

  .per-page-selector select {
    flex: 1;
    max-width: 120px;
  }

  .songs-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
  }

  .song-title-card {
    font-size: 14px;
  }

  .song-duration-card {
    font-size: 12px;
  }

  .pagination-container {
    gap: 8px;
    padding: 24px 0;
  }

  .pagination-btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .pagination-btn svg {
    width: 16px;
    height: 16px;
  }

  .pagination-numbers {
    gap: 4px;
  }

  .pagination-number {
    min-width: 36px;
    height: 36px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .pagination-btn span {
    display: none;
  }

  .pagination-btn {
    padding: 8px;
  }

  .pagination-number {
    min-width: 32px;
    height: 32px;
    font-size: 12px;
  }
}
</style>
