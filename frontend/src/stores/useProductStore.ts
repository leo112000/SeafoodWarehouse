import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '../types/seafood';

// ── seed data (same as ProductsPage initial data) ───────────────────────────

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    code: 'HS-CA-CAHOI',
    name: 'Cá Hồi Na Uy',
    categoryId: 'CA',
    categoryName: 'Cá',
    unit: 'Kg',
    storageType: 'FROZEN',
    targetTemperature: -18,
    warningDaysBeforeExpiry: 3,
    minStock: 50,
    maxStock: 500,
    referencePrice: 350000,
    status: 'ACTIVE',
    note: 'Nhập khẩu từ Na Uy, cấp đông IQF',
  },
  {
    id: 'p-2',
    code: 'HS-TOM-TOMHUM',
    name: 'Tôm Hùm Bông',
    categoryId: 'TOM',
    categoryName: 'Tôm',
    unit: 'Kg',
    storageType: 'ALIVE',
    targetTemperature: 20,
    warningDaysBeforeExpiry: 1,
    minStock: 10,
    maxStock: 100,
    referencePrice: 1500000,
    status: 'ACTIVE',
    note: 'Nuôi vịnh Vân Phong, giao sống',
  },
  {
    id: 'p-3',
    code: 'HS-CUA-CUAHD',
    name: 'Cua Hoàng Đế',
    categoryId: 'CUA',
    categoryName: 'Cua',
    unit: 'Kg',
    storageType: 'FRESH',
    targetTemperature: 2,
    warningDaysBeforeExpiry: 2,
    minStock: 20,
    maxStock: 200,
    referencePrice: 2200000,
    status: 'ACTIVE',
  },
  {
    id: 'p-4',
    code: 'HS-MUC-MUCLA',
    name: 'Mực Lá Đại',
    categoryId: 'MUC',
    categoryName: 'Mực & Bạch tuộc',
    unit: 'Kg',
    storageType: 'FROZEN',
    targetTemperature: -18,
    warningDaysBeforeExpiry: 5,
    minStock: 30,
    maxStock: 300,
    referencePrice: 280000,
    status: 'ACTIVE',
  },
  {
    id: 'p-5',
    code: 'HS-CA-CATHU',
    name: 'Cá Thu Phấn',
    categoryId: 'CA',
    categoryName: 'Cá',
    unit: 'Kg',
    storageType: 'FRESH',
    targetTemperature: 2,
    warningDaysBeforeExpiry: 2,
    minStock: 20,
    maxStock: 150,
    referencePrice: 180000,
    status: 'INACTIVE',
    note: 'Tạm ngừng nhập do giá biến động',
  },
];

// ── store types ──────────────────────────────────────────────────────────────

interface ProductState {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;
}

// ── store ─────────────────────────────────────────────────────────────────────

export const useProductStore = create<ProductState>()(
  devtools(
    (set) => ({
      products: INITIAL_PRODUCTS,

      addProduct: (productData) => {
        const newProduct: Product = { ...productData, id: `p-${Date.now()}` };
        set((state) => ({ products: [...state.products, newProduct] }));
        return newProduct;
      },

      updateProduct: (id, productData) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...productData, id } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
      },
    }),
    { name: 'ProductStore' }
  )
);
