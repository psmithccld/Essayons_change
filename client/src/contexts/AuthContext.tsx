import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  isEmailVerified: boolean;
  roleId: string;
}

interface Role {
  id: string;
  name: string;
  permissions: any;
}

interface AuthContextType {
  user: User | null;
  role: Role | null;
  permissions: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
}

interface AuthResponse {
  user: User;
  role: Role;
  permissions: any;
  sessionEstablished: boolean;
  message?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<any>(null);

  // Check authentication status on app load
  const { data: authStatus, isLoading } = useQuery({
    queryKey: ['/api/auth/status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include',
        });
        
        if (response.status === 401) {
          return null; // Not authenticated
        }

        if (!response.ok) {
          throw new Error('Failed to check auth status');
        }

        return response.json();
      } catch (error) {
        console.error('Auth status check failed:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout');
      return response.json();
    },
    onSuccess: () => {
      setUser(null);
      setRole(null);
      setPermissions(null);
      queryClient.clear(); // Clear all cached data
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // Still clear local state even if API call fails
      setUser(null);
      setRole(null);
      setPermissions(null);
      queryClient.clear();
    },
  });

  // Update auth state when status changes
  useEffect(() => {
    if (authStatus) {
      setUser(authStatus.user);
      setRole(authStatus.role);
      setPermissions(authStatus.permissions);
    } else {
      setUser(null);
      setRole(null);
      setPermissions(null);
    }
  }, [authStatus]);

  const login = (authData: AuthResponse) => {
    setUser(authData.user);
    setRole(authData.role);
    setPermissions(authData.permissions);
    // Invalidate auth status to refresh it
    queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const value: AuthContextType = {
    user,
    role,
    permissions,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}