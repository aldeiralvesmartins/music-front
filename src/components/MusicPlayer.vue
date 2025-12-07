<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { usePlayer } from '../composables/usePlayer';

const player = usePlayer();
const showVolume = ref(false);
const volumeControlRef = ref<HTMLElement | null>(null);

const handleSeek = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const percent = ((event.clientX - rect.left) / rect.width) * 100;
  player.seek(percent);
};

const handleVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  player.setVolume(parseFloat(target.value));
};

const handleVolumeMouseUp = () => {
  setTimeout(() => {
    showVolume.value = false;
  }, 200);
};

const handleClickOutside = (event: MouseEvent) => {
  if (volumeControlRef.value && !volumeControlRef.value.contains(event.target as Node)) {
    showVolume.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div v-if="player.currentSong.value" class="player">
    <div class="player-content">
      <div class="song-info">
        <div class="song-cover">
          <img v-if="player.currentSong.value.cover_url" :src="player.currentSong.value.cover_url" alt="Album artwork" />
          <svg v-else width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M10 16.5l6-4.5-6-4.5z"/>
          </svg>
        </div>
        <div class="song-details">
          <h4 class="song-title">{{ player.currentSong.value.title }}</h4>
          <p class="song-duration">{{ player.currentSong.value.duration }}</p>
        </div>
      </div>

      <div class="player-controls">
        <div class="all-controls">
          <button
            @click="player.toggleShuffle"
            class="control-btn shuffle-btn"
            :class="{ active: player.isShuffle.value }"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 3 21 3 21 8"/>
              <line x1="4" y1="20" x2="21" y2="3"/>
              <polyline points="21 16 21 21 16 21"/>
              <line x1="15" y1="15" x2="21" y2="21"/>
              <line x1="4" y1="4" x2="9" y2="9"/>
            </svg>
          </button>

          <button @click="player.previous" class="control-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button @click="player.togglePlay" class="control-btn play-btn">
            <svg v-if="player.isPlaying.value" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
            <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          <button @click="player.next" class="control-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z"/>
            </svg>
          </button>

          <div class="volume-control" ref="volumeControlRef">
            <button
              @click="showVolume = !showVolume"
              class="control-btn volume-btn"
            >
              <svg v-if="player.volume.value === 0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
              <svg v-else-if="player.volume.value < 0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </button>

            <div v-show="showVolume" class="volume-slider">
              <div class="volume-percentage">{{ Math.round(player.volume.value * 100) }}</div>
              <div class="volume-track">
                <div class="volume-fill" :style="{ height: (player.volume.value * 100) + '%' }"></div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="player.volume.value"
                  @input="handleVolumeChange"
                  @mouseup="handleVolumeMouseUp"
                  @touchend="handleVolumeMouseUp"
                  class="slider"
                  orient="vertical"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="progress-section">
          <span class="time">{{ player.formattedCurrentTime.value }}</span>
          <div class="progress-bar" @click="handleSeek">
            <div class="progress-bg"></div>
            <div class="progress-fill" :style="{ width: player.progress.value + '%' }"></div>
            <div class="progress-thumb" :style="{ left: player.progress.value + '%' }"></div>
          </div>
          <span class="time">{{ player.formattedDuration.value }}</span>
        </div>
      </div>

      <div class="player-right"></div>
    </div>
  </div>
</template>

<style scoped>
.player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 16px 24px;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.dark .player {
  background: #181818;
  border-top-color: #282828;
}

.player-content {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 24px;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.song-cover {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  overflow: hidden;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-details {
  min-width: 0;
  flex: 1;
}

.song-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .song-title {
  color: #fff;
}

.song-duration {
  font-size: 12px;
  color: #666;
}

.dark .song-duration {
  color: #999;
}

.player-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.all-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.dark .control-btn {
  color: #999;
}

.dark .control-btn:hover {
  background: #282828;
  color: #fff;
}

.play-btn {
  width: 48px;
  height: 48px;
  background: #10b981;
  color: white;
}

.play-btn:hover {
  background: #059669;
  transform: scale(1.05);
}

.shuffle-btn.active {
  color: #10b981;
}

.dark .shuffle-btn.active {
  color: #34d399;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: center;
}

.dark .time {
  color: #999;
}

.progress-bar {
  flex: 1;
  height: 24px;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
}

.progress-bg {
  position: absolute;
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.dark .progress-bg {
  background: #282828;
}

.progress-fill {
  position: absolute;
  height: 4px;
  background: #10b981;
  border-radius: 2px;
  transition: width 0.1s;
}

.dark .progress-fill {
  background: #34d399;
}

.progress-thumb {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #10b981;
  border-radius: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.dark .progress-thumb {
  background: #34d399;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
}

.player-right {
  display: flex;
  justify-content: flex-end;
}

.volume-control {
  position: relative;
  display: flex;
  align-items: center;
}

.volume-btn {
  width: 40px;
  height: 40px;
}

.volume-slider {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.dark .volume-slider {
  background: rgba(32, 32, 32, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.volume-percentage {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.dark .volume-percentage {
  color: #fff;
}

.volume-track {
  position: relative;
  width: 4px;
  height: 120px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.dark .volume-track {
  background: rgba(255, 255, 255, 0.1);
}

.volume-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
  border-radius: 2px;
  transition: height 0.15s ease-out;
  pointer-events: none;
}

.dark .volume-fill {
  background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
}

.slider {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 32px;
  background: transparent;
  outline: none;
  appearance: none;
  cursor: pointer;
  /* Use standardized vertical range styling */
  writing-mode: vertical-lr;
  direction: rtl;
  -webkit-appearance: none;
}

.slider::-webkit-slider-runnable-track {
  width: 4px;
  background: transparent;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #fff;
  border: 2px solid #10b981;
  border-radius: 50%;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  margin-left: -6px;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.1);
}

.dark .slider::-webkit-slider-thumb {
  background: #282828;
  border-color: #34d399;
  box-shadow: 0 2px 8px rgba(52, 211, 153, 0.3), 0 1px 2px rgba(0, 0, 0, 0.4);
}

.dark .slider::-webkit-slider-thumb:hover {
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.4), 0 2px 4px rgba(0, 0, 0, 0.4);
}

.slider::-moz-range-track {
  width: 4px;
  background: transparent;
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #fff;
  border: 2px solid #10b981;
  border-radius: 50%;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb:active {
  cursor: grabbing;
  transform: scale(1.1);
}

.dark .slider::-moz-range-thumb {
  background: #282828;
  border-color: #34d399;
  box-shadow: 0 2px 8px rgba(52, 211, 153, 0.3), 0 1px 2px rgba(0, 0, 0, 0.4);
}

.dark .slider::-moz-range-thumb:hover {
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.4), 0 2px 4px rgba(0, 0, 0, 0.4);
}

@media (max-width: 768px) {
  .player {
    padding: 12px 16px;
    bottom: 65px;
  }

  .player-content {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .song-info {
    grid-column: 1;
  }

  .player-controls {
    grid-column: 1;
    gap: 8px;
  }

  .player-right {
    display: none;
  }

  .song-cover {
    width: 48px;
    height: 48px;
  }

  .all-controls {
    gap: 4px;
  }

  .control-btn {
    width: 36px;
    height: 36px;
  }

  .play-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
