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
import { insertProcessMapSchema, type InsertProcessMap } from "@shared/schema";
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
  linkedItemId?: string; // For task, milestone, action symbols - link to created item
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

// Symbol definition interface
interface SymbolDefinition {
  name: string;
  icon: any;
  shape: string;
  color: string;
  isChangeItem?: boolean;
}

// Process mapping symbol definitions with industry standard shapes
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
  // Change Management Symbols
  task: { name: "Task", icon: CheckSquare, shape: "rectangle", color: "#3b82f6", isChangeItem: true },
  milestone: { name: "Milestone", icon: Calendar, shape: "diamond", color: "#22c55e", isChangeItem: true },
  action: { name: "Action", icon: AlertTriangle, shape: "triangle", color: "#f59e0b", isChangeItem: true },
};

// Form schemas reused from fishbone.tsx for item creation
const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

const milestoneFormSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional(),
  targetDate: z.string().min(1, "Target date is required"),
});

const actionFormSchema = z.object({
  type: z.literal("action"),
  title: z.string().min(1, "Action title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assigneeId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;
type MilestoneFormData = z.infer<typeof milestoneFormSchema>;
type ActionFormData = z.infer<typeof actionFormSchema>;

export default function DevelopmentMaps() {
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
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
  
  // Item creation dialogue states
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
  const { canCreateContent, canDeleteContent, hasPermission } = usePermissions();

  const { data: processMaps = [], isLoading } = useQuery<ProcessMap[]>({
    queryKey: ['/api/projects', currentProject?.id, 'process-maps'],
    enabled: !!currentProject?.id,
  });

  // Fetch users for assignment in item creation
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!currentProject?.id,
  });

  // Handle successful item creation from CreateItemForm
  const handleItemCreationSuccess = () => {
    // Create symbol on canvas after successful creation
    if (pendingSymbolPosition && selectedItemType) {
      // Create symbol with generic name since we don't have access to the created item data
      const symbolName = `${selectedItemType.charAt(0).toUpperCase() + selectedItemType.slice(1)} Item`;
      addProcessElementWithItem(selectedItemType, pendingSymbolPosition.x, pendingSymbolPosition.y, `temp-${Date.now()}`, symbolName);
      setPendingSymbolPosition(null);
    }
    setIsItemCreationOpen(false);
    toast({ 
      title: `${selectedItemType ? selectedItemType.charAt(0).toUpperCase() + selectedItemType.slice(1) : 'Item'} created and added to map`, 
      description: `${selectedItemType ? selectedItemType.charAt(0).toUpperCase() + selectedItemType.slice(1) : 'Item'} has been created and symbol placed on the map.` 
    });
  };

  // Sync ref with state to ensure event handlers have latest value
  useEffect(() => {
    currentProcessMapRef.current = currentProcessMap;
  }, [currentProcessMap]);

  // Note: Removed auto-loading to prevent unintended map switching.
  // Users must explicitly select or create a process map before placing symbols.

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Clean up existing canvas if it exists
    if (canvas) {
      try {
        canvas.dispose();
      } catch (error) {
        console.error('Error disposing existing canvas:', error);
      }
    }

    try {
      const canvasElement = canvasRef.current;
      const width = window.innerWidth - 320;
      const height = window.innerHeight - 200;
      
      // Set explicit dimensions on the HTML canvas element first
      canvasElement.width = width;
      canvasElement.height = height;
      canvasElement.style.width = width + 'px';
      canvasElement.style.height = height + 'px';

      const fabricCanvas = new FabricCanvas(canvasElement, {
        width: width,
        height: height,
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
  }, []); // Remove canvas dependency to avoid initialization loop

  // Update ref when selectedSymbolType changes
  useEffect(() => {
    selectedSymbolTypeRef.current = selectedSymbolType;
  }, [selectedSymbolType]);

  // Update brush properties when drawing tools change (fix reactivity)
  useEffect(() => {
    if (!canvas || !canvas.isDrawingMode) return;
    
    // Update brush properties when colors or stroke width change while in drawing mode
    if (tools.drawingTool === 'eraser') {
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = '#ffffff'; // Background color for eraser effect
      canvas.freeDrawingBrush.width = tools.strokeWidth * 2;
    } else {
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = tools.strokeColor;
      canvas.freeDrawingBrush.width = tools.strokeWidth;
    }
  }, [canvas, tools.drawingTool, tools.strokeColor, tools.strokeWidth]);

  // Handle canvas interactions - symbol placement and connections
  useEffect(() => {
    if (!canvas) return;

    const handleCanvasClick = (e: any) => {
      const currentSymbolType = selectedSymbolTypeRef.current;
      
      // Handle symbol placement
      if (currentSymbolType && e.pointer) {
        // Double-check that a process map is selected before placing symbols (check both state and ref)
        const hasProcessMap = currentProcessMap || currentProcessMapRef.current;
        if (!hasProcessMap) {
          toast({
            title: "No Process Map Selected",
            description: "Please create or select a process map first",
            variant: "destructive",
          });
          setSelectedSymbolType(null);
          return;
        }

        // Check if this is a change management symbol that needs item creation
        const symbol = PROCESS_SYMBOLS[currentSymbolType];
        if (symbol?.isChangeItem) {
          // Open item creation dialog first
          setPendingSymbolPosition({ x: e.pointer.x, y: e.pointer.y });
          setSelectedItemType(currentSymbolType as 'task' | 'milestone' | 'action');
          setIsItemCreationOpen(true);
          setSelectedSymbolType(null);
          return;
        }
        
        addProcessElement(currentSymbolType, e.pointer.x, e.pointer.y);
        setSelectedSymbolType(null);
        return;
      }
      
      // Handle connection mode - clicking on objects to connect them
      if (tools.mode === 'connect' && e.target && (e.target as any).processId) {
        const clickedElement = e.target;
        
        if (!tools.connecting || !tools.connectionStart) {
          // First click - start connection
          setTools(prev => ({
            ...prev,
            connecting: true,
            connectionStart: clickedElement
          }));
          toast({
            title: "Connection Started",
            description: "Click another symbol to complete the connection",
          });
        } else {
          // Second click - complete connection
          if (tools.connectionStart !== clickedElement) {
            createConnection(tools.connectionStart, clickedElement);
            toast({
              title: "Connection Created",
              description: "Symbols connected successfully!",
            });
          }
          // Reset connection state
          setTools(prev => ({
            ...prev,
            connecting: false,
            connectionStart: null
          }));
        }
      }
    };

    const handleDoubleClick = (e: any) => {
      // Handle text editing on double-click
      let targetElement = e.target;
      
      // If clicking on a shape within a group, get the group
      if (targetElement && (targetElement as any).group) {
        targetElement = (targetElement as any).group;
      }
      
      // Check if the target (or its group) has a processId
      if (targetElement && (targetElement as any).processId) {
        editSymbolText(targetElement);
      }
    };

    canvas.on('mouse:down', handleCanvasClick);
    canvas.on('mouse:dblclick', handleDoubleClick);

    return () => {
      canvas.off('mouse:down', handleCanvasClick);
      canvas.off('mouse:dblclick', handleDoubleClick);
    };
  }, [canvas, tools.mode, tools.connecting, tools.connectionStart]);

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

  // Add process element to canvas with linked item data
  const addProcessElementWithItem = (type: string, x: number, y: number, linkedItemId: string, itemName: string) => {
    if (!canvas) return;

    const shape = createProcessShape(type, x, y);
    if (shape) {
      // Add custom properties for linked item
      (shape as any).linkedItemId = linkedItemId;
      (shape as any).linkedItemName = itemName;
      
      canvas.add(shape);
      canvas.setActiveObject(shape);
      
      // Add to elements state with item data
      const newElement: ProcessElement = {
        id: (shape as any).processId,
        type: type as ProcessElement['type'],
        text: itemName, // Use the actual item name
        x: x,
        y: y,
        width: 120,
        height: 60,
        linkedItemId: linkedItemId,
      };
      
      setElements(prev => {
        const updatedElements = [...prev, newElement];
        
        // Auto-save to database when element is added
        if (currentProcessMap?.id) {
          const canvasData = JSON.stringify(canvas.toJSON());
          const updateData = {
            canvasData: canvasData,
            elements: updatedElements,
            connections: connections,
          };

          apiRequest('PUT', `/api/process-maps/${currentProcessMap.id}`, updateData)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
            })
            .catch((error) => {
              console.error("Error auto-saving process map:", error);
            });
        }
        
        return updatedElements;
      });
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

    // Calculate arrow direction for proper arrowhead positioning
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    
    // Adjust end point to touch the symbol edge rather than center
    const adjustedEndX = endX - Math.cos(angle) * 30;
    const adjustedEndY = endY - Math.sin(angle) * 30;

    // Create arrow line
    const line = new Path(`M ${startX} ${startY} L ${adjustedEndX} ${adjustedEndY}`, {
      stroke: '#374151',
      strokeWidth: 2,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
    });

    // Create arrow head positioned at the adjusted end point
    const arrowSize = 10;
    const arrowHead = new Polygon([
      { x: adjustedEndX - arrowSize * Math.cos(angle - Math.PI / 6), y: adjustedEndY - arrowSize * Math.sin(angle - Math.PI / 6) },
      { x: adjustedEndX, y: adjustedEndY },
      { x: adjustedEndX - arrowSize * Math.cos(angle + Math.PI / 6), y: adjustedEndY - arrowSize * Math.sin(angle + Math.PI / 6) }
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

    // Add custom properties to identify this as a connection
    (connection as any).isConnection = true;
    (connection as any).connectionId = `connection-${Date.now()}`;

    canvas.add(connection);
    canvas.renderAll();

    // Add to connections state
    const newConnection: Connection = {
      id: (connection as any).connectionId,
      fromId: (startElement as any).processId,
      toId: (endElement as any).processId,
      points: [startX, startY, adjustedEndX, adjustedEndY],
    };

    setConnections(prev => [...prev, newConnection]);
  };

  // Edit text in symbol
  const editSymbolText = (symbolGroup: any) => {
    if (!canvas || !symbolGroup) return;

    // Find the text object within the group
    const textObject = symbolGroup.getObjects().find((obj: any) => obj.type === 'i-text');
    if (!textObject) return;

    // Temporarily make the text object editable
    textObject.selectable = true;
    textObject.evented = true;
    
    // Set the text object as active and enter editing mode
    canvas.setActiveObject(textObject);
    canvas.requestRenderAll();
    
    setTimeout(() => {
      try {
        (textObject as any).enterEditing();
        
        // When editing ends, update the element state
        textObject.on('editing:exited', () => {
          const processId = (symbolGroup as any).processId;
          
          if (processId) {
            setElements(prev => prev.map(el => 
              el.id === processId 
                ? { ...el, text: textObject.text || el.text }
                : el
            ));
          }
          
          // Make text non-selectable again
          textObject.selectable = false;
          textObject.evented = false;
          canvas.discardActiveObject();
          
          // Force canvas re-render to ensure text changes are visible
          canvas.requestRenderAll();
          
          // Additional force render after a small delay to ensure visibility
          setTimeout(() => {
            canvas.renderAll();
          }, 10);
        });
      } catch (error) {
        console.warn('Could not enter text editing mode:', error);
        // Fallback: still make text temporarily selectable
        textObject.selectable = false;
        textObject.evented = false;
      }
    }, 50);
  };

  // Handle symbol selection from toolbar
  const handleSymbolSelect = (symbolType: string) => {
    // Check if a process map is selected first (check both state and ref for robustness)
    const hasProcessMap = currentProcessMap || currentProcessMapRef.current;
    if (!hasProcessMap) {
      toast({
        title: "No Process Map Selected",
        description: "Please create a new process map or select an existing one before placing symbols",
        variant: "destructive",
      });
      return;
    }
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
    if (!canvas || !tools.selectedElement) return;

    const elementToDelete = tools.selectedElement;
    const elementId = (elementToDelete as any).processId;
    const connectionId = (elementToDelete as any).connectionId;
    const isConnection = (elementToDelete as any).isConnection === true;

    // Remove from canvas
    canvas.remove(elementToDelete);
    canvas.renderAll();
    setTools(prev => ({ ...prev, selectedElement: null }));

    // Calculate updated state based on what was deleted
    let updatedElements = elements;
    let updatedConnections = connections;

    if (isConnection && connectionId) {
      // Deleting a connection
      updatedConnections = connections.filter(conn => conn.id !== connectionId);
    } else if (elementId) {
      // Deleting a symbol/element
      updatedElements = elements.filter(el => el.id !== elementId);
      // Also remove any connections involving this element
      updatedConnections = connections.filter(conn => 
        conn.fromId !== elementId && conn.toId !== elementId
      );
    }

    // Update state
    if (elementId || (isConnection && connectionId)) {
      setElements(updatedElements);
      setConnections(updatedConnections);
    }

    // Auto-save with the updated state
    if (currentProcessMap?.id && canvas) {
      const canvasData = JSON.stringify(canvas.toJSON());
      const updateData = {
        canvasData: canvasData,
        elements: updatedElements,
        connections: updatedConnections,
      };

      // Save immediately with the correct state
      apiRequest('PUT', `/api/process-maps/${currentProcessMap.id}`, updateData)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
          toast({
            title: "Success",
            description: "Process map saved successfully!",
          });
        })
        .catch((error) => {
          console.error("Error saving process map after delete:", error);
          toast({
            title: "Error",
            description: "Failed to save changes. Please try again.",
            variant: "destructive",
          });
        });
    }
  };

  // Drawing tool functions
  const setDrawingMode = (enabled: boolean) => {
    if (!canvas) {
      return;
    }
    
    canvas.isDrawingMode = enabled;
    
    if (enabled) {
      // Initialize the brush first before setting properties
      if (tools.drawingTool === 'eraser') {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.color = '#ffffff'; // Background color for eraser effect
        canvas.freeDrawingBrush.width = tools.strokeWidth * 2;
      } else {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.color = tools.strokeColor;
        canvas.freeDrawingBrush.width = tools.strokeWidth;
      }
      
      // Add path created event listener
      canvas.on('path:created', function(event) {
        // Path was created successfully
      });
    } else {
      // Remove event listeners when drawing is disabled
      canvas.off('path:created');
    }
  };

  const addTextBox = () => {
    if (!canvas) return;
    
    const textbox = new IText('Click to edit text', {
      left: canvas.width! / 2 - 100,
      top: canvas.height! / 2 - 20,
      fontFamily: 'Arial',
      fontSize: 16,
      fill: tools.strokeColor,
      width: 200,
      splitByGrapheme: true,
    });
    
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    
    // Wait for the textbox to be properly rendered before entering editing mode
    canvas.requestRenderAll();
    setTimeout(() => {
      try {
        textbox.enterEditing();
      } catch (error) {
        console.warn('Could not enter editing mode immediately:', error);
        // Fallback: user can double-click to edit
      }
    }, 50);
  };

  const addShape = (type: 'rectangle' | 'circle') => {
    if (!canvas) return;
    
    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;
    
    let shape: any;
    
    if (type === 'rectangle') {
      shape = new Rect({
        left: centerX - 50,
        top: centerY - 25,
        width: 100,
        height: 50,
        fill: tools.fillColor,
        stroke: tools.strokeColor,
        strokeWidth: tools.strokeWidth,
      });
    } else {
      shape = new FabricCircle({
        left: centerX - 25,
        top: centerY - 25,
        radius: 25,
        fill: tools.fillColor,
        stroke: tools.strokeColor,
        strokeWidth: tools.strokeWidth,
      });
    }
    
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();
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
      
      const response = await apiRequest('POST', `/api/projects/${currentProject.id}/process-maps`, processMapData);
      return await response.json();
    },
    onSuccess: (createdProcessMap: ProcessMap) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
      setIsNewProcessMapOpen(false);
      processMapForm.reset();
      
      // Set the newly created process map as current so Save button appears
      setCurrentProcessMap(createdProcessMap);
      
      toast({
        title: "Success",
        description: "Process map created successfully! You can now add symbols and save changes.",
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

  const deleteProcessMapMutation = useMutation({
    mutationFn: async (processMapId: string) => {
      return apiRequest('DELETE', `/api/process-maps/${processMapId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'process-maps'] });
      
      // Clear current process map if it was deleted
      if (currentProcessMap?.id === processMapToDelete?.id) {
        setCurrentProcessMap(null);
        currentProcessMapRef.current = null;
        clearCanvas();
      }
      
      setIsDeleteDialogOpen(false);
      setProcessMapToDelete(null);
      
      toast({
        title: "Success",
        description: "Process map deleted successfully!",
      });
    },
    onError: (error) => {
      console.error("Error deleting process map:", error);
      toast({
        title: "Error",
        description: "Failed to delete process map. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (processMap: ProcessMap) => {
    setProcessMapToDelete(processMap);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (processMapToDelete?.id) {
      deleteProcessMapMutation.mutate(processMapToDelete.id);
    }
  };

  // Load process map
  const loadProcessMap = async (processMap: ProcessMap) => {
    if (!canvas) {
      console.error("Canvas not available for loading process map");
      toast({
        title: "Error",
        description: "Canvas not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setCurrentProcessMap(processMap);
      currentProcessMapRef.current = processMap;
      
      // Clear canvas state first
      setElements([]);
      setConnections([]);
      
      // Ensure canvas is properly initialized before operations
      try {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
      } catch (clearError) {
        console.error("Error clearing canvas:", clearError);
        // If basic operations fail, canvas is not properly initialized
        toast({
          title: "Error",
          description: "Canvas initialization failed. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      if (processMap.canvasData) {
        try {
          // Parse canvas data first to validate it
          const canvasData = typeof processMap.canvasData === 'string' 
            ? JSON.parse(processMap.canvasData) 
            : processMap.canvasData;
          
          canvas.loadFromJSON(canvasData, () => {
            try {
              canvas.renderAll();
              if (processMap.elements) {
                setElements(processMap.elements as ProcessElement[]);
              }
              if (processMap.connections) {
                setConnections(processMap.connections as Connection[]);
              }
              
              toast({
                title: "Success",
                description: `Process map "${processMap.name}" loaded successfully!`,
              });
            } catch (renderError) {
              console.error("Error rendering canvas after load:", renderError);
              toast({
                title: "Warning",
                description: "Process map loaded but some elements may not display correctly.",
                variant: "destructive",
              });
            }
          });
        } catch (loadError) {
          console.error("Error loading canvas from JSON:", loadError);
          // If loading fails, ensure canvas is in a good state
          try {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
          } catch (recoveryError) {
            console.error("Error during canvas recovery:", recoveryError);
          }
          
          toast({
            title: "Error",
            description: "Failed to load canvas data. Process map created with empty canvas.",
            variant: "destructive",
          });
        }
      } else {
        // No canvas data, just show success for empty process map
        toast({
          title: "Success",
          description: `Process map "${processMap.name}" loaded successfully!`,
        });
      }
      
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
          <PermissionGate customCheck={canCreateContent}>
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
                    <PermissionGate customCheck={canCreateContent}>
                      <Button type="submit" disabled={createProcessMapMutation.isPending} data-testid="button-create-process-map">
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
              <Button 
                onClick={() => saveProcessMapMutation.mutate()} 
                disabled={saveProcessMapMutation.isPending}
                data-testid="button-save-process-map"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveProcessMapMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </PermissionGate>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Symbol Toolbar */}
        <div className="w-80 border-r bg-muted/20 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Saved Process Maps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Development Maps</CardTitle>
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
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => loadProcessMap(processMap)}
                          data-testid={`button-load-${processMap.id}`}
                        >
                          Load
                        </Button>
                        <PermissionGate customCheck={canDeleteContent}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                data-testid={`button-menu-${processMap.id}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(processMap)}
                                className="text-destructive focus:text-destructive"
                                data-testid={`button-delete-${processMap.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </PermissionGate>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Process Symbols */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Development Symbols</CardTitle>
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

                <Separator />

                <div>
                  <h4 className="text-xs font-medium mb-2">Change Management</h4>
                  <p className="text-xs text-muted-foreground mb-2">Creates linked items and symbols</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('task')}
                      className={`h-auto p-3 ${selectedSymbolType === 'task' ? 'ring-2 ring-blue-500' : ''}`}
                      data-testid="button-symbol-task"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <CheckSquare className="w-5 h-5 text-blue-500" />
                        <span className="text-xs">Task</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('milestone')}
                      className={`h-auto p-3 ${selectedSymbolType === 'milestone' ? 'ring-2 ring-green-500' : ''}`}
                      data-testid="button-symbol-milestone"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Calendar className="w-5 h-5 text-green-500" />
                        <span className="text-xs">Milestone</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect('action')}
                      className={`h-auto p-3 ${selectedSymbolType === 'action' ? 'ring-2 ring-orange-500' : ''}`}
                      data-testid="button-symbol-action"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <span className="text-xs">Action</span>
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
                <div className="flex flex-wrap items-start gap-2">
                  <Button
                    variant={tools.mode === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTools(prev => ({ ...prev, mode: 'select', connecting: false, connectionStart: null }));
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
                    variant={tools.mode === 'connect' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTools(prev => ({ ...prev, mode: 'connect', connecting: false, connectionStart: null }));
                      setSelectedSymbolType(null);
                      if (canvas) {
                        canvas.defaultCursor = 'crosshair';
                      }
                      toast({
                        title: "Connect Mode",
                        description: "Click two symbols to connect them with an arrow",
                      });
                    }}
                    data-testid="button-tool-connect"
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    Connect
                  </Button>
                  
                  {/* Drawing Tools */}
                  <Button
                    variant={tools.mode === 'draw' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newMode = tools.mode === 'draw' ? 'select' : 'draw';
                      setTools(prev => ({ ...prev, mode: newMode }));
                      setSelectedSymbolType(null);
                      setDrawingMode(newMode === 'draw');
                      if (canvas) {
                        canvas.defaultCursor = newMode === 'draw' ? 'crosshair' : 'default';
                      }
                    }}
                    data-testid="button-tool-draw"
                  >
                    <Pen className="w-4 h-4 mr-1" />
                    Draw
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTextBox}
                    data-testid="button-tool-text"
                  >
                    <Type className="w-4 h-4 mr-1" />
                    Text
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addShape('rectangle')}
                    data-testid="button-tool-rectangle"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    Rectangle
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addShape('circle')}
                    data-testid="button-tool-circle"
                  >
                    <Circle className="w-4 h-4 mr-1" />
                    Circle
                  </Button>
                  
                  {/* Color Controls */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-tool-color">
                        <Palette className="w-4 h-4 mr-2" />
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: tools.strokeColor }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-3">
                        <div>
                          <Label>Stroke Color</Label>
                          <Input
                            type="color"
                            value={tools.strokeColor}
                            onChange={(e) => setTools({ ...tools, strokeColor: e.target.value })}
                            data-testid="input-stroke-color"
                          />
                        </div>
                        <div>
                          <Label>Fill Color</Label>
                          <Input
                            type="color"
                            value={tools.fillColor}
                            onChange={(e) => setTools({ ...tools, fillColor: e.target.value })}
                            data-testid="input-fill-color"
                          />
                        </div>
                        <div>
                          <Label>Stroke Width</Label>
                          <Input
                            type="range"
                            min="1"
                            max="20"
                            value={tools.strokeWidth}
                            onChange={(e) => setTools({ ...tools, strokeWidth: parseInt(e.target.value) })}
                            data-testid="input-stroke-width"
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <PermissionGate customCheck={canDeleteContent}>
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
                  </PermissionGate>
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-2">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Process Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{processMapToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteProcessMapMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteProcessMapMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Creation Dialog */}
      <Dialog open={isItemCreationOpen} onOpenChange={setIsItemCreationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Create {selectedItemType === 'task' ? 'Task' : selectedItemType === 'milestone' ? 'Milestone' : 'Action'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItemType && (
            <CreateItemForm
              itemType={selectedItemType === 'action' ? 'raid' : selectedItemType}
              phase="Process Mapping"
              users={users}
              onSuccess={handleItemCreationSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}