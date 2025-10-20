import { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permissions } from "@shared/schema";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PermissionGateProps {
  children: ReactNode;
  permission?: keyof Permissions;
  permissions?: (keyof Permissions)[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, ANY permission
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function PermissionGate({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false,
  fallback,
  showFallback = false
}: PermissionGateProps) {
  const { isLoading, hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  // Show skeleton while loading permissions
  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(...permissions) : hasAnyPermission(...permissions);
  } else {
    // No permissions specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    if (showFallback && fallback) {
      return <>{fallback}</>;
    }
    if (showFallback) {
      return (
        <div className="flex items-center space-x-2 text-muted-foreground text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Access restricted</span>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}

export function PermissionButton({ 
  children, 
  permission, 
  permissions, 
  requireAll,
  className,
  disabled,
  ...props 
}: PermissionGateProps & any) {
  const { isLoading, hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  if (isLoading) {
    return (
      <button className={className} disabled={true} {...props}>
        <Skeleton className="h-4 w-16" />
      </button>
    );
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(...permissions) : hasAnyPermission(...permissions);
  } else {
    hasAccess = true;
  }

  return (
    <button 
      className={className} 
      disabled={disabled || !hasAccess} 
      {...props}
      style={{
        opacity: hasAccess ? 1 : 0.5,
        cursor: hasAccess ? 'pointer' : 'not-allowed',
        ...props.style
      }}
    >
      {children}
    </button>
  );
}