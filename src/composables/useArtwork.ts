import { ref } from 'vue';
import { parseBlob } from 'music-metadata';
import { musicApi } from '../api/music';

export function useArtwork() {
  const artworkUrl = ref<string | null>(null);
  const loading = ref(false);

  const extractArtwork = async (songId: string): Promise<string | null> => {
    try {
      loading.value = true;

      const token = localStorage.getItem('auth_token');
      const url = musicApi.getPlayUrl(songId);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load audio file');
      }

      const blob = await response.blob();
      const metadata = await parseBlob(blob);

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const imageBlob = new Blob([picture.data.buffer as ArrayBuffer], { type: picture.format });
        const imageUrl = URL.createObjectURL(imageBlob);
        artworkUrl.value = imageUrl;
        loading.value = false;
        return imageUrl;
      } else {
        artworkUrl.value = null;
        loading.value = false;
        return null;
      }
    } catch (error) {
      console.error('Error reading tags:', error);
      artworkUrl.value = null;
      loading.value = false;
      return null;
    }
  };

  return {
    artworkUrl,
    loading,
    extractArtwork
  };
}
