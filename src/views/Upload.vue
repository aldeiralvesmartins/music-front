<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { musicApi } from '../api/music';
import { companiesApi, type Company } from '../api/companies';
import { categoriesApi, type Category } from '../api/categories';
import { parseBlob } from 'music-metadata';

interface FileToUpload {
  id: string;
  file: File;
  title: string;
  progress: number;
  uploading: boolean;
  uploaded: boolean;
  error: string;
  artworkPreview: string | null;
}

const router = useRouter();
const categoryId = ref<number | null>(null);
const isAd = ref(false);
const companies = ref<Company[]>([]);
const loadingCompanies = ref(false);
const selectedCompanyId = ref<string>('');
const showCompanyModal = ref(false);
const modalError = ref('');
const newCompany = ref({ name: '', industry: '', description: '' });
const newUser = ref({ name: '', email: '', password: '' });
const categories = ref<Category[]>([]);
const loadingCategories = ref(true);
const selectedFiles = ref<FileToUpload[]>([]);
const uploading = ref(false);
const message = ref('');
const error = ref('');
const dragOver = ref(false);

const isRecording = ref(false);
const recordingTime = ref(0);
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingInterval: number | null = null;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const audioContext = ref<AudioContext | null>(null);
const animationId = ref<number | null>(null);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB em bytes

const uploadingCount = computed(() => selectedFiles.value.filter(f => f.uploading).length);

const extractArtworkFromFile = async (file: File) => {
  try {
    const metadata = await parseBlob(file);
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const imageBlob = new Blob([picture.data.buffer as ArrayBuffer], { type: picture.format });
      const imageUrl = URL.createObjectURL(imageBlob);
      return imageUrl;
    }
  } catch (err) {
    console.error('Error extracting artwork:', err);
  }
  return null;
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    await addFiles(Array.from(target.files));
    target.value = '';
  }
};

const addFiles = async (files: File[]) => {
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      error.value = `${file.name} é muito grande. Tamanho máximo é 100MB. Tamanho do arquivo: ${formatFileSize(file.size)}.`;
      continue;
    }

    const artwork = await extractArtworkFromFile(file);

    selectedFiles.value.push({
      id: `${Date.now()}-${Math.random()}`,
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      progress: 0,
      uploading: false,
      uploaded: false,
      error: '',
      artworkPreview: artwork
    });
  }
  error.value = '';
};

const handleDrop = async (event: DragEvent) => {
  dragOver.value = false;
  const files = event.dataTransfer?.files;
  if (files) {
    await addFiles(Array.from(files));
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = () => {
  dragOver.value = false;
};

const removeFile = (fileId: string) => {
  const fileIndex = selectedFiles.value.findIndex(f => f.id === fileId);
  if (fileIndex !== -1) {
    const file = selectedFiles.value[fileIndex];
    if (file.artworkPreview) {
      URL.revokeObjectURL(file.artworkPreview);
    }
    selectedFiles.value.splice(fileIndex, 1);
  }
};

const clearAllFiles = () => {
  selectedFiles.value.forEach(file => {
    if (file.artworkPreview) {
      URL.revokeObjectURL(file.artworkPreview);
    }
  });
  selectedFiles.value = [];
};

const visualize = () => {
  if (!analyser.value || !canvasRef.value) return;

  const canvas = canvasRef.value;
  const canvasCtx = canvas.getContext('2d');
  if (!canvasCtx) return;

  const bufferLength = analyser.value.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!isRecording.value) return;

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

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    recordingTime.value = 0;

    audioContext.value = new AudioContext();
    const source = audioContext.value.createMediaStreamSource(stream);
    analyser.value = audioContext.value.createAnalyser();
    analyser.value.fftSize = 256;
    source.connect(analyser.value);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'recorded-audio.webm', { type: 'audio/webm' });

      selectedFiles.value.push({
        id: `${Date.now()}-${Math.random()}`,
        file: audioFile,
        title: 'Áudio Gravado ' + new Date().toLocaleTimeString('pt-BR'),
        progress: 0,
        uploading: false,
        uploaded: false,
        error: '',
        artworkPreview: null
      });

      stream.getTracks().forEach(track => track.stop());

      if (audioContext.value) {
        audioContext.value.close();
        audioContext.value = null;
      }

      if (animationId.value) {
        cancelAnimationFrame(animationId.value);
        animationId.value = null;
      }
    };

    mediaRecorder.start();
    isRecording.value = true;
    visualize();

    recordingInterval = window.setInterval(() => {
      recordingTime.value++;
    }, 1000);
  } catch (err) {
    error.value = 'Falha ao acessar o microfone. Por favor, permita o acesso ao microfone.';
    console.error(err);
  }
};

const stopRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop();
    isRecording.value = false;
    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }
  }
};

const cancelRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop();
    isRecording.value = false;
    recordingTime.value = 0;
    audioChunks = [];
    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }
  }
};

const formatRecordingTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const loadCategories = async () => {
  try {
    loadingCategories.value = true;
    const data = await categoriesApi.getAll();
    categories.value = data.filter(cat => cat.is_active !== false);
    if (categories.value.length > 0 && !categoryId.value) {
      categoryId.value = categories.value[0].id;
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  } finally {
    loadingCategories.value = false;
  }
};

const loadCompanies = async () => {
  try {
    loadingCompanies.value = true;
    companies.value = await companiesApi.getAll();
  } catch (err) {
    console.error('Failed to load companies:', err);
  } finally {
    loadingCompanies.value = false;
  }
};

const isValidEmail = (email: string) => /\S+@\S+\.[\w-]+/.test(email);

const createCompanyWithUser = async () => {
  try {
    error.value = '';
    modalError.value = '';
    const payload = {
      company: {
        name: newCompany.value.name.trim(),
        industry: newCompany.value.industry || undefined,
        description: newCompany.value.description || undefined,
        is_active: true,
      },
      user: {
        name: newUser.value.name.trim(),
        email: newUser.value.email.trim(),
        password: newUser.value.password,
      }
    };
    if (!payload.company.name || !payload.user.name || !payload.user.email || !payload.user.password) {
      modalError.value = 'Preencha os campos obrigatórios (empresa: nome; usuário: nome, email, senha)';
      return;
    }
    if (!isValidEmail(payload.user.email)) {
      modalError.value = 'Informe um email válido (ex: nome@dominio.com)';
      return;
    }
    if (payload.user.password.length < 6) {
      modalError.value = 'A senha deve ter pelo menos 6 caracteres';
      return;
    }
    const { company } = await companiesApi.createWithUser(payload);
    companies.value.unshift(company);
    selectedCompanyId.value = company.id;
    showCompanyModal.value = false;
    newCompany.value = { name: '', industry: '', description: '' };
    newUser.value = { name: '', email: '', password: '' };
  } catch (err: any) {
    modalError.value = err.response?.data?.message || 'Falha ao criar empresa e usuário';
    console.error(err);
  }
};

const handleUpload = async () => {
  if (selectedFiles.value.length === 0) {
    error.value = 'Por favor, selecione pelo menos um arquivo';
    return;
  }

  if (!categoryId.value) {
    error.value = 'Por favor, selecione uma categoria';
    return;
  }

  if (isAd.value && !selectedCompanyId.value) {
    error.value = 'Para anúncio, selecione a Empresa (Company)';
    return;
  }

  try {
    uploading.value = true;
    error.value = '';
    message.value = '';

    let successCount = 0;
    let failureCount = 0;

    for (const fileData of selectedFiles.value) {
      if (fileData.uploaded) continue;

      fileData.uploading = true;
      fileData.error = '';

      try {
        await musicApi.uploadSong(
          fileData.title,
          categoryId.value,
          fileData.file,
          (p: number) => {
            fileData.progress = p;
          },
          { anuncio: isAd.value, company_id: selectedCompanyId.value || undefined }
        );

        fileData.uploaded = true;
        fileData.uploading = false;
        fileData.progress = 100;
        successCount++;
      } catch (err: any) {
        fileData.uploading = false;
        fileData.error = err.response?.data?.message || err.response?.data?.error || 'Falha no envio';
        failureCount++;
        console.error(`Failed to upload ${fileData.title}:`, err);
      }
    }

    if (successCount > 0) {
      message.value = `${successCount} arquivo(s) enviado(s) com sucesso`;
    }

    if (failureCount > 0) {
      error.value = `Falha no envio de ${failureCount} arquivo(s)`;
    }

    if (failureCount === 0) {
      setTimeout(() => {
        router.push('/search');
      }, 2000);
    }
  } catch (err: any) {
    error.value = 'Falha no processo de envio';
    console.error(err);
  } finally {
    uploading.value = false;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

onMounted(() => {
  loadCategories();
  loadCompanies();
});

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }
  if (audioContext.value) {
    audioContext.value.close();
  }
});
</script>

