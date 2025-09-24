import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ClipboardCheck, Calendar, Users, BarChart3, Trash2, Bot, BookOpen, UserCheck, Play, Pause, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { PREBUILT_SURVEYS, getPrebuiltSurveyById, type PrebuiltSurveyTemplate } from "@/lib/prebuilt-surveys";
import type { Project, Survey, SurveyResponse, Stakeholder } from "@shared/schema";

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "scale", "text", "yes_no"]),
  question: z.string().min(1, "Question is required"),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
});

const surveyFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetStakeholders: z.array(z.string()).optional(),
});

const prebuiltSurveyFormSchema = z.object({
  templateId: z.string().min(1, "Template selection is required"),
  targetStakeholders: z.array(z.string()).min(1, "At least one stakeholder must be selected"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type SurveyFormData = z.infer<typeof surveyFormSchema>;
type PrebuiltSurveyFormData = z.infer<typeof prebuiltSurveyFormSchema>;

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

export default function Surveys() {
  const [activeTab, setActiveTab] = useState<string>("surveys");
  const [isNewSurveyOpen, setIsNewSurveyOpen] = useState(false);
  const [isPrebuiltSurveyOpen, setIsPrebuiltSurveyOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PrebuiltSurveyTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();

  const { data: surveys = [], isLoading: surveysLoading } = useQuery<Survey[]>({
    queryKey: ['/api/projects', currentProject?.id, 'surveys'],
    enabled: !!currentProject?.id,
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery<SurveyResponse[]>({
    queryKey: ['/api/surveys', selectedSurvey, 'responses'],
    enabled: !!selectedSurvey,
  });

  const { data: stakeholders = [] } = useQuery<Stakeholder[]>({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id,
  });

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      questions: [{
        id: "1",
        type: "scale",
        question: "How ready do you feel for this change initiative?",
        required: true,
      }],
      targetStakeholders: [],
    },
  });

  const prebuiltForm = useForm<PrebuiltSurveyFormData>({
    resolver: zodResolver(prebuiltSurveyFormSchema),
    defaultValues: {
      templateId: "",
      targetStakeholders: [],
    },
  });

  const { fields: questions, append: addQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const createSurveyMutation = useMutation({
    mutationFn: async (surveyData: SurveyFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/surveys`, surveyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'surveys'] });
      setIsNewSurveyOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Survey created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create survey",
        variant: "destructive",
      });
    },
  });

  const createPrebuiltSurveyMutation = useMutation({
    mutationFn: async (data: PrebuiltSurveyFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const template = getPrebuiltSurveyById(data.templateId);
      if (!template) throw new Error("Template not found");
      
      const surveyData: SurveyFormData = {
        title: template.title,
        description: template.description,
        questions: template.questions,
        targetStakeholders: data.targetStakeholders,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/surveys`, surveyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'surveys'] });
      setIsPrebuiltSurveyOpen(false);
      prebuiltForm.reset();
      setSelectedTemplate(null);
      toast({
        title: "Success",
        description: "Survey created from template successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create survey from template",
        variant: "destructive",
      });
    },
  });

  const analyzeReadinessMutation = useMutation({
    mutationFn: async () => {
      // Mock survey responses for analysis
      const mockResponses = [
        { questionId: "1", question: "How ready do you feel for this change?", answer: 4 },
        { questionId: "2", question: "Do you understand the benefits?", answer: "Yes" },
        { questionId: "3", question: "What concerns you most?", answer: "Training time" },
      ];
      
      // Mock stakeholder data  
      const mockStakeholderData = [
        { role: "Manager", supportLevel: "supportive", engagementLevel: "high" },
        { role: "Employee", supportLevel: "neutral", engagementLevel: "medium" },
        { role: "IT Staff", supportLevel: "resistant", engagementLevel: "low" },
      ];

      const response = await apiRequest("POST", "/api/gpt/readiness-analysis", {
        projectId: currentProject?.id,
        surveyResponses: mockResponses,
        stakeholderData: mockStakeholderData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResults(data);
      toast({
        title: "Success",
        description: "Analysis completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze readiness",
        variant: "destructive",
      });
    },
  });

  // Survey status mutation
  const updateSurveyStatusMutation = useMutation({
    mutationFn: async ({ surveyId, status }: { surveyId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/surveys/${surveyId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'surveys'] });
      toast({
        title: "Success",
        description: "Survey status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update survey status",
        variant: "destructive",
      });
    },
  });

  // Send reminders mutation
  const sendRemindersMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const response = await apiRequest("POST", `/api/surveys/${surveyId}/reminders`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Sent ${data.sent} reminder${data.sent !== 1 ? 's' : ''} successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reminders",
        variant: "destructive",
      });
    },
  });

  // Delete survey mutation
  const deleteSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const response = await apiRequest("DELETE", `/api/surveys/${surveyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'surveys'] });
      toast({
        title: "Success",
        description: "Survey deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SurveyFormData) => {
    createSurveyMutation.mutate(data);
  };

  const updateSurveyStatus = (surveyId: string, status: string) => {
    updateSurveyStatusMutation.mutate({ surveyId, status });
  };

  const sendReminders = (surveyId: string) => {
    sendRemindersMutation.mutate(surveyId);
  };

  const deleteSurvey = (surveyId: string) => {
    if (confirm("Are you sure you want to delete this survey? This action cannot be undone.")) {
      deleteSurveyMutation.mutate(surveyId);
    }
  };

  const handleAnalyze = () => {
    analyzeReadinessMutation.mutate();
    setIsAnalysisOpen(true);
  };

  const addNewQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      type: "multiple_choice" as const,
      question: "",
      options: ["Option 1", "Option 2"],
      required: true,
    };
    addQuestion(newQuestion);
  };

  return (
    <div className="space-y-6" data-testid="surveys-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Readiness Surveys</h1>
          <p className="text-sm text-muted-foreground">Assess and track change readiness through surveys</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={!currentProject?.id || surveys.length === 0}
                onClick={handleAnalyze}
                data-testid="button-analyze-readiness"
              >
                <Bot className="w-4 h-4 mr-2" />
                AI Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Change Readiness Analysis</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {analyzeReadinessMutation.isPending ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Analyzing readiness data...</p>
                  </div>
                ) : analysisResults ? (
                  <>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                        <span className="text-2xl font-bold text-primary">{analysisResults.overallScore}%</span>
                      </div>
                      <h3 className="text-lg font-semibold">Overall Readiness Score</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Key Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analysisResults.insights?.map((insight: string, index: number) => (
                              <div key={index} className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p className="text-sm">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Risk Areas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analysisResults.riskAreas?.map((risk: string, index: number) => (
                              <div key={index} className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p className="text-sm">{risk}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analysisResults.recommendations?.map((rec: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <p className="text-sm">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isPrebuiltSurveyOpen} onOpenChange={setIsPrebuiltSurveyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!currentProject?.id} data-testid="button-use-template">
                <BookOpen className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Survey from Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                {!selectedTemplate ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Choose from professionally designed survey templates based on change management phases:</p>
                    <div className="grid grid-cols-1 gap-4">
                      {PREBUILT_SURVEYS.map((template) => (
                        <Card key={template.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                          setSelectedTemplate(template);
                          prebuiltForm.setValue('templateId', template.id);
                        }}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{template.title}</CardTitle>
                                <Badge variant="secondary" className="mt-1">{template.phaseName}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {template.questions.length} questions
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {template.questions.slice(0, 3).map((q, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {q.type === 'scale' ? 'Likert Scale' : 
                                   q.type === 'text' ? 'Open Text' : 
                                   q.type === 'multiple_choice' ? 'Multiple Choice' : 
                                   'Yes/No'}
                                </Badge>
                              ))}
                              {template.questions.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{template.questions.length - 3} more</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Form {...prebuiltForm}>
                    <form onSubmit={prebuiltForm.handleSubmit((data) => createPrebuiltSurveyMutation.mutate(data))} className="space-y-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{selectedTemplate.title}</CardTitle>
                              <Badge variant="secondary" className="mt-1">{selectedTemplate.phaseName}</Badge>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => {
                              setSelectedTemplate(null);
                              prebuiltForm.reset();
                            }}>
                              Change Template
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">{selectedTemplate.description}</p>
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">Survey Questions ({selectedTemplate.questions.length})</h4>
                            {selectedTemplate.questions.map((question, idx) => (
                              <div key={question.id} className="p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-sm font-medium">Q{idx + 1}. {question.question}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {question.type === 'scale' ? 'Likert Scale (1-5)' : 
                                     question.type === 'text' ? 'Open Text' : 
                                     question.type === 'multiple_choice' ? 'Multiple Choice' : 
                                     'Yes/No'}
                                  </Badge>
                                </div>
                                {question.options && (
                                  <div className="flex flex-wrap gap-1">
                                    {question.options.map((option, optIdx) => (
                                      <Badge key={optIdx} variant="secondary" className="text-xs">{option}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <UserCheck className="w-4 h-4 mr-2" />
                            Target Stakeholders
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={prebuiltForm.control}
                            name="targetStakeholders"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select stakeholders to survey</FormLabel>
                                <FormControl>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {stakeholders.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No stakeholders available. Please add stakeholders to your project first.</p>
                                    ) : (
                                      stakeholders.map((stakeholder) => (
                                        <div key={stakeholder.id} className="flex items-center space-x-2">
                                          <Checkbox
                                            checked={field.value?.includes(stakeholder.id) || false}
                                            onCheckedChange={(checked) => {
                                              const currentValue = field.value || [];
                                              if (checked) {
                                                field.onChange([...currentValue, stakeholder.id]);
                                              } else {
                                                field.onChange(currentValue.filter(id => id !== stakeholder.id));
                                              }
                                            }}
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-medium">{stakeholder.name}</span>
                                              <Badge variant="outline" className="text-xs">{stakeholder.role}</Badge>
                                            </div>
                                            {stakeholder.email && (
                                              <p className="text-xs text-muted-foreground">{stakeholder.email}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={prebuiltForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={prebuiltForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsPrebuiltSurveyOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createPrebuiltSurveyMutation.isPending || stakeholders.length === 0}
                          data-testid="button-create-from-template"
                        >
                          {createPrebuiltSurveyMutation.isPending ? "Creating..." : "Create Survey"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isNewSurveyOpen} onOpenChange={setIsNewSurveyOpen}>
            <DialogTrigger asChild>
              <Button disabled={!currentProject?.id} data-testid="button-new-survey">
                <Plus className="w-4 h-4 mr-2" />
                New Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Readiness Survey</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Survey Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-survey-title" />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-survey-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-survey-start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-survey-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Target Stakeholders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="targetStakeholders"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select stakeholders to survey</FormLabel>
                            <FormControl>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {stakeholders.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No stakeholders available. Please add stakeholders to your project first.</p>
                                ) : (
                                  stakeholders.map((stakeholder) => (
                                    <div key={stakeholder.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={field.value?.includes(stakeholder.id) || false}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          if (checked) {
                                            field.onChange([...currentValue, stakeholder.id]);
                                          } else {
                                            field.onChange(currentValue.filter(id => id !== stakeholder.id));
                                          }
                                        }}
                                        data-testid={`checkbox-stakeholder-${stakeholder.id}`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">{stakeholder.name}</span>
                                          <Badge variant="outline" className="text-xs">{stakeholder.role}</Badge>
                                        </div>
                                        {stakeholder.email && (
                                          <p className="text-xs text-muted-foreground">{stakeholder.email}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium">Questions</h4>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addNewQuestion}
                        data-testid="button-add-question"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {questions.map((field, index) => (
                        <Card key={field.id} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h5 className="font-medium">Question {index + 1}</h5>
                            {questions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(index)}
                                data-testid={`button-remove-question-${index}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`questions.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Question Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid={`select-question-type-${index}`}>
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                        <SelectItem value="scale">Scale (1-5)</SelectItem>
                                        <SelectItem value="yes_no">Yes/No</SelectItem>
                                        <SelectItem value="text">Text Response</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={form.control}
                              name={`questions.${index}.question`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Question Text</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid={`input-question-text-${index}`} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Multiple Choice Options */}
                            {form.watch(`questions.${index}.type`) === 'multiple_choice' && (
                              <div className="space-y-3">
                                <FormLabel>Answer Options</FormLabel>
                                <div className="space-y-2">
                                  {form.watch(`questions.${index}.options`)?.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center space-x-2">
                                      <FormField
                                        control={form.control}
                                        name={`questions.${index}.options.${optionIndex}`}
                                        render={({ field }) => (
                                          <FormItem className="flex-1">
                                            <FormControl>
                                              <Input 
                                                {...field} 
                                                placeholder={`Option ${optionIndex + 1}`}
                                                data-testid={`input-option-${index}-${optionIndex}`}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      {(form.watch(`questions.${index}.options`)?.length || 0) > 2 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const currentOptions = form.getValues(`questions.${index}.options`) || [];
                                            const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
                                            form.setValue(`questions.${index}.options`, newOptions);
                                          }}
                                          data-testid={`button-remove-option-${index}-${optionIndex}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentOptions = form.getValues(`questions.${index}.options`) || [];
                                      const newOptions = [...currentOptions, `Option ${currentOptions.length + 1}`];
                                      form.setValue(`questions.${index}.options`, newOptions);
                                    }}
                                    data-testid={`button-add-option-${index}`}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Option
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsNewSurveyOpen(false)}
                      data-testid="button-cancel-survey"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createSurveyMutation.isPending}
                      data-testid="button-save-survey"
                    >
                      {createSurveyMutation.isPending ? "Creating..." : "Create Survey"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Surveys & Responses */}
      {currentProject && (
        <Card>
          <CardHeader>
            <CardTitle>Survey Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="surveys" data-testid="tab-surveys">Surveys</TabsTrigger>
                <TabsTrigger value="responses" data-testid="tab-responses">Responses</TabsTrigger>
              </TabsList>

              <TabsContent value="surveys" className="space-y-4">
                {surveysLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : surveys.length === 0 ? (
                  <div className="text-center py-12" data-testid="no-surveys-message">
                    <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Surveys Found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first readiness survey to assess change readiness.
                    </p>
                    <Button onClick={() => setIsNewSurveyOpen(true)} data-testid="button-create-first-survey">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Survey
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {surveys.map((survey) => (
                      <Card key={survey.id} className="hover:shadow-md transition-shadow" data-testid={`survey-${survey.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-medium text-foreground">{survey.title}</h3>
                                <Badge className={getStatusColor(survey.status)}>
                                  {survey.status}
                                </Badge>
                              </div>
                              
                              {survey.description && (
                                <p className="text-sm text-muted-foreground mb-3">{survey.description}</p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                                <div className="flex items-center space-x-1">
                                  <ClipboardCheck className="w-3 h-3" />
                                  <span>{Array.isArray(survey.questions) ? survey.questions.length : 0} questions</span>
                                </div>
                                {survey.startDate && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Starts: {new Date(survey.startDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {survey.endDate && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Ends: {new Date(survey.endDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedSurvey(survey.id)}
                                  data-testid={`button-view-responses-${survey.id}`}
                                >
                                  <BarChart3 className="w-3 h-3 mr-1" />
                                  View Responses
                                </Button>
                                
                                {survey.status === 'draft' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateSurveyStatus(survey.id, 'active')}
                                    data-testid={`button-activate-${survey.id}`}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    Activate
                                  </Button>
                                )}
                                
                                {survey.status === 'active' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => updateSurveyStatus(survey.id, 'paused')}
                                      data-testid={`button-pause-${survey.id}`}
                                    >
                                      <Pause className="w-3 h-3 mr-1" />
                                      Pause
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => sendReminders(survey.id)}
                                      data-testid={`button-remind-${survey.id}`}
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      Send Reminders
                                    </Button>
                                  </>
                                )}
                                
                                {survey.status === 'paused' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateSurveyStatus(survey.id, 'active')}
                                    data-testid={`button-resume-${survey.id}`}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    Resume
                                  </Button>
                                )}
                                
                                {survey.status !== 'completed' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => updateSurveyStatus(survey.id, 'completed')}
                                      data-testid={`button-complete-${survey.id}`}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Complete
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => deleteSurvey(survey.id)}
                                      data-testid={`button-delete-${survey.id}`}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Delete
                                    </Button>
                                  </>
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

              <TabsContent value="responses" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                    <SelectTrigger className="w-full max-w-md" data-testid="select-survey-responses">
                      <SelectValue placeholder="Select survey to view responses" />
                    </SelectTrigger>
                    <SelectContent>
                      {surveys.map((survey) => (
                        <SelectItem key={survey.id} value={survey.id}>
                          {survey.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSurvey && (
                  <>
                    {responsesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      </div>
                    ) : responses.length === 0 ? (
                      <div className="text-center py-12" data-testid="no-responses-message">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Responses Yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Responses will appear here once participants complete the survey.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-2xl font-bold text-primary" data-testid="total-responses">
                                {responses.length}
                              </div>
                              <div className="text-sm text-muted-foreground">Total Responses</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-2xl font-bold text-green-600">85%</div>
                              <div className="text-sm text-muted-foreground">Completion Rate</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-2xl font-bold text-blue-600">4.2</div>
                              <div className="text-sm text-muted-foreground">Avg. Readiness Score</div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <div className="space-y-3">
                          {responses.map((response) => (
                            <Card key={response.id} data-testid={`response-${response.id}`}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {response.respondentEmail || "Anonymous"}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(response.submittedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {Object.keys(response.responses || {}).length} questions answered
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
