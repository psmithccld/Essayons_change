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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Megaphone, Mail, Users, MessageSquare, Calendar, Send, Edit, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { Project, Communication } from "@shared/schema";

const communicationFormSchema = z.object({
  type: z.enum(["flyer", "company_email", "point_to_point_email", "meeting_prompt"]),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  targetAudience: z.array(z.string()).optional(),
  sendDate: z.string().optional(),
});

type CommunicationFormData = z.infer<typeof communicationFormSchema>;

function getCommunicationIcon(type: string) {
  switch (type) {
    case 'flyer': return <Megaphone className="w-4 h-4 text-accent" />;
    case 'company_email': return <Mail className="w-4 h-4 text-primary" />;
    case 'point_to_point_email': return <Mail className="w-4 h-4 text-secondary" />;
    case 'meeting_prompt': return <MessageSquare className="w-4 h-4 text-destructive" />;
    default: return <Megaphone className="w-4 h-4 text-muted-foreground" />;
  }
}

function getCommunicationTypeColor(type: string) {
  switch (type) {
    case 'flyer': return 'bg-accent/10 text-accent border-accent/20';
    case 'company_email': return 'bg-primary/10 text-primary border-primary/20';
    case 'point_to_point_email': return 'bg-secondary/10 text-secondary border-secondary/20';
    case 'meeting_prompt': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

export default function Communications() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isNewCommOpen, setIsNewCommOpen] = useState(false);
  const [isGptAssistOpen, setIsGptAssistOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();

  const { data: communications = [], isLoading } = useQuery<Communication[]>({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id,
  });

  const form = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: {
      type: "company_email",
      targetAudience: [],
    },
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (commData: CommunicationFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/communications`, commData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      setIsNewCommOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Communication created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create communication",
        variant: "destructive",
      });
    },
  });

  const generateContentMutation = useMutation({
    mutationFn: async (data: {
      type: string;
      projectName: string;
      changeDescription: string;
      targetAudience: string[];
      keyMessages: string[];
    }) => {
      const response = await apiRequest("POST", "/api/gpt/generate-content", data);
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('title', data.title);
      form.setValue('content', data.content + '\n\n' + data.callToAction);
      setIsGptAssistOpen(false);
      toast({
        title: "Success",
        description: "Content generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate content",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CommunicationFormData) => {
    createCommunicationMutation.mutate(data);
  };

  const handleGenerateContent = () => {
    if (!currentProject?.id) {
      toast({
        title: "Project Required",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }
    if (!currentProject) return;

    generateContentMutation.mutate({
      type: form.watch('type'),
      projectName: currentProject.name,
      changeDescription: currentProject.description || '',
      targetAudience: form.watch('targetAudience') || [],
      keyMessages: ['Improved efficiency', 'Better collaboration', 'Enhanced user experience'],
    });
  };

  const filteredCommunications = communications.filter(comm => 
    activeTab === "all" || comm.type === activeTab
  );

  const commCounts = {
    all: communications.length,
    flyer: communications.filter(c => c.type === 'flyer').length,
    company_email: communications.filter(c => c.type === 'company_email').length,
    point_to_point_email: communications.filter(c => c.type === 'point_to_point_email').length,
    meeting_prompt: communications.filter(c => c.type === 'meeting_prompt').length,
  };

  return (
    <div className="space-y-6" data-testid="communications-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground">Plan and manage change communications</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isGptAssistOpen} onOpenChange={setIsGptAssistOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!currentProject?.id} data-testid="button-gpt-assist">
                <Bot className="w-4 h-4 mr-2" />
                GPT Assist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Communication Content</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Let AI help you create engaging communication content for your change initiative.
                </p>
                <Button 
                  onClick={handleGenerateContent}
                  disabled={generateContentMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-content"
                >
                  {generateContentMutation.isPending ? "Generating..." : "Generate Content"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isNewCommOpen} onOpenChange={setIsNewCommOpen}>
            <DialogTrigger asChild>
              <Button disabled={!currentProject?.id} data-testid="button-new-communication">
                <Plus className="w-4 h-4 mr-2" />
                New Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create Communication</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Communication Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-comm-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="flyer">Flyer/Poster</SelectItem>
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
                      control={form.control}
                      name="sendDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Send Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-send-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title/Subject</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-comm-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={8} data-testid="input-comm-content" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsNewCommOpen(false)}
                      data-testid="button-cancel-comm"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCommunicationMutation.isPending}
                      data-testid="button-save-comm"
                    >
                      {createCommunicationMutation.isPending ? "Creating..." : "Create Communication"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Communications List */}
      {currentProject && (
        <Card>
          <CardHeader>
            <CardTitle>Communication Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" data-testid="tab-all-comms">
                  All ({commCounts.all})
                </TabsTrigger>
                <TabsTrigger value="flyer" data-testid="tab-flyers">
                  Flyers ({commCounts.flyer})
                </TabsTrigger>
                <TabsTrigger value="company_email" data-testid="tab-company-emails">
                  Company Emails ({commCounts.company_email})
                </TabsTrigger>
                <TabsTrigger value="point_to_point_email" data-testid="tab-p2p-emails">
                  P2P Emails ({commCounts.point_to_point_email})
                </TabsTrigger>
                <TabsTrigger value="meeting_prompt" data-testid="tab-meetings">
                  Meetings ({commCounts.meeting_prompt})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredCommunications.length === 0 ? (
                  <div className="text-center py-12" data-testid="no-comms-message">
                    <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No {activeTab === 'all' ? 'communications' : activeTab.replace('_', ' ')} Found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start building your communication strategy for this change initiative.
                    </p>
                    <Button onClick={() => setIsNewCommOpen(true)} data-testid="button-create-first-comm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Communication
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCommunications.map((comm) => (
                      <Card 
                        key={comm.id} 
                        className={`hover:shadow-md transition-shadow ${getCommunicationTypeColor(comm.type)}`}
                        data-testid={`communication-${comm.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1">
                              {getCommunicationIcon(comm.type)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-medium text-foreground">{comm.title}</h3>
                                  <Badge className="text-xs capitalize">
                                    {comm.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                                  {comm.content}
                                </p>
                                
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  {comm.sendDate && (
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>Send: {new Date(comm.sendDate).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {comm.targetAudience && comm.targetAudience.length > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <Users className="w-3 h-3" />
                                      <span>Audience: {comm.targetAudience.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col space-y-2 ml-4">
                              <Badge className={`text-xs ${getStatusColor(comm.status)}`}>
                                {comm.status}
                              </Badge>
                              <div className="flex space-x-1">
                                <Button size="sm" variant="outline" data-testid={`button-edit-${comm.id}`}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                {comm.status === 'draft' && (
                                  <Button size="sm" data-testid={`button-send-${comm.id}`}>
                                    <Send className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
