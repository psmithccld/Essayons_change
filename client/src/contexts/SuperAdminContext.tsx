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
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (sessionId: string) => void;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!sessionId;

  const checkAuthStatus = async () => {
    try {
      const storedSessionId = localStorage.getItem("superAdminSessionId");
      if (!storedSessionId) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/super-admin/auth/status", {
        headers: {
          "x-super-admin-session": storedSessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessionId(storedSessionId);
      } else {
        // Invalid session, clear storage
        localStorage.removeItem("superAdminSessionId");
        setUser(null);
        setSessionId(null);
      }
    } catch (error) {
      console.error("Error checking super admin auth status:", error);
      localStorage.removeItem("superAdminSessionId");
      setUser(null);
      setSessionId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newSessionId: string) => {
    setSessionId(newSessionId);
    localStorage.setItem("superAdminSessionId", newSessionId);
    checkAuthStatus();
  };

  const logout = async () => {
    try {
      if (sessionId) {
        await fetch("/api/super-admin/auth/logout", {
          method: "POST",
          headers: {
            "x-super-admin-session": sessionId,
          },
        });
      }
    } catch (error) {
      console.error("Error during super admin logout:", error);
    } finally {
      localStorage.removeItem("superAdminSessionId");
      setUser(null);
      setSessionId(null);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: SuperAdminContextType = {
    user,
    sessionId,
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