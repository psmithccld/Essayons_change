import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SuperAdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt?: Date;
}

interface SuperAdminContextType {
  user: SuperAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error("useSuperAdmin must be used within a SuperAdminProvider");
  }
  return context;
}

interface SuperAdminProviderProps {
  children: ReactNode;
}

export function SuperAdminProvider({ children }: SuperAdminProviderProps) {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const checkAuthStatus = async () => {
    try {
      // SECURITY: No need to send headers - cookies are automatically included
      const response = await fetch("/api/super-admin/auth/status", {
        credentials: 'include' // Ensure cookies are included in the request
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Invalid session, user will be redirected to login
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking super admin auth status:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    // SECURITY: No sessionId needed - cookies handle session automatically
    checkAuthStatus();
  };

  const logout = async () => {
    try {
      // SECURITY: No headers needed - cookies are automatically included
      await fetch("/api/super-admin/auth/logout", {
        method: "POST",
        credentials: 'include' // Ensure cookies are included
      });
    } catch (error) {
      console.error("Error during super admin logout:", error);
    } finally {
      // Cookie is cleared on server side, just clear local state
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: SuperAdminContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
}