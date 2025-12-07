import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi, type User, type LoginCredentials, type RegisterData } from '../api/auth';

const getInitialUser = () => {
  const storedUser = localStorage.getItem('user');
  const token = localStorage.getItem('auth_token');

  if (storedUser && token) {
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      return null;
    }
  }
  return null;
};

export const useAuthStore = defineStore('auth', () => {
  const initialUser = getInitialUser();
  const user = ref<User | null>(initialUser);
  const loading = ref(false);
  const isAuthenticated = ref(!!initialUser);
  const hasTriedAutoLogin = ref(true);

  const initializeFromStorage = () => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');

    if (storedUser && token) {
      try {
        user.value = JSON.parse(storedUser);
        isAuthenticated.value = true;
      } catch (error) {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
      }
    }
    hasTriedAutoLogin.value = true;
  };

  const setUser = (newUser: User | null) => {
    user.value = newUser;
    isAuthenticated.value = !!newUser;

    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
    }
  };

  const loadUser = async () => {
    try {
      loading.value = true;
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      loading.value = true;
      const response = await authApi.login(credentials);
      setUser(response.user);
      return response;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      loading.value = true;
      const response = await authApi.register(data);
      setUser(response.user);
      return response;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      loading.value = true;
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      loading.value = false;
    }
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    try {
      loading.value = true;
      const updatedUser = await authApi.updateProfile(data);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const changePassword = async (data: { current_password: string; password: string; password_confirmation: string }) => {
    try {
      loading.value = true;
      await authApi.changePassword(data);
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    hasTriedAutoLogin,
    initializeFromStorage,
    setUser,
    loadUser,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };
});
