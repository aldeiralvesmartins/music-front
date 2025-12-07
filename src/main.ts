import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useRadioStore } from './stores/radio'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Inicializa a sessão de rádio no boot do app para garantir retomada imediata
try {
  const radio = useRadioStore()
  // Não bloquear o boot; dispara e deixa a store cuidar do progresso/seek
  radio.init().catch(() => {})
} catch {}
app.mount('#app')
