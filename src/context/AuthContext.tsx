import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'STAFF';
  firstName: string;
  lastName: string;
  canSwitchAdmin?: boolean;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  settings: any;
  token: string | null;
  login: (token: string, user: User, settings: any) => void;
  logout: () => void;
  switchRole: (targetRole: "ADMIN" | "STAFF") => Promise<void>;
  updateSettings: (newSettings: any) => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [settings, setSettings] = useState<any>(() => {
    const cached = localStorage.getItem('settings');
    return cached ? JSON.parse(cached) : {};
  });
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
              window.location.replace('/login');
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
          
          if (res.status === 401 || res.status === 403) {
             logout();
             return;
          }
          
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            if (data.settings) {
              setSettings(data.settings);
              localStorage.setItem('settings', JSON.stringify(data.settings));
            }
          } else {
            // Server error or other issue, don't logout but maybe user is not loaded
            console.error('Failed to fetch user:', res.status);
            // We could optionally load user from localStorage if we cached it, but for now we just don't logout.
          }
        } catch (error) {
          console.error('Network or fetch error during initAuth:', error);
          // Don't logout on network errors (e.g. offline or cancelled fetch)
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = (newToken: string, userData: User, newSettings?: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    if (newSettings) {
      setSettings(newSettings);
      localStorage.setItem('settings', JSON.stringify(newSettings));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('settings');
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

  const updateUser = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const updateSettings = (newSettings: any) => {
    setSettings(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
  };

  return (
    <AuthContext.Provider value={{ user, settings, token, login, logout, switchRole, updateSettings, updateUser, isLoading }}>
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
