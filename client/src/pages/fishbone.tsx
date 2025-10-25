import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  CheckCircle, 
  Circle,
  ArrowRight,
  Calendar,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  Users,
  Target,
  Lightbulb,
  Building,
  Rocket,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { Project, Task, RaidLog, Communication, Milestone, User } from "@shared/schema";

// Define the phases with their metadata
export const CHANGE_PHASES = [
  {
    id: "identify_need",
    name: "Identify Need to Change",
    shortName: "Identify Need",
    icon: Lightbulb,
    color: "bg-blue-500",
    description: "Clarify the business problem and define success",
    organizational: [
      "clarify business problem",
      "define success metrics", 
      "align leadership narrative"
    ],
    individual: [
      "explain the \"why\"",
      "reduce uncertainty",
      "invite early questions"
    ]
  },
  {
    id: "identify_stakeholders",
    name: "Identify Stakeholders", 
    shortName: "Stakeholders",
    icon: Users,
    color: "bg-green-500",
    description: "Map stakeholders and plan engagement",
    organizational: [
      "map influence/interest",
      "assign sponsors/champions",
      "choose comms channels"
    ],
    individual: [
      "clarify roles and impact",
      "open feedback loops",
      "surface resistance early"
    ]
  },
  {
    id: "develop_change",
    name: "Develop the Change",
    shortName: "Develop",
    icon: Building,
    color: "bg-orange-500", 
    description: "Design the change and build support systems",
    organizational: [
      "design process/tech changes",
      "build training & support",
      "define readiness gates"
    ],
    individual: [
      "show \"what changes for me\"",
      "provide how-to guides",
      "offer practice spaces"
    ]
  },
  {
    id: "implement_change",
    name: "Implement the Change",
    shortName: "Implement", 
    icon: Rocket,
    color: "bg-purple-500",
    description: "Execute the change plan and support adoption",
    organizational: [
      "publish schedule",
      "monitor adoption", 
      "remove blockers fast"
    ],
    individual: [
      "encourage first wins",
      "give just-in-time help",
      "share exemplars"
    ]
  },
  {
    id: "reinforce_change",
    name: "Reinforce the Change",
    shortName: "Reinforce",
    icon: Star,
    color: "bg-pink-500",
    description: "Measure outcomes and embed new habits",
    organizational: [
      "measure outcomes vs. targets",
      "update SOPs", 
      "recognize contributors"
    ],
    individual: [
      "celebrate progress",
      "reflect on lessons",
      "embed new habits"
    ]
  }
] as const;

// Form schemas for different item types
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

