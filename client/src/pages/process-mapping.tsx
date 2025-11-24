import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as fabric from "fabric";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Save, Trash2, Download, Upload, ArrowRight, Minus, Paintbrush, Pencil, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { ProcessMap } from "@shared/schema";

const createProcessMapSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
});

type CreateProcessMapFormData = z.infer<typeof createProcessMapSchema>;

// Minimal valid canvas JSON for initial state
const EMPTY_CANVAS_JSON = JSON.stringify({
  version: "6.0.0",
  objects: [],
});

export default function ProcessMapping() {
  const { currentProject } = useCurrentProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [selectedProcessMap, setSelectedProcessMap] = useState<ProcessMap | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingLineWidth, setDrawingLineWidth] = useState(2);
  
  // UI state for button variants (synced with refs)
  const [activeConnectorType, setActiveConnectorType] = useState<'line' | 'arrow' | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionsRef = useRef<Map<string, { from: string; to: string; line: fabric.Line; arrow?: fabric.Triangle }>>(new Map());
  
  // Use refs for connector drawing state to avoid stale closures in event handlers
  const isDrawingLineRef = useRef(false);
  const lineStartPointRef = useRef<{ x: number; y: number; object: fabric.Object } | null>(null);
  const tempLineRef = useRef<fabric.Line | null>(null);
  const connectorTypeRef = useRef<'line' | 'arrow' | null>(null);

  const form = useForm<CreateProcessMapFormData>({
    resolver: zodResolver(createProcessMapSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch process maps for current project
  const { data: processMaps = [], isLoading: isLoadingMaps } = useQuery<ProcessMap[]>({
    queryKey: ['/api/projects', currentProject?.id, 'process-maps'],
    enabled: !!currentProject?.id,
  });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log("Initializing Fabric.js canvas...");
    
    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 1000,
        height: 700,
        backgroundColor: '#f8fafc',
      });

      fabricCanvasRef.current = canvas;
      setIsCanvasReady(true);
      console.log("Canvas initialized successfully");

      // Set up canvas event listeners for autosave
      canvas.on('object:modified', () => {
        console.log("Canvas modified - scheduling autosave");
        scheduleSave();
      });

      canvas.on('object:added', () => {
        console.log("Object added to canvas - scheduling autosave");
        scheduleSave();
      });

      canvas.on('object:removed', () => {
        console.log("Object removed from canvas - scheduling autosave");
        scheduleSave();
      });

      // Update connections when objects move
      canvas.on('object:moving', updateConnections);
      canvas.on('object:scaling', updateConnections);
      canvas.on('object:rotating', updateConnections);

      // Handle connector drawing
      canvas.on('mouse:down', (event) => {
        if (!isDrawingLineRef.current || !connectorTypeRef.current) return;
        
        const target = event.target;

        if (!lineStartPointRef.current && target) {
          // First click - start point
          const center = getObjectCenter(target);
          lineStartPointRef.current = { x: center.x, y: center.y, object: target };
          
          // Create temporary line for visual feedback
          const temp = new fabric.Line(
            [center.x, center.y, center.x, center.y],
            {
              stroke: '#1e293b',
              strokeWidth: 2,
              selectable: false,
              evented: false,
            }
          );
          canvas.add(temp);
          tempLineRef.current = temp;
        } else if (lineStartPointRef.current && target) {
          // Second click - end point
          const endCenter = getObjectCenter(target);
          
          // Remove temporary line
          if (tempLineRef.current) {
            canvas.remove(tempLineRef.current);
            tempLineRef.current = null;
          }

          // Create the final line
          const line = new fabric.Line(
            [lineStartPointRef.current.x, lineStartPointRef.current.y, endCenter.x, endCenter.y],
            {
              stroke: '#1e293b',
              strokeWidth: 2,
              selectable: false,
              evented: false,
            }
          );

          canvas.add(line);
          
          // Create arrow head if arrow type
          let arrowHead: fabric.Triangle | undefined = undefined;
          if (connectorTypeRef.current === 'arrow') {
            const angle = Math.atan2(
              endCenter.y - lineStartPointRef.current.y,
              endCenter.x - lineStartPointRef.current.x
            );
            arrowHead = createArrowHead();
            arrowHead.set({
              left: endCenter.x,
              top: endCenter.y,
              angle: (angle * 180) / Math.PI + 90,
              selectable: false,
              evented: false,
            });
            canvas.add(arrowHead);
          }
          
          // Store connection info with IDs and arrow reference
          const fromObj = lineStartPointRef.current.object;
          const toObj = target;
          
          const connectionId = `conn_${Date.now()}`;
          
          // Assign IDs to objects if they don't have them
          if (!(fromObj as any).id) (fromObj as any).id = connectionId + '_from';
          if (!(toObj as any).id) (toObj as any).id = connectionId + '_to';
          
          connectionsRef.current.set(connectionId, {
            from: (fromObj as any).id,
            to: (toObj as any).id,
            line: line,
            arrow: arrowHead,
          });

          // Reset drawing state
          lineStartPointRef.current = null;
          isDrawingLineRef.current = false;
          connectorTypeRef.current = null;
          setActiveConnectorType(null); // UI state
          canvas.selection = true;
          canvas.hoverCursor = 'move';
          canvas.defaultCursor = 'default';
          
          canvas.renderAll();
          scheduleSave();
        }
      });

      // Update temporary line position as mouse moves
      canvas.on('mouse:move', (event) => {
        if (!isDrawingLineRef.current || !lineStartPointRef.current || !tempLineRef.current) return;
        
        const pointer = canvas.getPointer(event.e);
        tempLineRef.current.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
      });

      return () => {
        console.log("Cleaning up canvas...");
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        canvas.dispose();
        fabricCanvasRef.current = null;
        setIsCanvasReady(false);
      };
    } catch (error) {
      console.error("Error initializing canvas:", error);
      toast({
        title: "Canvas Initialization Error",
        description: "Failed to initialize the canvas. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, []);

  // Debounced autosave function (600ms)
  const scheduleSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      if (selectedProcessMap && fabricCanvasRef.current) {
        console.log("Autosaving process map...");
        saveProcessMap();
      }
    }, 600);
  }, [selectedProcessMap]);

  // Hardened loadFromJSON with fallback
  const loadProcessMap = useCallback((processMap: ProcessMap) => {
    if (!fabricCanvasRef.current) {
      console.warn("Canvas not ready, cannot load process map");
      return;
    }

    console.log(`Loading process map: ${processMap.name}`);
    const canvas = fabricCanvasRef.current;
    
    let canvasData = EMPTY_CANVAS_JSON;
    
    // Harden canvasData parsing
    try {
      if (processMap.canvasData) {
        // Validate that canvasData is valid JSON
        const parsed = typeof processMap.canvasData === 'string' 
          ? JSON.parse(processMap.canvasData)
          : processMap.canvasData;
        
        // Ensure it has the minimum required structure
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.objects)) {
          canvasData = JSON.stringify(parsed);
        } else {
          console.warn("Invalid canvas data structure, using empty canvas");
          toast({
            title: "Canvas Data Warning",
            description: "The canvas data was invalid. Starting with an empty canvas.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error("Error parsing canvas data, falling back to empty canvas:", error);
      toast({
        title: "Canvas Load Warning",
        description: "Could not load saved canvas data. Starting with an empty canvas.",
        variant: "default",
      });
    }

    // Load canvas JSON with error handling
    canvas.loadFromJSON(canvasData, () => {
      canvas.renderAll();
      console.log("Canvas loaded successfully");
    });

    setSelectedProcessMap(processMap);
  }, [toast]);

  // Create process map mutation with tolerant canvas payload
  const createProcessMapMutation = useMutation({
    mutationFn: async (data: CreateProcessMapFormData) => {
      if (!currentProject?.id) {
        throw new Error("No project selected");
      }

      console.log("Creating new process map:", data.name);

      // Send minimal valid canvas JSON when canvas is not ready or empty
      let canvasData = EMPTY_CANVAS_JSON;
      
      if (isCanvasReady && fabricCanvasRef.current) {
        try {
          const canvasJson = fabricCanvasRef.current.toJSON();
          canvasData = JSON.stringify(canvasJson);
          console.log("Using current canvas state for new process map");
        } catch (error) {
          console.warn("Error serializing canvas, using empty canvas:", error);
        }
      } else {
        console.log("Canvas not ready, using empty canvas JSON");
      }

      const payload = {
        name: data.name,
        description: data.description || "",
        canvasData: canvasData,
        elements: [],
        connections: [],
      };

      const response = await apiRequest(
        "POST",
        `/api/projects/${currentProject.id}/process-maps`,
        payload
      );
      return response;
    },
    onSuccess: (newProcessMap) => {
      console.log("Process map created successfully:", newProcessMap.name);
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', currentProject?.id, 'process-maps'] 
      });
      
      toast({
        title: "Process Map Created",
        description: `"${newProcessMap.name}" has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      form.reset();
      
      // Load the new process map
      loadProcessMap(newProcessMap);
    },
    onError: (error: Error) => {
      console.error("Error creating process map:", error);
      toast({
        title: "Failed to Create Process Map",
        description: error.message || "An error occurred while creating the process map.",
        variant: "destructive",
      });
    },
  });

  // Save/update process map
  const saveProcessMapMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProcessMap) {
        throw new Error("No process map selected");
      }

      if (!fabricCanvasRef.current) {
        throw new Error("Canvas not initialized");
      }

      console.log("Saving process map:", selectedProcessMap.name);

      const canvasJson = fabricCanvasRef.current.toJSON();
      const payload = {
        canvasData: JSON.stringify(canvasJson),
      };

      const response = await apiRequest(
        "PUT",
        `/api/process-maps/${selectedProcessMap.id}`,
        payload
      );
      return response;
    },
    onSuccess: () => {
      console.log("Process map saved successfully");
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', currentProject?.id, 'process-maps'] 
      });
      
      toast({
        title: "Process Map Saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Error saving process map:", error);
      toast({
        title: "Failed to Save",
        description: error.message || "An error occurred while saving the process map.",
        variant: "destructive",
      });
    },
  });

  const saveProcessMap = () => {
    if (selectedProcessMap) {
      saveProcessMapMutation.mutate();
    }
  };

  // Delete process map
  const deleteProcessMapMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Deleting process map:", id);
      await apiRequest("DELETE", `/api/process-maps/${id}`, undefined);
    },
    onSuccess: () => {
      console.log("Process map deleted successfully");
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', currentProject?.id, 'process-maps'] 
      });
      
      toast({
        title: "Process Map Deleted",
        description: "The process map has been deleted successfully.",
      });

      // Clear canvas
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.clear();
      }
      setSelectedProcessMap(null);
    },
    onError: (error: Error) => {
      console.error("Error deleting process map:", error);
      toast({
        title: "Failed to Delete",
        description: error.message || "An error occurred while deleting the process map.",
        variant: "destructive",
      });
    },
  });

  // Add shape to canvas
  const addShape = (type: 'rect' | 'circle' | 'triangle') => {
    if (!fabricCanvasRef.current) return;

    console.log("Adding shape:", type);
    const canvas = fabricCanvasRef.current;
    
    let shape: fabric.Object;
    const options = {
      left: 100,
      top: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
    };

    switch (type) {
      case 'rect':
        shape = new fabric.Rect({ ...options, width: 100, height: 80 });
        break;
      case 'circle':
        shape = new fabric.Circle({ ...options, radius: 50 });
        break;
      case 'triangle':
        shape = new fabric.Triangle({ ...options, width: 100, height: 100 });
        break;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  // Add text to canvas
  const addText = () => {
    if (!fabricCanvasRef.current) return;

    console.log("Adding text");
    const canvas = fabricCanvasRef.current;
    const text = new fabric.IText('Double-click to edit', {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: '#1e293b',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // Add text to selected shape
  const addTextToShape = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    
    if (!activeObject) {
      toast({
        title: "No Shape Selected",
        description: "Please select a shape first, then add text to it.",
        variant: "destructive",
      });
      return;
    }

    // Don't allow adding text to groups or text objects
    if (activeObject.type === 'group' || activeObject.type === 'i-text') {
      toast({
        title: "Invalid Selection",
        description: "Select a shape (rectangle, circle, triangle) to add text.",
        variant: "destructive",
      });
      return;
    }

    const text = new fabric.IText('Text', {
      fontSize: 16,
      fill: '#ffffff',
      originX: 'center',
      originY: 'center',
    });

    // Create a group with the shape and text
    const group = new fabric.Group([activeObject, text], {
      left: activeObject.left,
      top: activeObject.top,
    });

    canvas.remove(activeObject);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    
    console.log("Text added to shape");
  };

  // Start drawing a line/arrow
  const startDrawingConnector = (type: 'line' | 'arrow') => {
    if (!fabricCanvasRef.current) return;
    
    connectorTypeRef.current = type;
    isDrawingLineRef.current = true;
    setActiveConnectorType(type); // UI state
    
    const canvas = fabricCanvasRef.current;
    canvas.selection = false;
    canvas.hoverCursor = 'crosshair';
    canvas.defaultCursor = 'crosshair';
    
    toast({
      title: `Drawing ${type === 'arrow' ? 'Arrow' : 'Line'}`,
      description: "Click on a shape to start, then click on another shape to connect them.",
    });
  };

  // Toggle free draw mode
  const toggleFreeDrawMode = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const newMode = !isDrawingMode;
    
    setIsDrawingMode(newMode);
    canvas.isDrawingMode = newMode;
    
    if (newMode) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = drawingLineWidth;
      canvas.freeDrawingBrush.color = '#1e293b';
      toast({
        title: "Free Draw Enabled",
        description: "Draw freely on the canvas. Click again to disable.",
      });
    } else {
      toast({
        title: "Free Draw Disabled",
        description: "Selection mode enabled.",
      });
    }
  };

  // Change drawing line width
  const changeLineWidth = (width: number) => {
    setDrawingLineWidth(width);
    if (fabricCanvasRef.current && isDrawingMode) {
      const canvas = fabricCanvasRef.current;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = width;
      }
    }
  };

  // Change shape color
  const changeShapeColor = (color: string) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    
    if (!activeObject) {
      toast({
        title: "No Object Selected",
        description: "Please select a shape to change its color.",
        variant: "destructive",
      });
      return;
    }

    if (activeObject.type === 'group') {
      // Change the first object in the group (the shape)
      const group = activeObject as fabric.Group;
      const objects = group.getObjects();
      if (objects[0]) {
        objects[0].set('fill', color);
      }
    } else if (activeObject.type !== 'i-text') {
      activeObject.set('fill', color);
    }
    
    canvas.renderAll();
    console.log("Shape color changed to:", color);
  };

  // Change text color with smart contrast
  const changeTextColor = (color: string) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    
    if (!activeObject) {
      toast({
        title: "No Object Selected",
        description: "Please select text or a shape with text to change the text color.",
        variant: "destructive",
      });
      return;
    }

    if (activeObject.type === 'i-text') {
      activeObject.set('fill', color);
    } else if (activeObject.type === 'group') {
      // Change text in group
      const group = activeObject as fabric.Group;
      const objects = group.getObjects();
      const textObject = objects.find(obj => obj.type === 'i-text');
      if (textObject) {
        textObject.set('fill', color);
      }
    }
    
    canvas.renderAll();
    console.log("Text color changed to:", color);
  };

  // Helper to get center point of an object
  const getObjectCenter = (obj: fabric.Object) => {
    const center = obj.getCenterPoint();
    return { x: center.x, y: center.y };
  };

  // Create arrow marker
  const createArrowHead = () => {
    return new fabric.Triangle({
      width: 10,
      height: 10,
      fill: '#1e293b',
      stroke: '#1e293b',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
    });
  };

  // Update connections when objects move
  const updateConnections = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    connectionsRef.current.forEach((connection) => {
      const fromObj = canvas.getObjects().find((obj: any) => obj.id === connection.from);
      const toObj = canvas.getObjects().find((obj: any) => obj.id === connection.to);
      
      if (fromObj && toObj && connection.line) {
        const fromCenter = getObjectCenter(fromObj);
        const toCenter = getObjectCenter(toObj);
        
        // Update line position
        connection.line.set({
          x1: fromCenter.x,
          y1: fromCenter.y,
          x2: toCenter.x,
          y2: toCenter.y,
        });
        
        // Update arrow head position and angle if it exists
        if (connection.arrow) {
          const angle = Math.atan2(
            toCenter.y - fromCenter.y,
            toCenter.x - fromCenter.x
          );
          connection.arrow.set({
            left: toCenter.x,
            top: toCenter.y,
            angle: (angle * 180) / Math.PI + 90,
          });
        }
        
        canvas.renderAll();
      }
    });
  };

  const onSubmit = (data: CreateProcessMapFormData) => {
    createProcessMapMutation.mutate(data);
  };

  if (!currentProject) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Please select a project to view process maps.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Process Mapping</h1>
          <p className="text-muted-foreground">
            Create and manage visual process maps for {currentProject.name}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isCanvasReady}>
                <Plus className="h-4 w-4 mr-2" />
                New Process Map
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Process Map</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Process map name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProcessMapMutation.isPending}>
                      {createProcessMapMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Process Maps List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Process Maps</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMaps ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : processMaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No process maps yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {processMaps.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => loadProcessMap(map)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedProcessMap?.id === map.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium truncate">{map.name}</div>
                    {map.description && (
                      <div className="text-xs opacity-75 truncate">{map.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Canvas Area */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {selectedProcessMap ? selectedProcessMap.name : 'Canvas'}
              </CardTitle>
              {selectedProcessMap && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveProcessMap}
                    disabled={saveProcessMapMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveProcessMapMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteProcessMapMutation.mutate(selectedProcessMap.id)}
                    disabled={deleteProcessMapMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isCanvasReady && (
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Initializing canvas... Please wait.
                </p>
              </div>
            )}
            
            {/* Canvas Tools - Organized by Groups */}
            <div className="mb-4 space-y-3">
              {/* Shapes Group */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Shapes</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addShape('rect')}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-add-rectangle"
                  >
                    Rectangle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addShape('circle')}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-add-circle"
                  >
                    Circle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addShape('triangle')}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-add-triangle"
                  >
                    Triangle
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Connectors Group */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Connectors</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={activeConnectorType === 'line' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => startDrawingConnector('line')}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-draw-line"
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Line
                  </Button>
                  <Button
                    variant={activeConnectorType === 'arrow' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => startDrawingConnector('arrow')}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-draw-arrow"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Arrow
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Text Group */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Text</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addText}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-add-text"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTextToShape}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-add-text-to-shape"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Text on Shape
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Drawing Group */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Drawing</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    variant={isDrawingMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleFreeDrawMode}
                    disabled={!isCanvasReady || !selectedProcessMap}
                    data-testid="button-toggle-free-draw"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {isDrawingMode ? 'Stop Drawing' : 'Free Draw'}
                  </Button>
                  {isDrawingMode && (
                    <div className="flex gap-1">
                      <Button
                        variant={drawingLineWidth === 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => changeLineWidth(1)}
                        data-testid="button-line-width-thin"
                      >
                        Thin
                      </Button>
                      <Button
                        variant={drawingLineWidth === 2 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => changeLineWidth(2)}
                        data-testid="button-line-width-medium"
                      >
                        Medium
                      </Button>
                      <Button
                        variant={drawingLineWidth === 5 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => changeLineWidth(5)}
                        data-testid="button-line-width-thick"
                      >
                        Thick
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Colors Group */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Colors</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Shape:</span>
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer"
                      onChange={(e) => changeShapeColor(e.target.value)}
                      disabled={!isCanvasReady || !selectedProcessMap}
                      data-testid="input-shape-color"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Text:</span>
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer"
                      onChange={(e) => changeTextColor(e.target.value)}
                      disabled={!isCanvasReady || !selectedProcessMap}
                      data-testid="input-text-color"
                    />
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeShapeColor('#3b82f6')}
                      disabled={!isCanvasReady || !selectedProcessMap}
                      className="w-8 h-8 p-0"
                      style={{ backgroundColor: '#3b82f6' }}
                      data-testid="button-preset-blue"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeShapeColor('#ef4444')}
                      disabled={!isCanvasReady || !selectedProcessMap}
                      className="w-8 h-8 p-0"
                      style={{ backgroundColor: '#ef4444' }}
                      data-testid="button-preset-red"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeShapeColor('#22c55e')}
                      disabled={!isCanvasReady || !selectedProcessMap}
                      className="w-8 h-8 p-0"
                      style={{ backgroundColor: '#22c55e' }}
                      data-testid="button-preset-green"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeShapeColor('#f59e0b')}
                      disabled={!isCanvasReady || !selectedProcessMap}
                      className="w-8 h-8 p-0"
                      style={{ backgroundColor: '#f59e0b' }}
                      data-testid="button-preset-orange"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="border rounded-lg overflow-hidden bg-slate-50">
              <canvas ref={canvasRef} />
            </div>

            {!selectedProcessMap && isCanvasReady && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Select a process map from the sidebar or create a new one to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}