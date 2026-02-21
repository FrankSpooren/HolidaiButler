import { create } from 'zustand';

const useThemeStore = create((set) => ({
  mode: localStorage.getItem('hb-admin-theme') || 'light',
  toggleMode: () => set((state) => {
    const next = state.mode === 'light' ? 'dark' : 'light';
    localStorage.setItem('hb-admin-theme', next);
    return { mode: next };
  })
}));

export default useThemeStore;
