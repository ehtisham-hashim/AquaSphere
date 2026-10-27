/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setCompanyCookie, clearCompanyCookie, setAuthToken, clearAuthToken } from '../utils/companyCookie';
import { API_URL, clearCache } from '../utils/api';

const AuthContext = createContext();

/**
 * Authentication and authorization context provider
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const verifyUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, { credentials: 'include', cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        clearAuthToken();
        clearCache();
        setUser(null);
      }
    } catch (_error) {
      // Retain current session on intermittent network failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyUser();
  }, [verifyUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path === '/login' || path === '/website-admin') return;
      clearAuthToken();
      clearCache();
      setUser(null);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && user) {
        verifyUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, verifyUser]);

  const login = async (email, password, tenant = 'aquasphere') => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenant }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data?.require2FA) {
          return {
            success: true,
            require2FA: true,
            tempToken: data.data.tempToken,
            emailMask: data.data.emailMask,
            resendCooldown: data.data.resendCooldown || 60
          };
        }
        if (data.data?.token) {
          setAuthToken(data.data.token);
        }
        setCompanyCookie(tenant);
        clearCache();
        setUser(data.data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again later.' };
    }
  };

  const verifyOwnerOtp = async (tempToken, otp, tenant = 'aquasphere') => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-owner-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, otp }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data?.token) {
          setAuthToken(data.data.token);
        }
        setCompanyCookie(tenant);
        clearCache();
        setUser(data.data.user);
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message || 'Verification failed' };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again later.' };
    }
  };

  const resendOwnerOtp = async (tempToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/resend-owner-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          resendCooldown: data.data?.resendCooldown || 60,
          tempToken: data.data?.tempToken 
        };
      } else {
        return { success: false, message: data.message || 'Failed to resend code' };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again later.' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (_err) {
      // Ignore network errors on logout
    }
    clearAuthToken();
    clearCompanyCookie();
    clearCache();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, verifyOwnerOtp, resendOwnerOtp }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
