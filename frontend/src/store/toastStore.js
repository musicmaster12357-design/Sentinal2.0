import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, ...toast }] }));
    
    // Auto remove after duration
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 3000);
  },
  removeToast: (id) => 
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Helper function for easier imports
export const toast = {
  success: (message) => useToastStore.getState().addToast({ message, type: 'success' }),
  error: (message) => useToastStore.getState().addToast({ message, type: 'error' }),
  info: (message) => useToastStore.getState().addToast({ message, type: 'info' }),
  warning: (message) => useToastStore.getState().addToast({ message, type: 'warning' }),
};
