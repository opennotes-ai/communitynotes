import { useState, useEffect } from 'react';

export interface User {
  id: string;
  discordId: string;
  username: string;
  permissions: {
    canRequestNotes: boolean;
    canCreateNotes: boolean;
    canRateNotes: boolean;
    isModerator: boolean;
    isVerified: boolean;
    verificationLevel: string;
  };
}

interface AuthResponse {
  token: string;
  user: User;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dashboard_token');
    const userData = localStorage.getItem('dashboard_user');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('dashboard_token');
        localStorage.removeItem('dashboard_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (discordId: string, token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/dashboard/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ discordId, token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data: AuthResponse = await response.json();

      localStorage.setItem('dashboard_token', data.token);
      localStorage.setItem('dashboard_user', JSON.stringify(data.user));

      setUser(data.user);
      setIsAuthenticated(true);

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('dashboard_token');
    localStorage.removeItem('dashboard_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const getAuthToken = (): string | null => {
    return localStorage.getItem('dashboard_token');
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    getAuthToken,
  };
}