<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import MusicPlayer from './components/MusicPlayer.vue';
import ProfileMenu from './components/ProfileMenu.vue';
import { useAuthStore } from './stores/auth';

const isDark = ref(false);
const sidebarCollapsed = ref(true);

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  }
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const route = useRoute();
const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.user?.is_super_admin === true);

const isAuthPage = computed(() => {
  return ['/login', '/register', '/forgot-password', '/reset-password'].includes(route.path);
});
</script>

<template>
  <div :class="{ dark: isDark }" class="app">
    <div v-if="isAuthPage" class="auth-layout">
      <RouterView />
    </div>
    <div v-else class="app-container">
      <header class="top-bar" :class="{ collapsed: sidebarCollapsed }">
        <div class="top-bar-content">
          <div class="top-bar-right">
            <ProfileMenu />
          </div>
        </div>
      </header>

      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="logo" @click="toggleSidebar">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13v8l6-4-6-4z"/>
          </svg>
          <span v-if="!sidebarCollapsed">MusicStream</span>
        </div>

        <nav class="nav">
          <router-link to="/" class="nav-item" :class="{ active: route.path === '/' }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Home</span>
          </router-link>

          <router-link to="/search" class="nav-item" :class="{ active: route.path === '/search' }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <span>Search</span>
          </router-link>

          <router-link v-if="isSuperAdmin" to="/upload" class="nav-item" :class="{ active: route.path === '/upload' }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload</span>
          </router-link>

          <router-link to="/playlists" class="nav-item" :class="{ active: route.path.startsWith('/playlists') }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
            </svg>
            <span>Playlists</span>
          </router-link>

          <router-link to="/intercom" class="nav-item" :class="{ active: route.path === '/intercom' }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <span>Intercom</span>
          </router-link>

          <button @click="toggleTheme" class="nav-item theme-toggle">
            <svg v-if="!isDark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <span>{{ isDark ? 'Light' : 'Dark' }}</span>
          </button>
        </nav>
      </aside>

      <main class="main-content" :class="{ collapsed: sidebarCollapsed }">
        <RouterView />
      </main>

      <MusicPlayer />

      <nav class="mobile-nav">
        <router-link to="/" class="mobile-nav-item" :class="{ active: route.path === '/' }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Home</span>
        </router-link>

        <router-link to="/search" class="mobile-nav-item" :class="{ active: route.path === '/search' }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span>Search</span>
        </router-link>

        <router-link to="/playlists" class="mobile-nav-item" :class="{ active: route.path.startsWith('/playlists') }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
          <span>Listas</span>
        </router-link>

        <router-link v-if="isSuperAdmin" to="/upload" class="mobile-nav-item" :class="{ active: route.path === '/upload' }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Upload</span>
        </router-link>

        <router-link to="/intercom" class="mobile-nav-item" :class="{ active: route.path === '/intercom' }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span>Talk</span>
        </router-link>

        <button @click="toggleTheme" class="mobile-nav-item">
          <svg v-if="!isDark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span>Theme</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #f8f9fa;
  transition: background 0.3s;
}

.dark .app {
  background: #0f0f0f;
}

.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.top-bar {
  position: fixed;
  top: 0;
  left: 72px;
  right: 0;
  height: 64px;
  background: transparent;
  border-bottom: none;
  z-index: 100;
  transition: all 0.3s;
}

.top-bar:not(.collapsed) {
  left: 240px;
}

.top-bar-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 32px;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 240px;
  height: 100vh;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  transition: all 0.3s;
  z-index: 90;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 72px;
}

.dark .sidebar {
  background: #181818;
  border-right-color: #282828;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  margin-bottom: 32px;
  color: #10b981;
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.logo:hover {
  opacity: 0.8;
}

.sidebar.collapsed .logo {
  justify-content: center;
  padding: 0 20px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 16px;
}

.nav-item,
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  color: #666;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  font-size: 14px;
  white-space: nowrap;
}

.sidebar.collapsed .nav-item,
.sidebar.collapsed .theme-toggle {
  justify-content: center;
  padding: 12px;
}

.sidebar.collapsed .nav-item span,
.sidebar.collapsed .theme-toggle span {
  display: none;
}

.nav-item:hover,
.theme-toggle:hover {
  background: #f0f0f0;
  color: #333;
}

.dark .nav-item:hover,
.dark .theme-toggle:hover {
  background: #282828;
  color: #fff;
}

.nav-item.active {
  background: #d1fae5;
  color: #059669;
}

.dark .nav-item.active {
  background: #064e3b;
  color: #34d399;
}

.main-content {
  flex: 1;
  margin-left: 72px;
  margin-top: 64px;
  margin-bottom: 96px; /* Espaço para o MusicPlayer no desktop */
  width: calc(100% - 72px);
  overflow-y: auto;
  transition: all 0.3s;
}

.main-content:not(.collapsed) {
  margin-left: 240px;
  width: calc(100% - 240px);
}

.mobile-nav {
  display: none;
}

/* Ajuste para dispositivos móveis */
@media (max-width: 768px) {
  .top-bar {
    left: 0 !important;
    width: 100%;
    background: transparent;
    z-index: 100;
  }

  .sidebar {
    display: none;
  }

  .main-content {
    margin-left: 0 !important;
    width: 100% !important;
    margin-bottom: 200px; /* ESPAÇO MAIOR PARA MOBILE (player + navbar) */
  }

  /* Para telas muito pequenas (smartphones menores) */
  @media (max-height: 700px) {
    .main-content {
      margin-bottom: 180px;
    }
  }

  @media (max-height: 600px) {
    .main-content {
      margin-bottom: 160px;
    }
  }

  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: white;
    border-top: 1px solid #e0e0e0;
    padding: 8px;
    justify-content: space-around;
    z-index: 90;
  }

  .dark .mobile-nav {
    background: #181818;
    border-top-color: #282828;
  }

  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    border-radius: 8px;
    color: #666;
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
    background: none;
    border: none;
    cursor: pointer;
  }

  .mobile-nav-item.active {
    color: #10b981;
  }

  .dark .mobile-nav-item {
    color: #999;
  }

  .dark .mobile-nav-item.active {
    color: #34d399;
  }
}

/* Para tablets (tamanho intermediário) */
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    margin-bottom: 100px; /* Espaço intermediário para tablets */
  }
}
</style>