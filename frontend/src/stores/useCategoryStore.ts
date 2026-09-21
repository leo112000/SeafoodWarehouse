import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Category } from '@/types/seafood';
import { categoryService } from '@/services/categoryService';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'productCount' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: string, category: Omit<Category, 'id' | 'productCount' | 'createdAt'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>()(
  devtools(
    (set, get) => ({
      categories: [],
      loading: false,

      fetchCategories: async () => {
        set({ loading: true });
        try {
          const apiCategories = await categoryService.getAll();
          set({ categories: apiCategories });
        } catch {
          // Keep current state on error
        } finally {
          set({ loading: false });
        }
      },

      addCategory: async (categoryData) => {
        const newCategory = await categoryService.create(categoryData);
        set((state) => ({ categories: [newCategory, ...state.categories] }));
        get().fetchCategories();
        return newCategory;
      },

      updateCategory: async (id, categoryData) => {
        await categoryService.update(id, categoryData);
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...categoryData, id } : c
          ),
        }));
        get().fetchCategories();
      },

      deleteCategory: async (id) => {
        await categoryService.delete(id);
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
        // Tự động đồng bộ lại từ server
        get().fetchCategories();
      },
    }),
    { name: 'CategoryStore' }
  )
);
