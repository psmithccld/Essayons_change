import { useState, useMemo, useEffect, useCallback } from "react";
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
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Crown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useFeatures } from "@/hooks/use-features";
import type { Permissions } from "@shared/schema";

type NavigationItem = {
  id: string;
  icon: any;
  label: string;
  path: string;
  permissions?: (keyof Permissions)[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  customCheck?: () => boolean;
  featureFlag?: string; // Feature flag name to check for this navigation item
};

// All navigation items with permission requirements
const allNavigationItems: NavigationItem[] = [
  { id: "overview", icon: ChartLine, label: "Overview", path: "/" },
  { id: "tasks", icon: ListTodo, label: "Tasks & To Do", path: "/tasks" },
  { id: "gantt", icon: ChartGantt, label: "Initiative Timeline", path: "/gantt" },
  { id: "raid-logs", icon: AlertTriangle, label: "RAID Logs", path: "/raid-logs" },
  { id: "reports", icon: ChartBar, label: "Reports", path: "/reports", permissions: ["canSeeReports"], featureFlag: "reports" },
  { id: "communications", icon: Megaphone, label: "Communications", path: "/communications", featureFlag: "communications" },
  { id: "stakeholders", icon: Building, label: "Stakeholders", path: "/stakeholders" },
  { id: "surveys", icon: ClipboardCheck, label: "Readiness Surveys", path: "/surveys", featureFlag: "readinessSurveys" },
  { id: "change-artifacts", icon: FileText, label: "Change Artifacts", path: "/change-artifacts", featureFlag: "changeArtifacts" },
  { id: "gpt-coach", icon: Bot, label: "GPT Coach", path: "/gpt-coach", featureFlag: "gptCoach" },
  { id: "fishbone", icon: Fish, label: "Change Process Flow", path: "/change-process-flow" },
  { id: "process-mapping", icon: GitBranch, label: "Development Maps", path: "/process-mapping", permissions: ["canSeeAllProjects", "canModifyProjects"], requireAll: false },
  { id: "organization", icon: Settings, label: "Organization Settings", path: "/organization", permissions: ["canModifyOrganizationSettings"] },
];

const SIDEBAR_ORDER_KEY = "sidebarOrder";
const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

// Sortable item component using @dnd-kit
function SortableNavItem({ 
  item, 
  isActive, 
  isCollapsed, 
  hasAccess,
  permissionsLoading 
}: { 
  item: NavigationItem; 
  isActive: boolean; 
  isCollapsed: boolean;
  hasAccess: boolean;
  permissionsLoading: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = item.icon;

  // Show skeleton while loading permissions
  if (permissionsLoading) {
    return (
      <div ref={setNodeRef} style={style} className="mb-1">
        <div className={cn(
          "flex items-center p-2",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <Skeleton className="w-4 h-4 rounded" />
          {!isCollapsed && <Skeleton className="w-24 h-4 rounded" />}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div ref={setNodeRef} style={style} className={cn("mb-1", isDragging && "z-50 opacity-50")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.path}>
              <div className={cn(
                "group flex items-center rounded-md text-sm font-medium transition-colors relative",
                "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                "p-2 justify-center",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground"
              )}>
                <IconComponent className="h-4 w-4 flex-shrink-0" />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-1", isDragging && "z-50 opacity-50")}>
      <Link href={item.path}>
        <div className={cn(
          "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors relative",
          "hover:bg-accent hover:text-accent-foreground cursor-pointer",
          isActive 
            ? "bg-accent text-accent-foreground" 
            : "text-muted-foreground"
        )}>
          <div 
            {...attributes}
            {...listeners}
            className={cn(
              "flex items-center justify-center mr-3 opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:text-foreground cursor-grab active:cursor-grabbing",
              isDragging && "cursor-grabbing opacity-100"
            )}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
          <span className="truncate" data-testid={`nav-${item.id}`}>{item.label}</span>
        </div>
      </Link>
    </div>
  );
}

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const [dragOrder, setDragOrder] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return saved === 'true';
    } catch (error) {
      return false;
    }
  });
  const { toast } = useToast();
  const { isLoading: permissionsLoading, hasAllPermissions, hasAnyPermission } = usePermissions();
  const { hasFeature, isLoading: featuresLoading } = useFeatures();

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toggle sidebar collapse state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
      } catch (error) {
        console.error('Failed to save sidebar collapsed state:', error);
      }
      return newState;
    });
  }, []);

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

  // Check if user has permission for a navigation item
  const hasPermissionForItem = useCallback((item: NavigationItem): boolean => {
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
  }, [hasAllPermissions, hasAnyPermission]);

  // Check if user has access to a navigation item (permissions AND features)
  const hasAccessToItem = useCallback((item: NavigationItem): boolean => {
    // Check permissions first
    if (!hasPermissionForItem(item)) {
      return false;
    }
    
    // Check feature flag if specified
    if (item.featureFlag) {
      return hasFeature(item.featureFlag as any);
    }
    
    return true;
  }, [hasPermissionForItem, hasFeature]);

  // Filter items to only those with access (for drag-and-drop and shortcuts)
  // This ensures SortableContext only includes items that will actually render
  const accessibleDraggableItems = useMemo(() => {
    // During loading, show all items (they'll render as skeletons)
    if (permissionsLoading || featuresLoading) {
      return orderedDraggableItems;
    }
    // After loading, only include items user has access to
    return orderedDraggableItems.filter(item => hasAccessToItem(item));
  }, [orderedDraggableItems, hasAccessToItem, permissionsLoading, featuresLoading]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Alt + number keys for quick navigation
      if (e.altKey && !e.shiftKey && !e.ctrlKey) {
        const keyNum = parseInt(e.key);
        if (keyNum >= 1 && keyNum <= 9) {
          e.preventDefault();
          // Only include accessible items in shortcuts
          const items = [allNavigationItems[0], ...accessibleDraggableItems]; // Include overview
          const targetItem = items[keyNum - 1];
          if (targetItem && hasAccessToItem(targetItem)) {
            navigate(targetItem.path);
            toast({
              title: `Navigated to ${targetItem.label}`,
              description: `Keyboard shortcut: Alt+${keyNum}`
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate, accessibleDraggableItems, hasAccessToItem, toast]);

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = accessibleDraggableItems.findIndex(item => item.id === active.id);
    const newIndex = accessibleDraggableItems.findIndex(item => item.id === over.id);

    const newItems = arrayMove(accessibleDraggableItems, oldIndex, newIndex);
    const newOrder = newItems.map(item => item.id);
    
    setDragOrder(newOrder);
    
    // Save to localStorage
    localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(newOrder));
  };

  // Render a regular (non-draggable) navigation item
  const renderNavigationItem = (item: NavigationItem) => {
    // Check permissions and features at render time
    if (!hasAccessToItem(item) && !permissionsLoading && !featuresLoading) {
      return null;
    }

    const isActive = location === item.path;
    const IconComponent = item.icon;

    // Show skeleton while loading permissions
    if (permissionsLoading) {
      return (
        <div className="mb-1">
          <div className={cn(
            "flex items-center p-2",
            isCollapsed ? "justify-center" : "space-x-3"
          )}>
            <Skeleton className="w-4 h-4 rounded" />
            {!isCollapsed && <Skeleton className="w-24 h-4 rounded" />}
          </div>
        </div>
      );
    }

    if (isCollapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <Link href={item.path}>
              <div className={cn(
                "group flex items-center rounded-md text-sm font-medium transition-colors mb-1",
                "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                "p-2 justify-center",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground"
              )}>
                <IconComponent className="h-4 w-4 flex-shrink-0" />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
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
    <TooltipProvider>
      <div className={cn(
        "flex flex-col h-full bg-card text-foreground border-r border-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="border-b border-border flex-shrink-0 bg-card">
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center p-2" : "justify-between p-4"
          )}>
            {!isCollapsed && (
              <img 
                src="/images/essayons-logo-cropped.png" 
                alt="Logo" 
                className="h-8 w-auto"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className={cn(
                "h-8 w-8 flex-shrink-0",
                isCollapsed && "h-6 w-6"
              )}
              data-testid="button-toggle-sidebar"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Menu - Scrollable */}
        <nav className={cn(
          "flex-1 overflow-y-auto min-h-0",
          isCollapsed ? "p-2" : "p-4"
        )}>
          <div className="space-y-1">
            {/* Overview - Fixed at Top */}
            {renderNavigationItem(allNavigationItems[0])}
            
            {/* Draggable Navigation Items */}
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={accessibleDraggableItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 mt-1">
                  {accessibleDraggableItems.map((item) => (
                    <SortableNavItem
                      key={item.id}
                      item={item}
                      isActive={location === item.path}
                      isCollapsed={isCollapsed}
                      hasAccess={hasAccessToItem(item) || permissionsLoading || featuresLoading}
                      permissionsLoading={permissionsLoading}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </nav>
      </div>
    </TooltipProvider>
  );
}