<template>
  <div class="upload">
    <div class="upload-container">
      <div class="upload-header">
        <h1>Enviar Música</h1>
        <p>Compartilhe sua música com o mundo</p>
      </div>

      <form @submit.prevent="handleUpload" class="upload-form">
        <div class="form-group">
          <label for="category">Categoria</label>
          <select
            id="category"
            v-model="categoryId"
            class="input"
            :disabled="uploading || isRecording || loadingCategories"
          >
            <option v-if="loadingCategories" :value="null">Carregando categorias...</option>
            <option v-else-if="categories.length === 0" :value="null">Nenhuma categoria disponível</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="isAd">
            <input id="isAd" type="checkbox" v-model="isAd" :disabled="uploading || isRecording" />
            É anúncio?
          </label>
        </div>

        <div class="form-group" v-if="isAd">
          <label for="companySelect">Selecione a Empresa (Company)</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <select
              id="companySelect"
              v-model="selectedCompanyId"
              class="input"
              :disabled="uploading || isRecording || loadingCompanies"
            >
              <option value="" disabled>
                {{ loadingCompanies ? 'Carregando empresas...' : 'Selecione uma empresa' }}
              </option>
              <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <button type="button" class="clear-all-btn" @click="showCompanyModal = true">
              Nova empresa + usuário
            </button>
          </div>
          <small class="hint">Obrigatório para anúncios.</small>
        </div>

        <div v-if="isRecording" class="recording-panel">
          <div class="recording-indicator">
            <div class="pulse"></div>
            <span>Gravando...</span>
          </div>
          <div class="recording-time">{{ formatRecordingTime(recordingTime) }}</div>
          <div class="recording-actions">
            <button @click="stopRecording" type="button" class="record-btn stop">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              Parar
            </button>
        
            <button @click="cancelRecording" type="button" class="record-btn cancel">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cancelar
            </button>
          </div>
        </div>

        <div v-else class="upload-options">
          <div
            class="file-upload"
            :class="{ 'drag-over': dragOver }"
            @drop.prevent="handleDrop"
            @dragover.prevent="handleDragOver"
            @dragleave="handleDragLeave"
          >
            <input
              id="file"
              type="file"
              accept="audio/*"
              multiple
              @change="handleFileSelect"
              class="file-input"
              :disabled="uploading"
            />

            <div class="file-upload-content">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p class="file-upload-text">
                <label for="file" class="file-label">Clique para enviar</label>
                ou arraste e solte
              </p>
              <p class="file-upload-hint">MP3, WAV, FLAC, ou qualquer formato de áudio (Máx. 100MB por arquivo)</p>
              <p class="file-upload-hint">Você pode selecionar vários arquivos de uma vez</p>
            </div>
          </div>

          <div class="divider">
            <span>OU</span>
          </div>

          <button
            v-if="!isRecording"
            @click="startRecording"
            type="button"
            class="record-audio-btn"
            :disabled="uploading"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            Gravar Áudio
          </button>
        </div>

        <div v-if="selectedFiles.length > 0" class="files-list">
          <div class="files-list-header">
            <h3>Arquivos Selecionados ({{ selectedFiles.length }})</h3>
            <button
              v-if="!uploading"
              @click="clearAllFiles"
              type="button"
              class="clear-all-btn"
            >
              Limpar Tudo
            </button>
          </div>

          <div class="files-items">
            <div
              v-for="fileData in selectedFiles"
              :key="fileData.id"
              class="file-item"
              :class="{
                uploading: fileData.uploading,
                uploaded: fileData.uploaded,
                error: fileData.error
              }"
            >
              <div class="file-item-artwork">
                <img v-if="fileData.artworkPreview" :src="fileData.artworkPreview" alt="Artwork" />
                <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>

              <div class="file-item-content">
                <input
                  v-model="fileData.title"
                  type="text"
                  class="file-item-title"
                  :disabled="uploading || fileData.uploaded"
                  placeholder="Título da música..."
                />
                <div class="file-item-meta">
                  <span class="file-item-name">{{ fileData.file.name }}</span>
                  <span class="file-item-size">{{ formatFileSize(fileData.file.size) }}</span>
                </div>

                <div v-if="fileData.uploading || fileData.uploaded" class="file-item-progress">
                  <div class="progress-bar-mini">
                    <div class="progress-fill-mini" :style="{ width: fileData.progress + '%' }"></div>
                  </div>
                  <span class="progress-text-mini">{{ fileData.progress }}%</span>
                </div>

                <div v-if="fileData.error" class="file-item-error">
                  {{ fileData.error }}
                </div>
              </div>

              <div class="file-item-status">
                <svg v-if="fileData.uploaded" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="status-icon success">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <svg v-else-if="fileData.uploading" width="24" height="24" viewBox="0 0 24 24" class="status-icon spinner">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="fileData.error" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="status-icon error">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <button
                  v-else
                  @click="removeFile(fileData.id)"
                  type="button"
                  class="remove-file-btn"
                  :disabled="uploading"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isRecording" class="recording-container">
          <div class="recording-header">
            <div class="recording-indicator">
              <div class="recording-dot"></div>
              <span>Gravando...</span>
            </div>
            <div class="recording-time">{{ formatRecordingTime(recordingTime) }}</div>
          </div>

          <div class="visualizer-wrapper">
            <canvas ref="canvasRef" width="800" height="150" class="recording-visualizer"></canvas>
          </div>

          <div class="recording-controls">
            <button @click="cancelRecording" type="button" class="recording-btn cancel">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cancelar
            </button>
            <button @click="stopRecording" type="button" class="recording-btn stop">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              Parar e Salvar
            </button>
          </div>
        </div>

        <div v-if="message" class="message success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ message }}
        </div>

        <div v-if="error" class="message error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error }}
        </div>

        <button
          v-if="!isRecording"
          type="submit"
          class="submit-btn"
          :disabled="selectedFiles.length === 0 || !categoryId || uploading"
        >
          <svg v-if="!uploading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div v-else class="btn-spinner"></div>
          <template v-if="uploading">
            Enviando {{ uploadingCount }} de {{ selectedFiles.length }}...
          </template>
          <template v-else>
            Enviar {{ selectedFiles.length }} Música{{ selectedFiles.length > 1 ? 's' : '' }}
          </template>
        </button>

        <!-- Modal: Nova Empresa + Usuário -->
        <div v-if="showCompanyModal" class="modal-overlay" @click.self="showCompanyModal = false">
          <div class="modal">
            <h3 style="margin-bottom:12px;">Nova Empresa + Usuário</h3>
            <div v-if="modalError" class="message error" style="margin-bottom:12px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ modalError }}
            </div>
            <div class="form-group">
              <label>Nome da Empresa</label>
              <input type="text" v-model="newCompany.name" class="input" placeholder="Nome da empresa" />
            </div>
            <div class="form-group">
              <label>Ramo (opcional)</label>
              <input type="text" v-model="newCompany.industry" class="input" placeholder="Tecnologia, Música..." />
            </div>
            <div class="form-group">
              <label>Descrição (opcional)</label>
              <input type="text" v-model="newCompany.description" class="input" placeholder="Sobre a empresa" />
            </div>
            <div class="form-group">
              <label>Nome do Usuário</label>
              <input type="text" v-model="newUser.name" class="input" placeholder="Nome do usuário" />
            </div>
            <div class="form-group">
              <label>Email do Usuário</label>
              <input type="email" v-model="newUser.email" class="input" placeholder="email@exemplo.com" />
            </div>
            <div class="form-group">
              <label>Senha</label>
              <input type="password" v-model="newUser.password" class="input" placeholder="Mínimo 6 caracteres" />
            </div>
            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
              <button type="button" class="clear-all-btn" @click="showCompanyModal = false">Cancelar</button>
              <button type="button" class="submit-btn" @click="createCompanyWithUser">Criar</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.upload {
  padding: 32px;
  max-width: 800px;
  margin: 0 auto;
}

