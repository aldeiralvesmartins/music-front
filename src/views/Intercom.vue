<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { usePlayer } from '../composables/usePlayer';

const player = usePlayer();

const isTransmitting = ref(false);
const isMuted = ref(false);
const volume = ref(1);
const mediaStream = ref<MediaStream | null>(null);
const audioContext = ref<AudioContext | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const animationId = ref<number | null>(null);
const previousPlayerVolume = ref(0);
const wasPlaying = ref(false);

const startIntercom = async () => {
  try {
    previousPlayerVolume.value = player.volume.value;
    wasPlaying.value = player.isPlaying.value;

    if (player.isPlaying.value) {
      player.pause();
    }
    player.setVolume(0);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    mediaStream.value = stream;

    audioContext.value = new AudioContext();
    const source = audioContext.value.createMediaStreamSource(stream);

    analyser.value = audioContext.value.createAnalyser();
    analyser.value.fftSize = 256;
    source.connect(analyser.value);

    const destination = audioContext.value.createMediaStreamDestination();
    const gainNode = audioContext.value.createGain();
    gainNode.gain.value = 1;

    source.connect(gainNode);
    gainNode.connect(destination);

    const audio = new Audio();
    audio.srcObject = destination.stream;
    audio.volume = 1;
    audio.play();

    isTransmitting.value = true;
    visualize();
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Não foi possível acessar o microfone. Verifique as permissões.');
  }
};

const stopIntercom = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop());
    mediaStream.value = null;
  }

  if (audioContext.value) {
    audioContext.value.close();
    audioContext.value = null;
  }

  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
    animationId.value = null;
  }

  isTransmitting.value = false;

  player.setVolume(previousPlayerVolume.value);
  if (wasPlaying.value) {
    player.play();
  }
};

const toggleTransmit = () => {
  if (isTransmitting.value) {
    stopIntercom();
  } else {
    startIntercom();
  }
};

const toggleMute = () => {
  if (mediaStream.value) {
    const audioTracks = mediaStream.value.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    isMuted.value = !isMuted.value;
  }
};

const handleVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  volume.value = parseFloat(target.value);
};

const visualize = () => {
  if (!analyser.value || !canvasRef.value) return;

  const canvas = canvasRef.value;
  const canvasCtx = canvas.getContext('2d');
  if (!canvasCtx) return;

  const bufferLength = analyser.value.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!isTransmitting.value) return;

    animationId.value = requestAnimationFrame(draw);

    analyser.value!.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = 'rgb(15, 15, 15)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;

      const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#34d399');

      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  };

  draw();
};

onUnmounted(() => {
  stopIntercom();
});
</script>

<template>
  <div class="intercom">
    <div class="intercom-container">
      <div class="header">
        <div class="icon-wrapper">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <h1>Interfone</h1>
        <p>Comunicação em tempo real</p>
      </div>

      <div class="visualizer-container">
        <canvas ref="canvasRef" width="800" height="200" class="visualizer"></canvas>
        <div v-if="!isTransmitting" class="visualizer-placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <p>Pressione o botão para transmitir</p>
        </div>
      </div>

      <div class="status" :class="{ active: isTransmitting }">
        <div class="status-indicator">
          <div class="pulse"></div>
        </div>
        <span v-if="isTransmitting">Transmitindo...</span>
        <span v-else>Aguardando transmissão</span>
      </div>

      <div class="controls">
        <button
          @click="toggleTransmit"
          class="transmit-btn"
          :class="{ active: isTransmitting }"
        >
          <svg v-if="!isTransmitting" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"/>
          </svg>
          <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>
      </div>

      <div class="action-buttons">
        <button
          @click="toggleMute"
          class="action-btn"
          :disabled="!isTransmitting"
          :class="{ muted: isMuted }"
        >
          <svg v-if="!isMuted" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span>{{ isMuted ? 'Desmutar' : 'Mutar' }}</span>
        </button>

        <div class="volume-control">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            :value="volume"
            @input="handleVolumeChange"
            class="volume-slider"
          />
        </div>
      </div>

      <div class="info-cards">
        <div class="info-card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div class="info-content">
            <span class="info-title">Como usar</span>
            <span class="info-text">Pressione o botão verde para iniciar a transmissão ao vivo</span>
          </div>
        </div>

        <div class="info-card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div class="info-content">
            <span class="info-title">Tempo Real</span>
            <span class="info-text">Áudio transmitido instantaneamente sem latência</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intercom {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.intercom-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.header {
  text-align: center;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
}

.header h1 {
  font-size: 36px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.dark .header h1 {
  color: #fff;
}

.header p {
  font-size: 16px;
  color: #666;
}

.dark .header p {
  color: #999;
}

.visualizer-container {
  position: relative;
  width: 100%;
  height: 200px;
  background: #0f0f0f;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.visualizer {
  width: 100%;
  height: 100%;
}

.visualizer-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
  background: #0f0f0f;
}

.visualizer-placeholder p {
  font-size: 14px;
}

.status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-weight: 600;
  color: #666;
  transition: all 0.3s;
}

