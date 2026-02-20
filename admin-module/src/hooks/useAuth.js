import useAuthStore from '../stores/authStore.js';

export default function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthStore();
  return { user, isAuthenticated, isLoading, login, logout };
}
