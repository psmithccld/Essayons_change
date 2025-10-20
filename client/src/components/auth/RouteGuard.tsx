import { ReactNode } from "react";
import { Redirect } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permissions } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface RouteGuardProps {
  children: ReactNode;
  permission?: keyof Permissions;
  permissions?: (keyof Permissions)[];
  requireAll?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function RouteGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  redirectTo,
  fallback
}: RouteGuardProps) {
  const { isLoading, isError, hasPermission, hasAllPermissions, hasAnyPermission, permissions: userPermissions } = usePermissions();

  // Show loading state while checking permissions
  // Also ensure we don't proceed if permissions object is undefined (additional safety check)
  if (isLoading || !userPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Handle error in permissions loading
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle>Permission Check Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Unable to verify your access permissions. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check permissions
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
    console.log("[RouteGuard] Single permission check:", { 
      permission, 
      hasAccess, 
      permissionValue: userPermissions?.[permission],
      timestamp: new Date().toISOString() 
    });
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(...permissions) : hasAnyPermission(...permissions);
    console.log("[RouteGuard] Multiple permissions check:", { 
      permissions, 
      requireAll, 
      hasAccess, 
      timestamp: new Date().toISOString() 
    });
  } else {
    // No permissions specified, allow access
    hasAccess = true;
    console.log("[RouteGuard] No permissions required - allowing access", { timestamp: new Date().toISOString() });
  }

  console.log("[RouteGuard] Final access decision:", { 
    hasAccess, 
    willShowAccessDenied: !hasAccess,
    timestamp: new Date().toISOString() 
  });

  // If no access, handle redirect or show fallback
  if (!hasAccess) {
    console.log("[RouteGuard] DENYING ACCESS - showing access denied page", { 
      redirectTo, 
      hasFallback: !!fallback,
      timestamp: new Date().toISOString() 
    });
    
    if (redirectTo) {
      return <Redirect to={redirectTo} />;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    // Default access denied page
    return <AccessDeniedPage />;
  }

  console.log("[RouteGuard] ALLOWING ACCESS - rendering children", { timestamp: new Date().toISOString() });

  return <>{children}</>;
}

export function AccessDeniedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/">
              <Button variant="default" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Link>
            <Button 
              variant="outline"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProtectedRoute({ 
  children, 
  permission, 
  permissions, 
  requireAll = false
}: RouteGuardProps) {
  return (
    <RouteGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      redirectTo="/"
    >
      {children}
    </RouteGuard>
  );
}