.upload-container {
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.dark .upload-container {
  background: #181818;
}

.upload-header {
  margin-bottom: 32px;
  text-align: center;
}

.upload-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.dark .upload-header h1 {
  color: #fff;
}

.upload-header p {
  color: #666;
  font-size: 16px;
}

.dark .upload-header p {
  color: #999;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.dark .form-group label {
  color: #fff;
}

.input {
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
  color: #333;
}

.input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

select.input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

select.input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.dark .input {
  background: #0f0f0f;
  border-color: #282828;
  color: #fff;
}

.dark select.input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
}

.dark .input:focus {
  border-color: #34d399;
  box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.1);
}

.upload-options {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.recording-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 48px;
  background: #fafafa;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
}

.dark .recording-panel {
  background: #0f0f0f;
  border-color: #282828;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #d32f2f;
}

.pulse {
  width: 16px;
  height: 16px;
  background: #d32f2f;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.recording-time {
  font-size: 48px;
  font-weight: 700;
  color: #1a1a1a;
  font-variant-numeric: tabular-nums;
}

.dark .recording-time {
  color: #fff;
}

.recording-actions {
  display: flex;
  gap: 12px;
}

.record-btn {
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

.record-btn.stop {
  background: #d32f2f;
  color: white;
}

.record-btn.stop:hover {
  background: #b71c1c;
}

.record-btn.cancel {
  background: #f0f0f0;
  color: #666;
}

.record-btn.cancel:hover {
  background: #e0e0e0;
}

.dark .record-btn.cancel {
  background: #282828;
  color: #999;
}

.dark .record-btn.cancel:hover {
  background: #333;
}

.file-upload {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  transition: all 0.2s;
  position: relative;
  background: #fafafa;
}

.dark .file-upload {
  border-color: #282828;
  background: #0f0f0f;
}

.file-upload.drag-over {
  border-color: #10b981;
  background: rgba(25, 118, 210, 0.05);
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.file-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #666;
}

.dark .file-upload-content {
  color: #999;
}

.file-upload-text {
  font-size: 16px;
}

.file-label {
  color: #10b981;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.file-upload-hint {
  font-size: 14px;
  color: #999;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.dark .file-preview {
  background: #181818;
  border-color: #282828;
}

.artwork-preview {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.artwork-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  color: #10b981;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  flex: 1;
  text-align: left;
}

.file-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.dark .file-name {
  color: #fff;
}

.file-size {
  font-size: 14px;
  color: #666;
}

.dark .file-size {
  color: #999;
}

.remove-file {
  padding: 8px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.remove-file:hover {
  background: #f0f0f0;
  color: #d32f2f;
}

.dark .remove-file:hover {
  background: #282828;
}

.divider {
  position: relative;
  text-align: center;
  color: #999;
  font-weight: 600;
  font-size: 14px;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(50% - 30px);
  height: 1px;
  background: #e0e0e0;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.dark .divider::before,
.dark .divider::after {
  background: #282828;
}

.record-audio-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 32px;
  background: #f0f0f0;
  color: #333;
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.record-audio-btn:hover:not(:disabled) {
  background: #e0e0e0;
  border-color: #10b981;
  color: #10b981;
}

.record-audio-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark .record-audio-btn {
  background: #0f0f0f;
  border-color: #282828;
  color: #999;
}

.dark .record-audio-btn:hover:not(:disabled) {
  background: #181818;
  border-color: #34d399;
  color: #34d399;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.dark .files-list {
  background: #0f0f0f;
  border-color: #282828;
}

.files-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.dark .files-list-header {
  border-bottom-color: #282828;
}

.files-list-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.dark .files-list-header h3 {
  color: #fff;
}

.clear-all-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  color: #666;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background: #e0e0e0;
  color: #d32f2f;
  border-color: #d32f2f;
}

.dark .clear-all-btn {
  background: #282828;
  color: #999;
  border-color: #333;
}

.dark .clear-all-btn:hover {
  background: #333;
  color: #ef4444;
  border-color: #ef4444;
}

.files-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
}

.dark .file-item {
  background: #181818;
  border-color: #282828;
}

.file-item.uploading {
  border-color: #10b981;
}

.file-item.uploaded {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.file-item.error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.file-item-artwork {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
}

.dark .file-item-artwork {
  background: #282828;
}

.file-item-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.file-item-title {
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  background: white;
  transition: all 0.2s;
}

.file-item-title:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.file-item-title:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.7;
}

.dark .file-item-title {
  background: #0f0f0f;
  border-color: #333;
  color: #fff;
}

.dark .file-item-title:disabled {
  background: #1a1a1a;
}

.file-item-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.dark .file-item-meta {
  color: #999;
}

.file-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item-size {
  flex-shrink: 0;
}

.file-item-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-mini {
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.dark .progress-bar-mini {
  background: #282828;
}

.progress-fill-mini {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.3s;
  border-radius: 2px;
}

.progress-text-mini {
  font-size: 12px;
  font-weight: 600;
  color: #10b981;
  min-width: 40px;
  text-align: right;
}

.file-item-error {
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}

.file-item-status {
  flex-shrink: 0;
}

.status-icon {
  display: block;
}

.status-icon.success {
  color: #10b981;
}

.status-icon.error {
  color: #ef4444;
}

.status-icon.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.remove-file-btn {
  padding: 8px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.remove-file-btn:hover:not(:disabled) {
  background: #f0f0f0;
  color: #d32f2f;
}

.remove-file-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark .remove-file-btn:hover:not(:disabled) {
  background: #282828;
  color: #ef4444;
}

.recording-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: white;
  border: 2px solid #10b981;
  border-radius: 16px;
  animation: slideIn 0.3s ease-out;
}

.dark .recording-container {
  background: #181818;
  border-color: #10b981;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.recording-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #ef4444;
}

.recording-dot {
  width: 12px;
  height: 12px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.recording-time {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  font-variant-numeric: tabular-nums;
}

.dark .recording-time {
  color: #fff;
}

.visualizer-wrapper {
  width: 100%;
  height: 150px;
  background: #0f0f0f;
  border-radius: 12px;
  overflow: hidden;
}

.recording-visualizer {
  width: 100%;
  height: 100%;
}

.recording-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.recording-btn {
  flex: 1;
  max-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border: 2px solid;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.recording-btn.cancel {
  background: white;
  border-color: #e0e0e0;
  color: #666;
}

.recording-btn.cancel:hover {
  background: #f5f5f5;
  border-color: #999;
  color: #333;
}

.dark .recording-btn.cancel {
  background: #181818;
  border-color: #282828;
  color: #999;
}

.dark .recording-btn.cancel:hover {
  background: #0f0f0f;
  border-color: #333;
  color: #fff;
}

.recording-btn.stop {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.recording-btn.stop:hover {
  background: #dc2626;
  border-color: #dc2626;
  transform: scale(1.02);
}

.progress-bar {
  position: relative;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.dark .progress-bar {
  background: #282828;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.3s;
  border-radius: 4px;
}

.progress-text {
  position: absolute;
  top: -24px;
  right: 0;
  font-size: 12px;
  font-weight: 600;
  color: #10b981;
}

.message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
}

.message.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.dark .message.success {
  background: rgba(46, 125, 50, 0.2);
  border-color: rgba(46, 125, 50, 0.3);
}

.dark .message.error {
  background: rgba(198, 40, 40, 0.2);
  border-color: rgba(198, 40, 40, 0.3);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 32px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal {
  background: #ffffff;
  color: #111827;
  width: 100%;
  max-width: 520px;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}

.dark .modal {
  background: #181818;
  color: #fff;
}

@media (max-width: 768px) {
  .upload {
    padding: 16px;
  }

  .upload-container {
    padding: 24px;
  }

  .upload-header h1 {
    font-size: 24px;
  }

  .file-upload {
    padding: 32px 16px;
  }

  .recording-panel {
    padding: 32px 16px;
  }

  .recording-time {
    font-size: 36px;
  }

  .recording-actions {
    flex-direction: column;
    width: 100%;
  }

  .record-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
