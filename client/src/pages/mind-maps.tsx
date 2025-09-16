import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Canvas as FabricCanvas, IText, Rect, Circle as FabricCircle, PencilBrush } from "fabric";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Save, Download, Upload, Pen, Square, Circle, Type, 
  Eraser, Palette, MoreVertical, ListTodo, AlertTriangle, 
  Megaphone, Users, Calendar, Undo, Redo, Move, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { MindMap, Task, RaidLog, Communication, Stakeholder } from "@shared/schema";

// Import the actual insert schemas from shared
import {
  insertTaskSchema,
  insertRaidLogSchema,
  insertCommunicationSchema,
  insertStakeholderSchema,
  insertMindMapSchema,
  insertMilestoneSchema,
  type InsertTask,
  type InsertRaidLog,
  type InsertCommunication,
  type InsertStakeholder,
  type InsertMindMap,
  type InsertMilestone,
} from "@shared/schema";

// Extend schemas for form handling
const taskFormSchema = insertTaskSchema.extend({
  dueDate: z.string().optional(),
}).omit({ projectId: true });

const raidLogFormSchema = insertRaidLogSchema.extend({
  dueDate: z.string().optional(),
}).omit({ projectId: true, ownerId: true });

const communicationFormSchema = insertCommunicationSchema.extend({
  sendDate: z.string().optional(),
}).omit({ projectId: true, createdById: true });

const stakeholderFormSchema = insertStakeholderSchema.omit({ projectId: true });

const mindMapFormSchema = insertMindMapSchema.omit({ projectId: true, createdById: true, canvasData: true, textBoxes: true });

const milestoneFormSchema = insertMilestoneSchema.extend({
  targetDate: z.string().min(1, "Target date is required"),
}).omit({ projectId: true });

type TaskFormData = z.infer<typeof taskFormSchema>;
type RaidLogFormData = z.infer<typeof raidLogFormSchema>;
type CommunicationFormData = z.infer<typeof communicationFormSchema>;
type StakeholderFormData = z.infer<typeof stakeholderFormSchema>;
type MindMapFormData = z.infer<typeof mindMapFormSchema>;
type MilestoneFormData = z.infer<typeof milestoneFormSchema>;

