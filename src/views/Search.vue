<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCategoriesStore } from '../stores/categories';

const router = useRouter();
const categoriesStore = useCategoriesStore();
const searchQuery = ref('');

const categoryColors = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
  'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
];

const getCategoryColor = (index: number) => {
  return categoryColors[index % categoryColors.length];
};

const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) return categoriesStore.categories;

  const query = searchQuery.value.toLowerCase();
  return categoriesStore.categories.filter(category =>
    category.name.toLowerCase().includes(query)
  );
});

const loadCategories = async () => {
  try {
    await categoriesStore.fetchCategories();
  } catch (err) {
    console.error('Falha ao carregar categorias:', err);
  }
};

const goToCategory = (categoryId: number) => {
  router.push(`/category/${categoryId}`);
};

onMounted(() => {
  loadCategories();
});
</script>

<template>
  <div class="search">
    <div class="header">
      <h1>Categorias</h1>
      <div class="search-bar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar categorias..."
          class="search-input"
        />
      </div>
    </div>

    <div v-if="categoriesStore.loading" class="loading">
      <div class="spinner"></div>
      <p>Carregando categorias...</p>
    </div>

    <div v-else-if="categoriesStore.error" class="error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ categoriesStore.error }}</p>
      <button @click="loadCategories" class="retry-btn">Tentar Novamente</button>
    </div>

    <div v-else-if="categoriesStore.categories.length === 0" class="empty">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"/>
      </svg>
      <p>Nenhuma categoria encontrada</p>
    </div>

    <div v-else class="categories-grid">
      <div
        v-for="(category, index) in filteredCategories"
        :key="category.id"
        class="category-card"
        :style="{ background: getCategoryColor(index) }"
        @click="goToCategory(category.id)"
      >
        <h3 class="category-name">{{ category.name }}</h3>
        <div class="category-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 120px;
}

.header {
  margin-bottom: 32px;
}

.header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24px;
}

.dark .header h1 {
  color: #fff;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px 16px;
  max-width: 500px;
  transition: all 0.2s;
}

.search-bar:focus-within {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.dark .search-bar {
  background: #181818;
  border-color: #282828;
}

.dark .search-bar:focus-within {
  border-color: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
}

.search-bar svg {
  color: #999;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 14px;
  color: #333;
}

.dark .search-input {
  color: #fff;
}

.search-input::placeholder {
  color: #999;
}

.loading,
.error,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  color: #666;
}

.dark .loading,
.dark .error,
.dark .empty {
  color: #999;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.dark .spinner {
  border-color: #282828;
  border-top-color: #34d399;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error svg,
.empty svg {
  margin-bottom: 16px;
}

.retry-btn {
  margin-top: 16px;
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

.category-card {
  position: relative;
  height: 200px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.category-card:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.3s;
}

.category-card:hover::before {
  opacity: 1;
}

.category-name {
  font-size: 22px;
  font-weight: 700;
  color: white;
  margin: 0;
  line-height: 1.3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 1;
  max-width: 70%;
  word-break: break-word;
}

.category-icon {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  transform: rotate(25deg);
  transition: all 0.3s;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.category-card:hover .category-icon {
  transform: rotate(25deg) scale(1.1);
  color: rgba(255, 255, 255, 1);
}

@media (max-width: 1024px) {
  .categories-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
  }

  .category-card {
    height: 180px;
  }

  .category-name {
    font-size: 20px;
  }

  .category-icon {
    width: 70px;
    height: 70px;
  }

  .category-icon svg {
    width: 56px;
    height: 56px;
  }
}

@media (max-width: 768px) {
  .search {
    padding: 16px;
    padding-bottom: 100px;
  }

  .header h1 {
    font-size: 24px;
    margin-bottom: 16px;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .category-card {
    height: 140px;
    padding: 16px;
  }

  .category-name {
    font-size: 18px;
    max-width: 60%;
  }

  .category-icon {
    width: 60px;
    height: 60px;
    bottom: 12px;
    right: 12px;
  }

  .category-icon svg {
    width: 48px;
    height: 48px;
  }
}

@media (max-width: 480px) {
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .category-card {
    height: 120px;
    padding: 12px;
  }

  .category-name {
    font-size: 16px;
  }

  .category-icon {
    width: 50px;
    height: 50px;
  }

  .category-icon svg {
    width: 40px;
    height: 40px;
  }
}
</style>