const raidFormSchema = z.object({
  type: z.enum(["risk", "action", "issue", "dependency"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"), 
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assigneeId: z.string().optional(),
});

const communicationFormSchema = z.object({
  type: z.enum(["flyer", "company_email", "point_to_point_email", "meeting_prompt"]),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  targetAudience: z.array(z.string()).optional(),
  sendDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;
type MilestoneFormData = z.infer<typeof milestoneFormSchema>;
type RaidFormData = z.infer<typeof raidFormSchema>;
type CommunicationFormData = z.infer<typeof communicationFormSchema>;

interface PhaseNodeProps {
  phase: typeof CHANGE_PHASES[number];
  isCurrentPhase: boolean;
  isCompleted: boolean;
  taskCount: number;
  raidCount: number;
  commCount: number;
  onClick: () => void;
}

function PhaseNode({ phase, isCurrentPhase, isCompleted, taskCount, raidCount, commCount, onClick }: PhaseNodeProps) {
  const IconComponent = phase.icon;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative cursor-pointer group transition-all duration-200 ${
            isCurrentPhase 
              ? `${phase.color} shadow-lg scale-105` 
              : isCompleted 
                ? "bg-green-100 border-2 border-green-500" 
                : "bg-gray-50 hover:bg-gray-100 border-2 border-gray-300"
          }`}
          onClick={onClick}
          data-testid={`phase-node-${phase.id}`}
        >
          <div className="w-32 h-32 rounded-full flex flex-col items-center justify-center p-4 relative">
            {/* Phase Icon */}
            <div className={`rounded-full p-2 mb-2 ${
              isCurrentPhase 
                ? "bg-white/20" 
                : isCompleted 
                  ? "bg-green-200" 
                  : "bg-white"
            }`}>
              {isCompleted ? (
                <CheckCircle className={`w-6 h-6 ${isCurrentPhase ? 'text-white' : 'text-green-600'}`} />
              ) : (
                <IconComponent className={`w-6 h-6 ${isCurrentPhase ? 'text-white' : 'text-gray-600'}`} />
              )}
            </div>
            
            {/* Phase Name */}
            <span className={`text-xs font-medium text-center leading-tight ${
              isCurrentPhase ? 'text-white' : isCompleted ? 'text-green-800' : 'text-gray-700'
            }`}>
              {phase.shortName}
            </span>
            
            {/* Progress Badges */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {taskCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1 py-0" data-testid={`task-badge-${phase.id}`}>
                  {taskCount}T
                </Badge>
              )}
              {raidCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1 py-0" data-testid={`raid-badge-${phase.id}`}>
                  {raidCount}R
                </Badge>
              )}
              {commCount > 0 && (
                <Badge variant="outline" className="text-xs px-1 py-0" data-testid={`comm-badge-${phase.id}`}>
                  {commCount}C
                </Badge>
              )}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">{phase.name}</h4>
            <p className="text-xs text-muted-foreground">{phase.description}</p>
          </div>
          
          <div className="space-y-2">
            <div>
              <h5 className="font-medium text-xs text-blue-600">Organizational Actions</h5>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {phase.organizational.map((action, idx) => (
                  <li key={idx}>• {action}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-xs text-purple-600">Individual Adoption Cues</h5>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {phase.individual.map((cue, idx) => (
                  <li key={idx}>• {cue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface CreateItemFormProps {
  itemType: "task" | "milestone" | "raid" | "communication";
  phase: string;
  users: User[];
  onSuccess: () => void;
}

export function CreateItemForm({ itemType, phase, users, onSuccess }: CreateItemFormProps) {
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();

  // Task form
  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      assigneeId: "",
      dueDate: "",
      priority: "medium",
    },
  });

  // Milestone form
  const milestoneForm = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetDate: "",
    },
  });

  // RAID form
  const raidForm = useForm<RaidFormData>({
    resolver: zodResolver(raidFormSchema),
    defaultValues: {
      type: "risk",
      title: "",
      description: "",
      severity: "medium",
      assigneeId: "",
    },
  });

  // Communication form
  const communicationForm = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: {
      type: "company_email",
      title: "",
      content: "",
      targetAudience: [],
      sendDate: "",
    },
  });

  // Create mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      
      // Clean up the data - remove empty assigneeId and convert empty strings to undefined
      const cleanData = {
        ...data,
        assigneeId: data.assigneeId && data.assigneeId.trim() && data.assigneeId !== 'unassigned' && data.assigneeId !== 'none' ? data.assigneeId : undefined,
        dueDate: data.dueDate && data.dueDate.trim() ? data.dueDate : undefined,
        phase,
        status: "pending",
      };
      
      return apiRequest("POST", `/api/projects/${currentProject.id}/tasks`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      onSuccess();
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async (data: MilestoneFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      return apiRequest("POST", `/api/projects/${currentProject.id}/milestones`, {
        ...data,
        phase,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'milestones'] });
      onSuccess();
    },
  });

  const createRaidMutation = useMutation({
    mutationFn: async (data: RaidFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      
      // Clean up the data - remove empty assigneeId
      const cleanData = {
        ...data,
        assigneeId: data.assigneeId && data.assigneeId.trim() && data.assigneeId !== 'unassigned' && data.assigneeId !== 'none' ? data.assigneeId : undefined,
        phase,
        status: "open",
      };
      
      return apiRequest("POST", `/api/projects/${currentProject.id}/raid-logs`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'raid-logs'] });
      onSuccess();
    },
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (data: CommunicationFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      return apiRequest("POST", `/api/projects/${currentProject.id}/communications`, {
        ...data,
        phase,
        status: "scheduled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      onSuccess();
    },
  });

  if (itemType === "task") {
    return (
      <Form {...taskForm}>
        <form onSubmit={taskForm.handleSubmit((data) => createTaskMutation.mutate(data))} className="space-y-4">
          <FormField
            control={taskForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-task-name" placeholder="Enter task name..." />
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
                  <Textarea {...field} data-testid="input-task-description" placeholder="Task details..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={taskForm.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-assignee">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No assignee</SelectItem>
                      {users.map((user) => (
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
                    <Input {...field} type="date" data-testid="input-task-due-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={taskForm.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

          <Button 
            type="submit" 
            disabled={createTaskMutation.isPending}
            data-testid="button-create-task"
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </Form>
    );
  }

  if (itemType === "milestone") {
    return (
      <Form {...milestoneForm}>
        <form onSubmit={milestoneForm.handleSubmit((data) => createMilestoneMutation.mutate(data))} className="space-y-4">
          <FormField
            control={milestoneForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Milestone Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    data-testid="input-milestone-name" 
                    placeholder="Enter milestone name..."
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(e);
                      milestoneForm.setValue('name', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLInputElement).value;
                      milestoneForm.setValue('name', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                    }}
                  />
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
                <FormLabel>Success Criteria</FormLabel>
                <FormControl>
                  <Textarea {...field} data-testid="input-milestone-description" placeholder="What defines success for this milestone?" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={milestoneForm.control}
            name="targetDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-milestone-target-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            disabled={createMilestoneMutation.isPending}
            data-testid="button-create-milestone"
          >
            {createMilestoneMutation.isPending ? "Creating..." : "Create Milestone"}
          </Button>
        </form>
      </Form>
    );
  }

  if (itemType === "raid") {
    return (
      <Form {...raidForm}>
        <form onSubmit={raidForm.handleSubmit((data) => createRaidMutation.mutate(data))} className="space-y-4">
          <FormField
            control={raidForm.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RAID Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-raid-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="risk">Risk</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                    <SelectItem value="dependency">Deficiency</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={raidForm.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    data-testid="input-raid-title" 
                    placeholder="Brief summary..."
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(e);
                      raidForm.setValue('title', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLInputElement).value;
                      raidForm.setValue('title', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                    }}
                  />
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
                  <Textarea {...field} data-testid="input-raid-description" placeholder="Detailed description..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={raidForm.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <FormField
              control={raidForm.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-raid-assignee">
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No owner</SelectItem>
                      {users.map((user) => (
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
          </div>

          <Button 
            type="submit" 
            disabled={createRaidMutation.isPending}
            data-testid="button-create-raid"
          >
            {createRaidMutation.isPending ? "Creating..." : "Create RAID Entry"}
          </Button>
        </form>
      </Form>
    );
  }

  if (itemType === "communication") {
    return (
      <Form {...communicationForm}>
        <form onSubmit={communicationForm.handleSubmit((data) => createCommunicationMutation.mutate(data))} className="space-y-4">
          <FormField
            control={communicationForm.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Communication Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-comm-type">
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
                  <Input 
                    {...field} 
                    data-testid="input-comm-title" 
                    placeholder="Communication title..."
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(e);
                      // Force form validation update
                      communicationForm.setValue('title', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                      if (value.trim()) {
                        communicationForm.clearErrors('title');
                      }
                    }}
                    onInput={(e) => {
                      // Additional handler for input events (helps with automated testing)
                      const value = (e.target as HTMLInputElement).value;
                      communicationForm.setValue('title', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                    }}
                    onBlur={(e) => {
                      field.onBlur();
                      // Ensure validation runs on blur
                      const value = e.target.value;
                      if (value.trim()) {
                        communicationForm.clearErrors('title');
                      }
                    }}
                  />
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
                <FormLabel>Message Content</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    data-testid="input-comm-content" 
                    placeholder="Draft your message..."
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(e);
                      communicationForm.setValue('content', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLTextAreaElement).value;
                      communicationForm.setValue('content', value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={communicationForm.control}
            name="sendDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Planned Send Date</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-comm-send-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            disabled={createCommunicationMutation.isPending}
            data-testid="button-create-communication"
          >
            {createCommunicationMutation.isPending ? "Creating..." : "Create Communication"}
          </Button>
        </form>
      </Form>
    );
  }

  return null;
}

export default function ChangeProcessFlow() {
  const [selectedPhase, setSelectedPhase] = useState<string>("identify_need");
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [itemType, setItemType] = useState<"task" | "milestone" | "raid" | "communication">("task");
  const [isPlanningNext, setIsPlanningNext] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();

  // Fetch project data
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/projects', currentProject?.id, 'tasks'],
    enabled: !!currentProject?.id,
  });

  const { data: raidLogs = [], isLoading: raidLoading } = useQuery<RaidLog[]>({
    queryKey: ['/api/projects', currentProject?.id, 'raid-logs'],
    enabled: !!currentProject?.id,
  });

  const { data: communications = [], isLoading: commsLoading } = useQuery<Communication[]>({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id,
  });

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: ['/api/projects', currentProject?.id, 'milestones'],
    enabled: !!currentProject?.id,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Update project phase mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (phase: string) => {
      if (!currentProject?.id) throw new Error("No project selected");
      return apiRequest("PUT", `/api/projects/${currentProject.id}`, { currentPhase: phase });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Phase Updated",
        description: "Project phase has been advanced successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project phase",
        variant: "destructive",
      });
    },
  });

  // Get counts for each phase
  const getPhaseData = (phaseId: string) => {
    const phaseTasks = tasks.filter(t => 
      (t as any).phase === phaseId || (!((t as any).phase) && phaseId === currentProject?.currentPhase)
    );
    const phaseRaid = raidLogs.filter(r => 
      (r as any).phase === phaseId || (!((r as any).phase) && phaseId === currentProject?.currentPhase)
    );
    const phaseComms = communications.filter(c => 
      (c as any).phase === phaseId || (!((c as any).phase) && phaseId === currentProject?.currentPhase)
    );
    
    return {
      taskCount: phaseTasks.filter(t => t.status !== 'completed').length,
      raidCount: phaseRaid.filter(r => r.status === 'open').length,
      commCount: phaseComms.filter(c => c.status === 'scheduled').length,
    };
  };

  const currentPhaseIndex = CHANGE_PHASES.findIndex(p => p.id === currentProject?.currentPhase);
  const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < CHANGE_PHASES.length - 1 
    ? CHANGE_PHASES[currentPhaseIndex + 1] 
    : null;

  const handleAdvancePhase = async () => {
    if (!nextPhase || !currentProject) return;
    
    const confirmed = window.confirm(
      `Advance to ${nextPhase.name}? You can still return to earlier data.`
    );
    
    if (confirmed) {
      updateProjectMutation.mutate(nextPhase.id);
    }
  };

  const handlePlanNextPhase = () => {
    if (!nextPhase) return;
    setSelectedPhase(nextPhase.id);
    setIsPlanningNext(true);
  };

  const handlePhaseClick = (phaseId: string) => {
    setSelectedPhase(phaseId);
    setIsPlanningNext(false);
  };

  // Show loading state
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="no-project-selected">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">No Project Selected</h2>
          <p className="text-sm text-muted-foreground">Please select a project to view the change process flow.</p>
        </div>
      </div>
    );
  }

  const isLoading = tasksLoading || raidLoading || commsLoading || milestonesLoading;

  return (
    <div className="space-y-6" data-testid="change-process-flow">
      {/* Top Bar */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{currentProject.name}</span>
                <Badge variant="outline" data-testid="current-phase-badge">
                  {CHANGE_PHASES.find(p => p.id === currentProject.currentPhase)?.shortName || "Unknown Phase"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Change Process Flow - Navigate through the five phases of change management
              </p>
            </div>
            
          </div>
        </CardHeader>
      </Card>

      {/* Phase Flow Visualization */}
      <Card className="p-8">
        <div className="flex items-center justify-between relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-16 right-16 h-0.5 bg-gray-300 -translate-y-1/2 -z-10" />
          
          {CHANGE_PHASES.map((phase, index) => {
            const phaseData = getPhaseData(phase.id);
            const isCompleted = index < currentPhaseIndex;
            const isCurrent = phase.id === currentProject.currentPhase;
            
            return (
              <PhaseNode
                key={phase.id}
                phase={phase}
                isCurrentPhase={isCurrent}
                isCompleted={isCompleted}
                taskCount={phaseData.taskCount}
                raidCount={phaseData.raidCount}
                commCount={phaseData.commCount}
                onClick={() => handlePhaseClick(phase.id)}
              />
            );
          })}
        </div>
        
        {/* Current Phase Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Circle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Current Phase: {CHANGE_PHASES.find(p => p.id === currentProject.currentPhase)?.name}
            </span>
          </div>
        </div>
      </Card>

      {/* Action Items Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Quick Actions</span>
              <div className="flex space-x-2">
                <Dialog open={isCreatingItem} onOpenChange={setIsCreatingItem}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-create-item">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant={itemType === "task" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setItemType("task")}
                          data-testid="select-item-task"
                        >
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Task
                        </Button>
                        <Button 
                          variant={itemType === "milestone" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setItemType("milestone")}
                          data-testid="select-item-milestone"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Milestone
                        </Button>
                        <Button 
                          variant={itemType === "raid" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setItemType("raid")}
                          data-testid="select-item-raid"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          RAID
                        </Button>
                        <Button 
                          variant={itemType === "communication" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setItemType("communication")}
                          data-testid="select-item-communication"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Communication
                        </Button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        Items will be created for the {isPlanningNext ? "next" : "current"} phase: {" "}
                        <strong>
                          {CHANGE_PHASES.find(p => p.id === selectedPhase)?.name}
                        </strong>
                      </p>
                      
                      <CreateItemForm
                        itemType={itemType}
                        phase={selectedPhase}
                        users={users}
                        onSuccess={() => {
                          setIsCreatingItem(false);
                          toast({
                            title: "Item Created",
                            description: `Saved. You can find this under ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}s and on this phase.`
                          });
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.length === 0 && raidLogs.length === 0 && communications.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-state">
                    <div className="text-muted-foreground mb-4">
                      <ClipboardList className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">
                        Start here—hover a phase to see tips. Create a task or note for what needs to happen next.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      {tasks.length} tasks, {raidLogs.length} RAID items, {communications.length} communications
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase Summary */}
        <Card>
          <CardHeader>
            <CardTitle>
              {CHANGE_PHASES.find(p => p.id === selectedPhase)?.name}
              {isPlanningNext && <Badge variant="outline" className="ml-2">Planning</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const phase = CHANGE_PHASES.find(p => p.id === selectedPhase);
              return phase ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-blue-600 mb-2">Organizational Focus</h4>
                      <ul className="space-y-1">
                        {phase.organizational.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start">
                            <Circle className="w-2 h-2 mt-1.5 mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-purple-600 mb-2">Individual Support</h4>
                      <ul className="space-y-1">
                        {phase.individual.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start">
                            <Circle className="w-2 h-2 mt-1.5 mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}