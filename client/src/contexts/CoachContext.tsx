import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";
import { useCurrentProject } from "./CurrentProjectContext";
import { useAuth } from "./AuthContext";
import type { 
  CoachContextPayload, 
  CoachContextPage, 
  CoachContextSelections, 
  CoachContextSnapshot 
} from "@shared/schema";

interface CoachContextValue {
  contextPayload: CoachContextPayload;
  updatePageContext: (pageName: CoachContextPage, selections?: CoachContextSelections) => void;
  updateSnapshot: (snapshot: Partial<CoachContextSnapshot>) => void;
  clearContext: () => void;
}

const CoachContext = createContext<CoachContextValue | undefined>(undefined);

interface CoachContextProviderProps {
  children: ReactNode;
}

// Helper to map pathname to page name
const getPageNameFromPath = (pathname: string): CoachContextPage => {
  const path = pathname.toLowerCase();
  
  if (path === "/" || path === "/dashboard") return "dashboard";
  if (path.startsWith("/projects")) return "projects";
  if (path.startsWith("/tasks")) return "tasks";
  if (path.startsWith("/stakeholders")) return "stakeholders";
  if (path.startsWith("/raid-logs")) return "raid-logs";
  if (path.startsWith("/communications")) return "communications";
  if (path.startsWith("/surveys")) return "surveys";
  if (path.startsWith("/gpt-coach")) return "gpt-coach";
  if (path.startsWith("/gantt")) return "gantt";
  if (path.startsWith("/process-mapping")) return "process-mapping";
  
  // Default fallback
  return "dashboard";
};

export function CoachContextProvider({ children }: CoachContextProviderProps) {
  const [location] = useLocation();
  const { currentProject } = useCurrentProject();
  const { user } = useAuth();
  
  // Context state
  const [contextPayload, setContextPayload] = useState<CoachContextPayload>({
    pathname: location,
    pageName: getPageNameFromPath(location),
    userId: user?.id,
    currentOrganizationId: user?.organizationId,
    currentProjectId: currentProject?.id,
    currentProjectName: currentProject?.name,
    userRole: user?.role,
    selections: undefined,
    snapshot: undefined,
  });

  // Update location context when route changes
  useEffect(() => {
    const pageName = getPageNameFromPath(location);
    setContextPayload(prev => ({
      ...prev,
      pathname: location,
      pageName,
      // Clear selections when changing pages
      selections: undefined,
    }));
  }, [location]);

  // Update project context when project changes
  useEffect(() => {
    setContextPayload(prev => ({
      ...prev,
      currentProjectId: currentProject?.id,
      currentProjectName: currentProject?.name,
    }));
  }, [currentProject]);

  // Update auth context when user changes
  useEffect(() => {
    setContextPayload(prev => ({
      ...prev,
      userId: user?.id,
      currentOrganizationId: user?.organizationId,
      userRole: user?.role,
    }));
  }, [user]);

  // Update page-specific context (called by individual pages)
  const updatePageContext = useCallback((pageName: CoachContextPage, selections?: CoachContextSelections) => {
    setContextPayload(prev => ({
      ...prev,
      pageName,
      selections,
    }));
  }, []);

  // Update data snapshot (called by pages with fresh data)
  const updateSnapshot = useCallback((snapshot: Partial<CoachContextSnapshot>) => {
    setContextPayload(prev => ({
      ...prev,
      snapshot: {
        ...prev.snapshot,
        ...snapshot,
      },
    }));
  }, []);

  // Clear context (useful for cleanup)
  const clearContext = useCallback(() => {
    setContextPayload(prev => ({
      ...prev,
      selections: undefined,
      snapshot: undefined,
    }));
  }, []);

  const contextValue: CoachContextValue = {
    contextPayload,
    updatePageContext,
    updateSnapshot,
    clearContext,
  };

  return (
    <CoachContext.Provider value={contextValue}>
      {children}
    </CoachContext.Provider>
  );
}

// Hook to use coach context
export function useCoachContext() {
  const context = useContext(CoachContext);
  if (context === undefined) {
    throw new Error("useCoachContext must be used within a CoachContextProvider");
  }
  return context;
}

// Hook for pages to register their context (with debouncing)
export function usePageContext(pageName: CoachContextPage, selections?: CoachContextSelections) {
  const { updatePageContext } = useCoachContext();

  useEffect(() => {
    // Debounce rapid context updates
    const timeoutId = setTimeout(() => {
      updatePageContext(pageName, selections);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [updatePageContext, pageName, selections]);
}

// Hook for pages to provide data snapshots
export function useDataSnapshot(snapshot: Partial<CoachContextSnapshot>) {
  const { updateSnapshot } = useCoachContext();
  
  useEffect(() => {
    if (snapshot && Object.keys(snapshot).length > 0) {
      updateSnapshot(snapshot);
    }
  }, [updateSnapshot, snapshot]);
}