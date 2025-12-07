<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const isOpen = ref(false);

const user = computed(() => authStore.user);
const loading = computed(() => authStore.loading);

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

const closeMenu = () => {
  isOpen.value = false;
};

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push('/login');
  } catch (error) {
    console.error('Failed to logout', error);
  }
};

const goToProfile = () => {
  closeMenu();
};
</script>

<template>
  <div v-if="!loading && user" class="profile-menu">
    <button @click="toggleMenu" class="profile-button">
      <div class="avatar">
        {{ user.name.charAt(0).toUpperCase() }}
      </div>
      <span class="username">{{ user.name }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron" :class="{ open: isOpen }">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <div v-if="isOpen" class="dropdown-overlay" @click="closeMenu"></div>

    <div v-if="isOpen" class="dropdown-menu">
      <div class="dropdown-header">
        <div class="avatar-large">
          {{ user.name.charAt(0).toUpperCase() }}
        </div>
        <div class="user-info">
          <div class="user-name">{{ user.name }}</div>
          <div class="user-email">{{ user.email }}</div>
        </div>
      </div>

      <div class="dropdown-divider"></div>

      <button @click="goToProfile" class="dropdown-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Ver Perfil</span>
      </button>

      <div class="dropdown-divider"></div>

      <button @click="handleLogout" class="dropdown-item logout">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Sair</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-menu {
  position: relative;
}

.profile-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.profile-button:hover {
  background: #f9f9f9;
  border-color: #10b981;
}

.dark .profile-button {
  background: #181818;
  border-color: #282828;
  color: #fff;
}

.dark .profile-button:hover {
  background: #222;
  border-color: #34d399;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.username {
  font-weight: 600;
  color: #333;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .username {
  color: #fff;
}

.chevron {
  transition: transform 0.2s;
  color: #666;
}

.dark .chevron {
  color: #999;
}

.chevron.open {
  transform: rotate(180deg);
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 999;
  animation: slideDown 0.2s ease-out;
}

.dark .dropdown-menu {
  background: #181818;
  border-color: #282828;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .user-name {
  color: #fff;
}

.user-email {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .user-email {
  color: #999;
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

.dark .dropdown-divider {
  background: #282828;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  text-align: left;
}

.dropdown-item:hover {
  background: #f0f0f0;
}

.dark .dropdown-item {
  color: #fff;
}

.dark .dropdown-item:hover {
  background: #282828;
}

.dropdown-item.logout {
  color: #dc2626;
}

.dropdown-item.logout:hover {
  background: #fee;
}

.dark .dropdown-item.logout {
  color: #f87171;
}

.dark .dropdown-item.logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

@media (max-width: 768px) {
  .username {
    display: none;
  }

  .profile-button {
    padding: 8px;
    border-radius: 50%;
  }

  .dropdown-menu {
    right: -8px;
    width: 260px;
  }
}
</style>
