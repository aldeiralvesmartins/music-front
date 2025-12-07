<script setup lang="ts">
import type { Song } from '../api/music';

const props = defineProps<{
  song: Song;
}>();

const emit = defineEmits<{
  close: [];
  play: [song: Song];
}>();

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const handlePlay = () => {
  emit('play', props.song);
  emit('close');
};

const handleDownload = () => {
  window.open(props.song.url, '_blank');
};
</script>

<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <button @click="emit('close')" class="close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div class="modal-header">
        <div class="song-cover">
          <img v-if="song.cover_url" :src="song.cover_url" alt="Album artwork" />
          <svg v-else width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M10 16.5l6-4.5-6-4.5z"/>
          </svg>
        </div>
        <h2>{{ song.title }}</h2>
      </div>

      <div class="modal-content">
        <div class="info-group">
          <label>Duração</label>
          <span>{{ song.duration }}</span>
        </div>

        <div class="info-group" v-if="song.size_mb">
          <label>Tamanho do Arquivo</label>
          <span>{{ song.size_mb.toFixed(2) }} MB</span>
        </div>

        <div class="info-group">
          <label>Adicionado em</label>
          <span>{{ formatDate(song.created_at) }}</span>
        </div>

        <div class="info-group">
          <label>Última Atualização</label>
          <span>{{ formatDate(song.updated_at) }}</span>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="handlePlay" class="action-btn primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Reproduzir Agora
        </button>

        <button @click="handleDownload" class="action-btn secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Baixar
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s;
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

.dark .modal {
  background: #181818;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 1;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.dark .close-btn {
  background: rgba(255, 255, 255, 0.05);
  color: #999;
}

.dark .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-header {
  padding: 48px 32px 32px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
}

.dark .modal-header {
  border-bottom-color: #282828;
}

.song-cover {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin: 0 auto 24px;
  overflow: hidden;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.dark .modal-header h2 {
  color: #fff;
}

.modal-content {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.dark .info-group {
  border-bottom-color: #282828;
}

.info-group:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-group label {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.dark .info-group label {
  color: #999;
}

.info-group span {
  color: #1a1a1a;
  font-size: 14px;
  text-align: right;
}

.dark .info-group span {
  color: #fff;
}

.modal-actions {
  padding: 0 32px 32px;
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #1976d2;
  color: white;
}

.action-btn.primary:hover {
  background: #1565c0;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: #f0f0f0;
  color: #333;
}

.action-btn.secondary:hover {
  background: #e0e0e0;
}

.dark .action-btn.secondary {
  background: #282828;
  color: #fff;
}

.dark .action-btn.secondary:hover {
  background: #333;
}

@media (max-width: 768px) {
  .modal {
    margin: 20px;
  }

  .modal-header {
    padding: 40px 24px 24px;
  }

  .song-cover {
    width: 100px;
    height: 100px;
  }

  .modal-header h2 {
    font-size: 20px;
  }

  .modal-content {
    padding: 24px;
  }

  .modal-actions {
    padding: 0 24px 24px;
    flex-direction: column;
  }
}
</style>
