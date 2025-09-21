import { useState, useMemo } from "react";
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
  ListChecks,
  GripVertical,
  Briefcase,
  Shield,
  Building,
  FolderOpen
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permissions } from "@shared/schema";

type NavigationItem = {
  id: string;
  icon: any;
  label: string;
  path: string;
  permissions?: (keyof Permissions)[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  customCheck?: () => boolean;
};

// All navigation items with permission requirements
const allNavigationItems: NavigationItem[] = [
  { id: "overview", icon: ChartLine, label: "Overview", path: "/" },
  { id: "projects", icon: FolderOpen, label: "Projects", path: "/projects", permissions: ["canSeeProjects"] },
  { id: "tasks", icon: ListTodo, label: "Tasks & To Do", path: "/tasks" },
  { id: "checklist-templates", icon: ListChecks, label: "Checklist Templates", path: "/checklist-templates" },
  { id: "gantt", icon: ChartGantt, label: "Gantt Charts", path: "/gantt" },
  { id: "raid-logs", icon: AlertTriangle, label: "RAID Logs", path: "/raid-logs" },
  { id: "reports", icon: ChartBar, label: "Reports", path: "/reports", permissions: ["canSeeReports"] },
  { id: "communications", icon: Megaphone, label: "Communications", path: "/communications" },
  { id: "stakeholders", icon: Building, label: "Stakeholders", path: "/stakeholders" },
  { id: "surveys", icon: ClipboardCheck, label: "Readiness Surveys", path: "/surveys" },
  { id: "gpt-coach", icon: Bot, label: "GPT Coach", path: "/gpt-coach" },
  { id: "fishbone", icon: Fish, label: "Change Process Flow", path: "/change-process-flow" },
  { id: "process-mapping", icon: GitBranch, label: "Development Maps", path: "/process-mapping", permissions: ["canSeeAllProjects", "canModifyProjects"], requireAll: false }
];

const SIDEBAR_ORDER_KEY = "sidebarOrder";

export default function Sidebar() {
  const [location] = useLocation();
  const [dragOrder, setDragOrder] = useState<string[]>([]);
  const { toast } = useToast();
  const { isLoading: permissionsLoading, hasAllPermissions, hasAnyPermission } = usePermissions();

  // Get ordered draggable items (excluding overview)
  const orderedDraggableItems = useMemo(() => {
    const baseDraggableItems = allNavigationItems.slice(1);
    
    // If we have a drag order, use it
    if (dragOrder.length > 0) {
      const ordered = dragOrder
        .map(id => baseDraggableItems.find(item => item.id === id))
        .filter(Boolean) as NavigationItem[];
      
      // Add any new items not in the order
      const existingIds = new Set(dragOrder);
      const newItems = baseDraggableItems.filter(item => !existingIds.has(item.id));
      
      return [...ordered, ...newItems];
    }
    
    // Otherwise try to load from localStorage
    try {
      const savedOrder = localStorage.getItem(SIDEBAR_ORDER_KEY);
      if (savedOrder) {
        const savedIds = JSON.parse(savedOrder);
        const ordered = savedIds
          .map((id: string) => baseDraggableItems.find(item => item.id === id))
          .filter(Boolean) as NavigationItem[];
        
        const existingIds = new Set(savedIds);
        const newItems = baseDraggableItems.filter(item => !existingIds.has(item.id));
        
        return [...ordered, ...newItems];
      }
    } catch (error) {
      console.error('Failed to parse saved sidebar order:', error);
    }
    
    return baseDraggableItems;
  }, [dragOrder]);

  // Handle drag end event
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(orderedDraggableItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newOrder = items.map(item => item.id);
    setDragOrder(newOrder);
    
    // Save to localStorage
    localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(newOrder));
  };

  // Check if user has permission for a navigation item
  const hasPermissionForItem = (item: NavigationItem): boolean => {
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }

    if (item.customCheck) {
      return item.customCheck();
    }

    if (item.requireAll) {
      return hasAllPermissions(...item.permissions);
    } else {
      return hasAnyPermission(...item.permissions);
    }
  };

  // Render a draggable navigation item
  const renderDraggableItem = (item: NavigationItem, index: number) => {
    // Check permissions at render time
    if (!hasPermissionForItem(item) && !permissionsLoading) {
      return null;
    }

    const isActive = location === item.path;
    const IconComponent = item.icon;

    // Show skeleton while loading permissions
    if (permissionsLoading) {
      return (
        <div key={item.id} className="mb-1">
          <div className="flex items-center space-x-3 p-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-24 h-4 rounded" />
          </div>
        </div>
      );
    }

    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "mb-1",
              snapshot.isDragging && "z-50"
            )}
          >
            <Link href={item.path}>
              <div className={cn(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors relative",
                "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground"
              )}>
                <div 
                  {...provided.dragHandleProps}
                  className={cn(
                    "flex items-center justify-center mr-3 opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:text-foreground cursor-grab active:cursor-grabbing",
                    snapshot.isDragging && "cursor-grabbing opacity-100"
                  )}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="truncate" data-testid={`nav-${item.id}`}>{item.label}</span>
              </div>
            </Link>
          </div>
        )}
      </Draggable>
    );
  };

  // Render a regular (non-draggable) navigation item
  const renderNavigationItem = (item: NavigationItem) => {
    // Check permissions at render time
    if (!hasPermissionForItem(item) && !permissionsLoading) {
      return null;
    }

    const isActive = location === item.path;
    const IconComponent = item.icon;

    // Show skeleton while loading permissions
    if (permissionsLoading) {
      return (
        <div className="mb-1">
          <div className="flex items-center space-x-3 p-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-24 h-4 rounded" />
          </div>
        </div>
      );
    }

    return (
      <Link key={item.id} href={item.path}>
        <div className={cn(
          "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors mb-1",
          "hover:bg-accent hover:text-accent-foreground cursor-pointer",
          isActive 
            ? "bg-accent text-accent-foreground" 
            : "text-muted-foreground"
        )}>
          {/* Invisible spacer to align with draggable items */}
          <div className="flex items-center justify-center mr-3 w-4 h-4" />
          <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
          <span className="truncate" data-testid={`nav-${item.id}`}>{item.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground border-r border-border">
      <div className="p-4 border-b border-border flex-shrink-0 bg-card">
        <div className="flex items-center justify-center">
          <img 
            src="/images/essayons-logo-cropped.png" 
            alt="Logo" 
            className="h-8 w-auto"
          />
        </div>
      </div>

      {/* Navigation Menu - Scrollable */}
      <nav className="flex-1 overflow-y-auto min-h-0 p-4">
        <div className="space-y-1">
          {/* Overview - Fixed at Top */}
          {renderNavigationItem(allNavigationItems[0])}
          
          {/* Draggable Navigation Items */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="navigation">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "space-y-1 mt-1",
                    snapshot.isDraggingOver && "bg-muted/50 rounded-md p-1"
                  )}
                >
                  {orderedDraggableItems.map((item, index) => 
                    renderDraggableItem(item, index)
                  ).filter(Boolean)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </nav>
    </div>
  );
}