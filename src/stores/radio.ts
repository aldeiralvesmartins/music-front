import { defineStore } from 'pinia'
import { ref } from 'vue'
import { radioApi, type RadioSessionDTO } from '../api/radio'
import { musicApi } from '../api/music'

function uuidv4(): string {
  // Prefer native when available
  const anyCrypto: any = (globalThis as any).crypto || (globalThis as any).msCrypto
  if (anyCrypto?.randomUUID) {
    return anyCrypto.randomUUID()
  }
  // Use secure RNG if possible
  if (anyCrypto?.getRandomValues) {
    const buf = new Uint8Array(16)
    anyCrypto.getRandomValues(buf)
    buf[6] = (buf[6] & 0x0f) | 0x40 // version 4
    buf[8] = (buf[8] & 0x3f) | 0x80 // variant 10
    const hex = Array.from(buf).map(b => b.toString(16).padStart(2, '0'))
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  }
  // Last resort: math-based RFC4122 v4 format
  let d = new Date().getTime()
  let d2 = (typeof performance !== 'undefined' && performance.now) ? Math.floor(performance.now() * 1000) : 0
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    let r = Math.random() * 16
    if (d > 0) {
      r = (d + r) % 16 | 0
      d = Math.floor(d / 16)
    } else {
      r = (d2 + r) % 16 | 0
      d2 = Math.floor(d2 / 16)
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function getOrCreateSessionToken(): string {
  let token = localStorage.getItem('radio_session_token')
  if (!token) {
    token = uuidv4()
    localStorage.setItem('radio_session_token', token)
  }
  return token
}

export type QueueItem = { type: 'song' | 'ad'; id: string }

export const useRadioStore = defineStore('radio', () => {
  const session = ref<RadioSessionDTO | null>(null)
  const queue = ref<QueueItem[]>([])
  const currentSong = ref<any | null>(null)
  const isFetchingNext = ref(false)
  const heartbeatIntervalMs = 7000
  let heartbeatTimer: number | null = null
  // multi-tab lock
  const isLeader = ref(false)
  const LOCK_KEY = 'radio_lock_owner'
  const LOCK_TTL_MS = 10000
  let lockRenewTimer: number | null = null

  function nowMs() { return Date.now() }

  function readLock(): { id: string; ts: number } | null {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  function writeLock(ownerId: string) {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ id: ownerId, ts: nowMs() }))
  }

  function isLockExpired(lock: { id: string; ts: number } | null) {
    if (!lock) return true
    return (nowMs() - lock.ts) > LOCK_TTL_MS
  }

  function startLockRenewal() {
    stopLockRenewal()
    lockRenewTimer = window.setInterval(() => {
      if (!session.value) return
      if (!isLeader.value) return
      writeLock(session.value.id)
    }, Math.floor(LOCK_TTL_MS / 2))
    window.addEventListener('storage', handleStorage)
  }

  function stopLockRenewal() {
    if (lockRenewTimer) {
      clearInterval(lockRenewTimer)
      lockRenewTimer = null
    }
    window.removeEventListener('storage', handleStorage)
  }

  function handleStorage(e: StorageEvent) {
    if (e.key !== LOCK_KEY) return
    const lock = readLock()
    if (!session.value) return
    const amOwner = lock && lock.id === session.value.id
    isLeader.value = !!amOwner && !isLockExpired(lock)
  }

  function acquireLock() {
    if (!session.value) return
    const current = readLock()
    if (isLockExpired(current) || (current && current.id === session.value.id)) {
      writeLock(session.value.id)
      isLeader.value = true
    } else {
      isLeader.value = false
    }
    startLockRenewal()
  }

  function releaseLock() {
    stopLockRenewal()
    const current = readLock()
    if (current && session.value && current.id === session.value.id) {
      localStorage.removeItem(LOCK_KEY)
    }
    isLeader.value = false
  }

  async function init() {
    // ensure token for anonymous sessions
    getOrCreateSessionToken()

    // resume or create session
    const res = await radioApi.getSession()
    session.value = res.data.session

    // restore queue and current if exists
    queue.value = (session.value.play_queue || []) as QueueItem[]

    // If there is a current track saved on server, fetch its metadata to resume playback accurately
    try {
      if (session.value.current_track_id) {
        const song = await musicApi.getSongById(session.value.current_track_id)
        currentSong.value = song
      } else if ((queue.value?.length || 0) > 0) {
        // Fallback: if backend didn't persist current_track_id but we have a queue, resume from the first item
        const first = queue.value.find(i => i.type === 'song')
        if (first) {
          const song = await musicApi.getSongById(first.id)
          currentSong.value = song
          session.value.current_track_id = song.id
        }
      }
    } catch {}

    // start heartbeat
    acquireLock()
    startHeartbeat()

    // if there is current track, consumer should load it and seek
    return session.value
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = window.setInterval(async () => {
      try {
        if (!session.value) return
        if (!isLeader.value) return
        // Persist limited queue
        const payloadQueue = queue.value.slice(0, 50)
        await radioApi.saveProgress({
          session_id: session.value.id,
          track_id: (currentSong.value?.id as string | undefined) || session.value.current_track_id || undefined,
          position: Number(session.value.current_track_position || 0),
          play_queue: payloadQueue,
        })
      } catch (e) {
        // swallow network errors; next tick will retry
        // console.debug('heartbeat error', e)
      }
    }, heartbeatIntervalMs)

    // last chance on unload
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  async function handleBeforeUnload() {
    try {
      if (!session.value) return
      await radioApi.saveProgress({
        session_id: session.value.id,
        track_id: (currentSong.value?.id as string | undefined) || session.value.current_track_id || undefined,
        position: Number(session.value.current_track_position || 0),
        play_queue: queue.value.slice(0, 50),
      })
    } catch {}
  }

  async function fetchNext() {
    if (!session.value || isFetchingNext.value) return null
    if (!isLeader.value) return null
    try {
      isFetchingNext.value = true
      const { data } = await radioApi.getNext({ session_id: session.value.id })
      const item = data.item
      if (!item) return null
      // push to queue shadow for UI reference if needed
      if (item.type === 'song' || item.type === 'ad') {
        // session on backend already popped; keep local minimal
      }
      // update current song for consumers
      if (item.type === 'song' || item.type === 'ad') {
        currentSong.value = item.song
        session.value.current_track_id = item.song.id
        session.value.current_track_position = 0
      }
      return item
    } finally {
      isFetchingNext.value = false
    }
  }

  async function markPlayed(durationPlayed?: number) {
    if (!session.value || !session.value.current_track_id) return
    try {
      await radioApi.markPlayed({
        session_id: session.value.id,
        song_id: session.value.current_track_id,
        duration_played: durationPlayed,
      })
    } catch {}
  }

  async function flushProgress() {
    if (!session.value) return
    try {
      await radioApi.saveProgress({
        session_id: session.value.id,
        track_id: session.value.current_track_id || undefined,
        position: Number(session.value.current_track_position || 0),
        play_queue: queue.value.slice(0, 50),
      })
    } catch {}
  }

  function setCurrentProgress(seconds: number) {
    if (session.value) {
      session.value.current_track_position = seconds
    }
  }

  return {
    session,
    queue,
    currentSong,
    isFetchingNext,
    isLeader,
    init,
    fetchNext,
    markPlayed,
    startHeartbeat,
    stopHeartbeat,
    setCurrentProgress,
    flushProgress,
    acquireLock,
    releaseLock,
  }
})
