import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null, // { email, role, user_id }
  token: localStorage.getItem('token') || null,
  
  login: (userData, token) => {
    localStorage.setItem('token', token)
    set({ user: userData, token })
  },
  
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
  
  setUser: (userData) => set({ user: userData })
}))
