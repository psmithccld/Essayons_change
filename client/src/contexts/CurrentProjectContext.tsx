import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Project } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface CurrentProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
}

const CurrentProjectContext = createContext<CurrentProjectContextType | undefined>(undefined);

export function CurrentProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  
  // Fetch all projects
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Set current project with localStorage persistence
  const setCurrentProject = (project: Project | null) => {
    setCurrentProjectState(project);
    if (project) {
      localStorage.setItem('currentProjectId', project.id);
    } else {
      localStorage.removeItem('currentProjectId');
    }
  };

  // Load saved project from localStorage and set default
  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      
      if (savedProjectId) {
        // Try to find the saved project
        const savedProject = projects.find(p => p.id === savedProjectId);
        if (savedProject) {
          setCurrentProjectState(savedProject);
          return;
        }
      }
      
      // If no saved project or saved project not found, select the first one
      if (!currentProject) {
        const firstProject = projects[0];
        setCurrentProject(firstProject);
      }
    }
  }, [projects, isLoading, currentProject]);

  // Update current project reference when projects list changes
  useEffect(() => {
    if (currentProject && projects.length > 0) {
      const updatedProject = projects.find(p => p.id === currentProject.id);
      if (updatedProject && updatedProject !== currentProject) {
        setCurrentProjectState(updatedProject);
      }
    }
  }, [projects, currentProject]);

  return (
    <CurrentProjectContext.Provider value={{
      currentProject,
      setCurrentProject,
      projects,
      isLoading,
      error: error as Error | null
    }}>
      {children}
    </CurrentProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const context = useContext(CurrentProjectContext);
  if (!context) {
    throw new Error('useCurrentProject must be used within a CurrentProjectProvider');
  }
  return context;
}