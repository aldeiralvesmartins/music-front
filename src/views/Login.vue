<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Por favor, preencha todos os campos';
    return;
  }

  try {
    error.value = '';

    await authStore.login({
      email: email.value,
      password: password.value,
    });

    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Falha no login. Tente novamente.';
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="logo">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M10 16.5l6-4.5-6-4.5z"/>
          </svg>
          <h1>Bem-vindo de Volta</h1>
          <p>Entre na sua conta para continuar</p>
        </div>

        <form @submit.prevent="handleLogin" class="auth-form">
          <div v-if="error" class="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ error }}</span>
          </div>

          <div class="form-group">
            <label for="email">E-mail</label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="seu@email.com"
              required
              :disabled="authStore.loading"
            />
          </div>

          <div class="form-group">
            <label for="password">Senha</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Digite sua senha"
              required
              :disabled="authStore.loading"
            />
          </div>

          <div class="form-actions">
            <router-link to="/forgot-password" class="forgot-link">
              Esqueceu a senha?
            </router-link>
          </div>

          <button type="submit" class="submit-btn" :disabled="authStore.loading">
            <span v-if="authStore.loading" class="spinner-small"></span>
            <span v-else>Entrar</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Não tem uma conta? <router-link to="/register">Cadastre-se</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #fafafa;
  position: relative;
  overflow: hidden;
}

.auth-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(5deg); }
  66% { transform: translate(-20px, 20px) rotate(-5deg); }
}

.dark .auth-page {
  background: #0a0a0a;
}

.dark .auth-page::before {
  background: radial-gradient(circle at 30% 50%, rgba(52, 211, 153, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(52, 211, 153, 0.06) 0%, transparent 50%);
}

.auth-container {
  width: 100%;
  max-width: 440px;
  position: relative;
  z-index: 1;
}

.auth-card {
  background: white;
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dark .auth-card {
  background: #0f0f0f;
  border-color: #1f1f1f;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.auth-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  color: #10b981;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 8px rgba(16, 185, 129, 0.2));
}

.dark .logo {
  color: #34d399;
  filter: drop-shadow(0 4px 8px rgba(52, 211, 153, 0.3));
}

.auth-header h1 {
  font-size: 32px;
  font-weight: 800;
  color: #0a0a0a;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.dark .auth-header h1 {
  color: #fff;
}

.auth-header p {
  font-size: 15px;
  color: #666;
  font-weight: 500;
}

.dark .auth-header p {
  color: #999;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
  font-size: 14px;
}

.dark .error-message {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.error-message svg {
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.dark .form-group label {
  color: #ccc;
}

.form-group input {
  padding: 14px 18px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  background: #fafafa;
  color: #0a0a0a;
  font-weight: 500;
}

.dark .form-group input {
  background: #141414;
  border-color: #1f1f1f;
  color: #fff;
}

.form-group input:hover {
  border-color: #d0d0d0;
}

.dark .form-group input:hover {
  border-color: #282828;
}

.form-group input:focus {
  outline: none;
  border-color: #10b981;
  background: white;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08);
  transform: translateY(-1px);
}

.dark .form-group input:focus {
  border-color: #34d399;
  background: #0a0a0a;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.1);
}

.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.forgot-link {
  font-size: 14px;
  color: #10b981;
  text-decoration: none;
  font-weight: 600;
}

.forgot-link:hover {
  text-decoration: underline;
}

.dark .forgot-link {
  color: #34d399;
}

.submit-btn {
  padding: 16px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.submit-btn:hover::before {
  left: 100%;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.dark .auth-footer {
  color: #999;
}

.auth-footer a {
  color: #10b981;
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  text-decoration: underline;
}

.dark .auth-footer a {
  color: #34d399;
}

@media (max-width: 768px) {
  .auth-page {
    padding: 20px;
  }

  .auth-card {
    padding: 36px 28px;
    border-radius: 20px;
  }

  .auth-header {
    margin-bottom: 32px;
  }

  .auth-header h1 {
    font-size: 26px;
  }

  .auth-header p {
    font-size: 14px;
  }

  .logo {
    width: 40px;
    height: 40px;
  }
}
</style>
