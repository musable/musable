import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData } from '../types';
import { apiService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  getProfile: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfilePicture: (file: File) => Promise<void>;
  deleteProfilePicture: () => Promise<void>;
  clearError: () => void;
  validateInvite: (token: string) => Promise<boolean>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.login(credentials);
          const { user, token } = response.data;
          
          localStorage.setItem('authToken', token);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.register(data);
          const { user, token } = response.data;
          
          localStorage.setItem('authToken', token);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Call API logout endpoint (fire and forget)
        apiService.logout().catch(console.error);
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      getProfile: async () => {
        const token = get().token || localStorage.getItem('authToken');
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await apiService.getProfile();
          const { user } = response.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Failed to get profile',
          });
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.changePassword({
            currentPassword,
            newPassword,
          });
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to change password',
            isLoading: false,
          });
          throw error;
        }
      },

      updateProfilePicture: async (file) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.updateProfilePicture(file);
          const { user } = response.data;
          
          set({
            user,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to update profile picture',
            isLoading: false,
          });
          throw error;
        }
      },

      deleteProfilePicture: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.deleteProfilePicture();
          const { user } = response.data;
          
          set({
            user,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to delete profile picture',
            isLoading: false,
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      validateInvite: async (token) => {
        try {
          const response = await apiService.validateInvite(token);
          return response.data.valid;
        } catch (error: any) {
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state from localStorage on app start
if (typeof window !== 'undefined') {
  // Wait for the store to rehydrate, then check auth
  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Set loading state and attempt to get profile
      useAuthStore.setState({ isLoading: true });
      useAuthStore.getState().getProfile();
    }
  };

  // Check if store has been persisted/rehydrated
  const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
    checkAuth();
    unsubscribe();
  });

  // Fallback - if hydration has already finished, check immediately
  if (useAuthStore.persist.hasHydrated()) {
    checkAuth();
  }
}