import { ref, computed, watch } from 'vue';
import { useRadioStore } from '../stores/radio';
import type { Song, PaginationMeta } from '../api/music';
import { musicApi } from '../api/music';

const currentSong = ref<Song | null>(null);
const playlist = ref<Song[]>([]);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isShuffle = ref(false);
const nextToken = ref<string | null>(null);
const isLoadingMore = ref(false);
const hasMoreSongs = ref(true);
const audio = new Audio();
let currentBlobUrl: string | null = null;

export const usePlayer = () => {
  const radio = useRadioStore();
  const progress = computed(() => {
    if (duration.value === 0) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  const formattedCurrentTime = computed(() => formatTime(currentTime.value));
  const formattedDuration = computed(() => formatTime(duration.value));

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function setPlaylist(songs: Song[], meta?: PaginationMeta) {
    playlist.value = songs;
    if (meta) {
      nextToken.value = meta.next_token || null;
      hasMoreSongs.value = !!meta.next_token;
    }
  }

  async function loadMoreSongs() {
    if (!nextToken.value || !hasMoreSongs.value || isLoadingMore.value) {
      return;
    }

    try {
      isLoadingMore.value = true;
      const response = await musicApi.getNextSongs(nextToken.value);

      playlist.value.push(...response.data);
      nextToken.value = response.meta.next_token || null;
      hasMoreSongs.value = !!response.meta.next_token;
    } catch (error) {
      console.error('Error loading more songs:', error);
    } finally {
      isLoadingMore.value = false;
    }
  }

  function checkAndLoadMore() {
    if (!currentSong.value || playlist.value.length === 0) return;

    const currentIndex = playlist.value.findIndex(s => s.id === currentSong.value!.id);
    const remainingSongs = playlist.value.length - currentIndex - 1;

    if (remainingSongs <= 5 && hasMoreSongs.value && !isLoadingMore.value) {
      loadMoreSongs();
    }
  }

  function updateMediaSession() {
    if ('mediaSession' in navigator && currentSong.value) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.value.title,
        artist: 'Música',
        album: '',
        artwork: currentSong.value.cover_url ? [
          { src: currentSong.value.cover_url, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', () => {
        play();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        previous();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        next();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          audio.currentTime = details.seekTime;
          currentTime.value = details.seekTime;
        }
      });
    }
  }

  (async () => {
    try {
      if (!(radio as any).session?.value) {
        await radio.init();
      }
      // O watcher abaixo cuidará de carregar e retomar a faixa atual quando disponível
    } catch {}
  })();

  watch(() => (radio.currentSong as any)?.value, async (val) => {
    if (val) {
      const start = Number((radio as any).session?.value?.current_track_position || 0);
      await playSong(val as any, start > 0 ? start : undefined);
    }
  });

  async function playSong(song: Song, startTime?: number) {
    if (currentSong.value?.id === song.id && !audio.paused) {
      pause();
      return;
    }

    audio.pause();
    isPlaying.value = false;
    currentTime.value = 0;

    currentSong.value = song;
    // Sincroniza track atual com a sessão de rádio para garantir retomada correta
    try {
      const radioAny = radio as any;
      if (radioAny?.session?.value?.current_track_id !== song.id) {
        radioAny.session.value.current_track_id = song.id;
      }
    } catch {}

    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const url = musicApi.getPlayUrl(song.id);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load audio');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      currentBlobUrl = blobUrl;

      audio.src = blobUrl;
      audio.load();

      // Aguarda metadados antes de aplicar seek, garantindo retomada correta
      await new Promise<void>((resolve) => {
        if (audio.readyState >= 1 && !isNaN(audio.duration)) {
          resolve();
          return;
        }
        const handler = () => {
          resolve();
        };
        audio.addEventListener('loadedmetadata', handler, { once: true });
      });

      if (startTime !== undefined && startTime > 0) {
        audio.currentTime = startTime;
        currentTime.value = startTime;
      }

      await audio.play();
      isPlaying.value = true;

      updateMediaSession();
    } catch (error) {
      console.error('Error playing song:', error);
      isPlaying.value = false;
    }
  }

  function play() {
    if (audio.src) {
      audio.play();
      isPlaying.value = true;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    }
  }

  function pause() {
    audio.pause();
    isPlaying.value = false;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  }

  function next() {
    if (!currentSong.value || playlist.value.length === 0) return;

    const currentIndex = playlist.value.findIndex(s => s.id === currentSong.value!.id);
    let nextIndex;

    if (isShuffle.value) {
      nextIndex = Math.floor(Math.random() * playlist.value.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.value.length;
    }

    playSong(playlist.value[nextIndex]);
    checkAndLoadMore();
  }

  function previous() {
    if (!currentSong.value || playlist.value.length === 0) return;

    const currentIndex = playlist.value.findIndex(s => s.id === currentSong.value!.id);
    const prevIndex = currentIndex === 0 ? playlist.value.length - 1 : currentIndex - 1;

    playSong(playlist.value[prevIndex]);
  }

  function seek(percent: number) {
    const time = (percent / 100) * duration.value;
    audio.currentTime = time;
    currentTime.value = time;
  }

  function setVolume(value: number) {
    volume.value = value;
    audio.volume = value;
  }

  function toggleShuffle() {
    isShuffle.value = !isShuffle.value;
  }

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime;
    try { radio.setCurrentProgress(currentTime.value); } catch {}
    if (currentSong.value && isPlaying.value) {
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        } catch (error) {
          console.log('MediaSession position state not supported');
        }
      }
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    duration.value = audio.duration;

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime,
        });
      } catch (error) {
        console.log('MediaSession position state not supported');
      }
    }
  });

  audio.addEventListener('ended', () => {
    (async () => {
      try {
        await radio.markPlayed(Math.floor(duration.value || 0));
        const item = await radio.fetchNext();
        if (item && (item as any).song) {
          await playSong((item as any).song as any);
          return;
        }
      } catch {}
      next();
    })();
  });

  watch(volume, (newVolume) => {
    audio.volume = newVolume;
  });

  return {
    currentSong,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    nextToken,
    isLoadingMore,
    hasMoreSongs,
    progress,
    formattedCurrentTime,
    formattedDuration,
    setPlaylist,
    playSong,
    play,
    pause,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    loadMoreSongs,
    checkAndLoadMore,
  };
};
