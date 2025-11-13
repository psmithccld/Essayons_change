import { ReactNode, useEffect, useRef } from "react";
import { Redirect } from "wouter";
import { useFeatures, type OrganizationFeatures } from "@/hooks/use-features";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface FeatureGateProps {
  children: ReactNode;
  feature?: keyof OrganizationFeatures;
  features?: (keyof OrganizationFeatures)[];
  requireAll?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
  customCheck?: () => boolean;
}

export function FeatureGate({
  children,
  feature,
  features = [],
  requireAll = false,
  redirectTo,
  fallback,
  customCheck
}: FeatureGateProps) {
  const { features: orgFeatures, hasFeature, isLoading, error } = useFeatures();
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  // Check feature access (calculate early, before any returns)
  let hasAccess = false;

  if (!isLoading && !error) {
    if (customCheck) {
      hasAccess = customCheck();
    } else if (feature) {
      hasAccess = hasFeature(feature);
    } else if (features.length > 0) {
      if (requireAll) {
        hasAccess = features.every(f => hasFeature(f as keyof OrganizationFeatures));
      } else {
        hasAccess = features.some(f => hasFeature(f as keyof OrganizationFeatures));
      }
    } else {
      // No features specified, allow access
      hasAccess = true;
    }
  }

  // Calculate display name for feature restriction messages
  const featureName = feature || features[0] || 'this feature';
  const displayName = String(featureName);

  // IMPORTANT: Call all hooks BEFORE any conditional returns (Rules of Hooks)
  // Show toast notification about feature restriction (only once)
  useEffect(() => {
    // Only show toast if not loading, no error, and access is denied
    if (!isLoading && !error && !hasAccess && !hasShownToast.current) {
      toast({
        title: "Feature Not Available",
        description: `The ${displayName} feature is not enabled for your organization.`,
        variant: "destructive",
      });
      hasShownToast.current = true;
    }
  }, [isLoading, error, hasAccess, displayName, toast]);

  // Show loading state while checking features
  if (isLoading) {
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

  // Handle error in features loading
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle>Feature Check Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Unable to verify your organization's features. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    // Redirect if specified
    if (redirectTo) {
      return <Redirect to={redirectTo} />;
    }

    // Show custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default access denied screen
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <CardTitle>Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              The {displayName} feature is not enabled for your organization. Please contact your administrator for access.
            </p>
            <div className="flex gap-2 justify-center">
              <Link to="/" data-testid="link-home">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Go Home
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
                data-testid="button-go-back"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Feature-aware component wrapper for conditional rendering
export function FeatureGuard({
  children,
  feature,
  features = [],
  requireAll = false,
  fallback,
  showFallback = false,
  customCheck
}: Omit<FeatureGateProps, 'redirectTo'> & {
  showFallback?: boolean;
}) {
  const { hasFeature, isLoading } = useFeatures();

  // Show skeleton while loading features
  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  let hasAccess = false;

  if (customCheck) {
    hasAccess = customCheck();
  } else if (feature) {
    hasAccess = hasFeature(feature);
  } else if (features.length > 0) {
    if (requireAll) {
      hasAccess = features.every(f => hasFeature(f as keyof OrganizationFeatures));
    } else {
      hasAccess = features.some(f => hasFeature(f as keyof OrganizationFeatures));
    }
  } else {
    // No features specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    if (showFallback && fallback) {
      return <>{fallback}</>;
    }
    if (showFallback) {
      return (
        <div className="flex items-center space-x-2 text-muted-foreground text-sm">
          <Lock className="w-4 h-4" />
          <span>Feature not available</span>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}

// Feature-aware button component
export function FeatureButton({
  children,
  feature,
  features,
  requireAll,
  customCheck,
  className,
  disabled,
  ...props
}: FeatureGateProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { hasFeature, isLoading } = useFeatures();

  if (isLoading) {
    return (
      <button className={className} disabled={true} {...props}>
        <Skeleton className="h-4 w-16" />
      </button>
    );
  }

  let hasAccess = false;

  if (customCheck) {
    hasAccess = customCheck();
  } else if (feature) {
    hasAccess = hasFeature(feature);
  } else if (features && features.length > 0) {
    if (requireAll) {
      hasAccess = features.every(f => hasFeature(f));
    } else {
      hasAccess = features.some(f => hasFeature(f));
    }
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