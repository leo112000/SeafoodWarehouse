import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Category } from '../types/seafood';
import { categoryService } from '../services/categoryService';

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
    (set) => ({
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
        try {
          const newCategory = await categoryService.create(categoryData);
          set((state) => ({ categories: [...state.categories, newCategory] }));
          return newCategory;
        } catch {
          const newCategory: Category = {
            ...categoryData,
            id: `cat-${Date.now()}`,
            productCount: 0,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ categories: [...state.categories, newCategory] }));
          return newCategory;
        }
      },

      updateCategory: async (id, categoryData) => {
        try {
          await categoryService.update(id, categoryData);
        } catch {
          // Continue updating local store
        }
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...categoryData, id } : c
          ),
        }));
      },

      deleteCategory: async (id) => {
        try {
          await categoryService.delete(id);
        } catch {
          // Continue local delete
        }
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },
    }),
    { name: 'CategoryStore' }
  )
);
