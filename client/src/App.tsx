import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrentProjectProvider } from "@/contexts/CurrentProjectContext";
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
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/checklist-templates" component={ChecklistTemplates} />
            <Route path="/gantt" component={GanttChart} />
            <Route path="/raid-logs" component={RaidLogs} />
            <Route path="/communications" component={Communications} />
            <Route path="/stakeholders" component={Stakeholders} />
            <Route path="/surveys" component={Surveys} />
            <Route path="/gpt-coach" component={GptCoach} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentProjectProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </CurrentProjectProvider>
    </QueryClientProvider>
  );
}

export default App;
