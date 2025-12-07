<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { usePlayer } from '../composables/usePlayer';
import { musicApi } from '../api/music';

const player = usePlayer();

const backgroundUrl = computed(() => player.currentSong.value?.cover_url || null);

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

onMounted(async () => {
  if (!player.currentSong.value) {
    try {
      const response = await musicApi.getAllSongsPaginated({
        page: 1,
        per_page: 30,
        ads_every: 3
      });

      if (response.data.length > 0) {
        player.setPlaylist(response.data, response.meta);
        player.playSong(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load songs:', error);
    }
  }
});
</script>

<template>
  <div class="home">
    <div
      v-if="backgroundUrl"
      class="background-artwork"
      :style="{ backgroundImage: `url(${backgroundUrl})` }"
    ></div>
    <div v-if="backgroundUrl" class="background-overlay"></div>

    <div v-if="!player.currentSong.value" class="no-song">
      <div class="no-song-content">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <h2>Nenhuma Música Tocando</h2>
        <p>Vá para Buscar para encontrar e reproduzir suas músicas favoritas</p>
      </div>
    </div>

    <div v-else class="now-playing">
      <div class="album-cover">
        <div
          v-if="backgroundUrl"
          class="cover-image"
          :style="{ backgroundImage: `url(${backgroundUrl})` }"
        ></div>
        <div v-else class="cover-gradient">
          <svg width="160" height="160" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M10 16.5l6-4.5-6-4.5z"/>
          </svg>
        </div>
        <div class="playing-animation" v-if="player.isPlaying.value">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
      </div>

      <div class="song-details">
        <div class="now-playing-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>TOCANDO AGORA</span>
        </div>

        <h1 class="song-title">{{ player.currentSong.value.title }}</h1>

        <div class="song-specs">
          <div class="spec-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div class="spec-content">
              <span class="spec-label">Duração</span>
              <span class="spec-value">{{ player.currentSong.value.duration }}</span>
            </div>
          </div>

          <div class="spec-item" v-if="player.currentSong.value.size_mb">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            <div class="spec-content">
              <span class="spec-label">Tamanho do Arquivo</span>
              <span class="spec-value">{{ player.currentSong.value.size_mb.toFixed(2) }} MB</span>
            </div>
          </div>

          <div class="spec-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div class="spec-content">
              <span class="spec-label">Adicionado em</span>
              <span class="spec-value">{{ formatDate(player.currentSong.value.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px 160px 32px;
  overflow: auto;
}

.background-artwork {
  position: fixed;
  top: -20%;
  left: -20%;
  right: -20%;
  bottom: -20%;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.7);
  transform: scale(1.2);
  z-index: 0;
  animation: fadeInBackground 0.8s ease-out;
}

@keyframes fadeInBackground {
  from {
    opacity: 0;
    transform: scale(1.3);
  }
  to {
    opacity: 1;
    transform: scale(1.2);
  }
}

.background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg,
    rgba(0, 0, 0, 0.3) 0%,
    rgba(0, 0, 0, 0.5) 50%,
    rgba(0, 0, 0, 0.7) 100%
  );
  z-index: 1;
}

.no-song {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.no-song-content {
  text-align: center;
  color: #999;
  position: relative;
  z-index: 2;
}

.no-song-content svg {
  margin-bottom: 24px;
  opacity: 0.5;
}

.no-song-content h2 {
  font-size: 28px;
  color: #666;
  margin-bottom: 12px;
}

.dark .no-song-content h2 {
  color: #999;
}

.no-song-content p {
  font-size: 16px;
}

.now-playing {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  z-index: 2;
  padding: 20px 0;
}

.album-cover {
  position: relative;
  width: 320px;
  height: 320px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.cover-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.cover-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  animation: fadeIn 0.5s ease-in;
}

.playing-animation {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 32px;
}

.bar {
  width: 4px;
  background: white;
  border-radius: 2px;
  animation: bounce 0.8s ease-in-out infinite;
}

.bar:nth-child(1) {
  animation-delay: 0s;
}

.bar:nth-child(2) {
  animation-delay: 0.2s;
}

.bar:nth-child(3) {
  animation-delay: 0.4s;
}

.bar:nth-child(4) {
  animation-delay: 0.6s;
}

@keyframes bounce {
  0%, 100% {
    height: 8px;
  }
  50% {
    height: 32px;
  }
}

.song-details {
  width: 100%;
  text-align: center;
}

.now-playing-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 20px;
  color: #059669;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 24px;
}

.dark .now-playing-label {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
}

.song-title {
  font-size: 48px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 48px;
  line-height: 1.2;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .song-title {
  color: #fff;
}

.home:not(:has(.background-artwork)) .song-title {
  color: #1a1a1a;
  text-shadow: none;
}

.dark .home:not(:has(.background-artwork)) .song-title {
  color: #fff;
}

.song-specs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.spec-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.spec-item:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.dark .spec-item {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

.dark .spec-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.home:not(:has(.background-artwork)) .spec-item {
  background: white;
  border-color: #e0e0e0;
  backdrop-filter: none;
}

.home:not(:has(.background-artwork)) .spec-item:hover {
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: none;
}

.dark .home:not(:has(.background-artwork)) .spec-item {
  background: #181818;
  border-color: #282828;
}

.dark .home:not(:has(.background-artwork)) .spec-item:hover {
  border-color: #34d399;
}

.spec-item svg {
  color: #fff;
  flex-shrink: 0;
  margin-top: 2px;
}

.dark .spec-item svg {
  color: #fff;
}

.home:not(:has(.background-artwork)) .spec-item svg {
  color: #10b981;
}

.dark .home:not(:has(.background-artwork)) .spec-item svg {
  color: #34d399;
}

.spec-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.spec-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.spec-value {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .spec-value {
  color: #fff;
}

.home:not(:has(.background-artwork)) .spec-label {
  color: #999;
}

.home:not(:has(.background-artwork)) .spec-value {
  color: #1a1a1a;
}

.dark .home:not(:has(.background-artwork)) .spec-value {
  color: #fff;
}

.playback-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.control-btn {
  width: 64px;
  height: 64px;
  border: none;
  background: #f0f0f0;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: #e0e0e0;
  transform: scale(1.05);
}

.dark .control-btn {
  background: #282828;
  color: #999;
}

.dark .control-btn:hover {
  background: #333;
  color: #fff;
}

.play-btn {
  width: 80px;
  height: 80px;
  background: #10b981;
  color: white;
}

.play-btn:hover {
  background: #059669;
}

.shuffle-btn.active {
  background: #10b981;
  color: white;
}

.dark .shuffle-btn.active {
  background: #34d399;
}

@media (max-width: 768px) {
  .home {
    padding: 24px 16px 200px 16px;
    align-items: flex-start;
    overflow-y: auto;
  }

  .no-song {
    padding: 0 12px;
  }

  .no-song-content svg {
    width: 64px;
    height: 64px;
  }

  .no-song-content h2 {
    font-size: 20px;
  }

  .no-song-content p {
    font-size: 14px;
  }

  .now-playing {
    gap: 20px;
    padding: 0;
  }

  .album-cover {
    width: 180px;
    height: 180px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .cover-gradient svg {
    width: 80px;
    height: 80px;
  }

  .playing-animation {
    bottom: 12px;
    right: 12px;
    height: 20px;
  }

  .bar {
    width: 3px;
  }

  @keyframes bounce {
    0%, 100% {
      height: 6px;
    }
    50% {
      height: 20px;
    }
  }

  .song-title {
    font-size: 22px;
    margin-bottom: 20px;
    padding: 0 8px;
  }

  .now-playing-label {
    font-size: 10px;
    padding: 6px 12px;
    margin-bottom: 12px;
  }

  .now-playing-label svg {
    width: 12px;
    height: 12px;
  }

  .song-specs {
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 24px;
  }

  .spec-item {
    padding: 12px;
    gap: 12px;
  }

  .spec-item svg {
    width: 16px;
    height: 16px;
  }

  .spec-label {
    font-size: 10px;
  }

  .spec-value {
    font-size: 13px;
  }

  .playback-controls {
    gap: 8px;
  }

  .control-btn {
    width: 44px;
    height: 44px;
  }

  .control-btn svg {
    width: 18px;
    height: 18px;
  }

  .play-btn {
    width: 56px;
    height: 56px;
  }

  .play-btn svg {
    width: 28px;
    height: 28px;
  }

  .shuffle-btn svg {
    width: 16px;
    height: 16px;
  }
}
</style>
