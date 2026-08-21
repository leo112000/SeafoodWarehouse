import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PackagingType } from '../types/seafood';
import { packagingService } from '../services/packagingService';

interface PackagingState {
  packagings: PackagingType[];
  loading: boolean;
  fetchPackagings: () => Promise<void>;
  addPackaging: (packaging: Omit<PackagingType, 'id'>) => Promise<PackagingType | null>;
  updatePackaging: (id: string, packaging: Omit<PackagingType, 'id'>) => Promise<void>;
  deletePackaging: (id: string) => Promise<void>;
}

export const usePackagingStore = create<PackagingState>()(
  devtools(
    (set) => ({
      packagings: [],
      loading: false,

      fetchPackagings: async () => {
        set({ loading: true });
        try {
          const data = await packagingService.getAll();
          set({ packagings: data });
        } catch {
          // Keep current state on error
        } finally {
          set({ loading: false });
        }
      },

      addPackaging: async (packagingData) => {
        try {
          const newPackaging = await packagingService.create(packagingData);
          if (newPackaging) {
            set((state) => ({ packagings: [...state.packagings, newPackaging] }));
          }
          return newPackaging;
        } catch {
          // Fallback: add locally with generated id
          const fallback: PackagingType = {
            ...packagingData,
            id: `pkg-${Date.now()}`,
          };
          set((state) => ({ packagings: [...state.packagings, fallback] }));
          return fallback;
        }
      },

      updatePackaging: async (id, packagingData) => {
        try {
          await packagingService.update(id, packagingData);
        } catch {
          // Continue updating local store
        }
        set((state) => ({
          packagings: state.packagings.map((p) =>
            p.id === id ? { ...p, ...packagingData, id } : p
          ),
        }));
      },

      deletePackaging: async (id) => {
        try {
          await packagingService.delete(id);
        } catch {
          // Continue local delete
        }
        set((state) => ({
          packagings: state.packagings.filter((p) => p.id !== id),
        }));
      },
    }),
    { name: 'PackagingStore' }
  )
);
