import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Canvas as FabricCanvas, IText, Rect, Circle as FabricCircle, Ellipse, Polygon, Path, Group } from "fabric";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Save, Download, Upload, Pen, Square, Circle, Diamond, FileText, 
  Database, Layers, Move, Clock, Triangle, ArrowRight, MoreVertical, 
  Trash2, Edit, Undo, Redo, ZoomIn, ZoomOut, RotateCcw, MousePointer2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { ProcessMap } from "@shared/schema";
import { insertProcessMapSchema, type InsertProcessMap } from "@shared/schema";

// Form schema for creating/editing process maps
const processMapFormSchema = insertProcessMapSchema.omit({ projectId: true, createdById: true, canvasData: true, elements: true, connections: true });

type ProcessMapFormData = z.infer<typeof processMapFormSchema>;

interface ProcessElement {
  id: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'document' | 'database' | 'subprocess' | 'manual' | 'delay' | 'storage';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  points: number[];
  text?: string;
}

interface CanvasTools {
  mode: 'select' | 'connect' | 'text';
  selectedElement: any | null;
  connecting: boolean;
  connectionStart: any | null;
}

// Process mapping symbol definitions with industry standard shapes
const PROCESS_SYMBOLS = {
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
};

export default function ProcessMapping() {
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [currentProcessMap, setCurrentProcessMap] = useState<ProcessMap | null>(null);
  const [isNewProcessMapOpen, setIsNewProcessMapOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [elements, setElements] = useState<ProcessElement[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedSymbolType, setSelectedSymbolType] = useState<string | null>(null);
  const selectedSymbolTypeRef = useRef<string | null>(null);
  
  const [tools, setTools] = useState<CanvasTools>({
    mode: 'select',
    selectedElement: null,
    connecting: false,
    connectionStart: null,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();

  const { data: processMaps = [], isLoading } = useQuery<ProcessMap[]>({
    queryKey: ['/api/projects', currentProject?.id, 'process-maps'],
    enabled: !!currentProject?.id,
  });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    try {
      const fabricCanvas = new FabricCanvas(canvasRef.current, {
        width: window.innerWidth - 320,
        height: window.innerHeight - 200,
        backgroundColor: '#ffffff',
      });

      fabricCanvas.on('selection:created', (e) => {
        setTools(prev => ({ ...prev, selectedElement: e.selected?.[0] || null }));
      });

      fabricCanvas.on('selection:updated', (e) => {
        setTools(prev => ({ ...prev, selectedElement: e.selected?.[0] || null }));
      });

      fabricCanvas.on('selection:cleared', () => {
        setTools(prev => ({ ...prev, selectedElement: null }));
      });


      setCanvas(fabricCanvas);

      return () => {
        try {
          fabricCanvas.dispose();
        } catch (error) {
          console.error('Error disposing canvas:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing Fabric.js canvas:', error);
    }
  }, [canvas]);

  // Update ref when selectedSymbolType changes
  useEffect(() => {
    selectedSymbolTypeRef.current = selectedSymbolType;
  }, [selectedSymbolType]);

  // Separate useEffect to handle canvas clicks for adding symbols
  useEffect(() => {
    if (!canvas) return;

    const handleCanvasClick = (e: any) => {
      // Use ref to get current selectedSymbolType to avoid stale closure
      const currentSymbolType = selectedSymbolTypeRef.current;
      if (currentSymbolType && e.pointer) {
        console.log('Adding process element:', currentSymbolType, 'at', e.pointer.x, e.pointer.y);
        addProcessElement(currentSymbolType, e.pointer.x, e.pointer.y);
        setSelectedSymbolType(null);
      }
    };

    canvas.on('mouse:down', handleCanvasClick);

    return () => {
      canvas.off('mouse:down', handleCanvasClick);
    };
  }, [canvas]);

  // Resize canvas when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (canvas) {
        const newWidth = window.innerWidth - 320;
        const newHeight = window.innerHeight - 200;
        canvas.setDimensions({
          width: newWidth,
          height: newHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvas]);

  // Form setup
  const processMapForm = useForm<ProcessMapFormData>({
    resolver: zodResolver(processMapFormSchema),
    defaultValues: {
      name: "New Process Map",
      description: "",
    },
  });

  // Create process element shapes
  const createProcessShape = (type: string, x: number, y: number, width = 120, height = 60) => {
    const symbol = PROCESS_SYMBOLS[type as keyof typeof PROCESS_SYMBOLS];
    if (!symbol) return null;

    let shape;
    const commonOptions = {
      left: x - width / 2,
      top: y - height / 2,
      width: width,
      height: height,
      fill: symbol.color,
      stroke: '#1f2937',
      strokeWidth: 2,
      rx: 5,
      ry: 5,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    };

    switch (symbol.shape) {
      case 'ellipse':
        shape = new FabricCircle({
          ...commonOptions,
          radius: Math.min(width, height) / 2,
          left: x - Math.min(width, height) / 2,
          top: y - Math.min(width, height) / 2,
        });
        break;
      case 'rectangle':
        shape = new Rect(commonOptions);
        break;
      case 'diamond':
        const diamondPoints = [
          { x: x, y: y - height / 2 }, // top
          { x: x + width / 2, y: y },  // right
          { x: x, y: y + height / 2 }, // bottom
          { x: x - width / 2, y: y }   // left
        ];
        shape = new Polygon(diamondPoints, {
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        break;
      case 'document':
        // Document shape - rectangle with curved bottom
        shape = new Path(`M ${x - width/2} ${y - height/2} L ${x + width/2} ${y - height/2} L ${x + width/2} ${y + height/3} Q ${x} ${y + height/2} ${x - width/2} ${y + height/3} Z`, {
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        break;
      case 'cylinder':
        // Database/cylinder shape
        const ellipseTop = new Ellipse({
          left: x - width / 2,
          top: y - height / 2,
          rx: width / 2,
          ry: height / 6,
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
        });
        const rect = new Rect({
          left: x - width / 2,
          top: y - height / 2 + height / 6,
          width: width,
          height: height - height / 3,
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
        });
        const ellipseBottom = new Ellipse({
          left: x - width / 2,
          top: y + height / 2 - height / 6,
          rx: width / 2,
          ry: height / 6,
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
        });
        shape = new Group([rect, ellipseTop, ellipseBottom], {
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        break;
      case 'subprocess':
        // Double-border rectangle for subprocess
        const outerRect = new Rect({
          ...commonOptions,
          strokeWidth: 4,
        });
        const innerRect = new Rect({
          ...commonOptions,
          left: commonOptions.left + 4,
          top: commonOptions.top + 4,
          width: commonOptions.width - 8,
          height: commonOptions.height - 8,
          fill: 'transparent',
          stroke: '#1f2937',
          strokeWidth: 2,
        });
        shape = new Group([outerRect, innerRect], {
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        break;
      case 'trapezoid':
        // Manual process trapezoid
        const trapezoidPoints = [
          { x: x - width / 2 + 10, y: y - height / 2 }, // top-left (inset)
          { x: x + width / 2 - 10, y: y - height / 2 }, // top-right (inset)
          { x: x + width / 2, y: y + height / 2 },       // bottom-right
          { x: x - width / 2, y: y + height / 2 }        // bottom-left
        ];
        shape = new Polygon(trapezoidPoints, {
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        break;
      case 'delay':
        // D-shape for delay
        shape = new Path(`M ${x - width/2} ${y - height/2} L ${x + width/3} ${y - height/2} Q ${x + width/2} ${y} ${x + width/3} ${y + height/2} L ${x - width/2} ${y + height/2} Z`, {
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        break;
      case 'triangle':
        // Inverted triangle for storage
        const trianglePoints = [
          { x: x, y: y + height / 2 },         // bottom point
          { x: x - width / 2, y: y - height / 2 }, // top-left
          { x: x + width / 2, y: y - height / 2 }  // top-right
        ];
        shape = new Polygon(trianglePoints, {
          fill: symbol.color,
          stroke: '#1f2937',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        break;
      default:
        shape = new Rect(commonOptions);
    }

    // Add text label
    const text = new IText(symbol.name, {
      left: x,
      top: y,
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });

    // Group shape and text together
    if (shape) {
      const group = new Group([shape, text], {
        left: x - width / 2,
        top: y - height / 2,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      
      // Add custom properties after creation
      (group as any).processType = type;
      (group as any).processId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return group;
    }

    return null;
  };

  // Add process element to canvas
  const addProcessElement = (type: string, x: number, y: number) => {
    if (!canvas) return;

    const shape = createProcessShape(type, x, y);
    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      
      // Add to elements state
      const newElement: ProcessElement = {
        id: (shape as any).processId,
        type: type as ProcessElement['type'],
        text: PROCESS_SYMBOLS[type as keyof typeof PROCESS_SYMBOLS].name,
        x: x,
        y: y,
        width: 120,
        height: 60,
      };
      
      setElements(prev => [...prev, newElement]);
      canvas.renderAll();
    }
  };

  // Create connection between elements
  const createConnection = (startElement: any, endElement: any) => {
    if (!canvas || !startElement || !endElement) return;

    const startBounds = startElement.getBoundingRect();
    const endBounds = endElement.getBoundingRect();
    
    const startX = startBounds.left + startBounds.width / 2;
    const startY = startBounds.top + startBounds.height / 2;
    const endX = endBounds.left + endBounds.width / 2;
    const endY = endBounds.top + endBounds.height / 2;

    // Create arrow line
    const line = new Path(`M ${startX} ${startY} L ${endX} ${endY}`, {
      stroke: '#374151',
      strokeWidth: 2,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
    });

    // Create arrow head
    const arrowHead = new Polygon([
      { x: endX - 10, y: endY - 5 },
      { x: endX, y: endY },
      { x: endX - 10, y: endY + 5 }
    ], {
      fill: '#374151',
      selectable: false,
      evented: false,
    });

    const connection = new Group([line, arrowHead], {
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: true,
    });

    canvas.add(connection);
    canvas.renderAll();

    // Add to connections state
    const newConnection: Connection = {
      id: `connection-${Date.now()}`,
      fromId: (startElement as any).processId,
      toId: (endElement as any).processId,
      points: [startX, startY, endX, endY],
    };

    setConnections(prev => [...prev, newConnection]);
  };

  // Handle symbol selection from toolbar
  const handleSymbolSelect = (symbolType: string) => {
    setSelectedSymbolType(symbolType);
    setTools(prev => ({ ...prev, mode: 'select' }));
    if (canvas) {
      canvas.defaultCursor = 'crosshair';
    }
    toast({
      title: "Symbol Selected",
      description: `Click on the canvas to place a ${PROCESS_SYMBOLS[symbolType as keyof typeof PROCESS_SYMBOLS].name}`,
    });
  };

  // Canvas action functions
  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      setElements([]);
      setConnections([]);
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
  };

  const zoomIn = () => {
    if (canvas) {
      const zoom = canvas.getZoom();
      canvas.setZoom(Math.min(zoom * 1.1, 3));
    }
  };

  const zoomOut = () => {
    if (canvas) {
      const zoom = canvas.getZoom();
      canvas.setZoom(Math.max(zoom * 0.9, 0.1));
    }
  };

  const resetZoom = () => {
    if (canvas) {
      canvas.setZoom(1);
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvas.renderAll();
    }
  };

  const deleteSelected = () => {
    if (canvas && tools.selectedElement) {
      canvas.remove(tools.selectedElement);
      canvas.renderAll();
      setTools(prev => ({ ...prev, selectedElement: null }));
    }
  };

  // Mutations for CRUD operations
  const createProcessMapMutation = useMutation({
    mutationFn: async (data: ProcessMapFormData) => {
      if (!currentProject?.id || !canvas) throw new Error("No project selected or canvas not ready");
      
      const canvasData = JSON.stringify(canvas.toJSON());
      const processMapData: InsertProcessMap = {
        ...data,
        projectId: currentProject.id,
        createdById: "550e8400-e29b-41d4-a716-446655440000", // Demo user
        canvasData: canvasData,
        elements: elements,
        connections: connections,
      };
      
      return apiRequest('POST', `/api/projects/${currentProject.id}/process-maps`, processMapData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
      setIsNewProcessMapOpen(false);
      processMapForm.reset();
      toast({
        title: "Success",
        description: "Process map created successfully!",
      });
    },
    onError: (error) => {
      console.error("Error creating process map:", error);
      toast({
        title: "Error",
        description: "Failed to create process map. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveProcessMapMutation = useMutation({
    mutationFn: async () => {
      if (!currentProcessMap?.id || !canvas) throw new Error("No process map selected or canvas not ready");
      
      const canvasData = JSON.stringify(canvas.toJSON());
      const updateData = {
        canvasData: canvasData,
        elements: elements,
        connections: connections,
      };
      
      return apiRequest('PUT', `/api/process-maps/${currentProcessMap.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
      toast({
        title: "Success",
        description: "Process map saved successfully!",
      });
    },
    onError: (error) => {
      console.error("Error saving process map:", error);
      toast({
        title: "Error",
        description: "Failed to save process map. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load process map
  const loadProcessMap = async (processMap: ProcessMap) => {
    if (!canvas) return;
    
    try {
      setCurrentProcessMap(processMap);
      
      // Clear canvas first to prevent conflicts
      canvas.clear();
      setElements([]);
      setConnections([]);
      
      if (processMap.canvasData) {
        try {
          canvas.loadFromJSON(processMap.canvasData, () => {
            try {
              canvas.renderAll();
              if (processMap.elements) {
                setElements(processMap.elements as ProcessElement[]);
              }
              if (processMap.connections) {
                setConnections(processMap.connections as Connection[]);
              }
            } catch (renderError) {
              console.error("Error rendering canvas after load:", renderError);
            }
          });
        } catch (loadError) {
          console.error("Error loading canvas from JSON:", loadError);
          // If loading fails, try to ensure canvas is in a good state
          canvas.clear();
          canvas.backgroundColor = '#ffffff';
          canvas.renderAll();
        }
      }
      
      toast({
        title: "Success",
        description: `Process map "${processMap.name}" loaded successfully!`,
      });
    } catch (error) {
      console.error("Error loading process map:", error);
      toast({
        title: "Error",
        description: "Failed to load process map.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Process Mapping</h1>
          <p className="text-muted-foreground">Create comprehensive process flow diagrams</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={isNewProcessMapOpen} onOpenChange={setIsNewProcessMapOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-process-map">
                <Plus className="w-4 h-4 mr-2" />
                New Process Map
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Process Map</DialogTitle>
              </DialogHeader>
              <Form {...processMapForm}>
                <form onSubmit={processMapForm.handleSubmit((data) => createProcessMapMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={processMapForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-process-map-name" placeholder="Enter process map name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={processMapForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea data-testid="input-process-map-description" placeholder="Enter description (optional)" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsNewProcessMapOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProcessMapMutation.isPending} data-testid="button-create-process-map">
                      {createProcessMapMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {currentProcessMap && (
            <Button 
              onClick={() => saveProcessMapMutation.mutate()} 
              disabled={saveProcessMapMutation.isPending}
              data-testid="button-save-process-map"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveProcessMapMutation.isPending ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Symbol Toolbar */}
        <div className="w-80 border-r bg-muted/20 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Saved Process Maps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Process Maps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : processMaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No process maps yet</p>
                ) : (
                  processMaps.map((processMap) => (
                    <div key={processMap.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-process-map-${processMap.id}`}>
                          {processMap.name}
                        </p>
                        {processMap.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {processMap.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => loadProcessMap(processMap)}
                        data-testid={`button-load-${processMap.id}`}
                      >
                        Load
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Process Symbols */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Process Symbols</CardTitle>
                <p className="text-xs text-muted-foreground">Click a symbol, then click on canvas to place</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium mb-2">Start/End</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('start')}
                      className={`h-auto p-3 ${selectedSymbolType === 'start' ? 'ring-2 ring-green-500' : ''}`}
                      data-testid="button-symbol-start"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Circle className="w-5 h-5 text-green-500" />
                        <span className="text-xs">Start</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('end')}
                      className={`h-auto p-3 ${selectedSymbolType === 'end' ? 'ring-2 ring-red-500' : ''}`}
                      data-testid="button-symbol-end"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Circle className="w-5 h-5 text-red-500" />
                        <span className="text-xs">End</span>
                      </div>
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-medium mb-2">Process Elements</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('process')}
                      className={`h-auto p-3 ${selectedSymbolType === 'process' ? 'ring-2 ring-blue-500' : ''}`}
                      data-testid="button-symbol-process"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Square className="w-5 h-5 text-blue-500" />
                        <span className="text-xs">Process</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('decision')}
                      className={`h-auto p-3 ${selectedSymbolType === 'decision' ? 'ring-2 ring-orange-500' : ''}`}
                      data-testid="button-symbol-decision"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Diamond className="w-5 h-5 text-orange-500" />
                        <span className="text-xs">Decision</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('subprocess')}
                      className={`h-auto p-3 ${selectedSymbolType === 'subprocess' ? 'ring-2 ring-cyan-500' : ''}`}
                      data-testid="button-symbol-subprocess"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Layers className="w-5 h-5 text-cyan-500" />
                        <span className="text-xs">Subprocess</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('manual')}
                      className={`h-auto p-3 ${selectedSymbolType === 'manual' ? 'ring-2 ring-orange-600' : ''}`}
                      data-testid="button-symbol-manual"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Move className="w-5 h-5 text-orange-600" />
                        <span className="text-xs">Manual</span>
                      </div>
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-medium mb-2">Data & Storage</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('document')}
                      className={`h-auto p-3 ${selectedSymbolType === 'document' ? 'ring-2 ring-purple-500' : ''}`}
                      data-testid="button-symbol-document"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="w-5 h-5 text-purple-500" />
                        <span className="text-xs">Document</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('database')}
                      className={`h-auto p-3 ${selectedSymbolType === 'database' ? 'ring-2 ring-emerald-500' : ''}`}
                      data-testid="button-symbol-database"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Database className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs">Database</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('storage')}
                      className={`h-auto p-3 ${selectedSymbolType === 'storage' ? 'ring-2 ring-indigo-500' : ''}`}
                      data-testid="button-symbol-storage"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Triangle className="w-5 h-5 text-indigo-500 rotate-180" />
                        <span className="text-xs">Storage</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('delay')}
                      className={`h-auto p-3 ${selectedSymbolType === 'delay' ? 'ring-2 ring-lime-500' : ''}`}
                      data-testid="button-symbol-delay"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Clock className="w-5 h-5 text-lime-500" />
                        <span className="text-xs">Delay</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Canvas Tools */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Canvas Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={tools.mode === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTools(prev => ({ ...prev, mode: 'select' }));
                      setSelectedSymbolType(null);
                      if (canvas) {
                        canvas.defaultCursor = 'default';
                      }
                    }}
                    data-testid="button-tool-select"
                  >
                    <MousePointer2 className="w-4 h-4 mr-1" />
                    Select
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteSelected}
                    disabled={!tools.selectedElement}
                    data-testid="button-delete-selected"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={zoomIn} data-testid="button-zoom-in">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={zoomOut} data-testid="button-zoom-out">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetZoom} data-testid="button-reset-zoom">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearCanvas} 
                  className="w-full"
                  data-testid="button-clear-canvas"
                >
                  Clear Canvas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-gray-50">
          <canvas
            ref={canvasRef}
            className="border-0"
            data-testid="process-canvas"
          />
          
          {/* Canvas Instructions */}
          {!currentProcessMap && elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-muted-foreground">
                <h3 className="text-lg font-medium mb-2">Start Creating Your Process Map</h3>
                <p className="text-sm mb-4">Select a symbol from the toolbar and click on the canvas to place it</p>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Circle className="w-4 h-4" />
                  <ArrowRight className="w-4 h-4" />
                  <Square className="w-4 h-4" />
                  <ArrowRight className="w-4 h-4" />
                  <Diamond className="w-4 h-4" />
                  <ArrowRight className="w-4 h-4" />
                  <Circle className="w-4 h-4" />
                </div>
                <p className="text-xs mt-2">Create professional process flow diagrams with industry standard symbols</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}