import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  ChartLine,
  ListTodo,
  ChartGantt,
  AlertTriangle,
  ChartBar,
  Megaphone,
  Users,
  ClipboardCheck,
  Bot,
  Fish,
  GitBranch,
  Brain,
  Settings
} from "lucide-react";

const navigationSections = [
  {
    title: "Dashboard",
    items: [
      { icon: ChartLine, label: "Overview", path: "/" }
    ]
  },
  {
    title: "PMIS Tools", 
    items: [
      { icon: ListTodo, label: "ListTodo & Projects", path: "/tasks" },
      { icon: ChartGantt, label: "Gantt Charts", path: "/gantt" },
      { icon: AlertTriangle, label: "RAID Logs", path: "/raid-logs" },
      { icon: ChartBar, label: "Progress Reports", path: "/" }
    ]
  },
  {
    title: "Change Management",
    items: [
      { icon: Megaphone, label: "Communications", path: "/communications" },
      { icon: Users, label: "Stakeholders", path: "/stakeholders" },
      { icon: ClipboardCheck, label: "Readiness Surveys", path: "/surveys" },
      { icon: Bot, label: "GPT Coach", path: "/gpt-coach" }
    ]
  },
  {
    title: "Visual Tools",
    items: [
      { icon: Fish, label: "Fishbone Analysis", path: "/fishbone" },
      { icon: GitBranch, label: "Process Mapping", path: "/process-mapping" },
      { icon: Brain, label: "Mind Maps", path: "/mind-maps" }
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChartLine className="text-primary-foreground w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">CMIS</h1>
            <p className="text-xs text-muted-foreground">Change Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const isActive = location === item.path;
                const IconComponent = item.icon;
                
                return (
                  <Link key={itemIndex} href={item.path}>
                    <a 
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-foreground hover:bg-muted"
                      )}
                      data-testid={`nav-${item.label.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-secondary-foreground">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Dr. Jane Doe</p>
            <p className="text-xs text-muted-foreground truncate">PhD Candidate</p>
          </div>
          <Settings 
            className="text-muted-foreground w-4 h-4 cursor-pointer hover:text-foreground" 
            data-testid="settings-button"
          />
        </div>
      </div>
    </div>
  );
}
