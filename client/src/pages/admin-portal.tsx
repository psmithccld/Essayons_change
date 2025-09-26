import { useState, useEffect } from "react";
import { SuperAdminLoginPage } from "@/pages/auth/super-admin-login";
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import { Loader2 } from "lucide-react";

export function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/super-admin/auth/status", {
        credentials: "include",
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SuperAdminLoginPage onAuthSuccess={handleAuthSuccess} />;
  }

  return <SuperAdminDashboard />;
}