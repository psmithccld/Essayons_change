import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrentProjectProvider } from "@/contexts/CurrentProjectContext";
import { CoachContextProvider } from "@/contexts/CoachContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { Suspense, lazy } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { LoginPage } from "@/pages/auth/login";
import { EmailVerifyPage } from "@/pages/auth/verify-email";
import { Loader2 } from "lucide-react";
import { AppBreadcrumbs } from "@/components/layout/AppBreadcrumbs";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useToast } from "@/hooks/use-toast";

// Code splitting: Lazy load all pages except login/verify to reduce initial bundle size
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Tasks = lazy(() => import("@/pages/tasks"));
const ChecklistTemplates = lazy(() => import("@/pages/checklist-templates"));
const GanttChart = lazy(() => import("@/pages/gantt"));
const RaidLogs = lazy(() => import("@/pages/raid-logs"));
const Communications = lazy(() => import("@/pages/communications"));
const Stakeholders = lazy(() => import("@/pages/stakeholders"));
const Surveys = lazy(() => import("@/pages/surveys"));
const SurveyTake = lazy(() => import("@/pages/survey-take"));
const GptCoach = lazy(() => import("@/pages/gpt-coach"));
const ProcessMapping = lazy(() => import("@/pages/process-mapping"));
const ChangeArtifacts = lazy(() => import("@/pages/change-artifacts"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const InitiativeManagement = lazy(() => import("@/pages/initiative-management"));
const SecurityManagement = lazy(() => import("@/pages/security-management"));
const ChangeProcessFlow = lazy(() => import("@/pages/fishbone"));
const Reports = lazy(() => import("@/pages/reports"));
const Projects = lazy(() => import("@/pages/projects"));
const OrganizationSettings = lazy(() => import("@/pages/organization-settings"));
const SuperAdminApp = lazy(() => import("@/pages/super-admin/super-admin-app"));
const AdminPortal = lazy(() => import("@/pages/admin-portal").then(module => ({ default: module.AdminPortal })));

// Lazy load heavy global components to defer their loading
const HelpDeskButton = lazy(() => import("@/components/HelpDeskButton").then(module => ({ default: module.HelpDeskButton })));
const PersistentAICoach = lazy(() => import("@/components/PersistentAICoach"));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { login, logout } = useAuth();
  const { toast } = useToast();

  // Idle timeout: logout after 20 minutes of inactivity
  useIdleTimeout({
    onIdle: () => {
      toast({
        title: "Session Expired",
        description: "You've been logged out due to inactivity.",
        variant: "default",
      });
      logout();
    },
    idleTime: 20 * 60 * 1000, // 20 minutes
    enabled: true,
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AppBreadcrumbs />
          <Suspense fallback={<LoadingSpinner />}>
            <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/checklist-templates" component={ChecklistTemplates} />
            <Route path="/gantt" component={GanttChart} />
            <Route path="/raid-logs" component={RaidLogs} />
            <Route path="/communications" component={Communications} />
            <Route path="/stakeholders" component={Stakeholders} />
            <Route path="/surveys" component={Surveys} />
            <Route path="/surveys/take/:surveyId" component={SurveyTake} />
            <Route path="/gpt-coach" component={GptCoach} />
            <Route path="/user-management" component={UserManagement} />
            <Route path="/users" component={UserManagement} />
            <Route path="/initiatives" component={InitiativeManagement} />
            <Route path="/security" component={SecurityManagement} />
            <Route path="/security/roles" component={SecurityManagement} />
            <Route path="/organization" component={OrganizationSettings} />
            <Route path="/process-mapping" component={ProcessMapping} />
            <Route path="/change-process-flow" component={ChangeProcessFlow} />
            <Route path="/change-artifacts" component={ChangeArtifacts} />
            <Route path="/reports" component={Reports} />
            <Route path="/verify-email" component={() => <EmailVerifyPage onAuthSuccess={login} />} />
            <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
        
        {/* Global Helpdesk Support Button - Lazy loaded */}
        <Suspense fallback={null}>
          <HelpDeskButton />
        </Suspense>
        
        {/* Persistent AI Coach - Available on all screens - Lazy loaded */}
        <Suspense fallback={null}>
          <PersistentAICoach />
        </Suspense>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [location] = useLocation();

  // Check if accessing Super Admin routes
  if (location.startsWith("/super-admin")) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SuperAdminApp />
      </Suspense>
    );
  }

  // Check if accessing hidden Admin Portal
  if (location === "/admin-portal") {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminPortal />
      </Suspense>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/verify-email" component={() => <EmailVerifyPage onAuthSuccess={login} />} />
        <Route component={() => <LoginPage onAuthSuccess={login} />} />
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImpersonationProvider>
          <CurrentProjectProvider>
            <CoachContextProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </CoachContextProvider>
          </CurrentProjectProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
