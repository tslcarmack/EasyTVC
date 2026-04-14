import { create } from 'zustand';
import { apiFetch, setTokens, clearTokens } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.success && res.data) {
      setTokens(res.data.accessToken, res.data.refreshToken);
      set({ user: res.data.user, isAuthenticated: true });
      return { success: true };
    }

    return { success: false, error: res.error };
  },

  register: async (email, password, name) => {
    const res = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (res.success && res.data) {
      setTokens(res.data.accessToken, res.data.refreshToken);
      set({ user: res.data.user, isAuthenticated: true });
      return { success: true };
    }

    return { success: false, error: res.error };
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const res = await apiFetch<User>('/auth/me');
    if (res.success && res.data) {
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } else {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
