<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authApi } from '../api/auth';

const router = useRouter();
const route = useRoute();

const email = ref('');
const token = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);

onMounted(() => {
  token.value = route.query.token as string || '';
  email.value = route.query.email as string || '';

  if (!token.value || !email.value) {
    error.value = 'Link de recuperação inválido. Por favor, solicite um novo.';
  }
});

const handleResetPassword = async () => {
  if (!password.value || !passwordConfirmation.value) {
    error.value = 'Por favor, preencha todos os campos';
    return;
  }

  if (password.value !== passwordConfirmation.value) {
    error.value = 'As senhas não coincidem';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'A senha deve ter pelo menos 8 caracteres';
    return;
  }

  try {
    loading.value = true;
    error.value = '';

    await authApi.resetPassword({
      email: email.value,
      token: token.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    });

    success.value = true;

    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Falha ao redefinir senha. Tente novamente.';
  } finally {
    loading.value = false;
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
          <h1>Definir Nova Senha</h1>
          <p>Digite sua nova senha abaixo</p>
        </div>

        <form v-if="!success" @submit.prevent="handleResetPassword" class="auth-form">
          <div v-if="error" class="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ error }}</span>
          </div>

          <div class="form-group">
            <label for="password">Nova Senha</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Mínimo de 8 caracteres"
              required
              :disabled="loading || !token || !email"
            />
          </div>

          <div class="form-group">
            <label for="password-confirmation">Confirmar Senha</label>
            <input
              id="password-confirmation"
              v-model="passwordConfirmation"
              type="password"
              placeholder="Confirme sua senha"
              required
              :disabled="loading || !token || !email"
            />
          </div>

          <button type="submit" class="submit-btn" :disabled="loading || !token || !email">
            <span v-if="loading" class="spinner-small"></span>
            <span v-else>Redefinir Senha</span>
          </button>
        </form>

        <div v-else class="success-message">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h2>Senha Redefinida!</h2>
          <p>Sua senha foi redefinida com sucesso.</p>
          <p class="helper-text">Redirecionando para a página de login...</p>
        </div>

        <div class="auth-footer">
          <p><router-link to="/login">Voltar para Login</router-link></p>
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

.success-message {
  text-align: center;
  padding: 32px 0;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.success-message svg {
  color: #10b981;
  margin-bottom: 24px;
  filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.2));
}

.dark .success-message svg {
  color: #34d399;
  filter: drop-shadow(0 4px 12px rgba(52, 211, 153, 0.3));
}

.success-message h2 {
  font-size: 28px;
  font-weight: 800;
  color: #0a0a0a;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.dark .success-message h2 {
  color: #fff;
}

.success-message p {
  font-size: 15px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
  line-height: 1.6;
}

.dark .success-message p {
  color: #999;
}

.helper-text {
  font-size: 13px;
  color: #999;
  margin-top: 16px;
  font-weight: 500;
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

  .success-message svg {
    width: 48px;
    height: 48px;
  }

  .success-message h2 {
    font-size: 22px;
  }
}
</style>
