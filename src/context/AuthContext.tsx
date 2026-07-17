import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'STAFF';
  firstName: string;
  lastName: string;
  canSwitchAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  settings: any;
  token: string | null;
  login: (token: string, user: User, settings: any) => void;
  logout: () => void;
  switchRole: (targetRole: "ADMIN" | "STAFF") => Promise<void>;
  updateSettings: (newSettings: any) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const originalFetch = window.fetch;
    try {
      Object.defineProperty(window, 'fetch', {
        value: async (...args: Parameters<typeof fetch>) => {
          const response = await originalFetch(...args);
          if (response.status === 401 || response.status === 403) {
            logout();
            // Option to redirect to login if not already there, unless it's a kiosk view
            if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/kiosk')) {
              window.location.href = '/login';
            }
          }
          return response;
        },
        configurable: true,
        writable: true
      });
    } catch (e) {
      console.warn('Could not override window.fetch:', e);
    }
    return () => {
      try {
        Object.defineProperty(window, 'fetch', {
          value: originalFetch,
          configurable: true,
          writable: true
        });
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch('/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Invalid token');
          const data = await res.json();
          setUser(data.user);
          if (data.settings) setSettings(data.settings);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = (newToken: string, userData: User, newSettings?: any) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    if (newSettings) setSettings(newSettings);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSettings({});
  };

  
  const switchRole = async (targetRole: "ADMIN" | "STAFF") => {
    if (!token) return;
    try {
      const res = await fetch('/api/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetRole })
      });
      if (!res.ok) throw new Error('Failed to switch role');
      const data = await res.json();
      login(data.token, data.user, settings);
    } catch (error) {
      console.error(error);
      alert('Error switching roles');
    }
  };

  const updateSettings = (newSettings: any) => {
    setSettings(newSettings);
  };

  return (
    <AuthContext.Provider value={{ user, settings, token, login, logout, switchRole, updateSettings, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
