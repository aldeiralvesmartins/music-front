import { defineStore } from 'pinia';
import { ref } from 'vue';
import { categoriesApi, type Category, type CreateCategoryData, type UpdateCategoryData } from '../api/categories';

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([]);
  const currentCategory = ref<Category | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchCategories = async () => {
    try {
      loading.value = true;
      error.value = null;
      const result = await categoriesApi.getAll();
      categories.value = Array.isArray(result) ? result : [];
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch categories';
      categories.value = [];
      console.error('Error fetching categories:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchCategoryById = async (id: number) => {
    try {
      loading.value = true;
      error.value = null;
      currentCategory.value = await categoriesApi.getById(id);
      return currentCategory.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch category';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createCategory = async (data: CreateCategoryData) => {
    try {
      loading.value = true;
      error.value = null;
      const category = await categoriesApi.create(data);
      categories.value.push(category);
      return category;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create category';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCategory = async (id: number, data: UpdateCategoryData) => {
    try {
      loading.value = true;
      error.value = null;
      const category = await categoriesApi.update(id, data);
      const index = categories.value.findIndex(c => c.id === id);
      if (index !== -1) {
        categories.value[index] = category;
      }
      return category;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update category';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      loading.value = true;
      error.value = null;
      await categoriesApi.delete(id);
      categories.value = categories.value.filter(c => c.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete category';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    categories,
    currentCategory,
    loading,
    error,
    fetchCategories,
    fetchCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    clearError,
  };
});
