import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Canvas as FabricCanvas, IText, Rect, Circle as FabricCircle, Ellipse, Polygon, Path, Group, PencilBrush } from "fabric";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Save, Download, Upload, Pen, Square, Circle, Diamond, FileText, 
  Database, Layers, Move, Clock, Triangle, ArrowRight, MoreVertical, 
  Trash2, Edit, Undo, Redo, ZoomIn, ZoomOut, RotateCcw, MousePointer2,
  Type, Eraser, Palette, CheckSquare, Calendar, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { ProcessMap, User } from "@shared/schema";
import { insertProcessMapSchema, type InsertProcessMap } from "@/shared/schema";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/use-permissions";
import { CreateItemForm } from "./fishbone";

// Form schema for creating/editing process maps
const processMapFormSchema = insertProcessMapSchema.omit({ projectId: true, createdById: true, canvasData: true, elements: true, connections: true });

type ProcessMapFormData = z.infer<typeof processMapFormSchema>;

interface ProcessElement {
  id: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'document' | 'database' | 'subprocess' | 'manual' | 'delay' | 'storage' | 'task' | 'milestone' | 'action';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  linkedItemId?: string;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  points: number[];
  text?: string;
}

interface CanvasTools {
  mode: 'select' | 'connect' | 'text' | 'draw' | 'shape';
  selectedElement: any | null;
  connecting: boolean;
  connectionStart: any | null;
  drawingTool: 'pen' | 'eraser';
  shapeType: 'rectangle' | 'circle';
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
}

interface SymbolDefinition {
  name: string;
  icon: any;
  shape: string;
  color: string;
  isChangeItem?: boolean;
}

const PROCESS_SYMBOLS: Record<string, SymbolDefinition> = {
  start: { name: "Start/End", icon: Circle, shape: "ellipse", color: "#22c55e" },
  end: { name: "Start/End", icon: Circle, shape: "ellipse", color: "#ef4444" },
  process: { name: "Process", icon: Square, shape: "rectangle", color: "#3b82f6" },
  decision: { name: "Decision", icon: Diamond, shape: "diamond", color: "#f59e0b" },
  document: { name: "Document", icon: FileText, shape: "document", color: "#8b5cf6" },
  database: { name: "Database", icon: Database, shape: "cylinder", color: "#10b981" },
  subprocess: { name: "Subprocess", icon: Layers, shape: "subprocess", color: "#06b6d4" },
  manual: { name: "Manual Process", icon: Move, shape: "trapezoid", color: "#f97316" },
  delay: { name: "Delay", icon: Clock, shape: "delay", color: "#84cc16" },
  storage: { name: "Storage", icon: Triangle, shape: "triangle", color: "#6366f1" },
  thoughtBubble: { name: "Thought Bubble", icon: Circle, shape: "ellipse", color: "#ec4899" },
};

