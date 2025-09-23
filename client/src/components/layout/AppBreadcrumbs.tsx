import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export function AppBreadcrumbs() {
  const breadcrumbs = useBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs for single-level navigation
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <div key={index} className="flex items-center">
              <BreadcrumbItem>
                {breadcrumb.isCurrentPage || isLast ? (
                  <BreadcrumbPage data-testid={`breadcrumb-current-${breadcrumb.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {breadcrumb.label}
                  </BreadcrumbPage>
                ) : breadcrumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={breadcrumb.href} data-testid={`breadcrumb-link-${breadcrumb.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {breadcrumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span data-testid={`breadcrumb-text-${breadcrumb.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {breadcrumb.label}
                  </span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}