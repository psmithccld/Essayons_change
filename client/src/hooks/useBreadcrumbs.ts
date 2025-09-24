import { useLocation } from "wouter";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const [location] = useLocation();
  const { currentProject } = useCurrentProject();

  // Define the page hierarchy and titles
  const pageConfig: Record<string, { title: string; parent?: string; requiresProject?: boolean }> = {
    "/": { title: "Overview" },
    "/projects": { title: "Projects" },
    "/tasks": { title: "Tasks & To Do", requiresProject: true },
    "/checklist-templates": { title: "Checklist Templates", requiresProject: true },
    "/gantt": { title: "Initiative Timeline", requiresProject: true },
    "/raid-logs": { title: "RAID Logs", requiresProject: true },
    "/reports": { title: "Reports", requiresProject: true },
    "/communications": { title: "Communications", requiresProject: true },
    "/stakeholders": { title: "Stakeholders", requiresProject: true },
    "/surveys": { title: "Readiness Surveys", requiresProject: true },
    "/change-artifacts": { title: "Change Artifacts", requiresProject: true },
    "/gpt-coach": { title: "GPT Coach", requiresProject: true },
    "/change-process-flow": { title: "Change Process Flow", requiresProject: true },
    "/process-mapping": { title: "Development Maps", requiresProject: true },
    "/users": { title: "User Management" },
    "/initiatives": { title: "Initiative Management" },
    "/security": { title: "Security Management" },
    "/organization": { title: "Organization Settings" },
  };

  const breadcrumbs: BreadcrumbItem[] = [];

  // Add Home/Organization root
  breadcrumbs.push({
    label: "Home",
    href: "/",
    isCurrentPage: location === "/"
  });

  // Add current project if we're in a project-specific page
  const currentPageConfig = pageConfig[location];
  if (currentPageConfig?.requiresProject && currentProject) {
    breadcrumbs.push({
      label: currentProject.name,
      href: "/", // Home shows project overview
      isCurrentPage: false
    });
  }

  // Add current page (if not home)
  if (location !== "/" && currentPageConfig) {
    breadcrumbs.push({
      label: currentPageConfig.title,
      isCurrentPage: true
    });
  }

  return breadcrumbs;
}