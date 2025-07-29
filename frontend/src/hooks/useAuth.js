import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';


const TOKEN_KEY = 'authToken';

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await authService.login({ email, password });
      localStorage.setItem(TOKEN_KEY, access_token);
      setToken(access_token);
      // Fetch user profile after login
      await fetchUserProfile(access_token);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      await authService.register(payload);
      return login(payload.email, payload.password);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    window.location.replace('/login'); // Redirect to login page

  }, []);

  const fetchUserProfile = useCallback(async (token) => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch user profile');
      logout(); // Log out if profile fetch fails (e.g., invalid token)
    }
  }, [logout]);

  useEffect(() => {
    if (token && !user) {
      fetchUserProfile(token);
    }
  }, [token, fetchUserProfile]);

  return { user, token, login, register, logout, loading, error, fetchUserProfile };
};