export default function ProcessMappingPage() {
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [currentProcessMap, setCurrentProcessMap] = useState<ProcessMap | null>(null);
  const currentProcessMapRef = useRef<ProcessMap | null>(null);
  const [isNewProcessMapOpen, setIsNewProcessMapOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [processMapToDelete, setProcessMapToDelete] = useState<ProcessMap | null>(null);
  const [elements, setElements] = useState<ProcessElement[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedSymbolType, setSelectedSymbolType] = useState<string | null>(null);
  const selectedSymbolTypeRef = useRef<string | null>(null);
  const [isItemCreationOpen, setIsItemCreationOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'task' | 'milestone' | 'action' | null>(null);
  const [pendingSymbolPosition, setPendingSymbolPosition] = useState<{ x: number; y: number } | null>(null);
  const [tools, setTools] = useState<CanvasTools>({
    mode: 'select',
    selectedElement: null,
    connecting: false,
    connectionStart: null,
    drawingTool: 'pen',
    shapeType: 'rectangle',
    strokeColor: '#000000',
    strokeWidth: 2,
    fillColor: '#ffffff',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();
  const { hasPermission } = usePermissions();
  const processMapForm = useForm<ProcessMapFormData>({
    resolver: zodResolver(processMapFormSchema),
    defaultValues: { name: "New Process Map", description: "" },
  });

  const { data: processMaps = [], isLoading } = useQuery<ProcessMap[]>({
    queryKey: ['/api/projects', currentProject?.id, 'process-maps'],
    enabled: !!currentProject?.id,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${currentProject?.id}/process-maps`);
      return res.json();
    }
  });

  // debounce autosave
  const saveDebounceRef = useRef<number | null>(null);
  const scheduleSave = () => {
    if (!currentProcessMap?.id) return;
    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = window.setTimeout(() => {
      const canvasData = JSON.stringify(canvas?.toJSON() ?? { objects: [], background: "#ffffff" });
      const updateData = { canvasData, elements, connections };
      apiRequest('PUT', `/api/process-maps/${currentProcessMap.id}`, updateData)
        .then(() => queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] }))
        .catch((err) => console.error("Auto-save failed:", err));
      saveDebounceRef.current = null;
    }, 600);
  };

  // createProcessMapMutation: tolerant of missing canvas
  const createProcessMapMutation = useMutation({
    mutationFn: async (data: ProcessMapFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");

      let canvasDataJson: string;
      try {
        if (canvas) {
          canvasDataJson = JSON.stringify(canvas.toJSON());
        } else {
          canvasDataJson = JSON.stringify({ version: "4.x", objects: [], background: "#ffffff" });
          console.warn("Canvas not available when creating process map; using empty canvas payload.");
        }
      } catch (err) {
        console.error("Error serializing canvas, sending empty canvas state instead:", err);
        canvasDataJson = JSON.stringify({ version: "4.x", objects: [], background: "#ffffff" });
      }

      const processMapData: InsertProcessMap = {
        ...data,
        projectId: currentProject.id,
        createdById: "550e8400-e29b-41d4-a716-446655440000",
        canvasData: canvasDataJson,
        elements: elements || [],
        connections: connections || [],
      };

      const response = await apiRequest('POST', `/api/projects/${currentProject.id}/process-maps`, processMapData);
      if (!response.ok) {
        let bodyText = await response.text().catch(() => '');
        throw new Error(bodyText || `Server responded with ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: (createdProcessMap: ProcessMap) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
      setIsNewProcessMapOpen(false);
      processMapForm.reset();
      setCurrentProcessMap(createdProcessMap);
      toast({ title: "Success", description: "Process map created successfully! You can now add symbols and save changes." });
    },
    onError: (error: any) => {
      console.error("Error creating process map:", error);
      toast({ title: "Error", description: error?.message || "Failed to create process map. Please try again.", variant: "destructive" });
    }
  });

  const saveProcessMapMutation = useMutation({
    mutationFn: async () => {
      if (!currentProcessMap?.id) throw new Error("No process map selected or canvas not ready");
      const canvasData = JSON.stringify(canvas?.toJSON() ?? { objects: [], background: "#ffffff" });
      const updateData = { canvasData: canvasData, elements: elements, connections: connections };
      return apiRequest('PUT', `/api/process-maps/${currentProcessMap.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
      toast({ title: "Success", description: "Process map saved successfully!" });
    },
    onError: (error) => {
      console.error("Error saving process map:", error);
      toast({ title: "Error", description: "Failed to save process map. Please try again.", variant: "destructive" });
    }
  });

  const deleteProcessMapMutation = useMutation({
    mutationFn: async (processMapId: string) => apiRequest('DELETE', `/api/process-maps/${processMapId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
      if (currentProcessMap?.id === processMapToDelete?.id) {
        setCurrentProcessMap(null);
        currentProcessMapRef.current = null;
        if (canvas) {
          try { canvas.clear(); canvas.renderAll(); } catch (err) { console.error(err); }
        }
      }
      setIsDeleteDialogOpen(false);
      setProcessMapToDelete(null);
      toast({ title: "Success", description: "Process map deleted successfully!" });
    },
    onError: (error) => {
      console.error("Error deleting process map:", error);
      toast({ title: "Error", description: "Failed to delete process map. Please try again.", variant: "destructive" });
    }
  });

  // Load process map
  const loadProcessMap = async (processMap: ProcessMap) => {
    if (!canvas) {
      console.error("Canvas not available for loading process map");
      toast({ title: "Error", description: "Canvas not ready. Please try again.", variant: "destructive" });
      return;
    }

    try {
      setCurrentProcessMap(processMap);
      currentProcessMapRef.current = processMap;
      setElements([]);
      setConnections([]);

      try { canvas.clear(); canvas.backgroundColor = '#ffffff'; canvas.renderAll(); } catch (clearError) {
        console.error("Error clearing canvas:", clearError);
        toast({ title: "Error", description: "Canvas initialization failed. Please refresh the page.", variant: "destructive" });
        return;
      }

      if (processMap.canvasData) {
        let canvasData;
        try {
          canvasData = typeof processMap.canvasData === 'string' ? JSON.parse(processMap.canvasData) : processMap.canvasData;
        } catch (err) {
          console.error("Invalid canvasData JSON; falling back to empty canvas:", err);
          canvasData = { objects: [], background: "#ffffff" };
        }

        try {
          canvas.loadFromJSON(canvasData, () => {
            try {
              canvas.renderAll();
              setElements(processMap.elements ?? []);
              setConnections(processMap.connections ?? []);
              toast({ title: "Success", description: `Process map "${processMap.name}" loaded successfully!` });
            } catch (renderError) {
              console.error("Error rendering canvas after load:", renderError);
              toast({ title: "Warning", description: "Process map loaded but some elements may not display correctly.", variant: "destructive" });
            }
          });
        } catch (loadError) {
          console.error("Error loading canvas from JSON:", loadError);
          try { canvas.clear(); canvas.backgroundColor = '#ffffff'; canvas.renderAll(); } catch (e) { console.error(e); }
          toast({ title: "Error", description: "Failed to load canvas data. Process map created with empty canvas.", variant: "destructive" });
        }
      } else {
        toast({ title: "Success", description: `Process map "${processMap.name}" loaded successfully!` });
      }
    } catch (error) {
      console.error("Error loading process map:", error);
      toast({ title: "Error", description: "Failed to load process map.", variant: "destructive" });
    }
  };

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    if (canvas) {
      try { canvas.dispose(); } catch (error) { console.error('Error disposing existing canvas:', error); }
    }

    try {
      const fabricCanvas = new (FabricCanvas as any)(canvasRef.current, {
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: '#ffffff',
      });

      fabricCanvas.setDimensions({ width: window.innerWidth - 320, height: window.innerHeight - 200 });
      fabricCanvas.renderAll();
      setCanvas(fabricCanvas);
      setIsCanvasReady(true);

      // wire up events, handlers, etc. (existing logic should be preserved)

      return () => {
        try { fabricCanvas.dispose(); } catch (e) { console.error(e); }
        setCanvas(null);
        setIsCanvasReady(false);
      };
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }, []);

  // Add process element to canvas (uses scheduleSave instead of immediate save)
  const addProcessElement = (type: string, x: number, y: number, linkedItemId?: string) => {
    if (!canvas) return;

    const symbol = PROCESS_SYMBOLS[type as keyof typeof PROCESS_SYMBOLS];
    if (!symbol) return;

    // create shape - simplified version, should match existing createProcessShape
    const commonOptions: any = {
      left: x - 60,
      top: y - 30,
      width: 120,
      height: 60,
      fill: symbol.color,
      stroke: '#1f2937',
      strokeWidth: 2,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    };

    let shape: any;
    switch (symbol.shape) {
      case 'ellipse':
        shape = new FabricCircle({ ...commonOptions, rx: 60, ry: 30 });
        break;
      case 'rectangle':
      default:
        shape = new Rect({ ...commonOptions });
        break;
    }

    (shape as any).processType = type;
    (shape as any).processId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    canvas.add(shape);
    canvas.setActiveObject(shape);

    const newElement: ProcessElement = {
      id: (shape as any).processId,
      type: type as ProcessElement['type'],
      text: symbol.name,
      x,
      y,
      width: 120,
      height: 60,
      linkedItemId: linkedItemId,
    };

    setElements(prev => {
      const updatedElements = [...prev, newElement];
      // schedule debounced save
      scheduleSave();
      return updatedElements;
    });

    canvas.renderAll();
  };

  // Example deleteElement handler (call scheduleSave instead of immediate apiRequest)
  const deleteElement = (elementId?: string, isConnection = false, connectionId?: string) => {
    let updatedElements = elements.slice();
    let updatedConnections = connections.slice();

    if (isConnection && connectionId) {
      updatedConnections = updatedConnections.filter(c => c.id !== connectionId);
    } else if (elementId) {
      updatedElements = updatedElements.filter(el => el.id !== elementId);
      updatedConnections = updatedConnections.filter(conn => conn.fromId !== elementId && conn.toId !== elementId);
    }

    if (elementId || (isConnection && connectionId)) {
      setElements(updatedElements);
      setConnections(updatedConnections);
    }

    // schedule debounced save
    scheduleSave();
  };

  // Resize canvas when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (canvas) {
        const newWidth = window.innerWidth - 320;
        const newHeight = window.innerHeight - 200;
        canvas.setDimensions({ width: newWidth, height: newHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvas]);

  // Sync ref with state to ensure event handlers have latest value
  useEffect(() => { currentProcessMapRef.current = currentProcessMap; }, [currentProcessMap]);

  // Ensure we cancel any pending debounced save on unmount
  useEffect(() => {
    return () => { if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current); };
  }, []);

  // UI
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Process Mapping</h1>
          <p className="text-muted-foreground">Create comprehensive process flow diagrams</p>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGate permissions={['canModifyProjects', 'canEditAllProjects']}> 
            <Dialog open={isNewProcessMapOpen} onOpenChange={setIsNewProcessMapOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-process-map"> <Plus className="w-4 h-4 mr-2"/> New Process Map </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Process Map</DialogTitle></DialogHeader>
                <Form {...processMapForm}>
                  <form onSubmit={processMapForm.handleSubmit((data) => createProcessMapMutation.mutate(data))} className="space-y-4">
                    <FormField control={processMapForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-process-map-name" placeholder="Enter process map name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={processMapForm.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea data-testid="input-process-map-description" placeholder="Enter description (optional)" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsNewProcessMapOpen(false)}>Cancel</Button>
                      <PermissionGate permissions={['canModifyProjects', 'canEditAllProjects']}> 
                        <Button type="submit" disabled={createProcessMapMutation.isPending || !isCanvasReady} data-testid="button-create-process-map">
                          {createProcessMapMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </PermissionGate>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </PermissionGate>

          <PermissionGate permissions={["canEditAllProjects"]}> 
            {currentProcessMap && (
              <Button onClick={() => saveProcessMapMutation.mutate()} disabled={saveProcessMapMutation.isPending} data-testid="button-save-process-map">
                <Save className="w-4 h-4 mr-2" /> {saveProcessMapMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </PermissionGate>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r bg-muted/20 p-4 overflow-y-auto">
          {/* toolbar content - unchanged */}
        </div>

        <div className="flex-1 relative">
          <canvas ref={canvasRef} />
        </div>
      </div>

    </div>
  );
}