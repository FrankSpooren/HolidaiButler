/**
 * UI Store - UI state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUIStore = create(
  persist(
    (set, get) => ({
      // Sidebar state
      sidebarOpen: true,
      sidebarCollapsed: false,

      // Theme
      darkMode: false,

      // Active views
      activeView: 'kanban', // 'kanban' | 'list' | 'table'

      // Modal state
      modals: {
        createDeal: false,
        editDeal: false,
        createContact: false,
        editContact: false,
        createAccount: false,
        editAccount: false,
        createTask: false,
        editTask: false,
        import: false,
        export: false,
        settings: false
      },
      modalData: null,

      // Selected items for bulk actions
      selectedItems: [],

      // Search
      globalSearch: '',

      // Actions
      toggleSidebar: () => {
        set({ sidebarOpen: !get().sidebarOpen });
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      toggleSidebarCollapse: () => {
        set({ sidebarCollapsed: !get().sidebarCollapsed });
      },

      toggleDarkMode: () => {
        set({ darkMode: !get().darkMode });
      },

      setActiveView: (view) => {
        set({ activeView: view });
      },

      openModal: (modalName, data = null) => {
        set({
          modals: { ...get().modals, [modalName]: true },
          modalData: data
        });
      },

      closeModal: (modalName) => {
        set({
          modals: { ...get().modals, [modalName]: false },
          modalData: null
        });
      },

      closeAllModals: () => {
        const modals = Object.keys(get().modals).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {});
        set({ modals, modalData: null });
      },

      setSelectedItems: (items) => {
        set({ selectedItems: items });
      },

      addSelectedItem: (item) => {
        const { selectedItems } = get();
        if (!selectedItems.includes(item)) {
          set({ selectedItems: [...selectedItems, item] });
        }
      },

      removeSelectedItem: (item) => {
        set({
          selectedItems: get().selectedItems.filter((i) => i !== item)
        });
      },

      toggleSelectedItem: (item) => {
        const { selectedItems } = get();
        if (selectedItems.includes(item)) {
          get().removeSelectedItem(item);
        } else {
          get().addSelectedItem(item);
        }
      },

      clearSelectedItems: () => {
        set({ selectedItems: [] });
      },

      setGlobalSearch: (search) => {
        set({ globalSearch: search });
      }
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        darkMode: state.darkMode,
        activeView: state.activeView
      })
    }
  )
);

export default useUIStore;
