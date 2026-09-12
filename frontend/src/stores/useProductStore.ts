import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '../types/seafood';
import { productService } from '../services/productService';

const INITIAL_PRODUCTS: Product[] = [];

interface ProductState {
  products: Product[];
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addProductsBatch: (items: Array<Omit<Product, 'id'>>) => Promise<{ importedCount: number; skippedCount: number; errors: string[] }>;
}

export const useProductStore = create<ProductState>()(
  devtools(
    (set, get) => ({
      products: INITIAL_PRODUCTS,

      fetchProducts: async () => {
        try {
          const apiProducts = await productService.getAll();
          if (Array.isArray(apiProducts)) {
            set({ products: apiProducts });
          }
        } catch {
          // Keep current state on error
        }
      },

      addProduct: async (productData) => {
        try {
          const newProduct = await productService.create(productData);
          set((state) => ({ products: [newProduct, ...state.products] }));
          get().fetchProducts();
          return newProduct;
        } catch {
          const newProduct: Product = { ...productData, id: `p-${Date.now()}` };
          set((state) => ({ products: [newProduct, ...state.products] }));
          return newProduct;
        }
      },

      addProductsBatch: async (items) => {
        try {
          const res = await productService.createBatch(items);
          await get().fetchProducts();
          return res;
        } catch {
          const newProducts: Product[] = items.map((it, idx) => ({
            ...it,
            id: `p-${Date.now()}-${idx}`,
          }));
          set((state) => ({ products: [...newProducts, ...state.products] }));
          return {
            importedCount: items.length,
            skippedCount: 0,
            errors: [],
          };
        }
      },

      updateProduct: async (id, productData) => {
        try {
          await productService.update(id, productData);
        } catch {
          // Continue updating local store
        }
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...productData, id } : p
          ),
        }));
        get().fetchProducts();
      },

      deleteProduct: async (id) => {
        try {
          await productService.delete(id);
        } catch {
          // Continue local delete
        }
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
        get().fetchProducts();
      },
    }),
    { name: 'ProductStore' }
  )
);
