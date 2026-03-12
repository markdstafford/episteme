import { create } from "zustand";
import { firstCategoryId } from "@/config/settings";

interface SettingsStore {
  settingsOpen: boolean;
  activeCategory: string;
  openSettings: () => void;
  closeSettings: () => void;
  setActiveCategory: (category: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settingsOpen: false,
  activeCategory: firstCategoryId(),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setActiveCategory: (category) => set({ activeCategory: category }),
}));
