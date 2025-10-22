import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      isDark: false,

      toggleTheme: () => {
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
          isDark: !state.isDark,
        }));
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({
          theme,
          isDark: theme === 'dark',
        });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