.dark .status {
  background: #181818;
  border-color: #282828;
  color: #999;
}

.status.active {
  background: #d1fae5;
  border-color: #10b981;
  color: #059669;
}

.dark .status.active {
  background: #064e3b;
  border-color: #10b981;
  color: #34d399;
}

.status-indicator {
  position: relative;
  width: 12px;
  height: 12px;
  background: #e0e0e0;
  border-radius: 50%;
}

.status.active .status-indicator {
  background: #10b981;
}

.status.active .pulse {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid #10b981;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

.controls {
  display: flex;
  justify-content: center;
}

.transmit-btn {
  width: 120px;
  height: 120px;
  border: none;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
}

.transmit-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.5);
}

.transmit-btn:active {
  transform: scale(0.98);
}

.transmit-btn.active {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6);
  }
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  color: #666;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:not(:disabled):hover {
  border-color: #10b981;
  color: #059669;
}

.dark .action-btn {
  background: #181818;
  border-color: #282828;
  color: #999;
}

.dark .action-btn:not(:disabled):hover {
  border-color: #10b981;
  color: #34d399;
}

.action-btn.muted {
  border-color: #ef4444;
  color: #dc2626;
}

.dark .action-btn.muted {
  border-color: #ef4444;
  color: #f87171;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  color: #666;
}

.dark .volume-control {
  background: #181818;
  border-color: #282828;
  color: #999;
}

.volume-slider {
  width: 120px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.dark .volume-slider {
  background: #282828;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #10b981;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #10b981;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.2s;
}

.info-card:hover {
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dark .info-card {
  background: #181818;
  border-color: #282828;
}

.dark .info-card:hover {
  border-color: #10b981;
}

.info-card svg {
  color: #10b981;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
}

.dark .info-title {
  color: #fff;
}

.info-text {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.dark .info-text {
  color: #999;
}

@media (max-width: 768px) {
  .intercom {
    padding: 16px;
    align-items: flex-start;
    padding-top: 24px;
  }

  .intercom-container {
    gap: 24px;
  }

  .icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    margin-bottom: 16px;
  }

  .icon-wrapper svg {
    width: 32px;
    height: 32px;
  }

  .header h1 {
    font-size: 28px;
  }

  .header p {
    font-size: 14px;
  }

  .visualizer-container {
    height: 150px;
  }

  .visualizer-placeholder svg {
    width: 48px;
    height: 48px;
  }

  .visualizer-placeholder p {
    font-size: 12px;
  }

  .transmit-btn {
    width: 100px;
    height: 100px;
  }

  .transmit-btn svg {
    width: 40px;
    height: 40px;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .action-btn,
  .volume-control {
    width: 100%;
    justify-content: center;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }
}
</style>
