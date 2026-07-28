import { createContext, useContext, useState, useEffect } from 'react';
import { setCompanyCookie } from '../../utils/companyCookie';

const AuthContext = createContext();
const API = import.meta.env.VITE_API_URL || '/api/v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUser(data.data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, []);

  const login = async (email, password, tenant = 'aquasphere') => {
    try {
      setCompanyCookie(tenant);
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenant }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error. Please try again later.' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      // Ignore network errors on logout
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
