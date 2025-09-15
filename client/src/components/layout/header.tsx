import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Change Management Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage organizational change initiatives</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-new-initiative"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Initiative
          </Button>
          <div className="relative">
            <Bell 
              className="text-muted-foreground w-5 h-5 cursor-pointer hover:text-foreground" 
              data-testid="button-notifications"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </div>
        </div>
      </div>
    </header>
  );
}
