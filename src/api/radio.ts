import api from './axios';

function getSessionToken(): string | null {
  return localStorage.getItem('radio_session_token');
}

function getHeaders() {
  const headers: Record<string, string> = {};
  const token = getSessionToken();
  if (token) headers['X-Session-Token'] = token;
  return headers;
}

export interface RadioSessionDTO {
  id: string;
  user_id: string | null;
  session_token: string | null;
  current_track_id: string | null;
  current_track_position: number;
  play_queue: Array<{ type: 'song' | 'ad'; id: string }> | null;
  loop_strategy: 'shuffle' | 'repeat_all' | 'no_repeat';
  last_saved_at: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export const radioApi = {
  async getSession() {
    const res = await api.get('/radio/session', { headers: getHeaders() });
    return res.data as { status: string; data: { session: RadioSessionDTO } };
  },

  async saveProgress(payload: {
    session_id: string;
    track_id?: string | null;
    position: number;
    play_queue: Array<{ type: 'song' | 'ad'; id: string }>;
  }) {
    const res = await api.post('/radio/save-progress', payload, { headers: getHeaders() });
    return res.data as { status: string; data: { session: RadioSessionDTO } };
  },

  async getNext(params: { session_id: string }) {
    const res = await api.get('/radio/next', { params, headers: getHeaders() });
    return res.data as { status: string; data: { item: { type: 'song' | 'ad'; song: any } | null } };
  },

  async markPlayed(payload: { session_id?: string; song_id: string; duration_played?: number }) {
    const res = await api.post('/radio/mark-played', payload, { headers: getHeaders() });
    return res.data as { status: string; data: boolean };
  },
};