interface TextBoxData {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasTools {
  mode: 'select' | 'draw' | 'text' | 'shape';
  drawingTool: 'pen' | 'eraser';
  shapeType: 'rectangle' | 'circle';
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
}

export default function MindMaps() {
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [currentMindMap, setCurrentMindMap] = useState<MindMap | null>(null);
  const [isNewMindMapOpen, setIsNewMindMapOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [selectedTextBox, setSelectedTextBox] = useState<any | null>(null);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [integrationType, setIntegrationType] = useState<'task' | 'raid' | 'communication' | 'stakeholder' | 'milestone' | null>(null);
  
  const [tools, setTools] = useState<CanvasTools>({
    mode: 'select',
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

  const { data: mindMaps = [], isLoading } = useQuery<MindMap[]>({
    queryKey: ['/api/projects', currentProject?.id, 'mind-maps'],
    enabled: !!currentProject?.id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const canvasElement = canvasRef.current;
    const width = window.innerWidth - 300;
    const height = window.innerHeight - 200;
    
    // Set explicit dimensions on the HTML canvas element
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
      setSelectedTextBox(e.selected?.[0] || null);
    });

    fabricCanvas.on('selection:updated', (e) => {
      setSelectedTextBox(e.selected?.[0] || null);
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedTextBox(null);
    });

    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [canvas]);

  // Resize canvas when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (canvas && canvasRef.current && canvas.getElement && canvas.lowerCanvasEl) {
        try {
          const newWidth = window.innerWidth - 300;
          const newHeight = window.innerHeight - 200;
          
          // Update HTML canvas element dimensions
          canvasRef.current.width = newWidth;
          canvasRef.current.height = newHeight;
          canvasRef.current.style.width = newWidth + 'px';
          canvasRef.current.style.height = newHeight + 'px';
          
          // Safely update Fabric.js canvas dimensions with validation
          if (typeof canvas.setDimensions === 'function') {
            canvas.setDimensions({
              width: newWidth,
              height: newHeight
            });
            
            // Force canvas to render after resize
            canvas.requestRenderAll();
          }
        } catch (error) {
          // Silently handle resize errors
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvas]);

  // Form setups for different integrations
  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      status: "pending",
      priority: "medium",
    },
  });

  const raidForm = useForm<RaidLogFormData>({
    resolver: zodResolver(raidLogFormSchema),
    defaultValues: {
      type: "issue",
      severity: "medium",
      impact: "medium",
    },
  });

  const communicationForm = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: {
      type: "company_email",
      targetAudience: [],
    },
  });

  const stakeholderForm = useForm<StakeholderFormData>({
    resolver: zodResolver(stakeholderFormSchema),
    defaultValues: {
      influenceLevel: "medium",
      supportLevel: "neutral",
      engagementLevel: "medium",
    },
  });

  const mindMapForm = useForm<MindMapFormData>({
    resolver: zodResolver(mindMapFormSchema),
    defaultValues: {
      name: "New Mind Map",
    },
  });

  const milestoneForm = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      status: "pending",
    },
  });

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
    textbox.enterEditing();
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
  };

  const clearCanvas = () => {
    if (!canvas) return;
    
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
  };

  const deleteSelected = () => {
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      canvas.remove(...activeObjects);
      canvas.discardActiveObject();
    }
  };

  // Save and load functions
  const saveCanvasData = () => {
    if (!canvas) return '{}';
    return JSON.stringify(canvas.toJSON());
  };

  const loadCanvasData = (data: string) => {
    if (!canvas) return;
    
    try {
      const canvasData = JSON.parse(data);
      canvas.loadFromJSON(canvasData, () => {
        canvas.renderAll();
        console.log('Canvas data loaded successfully');
      });
    } catch (error) {
      console.error('Error loading canvas data:', error);
      toast({
        title: "Error",
        description: "Failed to load mind map data",
        variant: "destructive",
      });
    }
  };

  // Mutations for API integration
  const createMindMapMutation = useMutation({
    mutationFn: async (data: MindMapFormData) => {
      const canvasData = saveCanvasData();
      const textBoxes = canvas?.getObjects().filter(obj => obj.type === 'i-text' || obj.type === 'text') || [];
      
      return apiRequest('POST', '/api/projects/' + currentProject?.id + '/mind-maps', {
        ...data,
        projectId: currentProject?.id,
        createdById: "550e8400-e29b-41d4-a716-446655440000",
        canvasData,
        textBoxes: textBoxes.map(obj => ({
          id: (obj as any).id || 'text-' + Math.random().toString(36),
          text: obj.type === 'i-text' ? (obj as any).text : '',
          x: obj.left || 0,
          y: obj.top || 0,
          width: obj.width || 100,
          height: obj.height || 50,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'mind-maps'] });
      toast({ title: "Success", description: "Mind map saved successfully" });
      setIsNewMindMapOpen(false);
      setIsSaveDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save mind map", variant: "destructive" });
    }
  });

  const updateMindMapMutation = useMutation({
    mutationFn: async (data: { id: string; canvasData: string }) => {
      const textBoxes = canvas?.getObjects().filter(obj => obj.type === 'i-text' || obj.type === 'text') || [];
      
      return apiRequest('PUT', '/api/mind-maps/' + data.id, {
        canvasData: data.canvasData,
        textBoxes: textBoxes.map(obj => ({
          id: (obj as any).id || 'text-' + Math.random().toString(36),
          text: obj.type === 'i-text' ? (obj as any).text : '',
          x: obj.left || 0,
          y: obj.top || 0,
          width: obj.width || 100,
          height: obj.height || 50,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'mind-maps'] });
      toast({ title: "Success", description: "Mind map updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update mind map", variant: "destructive" });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => apiRequest('POST', '/api/projects/' + currentProject?.id + '/tasks', {
      ...data, projectId: currentProject?.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      toast({ title: "Success", description: "Task created successfully" });
      setIsIntegrationOpen(false);
    }
  });

  const createRaidLogMutation = useMutation({
    mutationFn: async (data: RaidLogFormData) => apiRequest('POST', '/api/projects/' + currentProject?.id + '/raid-logs', {
      ...data, projectId: currentProject?.id, ownerId: "550e8400-e29b-41d4-a716-446655440000"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'raid-logs'] });
      toast({ title: "Success", description: "RAID log created successfully" });
      setIsIntegrationOpen(false);
    }
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (data: CommunicationFormData) => apiRequest('POST', '/api/projects/' + currentProject?.id + '/communications', {
      ...data, projectId: currentProject?.id, createdById: "550e8400-e29b-41d4-a716-446655440000"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      toast({ title: "Success", description: "Communication created successfully" });
      setIsIntegrationOpen(false);
    }
  });

  const createStakeholderMutation = useMutation({
    mutationFn: async (data: StakeholderFormData) => apiRequest('POST', '/api/projects/' + currentProject?.id + '/stakeholders', {
      ...data, projectId: currentProject?.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'stakeholders'] });
      toast({ title: "Success", description: "Stakeholder created successfully" });
      setIsIntegrationOpen(false);
    }
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async (data: MilestoneFormData) => apiRequest('POST', '/api/projects/' + currentProject?.id + '/milestones', {
      ...data, projectId: currentProject?.id, targetDate: new Date(data.targetDate)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'milestones'] });
      toast({ title: "Success", description: "Milestone created successfully" });
      setIsIntegrationOpen(false);
    }
  });

  // Handle form submissions
  const handleFormSubmit = (type: string) => {
    if (!currentProject) return;
    
    const selectedText = selectedTextBox && selectedTextBox.type === 'i-text' ? (selectedTextBox as any).text : '';
    
    switch(type) {
      case 'task':
        taskForm.setValue('name', selectedText || 'New Task');
        createTaskMutation.mutate(taskForm.getValues());
        break;
      case 'raid':
        raidForm.setValue('title', selectedText || 'New Issue');
        createRaidLogMutation.mutate(raidForm.getValues());
        break;
      case 'communication':
        communicationForm.setValue('title', selectedText || 'New Communication');
        createCommunicationMutation.mutate(communicationForm.getValues());
        break;
      case 'stakeholder':
        stakeholderForm.setValue('name', selectedText || 'New Stakeholder');
        createStakeholderMutation.mutate(stakeholderForm.getValues());
        break;
      case 'milestone':
        milestoneForm.setValue('name', selectedText || 'New Milestone');
        createMilestoneMutation.mutate(milestoneForm.getValues());
        break;
    }
  };

  // Context menu handler for selected objects
  const handleContextMenuAction = (action: string) => {
    setIntegrationType(action as any);
    setIsIntegrationOpen(true);
  };

  // Event handlers
  const handleLoadMindMap = (mindMap: MindMap) => {
    setCurrentMindMap(mindMap);
    if (mindMap.canvasData) {
      loadCanvasData(mindMap.canvasData as string);
    }
  };

  const handleSave = () => {
    if (!currentMindMap) {
      setIsNewMindMapOpen(true);
      return;
    }

    const canvasData = saveCanvasData();
    if (canvasData) {
      updateMindMapMutation.mutate({
        id: currentMindMap.id,
        canvasData,
      });
    }
  };

  const handleCreateNew = (data: MindMapFormData) => {
    createMindMapMutation.mutate(data);
  };

  const handleIntegration = (type: 'task' | 'raid' | 'communication' | 'stakeholder' | 'milestone') => {
    // TODO: Update when Fabric.js text boxes are implemented
    const demoText = "Sample mind map text";
    setIntegrationType(type);

    // Pre-populate forms with demo text content
    switch (type) {
      case 'task':
        taskForm.setValue('name', demoText.substring(0, 100));
        taskForm.setValue('description', demoText);
        break;
      case 'raid':
        raidForm.setValue('title', demoText.substring(0, 100));
        raidForm.setValue('description', demoText);
        break;
      case 'communication':
        communicationForm.setValue('title', demoText.substring(0, 100));
        communicationForm.setValue('content', demoText);
        break;
      case 'stakeholder':
        const lines = demoText.split('\n');
        stakeholderForm.setValue('name', lines[0] || demoText.substring(0, 50));
        stakeholderForm.setValue('role', lines[1] || 'Role from mind map');
        break;
      case 'milestone':
        milestoneForm.setValue('name', demoText.substring(0, 100));
        milestoneForm.setValue('description', demoText);
        break;
    }

    setIsIntegrationOpen(true);
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please select a project to use Mind Maps
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" data-testid="mind-maps-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold">Mind Maps</h1>
          <Select value={currentMindMap?.id || ''} onValueChange={(value) => {
            const selected = mindMaps.find(m => m.id === value);
            if (selected) handleLoadMindMap(selected);
          }}>
            <SelectTrigger className="w-64" data-testid="select-mind-map">
              <SelectValue placeholder="Select a mind map" />
            </SelectTrigger>
            <SelectContent>
              {mindMaps.map((mindMap) => (
                <SelectItem key={mindMap.id} value={mindMap.id}>
                  {mindMap.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsNewMindMapOpen(true)} data-testid="button-new-mind-map">
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
          <Button onClick={handleSave} variant="outline" data-testid="button-save">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Button
            variant={tools.mode === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setTools({ ...tools, mode: 'select' });
              setDrawingMode(false);
            }}
            data-testid="tool-select"
          >
            <Move className="w-4 h-4" />
          </Button>
          
          <Button
            variant={tools.mode === 'draw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setTools({ ...tools, mode: 'draw' });
              setDrawingMode(true);
            }}
            data-testid="tool-draw"
          >
            <Pen className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={addTextBox}
            data-testid="tool-text"
          >
            <Type className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => addShape('rectangle')}
            data-testid="tool-rectangle"
          >
            <Square className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => addShape('circle')}
            data-testid="tool-circle"
          >
            <Circle className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="tool-color">
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

          <div className="w-px h-6 bg-border mx-2" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelected}
            data-testid="tool-delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            data-testid="tool-clear"
          >
            <Eraser className="w-4 h-4" />
          </Button>
        </div>

        {/* Integration menu (always visible for demo since Fabric.js text selection is disabled) */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Canvas Tools:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-integrate">
                <MoreVertical className="w-4 h-4 mr-2" />
                Create Items
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleIntegration('task')} data-testid="integrate-task">
                <ListTodo className="w-4 h-4 mr-2" />
                Create Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleIntegration('raid')} data-testid="integrate-raid">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Create RAID Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleIntegration('communication')} data-testid="integrate-communication">
                <Megaphone className="w-4 h-4 mr-2" />
                Create Communication
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleIntegration('stakeholder')} data-testid="integrate-stakeholder">
                <Users className="w-4 h-4 mr-2" />
                Create Stakeholder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleIntegration('milestone')} data-testid="integrate-milestone">
                <Calendar className="w-4 h-4 mr-2" />
                Create Milestone
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <canvas ref={canvasRef} data-testid="mind-map-canvas" />
      </div>

      {/* New Mind Map Dialog */}
      <Dialog open={isNewMindMapOpen} onOpenChange={setIsNewMindMapOpen}>
        <DialogContent data-testid="dialog-new-mind-map">
          <DialogHeader>
            <DialogTitle>Create New Mind Map</DialogTitle>
          </DialogHeader>
          <Form {...mindMapForm}>
            <form onSubmit={mindMapForm.handleSubmit(handleCreateNew)} className="space-y-4">
              <FormField
                control={mindMapForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-mind-map-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={mindMapForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-mind-map-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewMindMapOpen(false)}
                  data-testid="button-cancel-mind-map"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-create-mind-map">
                  Create
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Integration Dialogs */}
      <Dialog open={isIntegrationOpen} onOpenChange={setIsIntegrationOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-integration">
          <DialogHeader>
            <DialogTitle>
              Create {integrationType === 'task' ? 'Task' : integrationType === 'raid' ? 'RAID Log' : 
                      integrationType === 'communication' ? 'Communication' : integrationType === 'stakeholder' ? 'Stakeholder' : 'Milestone'}
            </DialogTitle>
          </DialogHeader>

          {integrationType === 'task' && (
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={taskForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-task-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-task-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={taskForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={taskForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={taskForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-assignee">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-task-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsIntegrationOpen(false)}
                    data-testid="button-cancel-task"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-create-task">
                    Create Task
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {integrationType === 'raid' && (
            <Form {...raidForm}>
              <form onSubmit={raidForm.handleSubmit((data) => createRaidLogMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={raidForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-raid-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="risk">Risk</SelectItem>
                            <SelectItem value="action">Action</SelectItem>
                            <SelectItem value="issue">Issue</SelectItem>
                            <SelectItem value="deficiency">Deficiency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={raidForm.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-raid-severity">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={raidForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-raid-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={raidForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-raid-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsIntegrationOpen(false)}
                    data-testid="button-cancel-raid"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-create-raid">
                    Create RAID Log
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {integrationType === 'communication' && (
            <Form {...communicationForm}>
              <form onSubmit={communicationForm.handleSubmit((data) => createCommunicationMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={communicationForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-communication-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="flyer">Flyer</SelectItem>
                          <SelectItem value="company_email">Company Email</SelectItem>
                          <SelectItem value="point_to_point_email">Point-to-Point Email</SelectItem>
                          <SelectItem value="meeting_prompt">Meeting Prompt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={communicationForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-communication-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={communicationForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-communication-content" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsIntegrationOpen(false)}
                    data-testid="button-cancel-communication"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-create-communication">
                    Create Communication
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {integrationType === 'stakeholder' && (
            <Form {...stakeholderForm}>
              <form onSubmit={stakeholderForm.handleSubmit((data) => createStakeholderMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={stakeholderForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-stakeholder-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={stakeholderForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-stakeholder-role" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={stakeholderForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-stakeholder-department" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={stakeholderForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-stakeholder-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={stakeholderForm.control}
                    name="influenceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Influence Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-stakeholder-influence">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={stakeholderForm.control}
                    name="supportLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-stakeholder-support">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="resistant">Resistant</SelectItem>
                            <SelectItem value="neutral">Neutral</SelectItem>
                            <SelectItem value="supportive">Supportive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={stakeholderForm.control}
                    name="engagementLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engagement Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-stakeholder-engagement">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsIntegrationOpen(false)}
                    data-testid="button-cancel-stakeholder"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-create-stakeholder">
                    Create Stakeholder
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {integrationType === 'milestone' && (
            <Form {...milestoneForm}>
              <form onSubmit={milestoneForm.handleSubmit((data) => createMilestoneMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={milestoneForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milestone Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-milestone-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={milestoneForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-milestone-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={milestoneForm.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-milestone-target-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={milestoneForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-milestone-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="achieved">Achieved</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsIntegrationOpen(false)}
                    data-testid="button-cancel-milestone"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-create-milestone">
                    Create Milestone
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}