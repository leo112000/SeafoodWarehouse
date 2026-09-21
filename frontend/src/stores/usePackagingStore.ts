import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PackagingType } from '@/types/seafood';
import { packagingService } from '@/services/packagingService';

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
        const newPackaging = await packagingService.create(packagingData);
        if (newPackaging) {
          set((state) => ({ packagings: [newPackaging, ...state.packagings] }));
        }
        return newPackaging;
      },

      updatePackaging: async (id, packagingData) => {
        await packagingService.update(id, packagingData);
        set((state) => ({
          packagings: state.packagings.map((p) =>
            p.id === id ? { ...p, ...packagingData, id } : p
          ),
        }));
      },

      deletePackaging: async (id) => {
        await packagingService.delete(id);
        set((state) => ({
          packagings: state.packagings.filter((p) => p.id !== id),
        }));
      },
    }),
    { name: 'PackagingStore' }
  )
);
