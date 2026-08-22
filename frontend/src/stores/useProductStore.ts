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
}

export const useProductStore = create<ProductState>()(
  devtools(
    (set) => ({
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
          set((state) => ({ products: [...state.products, newProduct] }));
          return newProduct;
        } catch {
          const newProduct: Product = { ...productData, id: `p-${Date.now()}` };
          set((state) => ({ products: [...state.products, newProduct] }));
          return newProduct;
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
      },

      deleteProduct: async (id) => {
        try {
          await productService.delete(id);
        } catch {
          // Continue local delete
        }
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
      },
    }),
    { name: 'ProductStore' }
  )
);
