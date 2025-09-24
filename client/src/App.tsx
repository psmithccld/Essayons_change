import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrentProjectProvider } from "@/contexts/CurrentProjectContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import ChecklistTemplates from "@/pages/checklist-templates";
import GanttChart from "@/pages/gantt";
import RaidLogs from "@/pages/raid-logs";
import Communications from "@/pages/communications";
import Stakeholders from "@/pages/stakeholders";
import Surveys from "@/pages/surveys";
import GptCoach from "@/pages/gpt-coach";
import ProcessMapping from "@/pages/process-mapping";
import ChangeArtifacts from "@/pages/change-artifacts";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import UserManagement from "@/pages/user-management";
import InitiativeManagement from "@/pages/initiative-management";
import SecurityManagement from "@/pages/security-management";
import ChangeProcessFlow from "@/pages/fishbone";
import Reports from "@/pages/reports";
import Projects from "@/pages/projects";
import OrganizationSettings from "@/pages/organization-settings";
import { LoginPage } from "@/pages/auth/login";
import { EmailVerifyPage } from "@/pages/auth/verify-email";
import { Loader2 } from "lucide-react";
import { HelpDeskButton } from "@/components/HelpDeskButton";
import { AppBreadcrumbs } from "@/components/layout/AppBreadcrumbs";

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
  const { login } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AppBreadcrumbs />
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
            <Route path="/gpt-coach" component={GptCoach} />
            <Route path="/user-management" component={UserManagement} />
            <Route path="/initiatives" component={InitiativeManagement} />
            <Route path="/security" component={SecurityManagement} />
            <Route path="/organization" component={OrganizationSettings} />
            <Route path="/process-mapping" component={ProcessMapping} />
            <Route path="/change-process-flow" component={ChangeProcessFlow} />
            <Route path="/change-artifacts" component={ChangeArtifacts} />
            <Route path="/reports" component={Reports} />
            <Route path="/verify-email" component={() => <EmailVerifyPage onAuthSuccess={login} />} />
            <Route component={NotFound} />
          </Switch>
        </main>
        
        {/* Global Helpdesk Support Button */}
        <HelpDeskButton />
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, login } = useAuth();

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
        <CurrentProjectProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CurrentProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
