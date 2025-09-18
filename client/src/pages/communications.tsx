import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  Users, 
  AlertTriangle, 
  Settings, 
  FileText, 
  Mail, 
  Megaphone,
  Calendar,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  User,
  Plus,
  Eye,
  Edit,
  Send,
  Bot,
  Save,
  Trash2
} from "lucide-react";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CommunicationStrategy, type CommunicationTemplate, type Communication, type Stakeholder, insertCommunicationStrategySchema } from "@shared/schema";
import { z } from "zod";

// Group Emails Execution Module Component
function GroupEmailsExecutionModule() {
  const { currentProject } = useCurrentProject();
  const [activeView, setActiveView] = useState<'repository' | 'create' | 'manage'>('repository');
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [emailContent, setEmailContent] = useState({ title: '', content: '', callToAction: '' });
  const [currentEmail, setCurrentEmail] = useState<Communication | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributionEmail, setDistributionEmail] = useState<Communication | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [selectedRaidLogs, setSelectedRaidLogs] = useState<string[]>([]);
  const [tone, setTone] = useState('professional');
  const [urgency, setUrgency] = useState('normal');
  const { toast } = useToast();

  // Fetch communication templates for group emails
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/communication-templates/category/email']
  });

  // Fetch created group emails
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id
  });

  const groupEmails = communications.filter((comm: Communication) => comm.type === 'group_email');

  // Fetch stakeholders for recipient selection
  const { data: stakeholders = [], isLoading: stakeholdersLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id
  });

  // Fetch RAID logs for context integration
  const { data: raidLogs = [], isLoading: raidLogsLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'raid-logs'],
    enabled: !!currentProject?.id
  });

  // Create group email mutation
  const createEmailMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${currentProject?.id}/communications`, {
      method: 'POST',
      body: {
        ...data,
        type: 'group_email',
        status: 'draft'
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      toast({ title: "Group email created successfully" });
      setShowCreateModal(false);
      setEmailContent({ title: '', content: '', callToAction: '' });
      setSelectedRaidLogs([]);
      setSelectedRecipients([]);
    },
    onError: () => {
      toast({ title: "Failed to create group email", variant: "destructive" });
    }
  });

  // GPT content generation for group emails
  const generateContentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gpt/generate-group-email-content', {
      method: 'POST',
      body: data
    }),
    onSuccess: (content) => {
      setEmailContent(content);
      setIsGeneratingContent(false);
      toast({ title: "Email content generated successfully" });
    },
    onError: () => {
      setIsGeneratingContent(false);
      toast({ title: "Failed to generate email content", variant: "destructive" });
    }
  });

  // Distribution mutation
  const distributeEmailMutation = useMutation({
    mutationFn: ({ emailId, recipients, dryRun }: { 
      emailId: string; 
      recipients: string[]; 
      dryRun?: boolean 
    }) => 
      apiRequest(`/api/communications/${emailId}/distribute`, {
        method: 'POST',
        body: { 
          distributionMethod: 'email',
          recipients,
          dryRun: dryRun || false
        }
      }),
    onSuccess: (data, { dryRun }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      
      if (dryRun) {
        toast({ 
          title: "Dry Run Complete", 
          description: `Would send email to ${data.distributionResult?.sent || 0} recipients. No emails were actually sent.`,
          variant: "default"
        });
      } else {
        const successCount = data.distributionResult?.sent || 0;
        const failCount = data.distributionResult?.failed || 0;
        toast({ 
          title: "Email Distribution Complete", 
          description: `Successfully sent to ${successCount} recipients${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      }
      
      setShowDistributeModal(false);
      setDistributionEmail(null);
    },
    onError: () => {
      toast({ title: "Failed to distribute email", variant: "destructive" });
    }
  });

  // Increment template usage
  const incrementUsageMutation = useMutation({
    mutationFn: (templateId: string) => apiRequest(`/api/communication-templates/${templateId}/usage`, {
      method: 'POST'
    }),
  });

  const handleTemplateSelect = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    incrementUsageMutation.mutate(template.id);
    setEmailContent({
      title: template.name,
      content: template.content,
      callToAction: 'Please review this information and let us know if you have any questions'
    });
    setShowTemplateModal(false);
    setShowCreateModal(true);
  };

  const handleGenerateContent = () => {
    if (!currentProject) return;
    
    setIsGeneratingContent(true);
    
    // Get selected RAID log context
    const raidLogContext = selectedRaidLogs.length > 0 
      ? raidLogs.filter((log: any) => selectedRaidLogs.includes(log.id))
      : [];
    
    generateContentMutation.mutate({
      projectName: currentProject.name,
      changeDescription: currentProject.description,
      targetAudience: ['All Staff'],
      keyMessages: ['Important change initiative update', 'Benefits for the organization'],
      raidLogContext,
      tone,
      urgency
    });
  };

  const handleSaveEmail = () => {
    if (!emailContent.title || !emailContent.content) {
      toast({ title: "Please fill in subject and content", variant: "destructive" });
      return;
    }

    createEmailMutation.mutate({
      title: emailContent.title,
      content: emailContent.content,
      targetAudience: ['All Staff'],
      templateId: selectedTemplate?.id || null,
      raidLogReferences: selectedRaidLogs,
      isGptGenerated: isGeneratingContent,
      distributionMethod: 'email',
      visibilitySettings: 'public'
    });
  };

  const handleAddRecipient = () => {
    if (recipientInput.trim() && !selectedRecipients.includes(recipientInput.trim())) {
      setSelectedRecipients([...selectedRecipients, recipientInput.trim()]);
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r !== email));
  };

  const handleDistribute = (email: Communication, dryRun: boolean = false) => {
    if (selectedRecipients.length === 0) {
      toast({ title: "Please select at least one recipient", variant: "destructive" });
      return;
    }

    distributeEmailMutation.mutate({
      emailId: email.id,
      recipients: selectedRecipients,
      dryRun
    });
  };

  const filteredTemplates = templates.filter((template: CommunicationTemplate) => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === 'all' || template.category === selectedCategory)
  );

  const filteredEmails = groupEmails.filter((email: Communication) =>
    email.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-[#832c2c]" />
            <span>Group Emails</span>
          </div>
          <Badge variant="outline" className="text-[#832c2c] border-[#832c2c]">
            {groupEmails.length} Created
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={setActiveView as any} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="repository" data-testid="tab-email-repository">
              <Mail className="w-4 h-4 mr-2" />
              Email Repository
            </TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create-email">
              <Plus className="w-4 h-4 mr-2" />
              Create Email
            </TabsTrigger>
            <TabsTrigger value="manage" data-testid="tab-manage-emails">
              <Users className="w-4 h-4 mr-2" />
              Manage
            </TabsTrigger>
          </TabsList>

          {/* Email Repository View */}
          <TabsContent value="repository" className="space-y-6" data-testid="repository-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Input 
                  placeholder="Search group emails..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  data-testid="input-search-emails"
                />
              </div>
              <Button 
                variant="outline"
                onClick={() => setActiveView('create')}
                data-testid="button-create-email"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Email
              </Button>
            </div>

            <div className="grid gap-4">
              {communicationsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </Card>
                ))
              ) : filteredEmails.length === 0 ? (
                <Card className="p-8 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No group emails created yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by creating your first group email communication
                  </p>
                  <Button onClick={() => setActiveView('create')} data-testid="button-create-first-email">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Group Email
                  </Button>
                </Card>
              ) : (
                filteredEmails.map((email: Communication) => (
                  <Card key={email.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium" data-testid={`text-email-title-${email.id}`}>
                            {email.title}
                          </h3>
                          <Badge 
                            variant={email.status === 'sent' ? 'default' : email.status === 'draft' ? 'secondary' : 'outline'}
                            data-testid={`badge-email-status-${email.id}`}
                          >
                            {email.status}
                          </Badge>
                          {email.isGptGenerated && (
                            <Badge variant="outline" className="text-[#832c2c] border-[#832c2c]">
                              <Bot className="w-3 h-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {email.content.substring(0, 120)}...
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Created {new Date(email.createdAt).toLocaleDateString()}</span>
                          {email.sendDate && (
                            <span>Sent {new Date(email.sendDate).toLocaleDateString()}</span>
                          )}
                          {email.targetAudience.length > 0 && (
                            <span>To: {email.targetAudience.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setCurrentEmail(email);
                            setShowPreviewModal(true);
                          }}
                          data-testid={`button-preview-${email.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setDistributionEmail(email);
                            setShowDistributeModal(true);
                          }}
                          disabled={email.status === 'sent'}
                          data-testid={`button-distribute-${email.id}`}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Create Email View */}
          <TabsContent value="create" className="space-y-6" data-testid="create-email-content">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Create New Group Email</h3>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTemplateModal(true)}
                      data-testid="button-browse-templates"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Browse Templates
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleGenerateContent}
                      disabled={isGeneratingContent || !currentProject}
                      data-testid="button-generate-email-content"
                    >
                      {isGeneratingContent ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tone">Email Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger data-testid="select-email-tone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="urgency">Urgency Level</Label>
                      <Select value={urgency} onValueChange={setUrgency}>
                        <SelectTrigger data-testid="select-email-urgency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      value={emailContent.title}
                      onChange={(e) => setEmailContent({ ...emailContent, title: e.target.value })}
                      placeholder="Enter email subject..."
                      data-testid="input-email-subject"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Email Content</Label>
                    <Textarea
                      id="content"
                      value={emailContent.content}
                      onChange={(e) => setEmailContent({ ...emailContent, content: e.target.value })}
                      placeholder="Enter email content..."
                      rows={8}
                      data-testid="textarea-email-content"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cta">Call to Action</Label>
                    <Input
                      id="cta"
                      value={emailContent.callToAction}
                      onChange={(e) => setEmailContent({ ...emailContent, callToAction: e.target.value })}
                      placeholder="Enter call to action..."
                      data-testid="input-email-cta"
                    />
                  </div>

                  {/* RAID Log Integration */}
                  <div>
                    <Label>Include RAID Log Information</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {raidLogsLoading ? (
                        <div className="text-sm text-muted-foreground">Loading RAID logs...</div>
                      ) : raidLogs.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No RAID logs available</div>
                      ) : (
                        raidLogs.map((log: any) => (
                          <div key={log.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`raid-${log.id}`}
                              checked={selectedRaidLogs.includes(log.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRaidLogs([...selectedRaidLogs, log.id]);
                                } else {
                                  setSelectedRaidLogs(selectedRaidLogs.filter(id => id !== log.id));
                                }
                              }}
                              data-testid={`checkbox-raid-${log.id}`}
                            />
                            <div className="flex-1">
                              <label htmlFor={`raid-${log.id}`} className="text-sm font-medium cursor-pointer">
                                <Badge variant="outline" className="mr-2">
                                  {log.type.toUpperCase()}
                                </Badge>
                                {log.title}
                              </label>
                              <p className="text-xs text-muted-foreground mt-1">
                                {log.description.substring(0, 100)}...
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEmailContent({ title: '', content: '', callToAction: '' });
                      setSelectedRaidLogs([]);
                    }}
                    data-testid="button-clear-email"
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={handleSaveEmail}
                    disabled={!emailContent.title || !emailContent.content || createEmailMutation.isPending}
                    data-testid="button-save-email"
                  >
                    {createEmailMutation.isPending ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Manage Emails View */}
          <TabsContent value="manage" className="space-y-6" data-testid="manage-emails-content">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Email Management</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#832c2c]">
                      {groupEmails.filter(e => e.status === 'sent').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Emails Sent</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#832c2c]">
                      {groupEmails.filter(e => e.status === 'draft').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Drafts</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#832c2c]">
                      {groupEmails.filter(e => e.isGptGenerated).length}
                    </div>
                    <div className="text-sm text-muted-foreground">AI Generated</div>
                  </Card>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Selection Modal */}
        <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Email Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Input 
                  placeholder="Search templates..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                  data-testid="input-search-templates"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48" data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="email">Email Templates</SelectItem>
                    <SelectItem value="newsletter">Newsletters</SelectItem>
                    <SelectItem value="announcement">Announcements</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4">
                {templatesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </Card>
                  ))
                ) : (
                  filteredTemplates.map((template: CommunicationTemplate) => (
                    <Card 
                      key={template.id} 
                      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTemplateSelect(template)}
                      data-testid={`template-card-${template.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium">{template.name}</h3>
                            <Badge variant="outline">
                              {template.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.content.substring(0, 150)}...
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Used {template.usageCount || 0} times
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Distribution Modal */}
        <Dialog open={showDistributeModal} onOpenChange={setShowDistributeModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Distribute Group Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Email: {distributionEmail?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {distributionEmail?.content.substring(0, 200)}...
                </p>
              </div>

              <div>
                <Label>Recipients</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      placeholder="Enter email address..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                      data-testid="input-recipient-email"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleAddRecipient}
                      data-testid="button-add-recipient"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {/* Quick Add from Stakeholders */}
                  <div>
                    <Label className="text-sm">Quick add from stakeholders:</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {stakeholders
                        .filter((s: Stakeholder) => s.email && !selectedRecipients.includes(s.email))
                        .map((stakeholder: Stakeholder) => (
                        <Button
                          key={stakeholder.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (stakeholder.email) {
                              setSelectedRecipients([...selectedRecipients, stakeholder.email]);
                            }
                          }}
                          data-testid={`button-add-stakeholder-${stakeholder.id}`}
                        >
                          <User className="w-3 h-3 mr-1" />
                          {stakeholder.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Selected Recipients */}
                  {selectedRecipients.length > 0 && (
                    <div>
                      <Label className="text-sm">Selected recipients:</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedRecipients.map((email) => (
                          <Badge 
                            key={email} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => handleRemoveRecipient(email)}
                            data-testid={`badge-recipient-${email}`}
                          >
                            {email}
                            <Trash2 className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => distributionEmail && handleDistribute(distributionEmail, true)}
                  disabled={selectedRecipients.length === 0 || distributeEmailMutation.isPending}
                  data-testid="button-dry-run"
                >
                  Test Send (Dry Run)
                </Button>
                <Button 
                  onClick={() => distributionEmail && handleDistribute(distributionEmail, false)}
                  disabled={selectedRecipients.length === 0 || distributeEmailMutation.isPending}
                  data-testid="button-send-email"
                  className="bg-[#832c2c] hover:bg-[#6d2424]"
                >
                  {distributeEmailMutation.isPending ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {currentEmail && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Subject:</Label>
                    <div className="font-medium" data-testid="preview-email-subject">
                      {currentEmail.title}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Content:</Label>
                    <div 
                      className="prose prose-sm max-w-none mt-2"
                      data-testid="preview-email-content"
                    >
                      {currentEmail.content.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                  {currentEmail.raidLogReferences && currentEmail.raidLogReferences.length > 0 && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Related RAID Information:</Label>
                      <div className="space-y-2 mt-2">
                        {currentEmail.raidLogReferences.map((raidId: string) => {
                          const raidLog = raidLogs.find((log: any) => log.id === raidId);
                          if (!raidLog) return null;
                          return (
                            <div key={raidId} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                  {raidLog.type.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{raidLog.title}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {raidLog.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Status: {currentEmail.status}</span>
                    <span>Created: {new Date(currentEmail.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Flyers Execution Module Component
function FlyersExecutionModule() {
  const { currentProject } = useCurrentProject();
  const [activeView, setActiveView] = useState<'repository' | 'create' | 'manage'>('repository');
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [flyerContent, setFlyerContent] = useState({ title: '', content: '', callToAction: '' });
  const [currentFlyer, setCurrentFlyer] = useState<Communication | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributionFlyer, setDistributionFlyer] = useState<Communication | null>(null);
  const { toast } = useToast();

  // Fetch communication templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/communication-templates/category/flyer']
  });

  // Fetch created flyers
  const { data: flyers = [], isLoading: flyersLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id
  });

  const flyerFlyers = flyers.filter((comm: Communication) => comm.type === 'flyer');

  // Create flyer mutation
  const createFlyerMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${currentProject?.id}/communications`, {
      method: 'POST',
      body: {
        ...data,
        type: 'flyer',
        status: 'draft'
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      toast({ title: "Flyer created successfully" });
      setShowCreateModal(false);
      setFlyerContent({ title: '', content: '', callToAction: '' });
    },
    onError: () => {
      toast({ title: "Failed to create flyer", variant: "destructive" });
    }
  });

  // GPT content generation
  const generateContentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gpt/generate-flyer-content', {
      method: 'POST',
      body: data
    }),
    onSuccess: (content) => {
      setFlyerContent(content);
      setIsGeneratingContent(false);
      toast({ title: "Content generated successfully" });
    },
    onError: () => {
      setIsGeneratingContent(false);
      toast({ title: "Failed to generate content", variant: "destructive" });
    }
  });

  // Increment template usage
  const incrementUsageMutation = useMutation({
    mutationFn: (templateId: string) => apiRequest(`/api/communication-templates/${templateId}/usage`, {
      method: 'POST'
    }),
  });

  const handleTemplateSelect = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    incrementUsageMutation.mutate(template.id);
    setFlyerContent({
      title: template.name,
      content: template.content,
      callToAction: 'Learn more about this change'
    });
    setShowTemplateModal(false);
    setShowCreateModal(true);
  };

  const handleGenerateContent = () => {
    if (!currentProject) return;
    
    setIsGeneratingContent(true);
    generateContentMutation.mutate({
      projectName: currentProject.name,
      changeDescription: currentProject.description,
      targetAudience: ['All Staff'],
      keyMessages: ['Important change initiative', 'Benefits for the organization']
    });
  };

  const handleSaveFlyer = () => {
    if (!flyerContent.title || !flyerContent.content) {
      toast({ title: "Please fill in title and content", variant: "destructive" });
      return;
    }

    createFlyerMutation.mutate({
      title: flyerContent.title,
      content: flyerContent.content,
      targetAudience: ['All Staff'],
      templateId: selectedTemplate?.id || null,
      isGptGenerated: isGeneratingContent,
      exportOptions: { powerpoint: true, canva: true, pdf: true }
    });
  };

  const filteredTemplates = templates.filter((template: CommunicationTemplate) => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === 'all' || template.category === selectedCategory)
  );

  const filteredFlyers = flyerFlyers.filter((flyer: Communication) =>
    flyer.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Distribution mutation with enhanced UX feedback
  const distributeFlyerMutation = useMutation({
    mutationFn: ({ flyerId, method, recipients, dryRun }: { 
      flyerId: string; 
      method: string; 
      recipients?: string[]; 
      dryRun?: boolean 
    }) => 
      apiRequest(`/api/communications/${flyerId}/distribute`, {
        method: 'POST',
        body: { 
          distributionMethod: method,
          recipients: recipients || [],
          dryRun: dryRun || false
        },
        headers: {
          'x-user-id': '550e8400-e29b-41d4-a716-446655440000' // Demo user ID for development
        }
      }),
    onSuccess: (data, { method, dryRun }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      
      if (dryRun) {
        toast({ 
          title: "Dry Run Complete", 
          description: `Would distribute to ${data.distributionResult?.sent || 0} recipients via ${method}. No emails were actually sent.`,
          variant: "default"
        });
      } else {
        const successCount = data.distributionResult?.sent || 0;
        const failCount = data.distributionResult?.failed || 0;
        toast({ 
          title: "Distribution Complete", 
          description: `Successfully sent to ${successCount} recipients${failCount > 0 ? `, ${failCount} failed` : ''} via ${method}.`,
          variant: failCount > 0 ? "destructive" : "default"
        });
      }
      
      setShowDistributeModal(false);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to distribute flyer";
      
      if (error?.message?.includes('Rate limit')) {
        errorMessage = "Rate limit exceeded. Please wait before sending more distributions.";
      } else if (error?.message?.includes('production')) {
        errorMessage = "Email distribution disabled in production environment.";
      } else if (error?.message?.includes('Authentication')) {
        errorMessage = "Authentication required. Please log in.";
      } else if (error?.message?.includes('permission')) {
        errorMessage = "Insufficient permissions for bulk email distribution.";
      }
      
      toast({ 
        title: "Distribution Failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  // Export mutation with enhanced UX feedback
  const exportFlyerMutation = useMutation({
    mutationFn: ({ flyerId, format }: { flyerId: string; format: string }) => 
      apiRequest(`/api/communications/${flyerId}/export`, {
        method: 'POST',
        body: { format },
        headers: {
          'x-user-id': '550e8400-e29b-41d4-a716-446655440000' // Demo user ID for development
        }
      }),
    onSuccess: (data, { format }) => {
      // Create and trigger download
      if (data.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || `flyer.${format === 'canva' ? 'png' : format}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ 
          title: "Export Complete", 
          description: `${data.filename} has been downloaded successfully.`,
          variant: "default"
        });
      } else {
        toast({ title: `Flyer exported to ${format} format successfully` });
      }
    },
    onError: (error: any) => {
      let errorMessage = "Failed to export flyer";
      
      if (error?.message?.includes('Rate limit')) {
        errorMessage = "Export rate limit exceeded. Please wait before requesting more exports.";
      } else if (error?.message?.includes('Authentication')) {
        errorMessage = "Authentication required. Please log in.";
      } else if (error?.message?.includes('permission')) {
        errorMessage = "Insufficient permissions to export communications.";
      } else if (error?.message?.includes('format')) {
        errorMessage = "Invalid export format specified.";
      }
      
      toast({ 
        title: "Export Failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const handleDistribute = (flyer: Communication) => {
    setDistributionFlyer(flyer);
    setShowDistributeModal(true);
  };

  const handleExport = (flyer: Communication, format: string) => {
    exportFlyerMutation.mutate({ flyerId: flyer.id, format });
  };

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Flyers Execution</h2>
          <p className="text-muted-foreground">Create, manage, and distribute flyers for your change initiative</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2"
            data-testid="button-new-flyer"
          >
            <Plus className="w-4 h-4" />
            New Flyer
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveView(activeView === 'repository' ? 'manage' : 'repository')}
            data-testid="button-toggle-view"
          >
            {activeView === 'repository' ? <Settings className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            {activeView === 'repository' ? 'Manage' : 'Repository'}
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search flyers and templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="flyer">Flyers</SelectItem>
            <SelectItem value="announcement">Announcements</SelectItem>
            <SelectItem value="update">Updates</SelectItem>
            <SelectItem value="training">Training</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs value={activeView} onValueChange={setActiveView as any} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="repository" data-testid="tab-repository">
            <FileText className="w-4 h-4 mr-2" />
            Repository
          </TabsTrigger>
          <TabsTrigger value="create" data-testid="tab-create">
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">
            <Settings className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Repository View */}
        <TabsContent value="repository" className="space-y-4" data-testid="repository-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flyersLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </Card>
              ))
            ) : filteredFlyers.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No flyers found</h3>
                <p className="text-sm">Create your first flyer to get started</p>
              </div>
            ) : (
              filteredFlyers.map((flyer: Communication) => (
                <Card key={flyer.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm line-clamp-2" data-testid={`text-flyer-title-${flyer.id}`}>
                      {flyer.title}
                    </h3>
                    <Badge variant={flyer.status === 'sent' ? 'default' : 'secondary'}>
                      {flyer.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {flyer.content.substring(0, 100)}...
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setCurrentFlyer(flyer);
                      setShowPreviewModal(true);
                    }} data-testid={`button-preview-${flyer.id}`}>
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" data-testid={`button-edit-${flyer.id}`}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Create New View */}
        <TabsContent value="create" className="space-y-6" data-testid="create-content">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Create New Flyer</h3>
                <Button 
                  variant="outline" 
                  onClick={handleGenerateContent}
                  disabled={isGeneratingContent || !currentProject}
                  data-testid="button-generate-content"
                >
                  {isGeneratingContent ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Flyer Title</Label>
                  <Input
                    id="title"
                    value={flyerContent.title}
                    onChange={(e) => setFlyerContent({ ...flyerContent, title: e.target.value })}
                    placeholder="Enter flyer title..."
                    data-testid="input-flyer-title"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={flyerContent.content}
                    onChange={(e) => setFlyerContent({ ...flyerContent, content: e.target.value })}
                    placeholder="Enter flyer content..."
                    rows={8}
                    data-testid="textarea-flyer-content"
                  />
                </div>
                <div>
                  <Label htmlFor="cta">Call to Action</Label>
                  <Input
                    id="cta"
                    value={flyerContent.callToAction}
                    onChange={(e) => setFlyerContent({ ...flyerContent, callToAction: e.target.value })}
                    placeholder="Enter call to action..."
                    data-testid="input-flyer-cta"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveFlyer} disabled={createFlyerMutation.isPending} data-testid="button-save-flyer">
                  <Save className="w-4 h-4 mr-2" />
                  Save Flyer
                </Button>
                <Button variant="outline" onClick={() => setShowPreviewModal(true)} data-testid="button-preview-flyer">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Template Management View */}
        <TabsContent value="manage" className="space-y-4" data-testid="manage-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templatesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-8 w-full" />
                </Card>
              ))
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No templates found</h3>
                <p className="text-sm">Add templates to help create consistent flyers</p>
              </div>
            ) : (
              filteredTemplates.map((template: CommunicationTemplate) => (
                <Card key={template.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleTemplateSelect(template)}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm line-clamp-2" data-testid={`text-template-title-${template.id}`}>
                      {template.name}
                    </h3>
                    <Badge variant="outline">
                      {template.templateType}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Used {template.usageCount || 0} times</span>
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Selection Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template: CommunicationTemplate) => (
              <Card key={template.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleTemplateSelect(template)}>
                <h3 className="font-medium mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                <div className="text-xs text-muted-foreground">
                  Used {template.usageCount || 0} times • {template.templateType}
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Flyer Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
              <h2 className="text-xl font-bold mb-4 text-center">
                {currentFlyer?.title || flyerContent.title}
              </h2>
              <div className="prose max-w-none text-sm">
                {currentFlyer?.content || flyerContent.content}
              </div>
              {(currentFlyer || flyerContent.callToAction) && (
                <div className="mt-6 text-center">
                  <Button variant="default" data-testid="button-preview-cta">
                    {currentFlyer?.['callToAction'] || flyerContent.callToAction}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => handleExport(currentFlyer!, 'powerpoint')}
                disabled={!currentFlyer || exportFlyerMutation.isPending}
                data-testid="button-export-powerpoint"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export to PowerPoint
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport(currentFlyer!, 'canva')}
                disabled={!currentFlyer || exportFlyerMutation.isPending}
                data-testid="button-export-canva"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Export to Canva
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDistribute(currentFlyer!)}
                disabled={!currentFlyer}
                data-testid="button-distribute"
              >
                <Send className="w-4 h-4 mr-2" />
                Distribute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Distribution Modal */}
      <Dialog open={showDistributeModal} onOpenChange={setShowDistributeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Distribute Flyer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              How would you like to distribute "{distributionFlyer?.title}"?
            </p>
            <div className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => distributeFlyerMutation.mutate({ 
                  flyerId: distributionFlyer!.id, 
                  method: 'group_email' 
                })}
                disabled={distributeFlyerMutation.isPending}
                data-testid="button-distribute-group-email"
              >
                <Mail className="w-4 h-4 mr-2" />
                Distribute by Group Email
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => distributeFlyerMutation.mutate({ 
                  flyerId: distributionFlyer!.id, 
                  method: 'p2p_email' 
                })}
                disabled={distributeFlyerMutation.isPending}
                data-testid="button-distribute-p2p-email"
              >
                <User className="w-4 h-4 mr-2" />
                Distribute by P2P Email
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  // Just close modal for "store only" option
                  setShowDistributeModal(false);
                  toast({ title: "Flyer stored for records only" });
                }}
                data-testid="button-store-only"
              >
                <Save className="w-4 h-4 mr-2" />
                Store for Records Only
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Frontend-only interface for resistance points (not persisted to database)
// These are used only for local state management and GPT API interactions
interface ResistancePoint {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedGroups: string[];
}

// Validation schema for resistance points
const resistancePointSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  severity: z.enum(['low', 'medium', 'high'], { required_error: "Severity is required" }),
  affectedGroups: z.array(z.string()).min(1, "At least one affected group is required")
});

const PHASES = [
  { 
    id: 'identify_need', 
    name: 'Identify Need', 
    description: 'Build awareness and urgency for change',
    color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
  },
  { 
    id: 'develop_solution', 
    name: 'Develop Solution', 
    description: 'Design and plan the change initiative',
    color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
  },
  { 
    id: 'implement_change', 
    name: 'Implement Change', 
    description: 'Execute the change and provide support',
    color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'
  },
  { 
    id: 'sustain_change', 
    name: 'Sustain Change', 
    description: 'Embed the change and celebrate wins',
    color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
  },
  { 
    id: 'evaluate_results', 
    name: 'Evaluate Results', 
    description: 'Measure success and capture lessons learned',
    color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
  }
];

const COMMUNICATION_CHANNELS = [
  { id: 'flyers', name: 'Flyers', effectiveness: 'Medium', audience: 'All Staff' },
  { id: 'group_emails', name: 'Group Emails', effectiveness: 'High', audience: 'Large Groups' },
  { id: 'p2p_emails', name: 'P2P Emails', effectiveness: 'Very High', audience: 'Individuals' },
  { id: 'meetings', name: 'Meetings', effectiveness: 'High', audience: 'Teams/Leadership' }
];

// Phase-Based Guidance Component
function PhaseGuidance() {
  const { currentProject } = useCurrentProject();
  const [selectedPhase, setSelectedPhase] = useState(PHASES[0].id);
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);
  const { toast } = useToast();

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'communication-strategies'],
    enabled: !!currentProject?.id
  });

  const { data: phaseGuidance, isLoading: guidanceLoading } = useQuery({
    queryKey: ['/api/gpt/phase-guidance', selectedPhase],
    queryFn: () => apiRequest('/api/gpt/phase-guidance', {
      method: 'POST',
      body: {
        projectId: currentProject?.id,
        phase: selectedPhase,
        projectName: currentProject?.name,
        description: currentProject?.description,
        currentPhase: currentProject?.currentPhase || 'identify_need'
      }
    }),
    enabled: !!currentProject?.id && showGuidanceModal
  });

  const createStrategyMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${currentProject?.id}/communication-strategies`, {
      method: 'POST',
      body: data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communication-strategies'] });
      toast({ title: "Communication strategy created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create communication strategy", variant: "destructive" });
    }
  });

  const handleCreateStrategy = (phase: string, guidance?: any) => {
    const guidanceToUse = guidance || phaseGuidance;
    if (!guidanceToUse) return;
    
    createStrategyMutation.mutate({
      phase,
      strategyName: `${PHASES.find(p => p.id === phase)?.name} Communication Strategy`,
      description: PHASES.find(p => p.id === phase)?.description,
      keyMessages: guidanceToUse.keyMessages.map((msg: string) => ({ message: msg, priority: 'high' })),
      communicationChannels: guidanceToUse.recommendedChannels,
      targetAudiences: [{ name: 'All Staff', description: 'Organization-wide communication' }],
      timeline: guidanceToUse.timeline
    });
  };

  const handleGenerateAIGuidance = async () => {
    if (!currentProject) return;
    
    setIsGeneratingGuidance(true);
    try {
      // First fetch the AI guidance
      const guidance = await apiRequest('/api/gpt/phase-guidance', {
        method: 'POST',
        body: {
          projectId: currentProject.id,
          phase: selectedPhase,
          projectName: currentProject.name,
          description: currentProject.description,
          currentPhase: currentProject.currentPhase || 'identify_need'
        }
      });
      
      // Show the guidance modal first so user can see what was generated
      setShowGuidanceModal(true);
      
      // Invalidate the guidance query to trigger re-fetch with the new data
      queryClient.invalidateQueries({ queryKey: ['/api/gpt/phase-guidance', selectedPhase] });
      
      // Then create strategy from the guidance
      handleCreateStrategy(selectedPhase, guidance);
      
      toast({ title: "AI guidance generated and strategy created successfully" });
    } catch (error) {
      console.error('Error generating AI guidance:', error);
      toast({ title: "Failed to generate AI guidance", variant: "destructive" });
    } finally {
      setIsGeneratingGuidance(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <span>Phase-Based Guidance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {PHASES.map((phase, index) => {
            const hasStrategy = strategies.some((s: CommunicationStrategy) => s.phase === phase.id);
            const isCurrentPhase = currentProject?.currentPhase === phase.id;
            
            return (
              <div 
                key={phase.id} 
                className={`space-y-2 cursor-pointer transition-all hover:scale-105 ${selectedPhase === phase.id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedPhase(phase.id)}
                data-testid={`phase-card-${phase.id}`}
              >
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={phase.color}>
                    Phase {index + 1}
                  </Badge>
                  {isCurrentPhase && <Badge variant="default" className="text-xs">Current</Badge>}
                  {hasStrategy && <CheckCircle className="w-3 h-3 text-green-500" />}
                </div>
                <span className="text-sm font-medium">{phase.name}</span>
                <p className="text-xs text-muted-foreground">{phase.description}</p>
              </div>
            );
          })}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowGuidanceModal(true)}
            data-testid="button-view-phase-details"
          >
            <Eye className="w-3 h-3 mr-1" />
            View Detailed Guidance
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateAIGuidance}
            disabled={isGeneratingGuidance || createStrategyMutation.isPending}
            data-testid="button-generate-guidance"
          >
            <Bot className="w-3 h-3 mr-1" />
            {isGeneratingGuidance ? 'Generating...' : 'Generate AI Guidance'}
          </Button>
        </div>

        <Dialog open={showGuidanceModal} onOpenChange={setShowGuidanceModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {PHASES.find(p => p.id === selectedPhase)?.name} - Communication Guidance
              </DialogTitle>
            </DialogHeader>
            
            {guidanceLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : phaseGuidance ? (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Key Communication Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {phaseGuidance.keyThemes.map((theme: string, index: number) => (
                      <Badge key={index} variant="secondary">{theme}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Key Messages</h4>
                  <ul className="space-y-1">
                    {phaseGuidance.keyMessages.map((message: string, index: number) => (
                      <li key={index} className="text-sm flex items-start space-x-2">
                        <span className="text-blue-500">•</span>
                        <span>{message}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recommended Channels</h4>
                  <div className="flex flex-wrap gap-2">
                    {phaseGuidance.recommendedChannels.map((channel: string, index: number) => (
                      <Badge key={index} variant="outline">{channel}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="space-y-2">
                    {phaseGuidance.timeline.map((item: any, index: number) => (
                      <div key={index} className="border-l-2 border-blue-500 pl-4">
                        <h5 className="font-medium text-sm">{item.week}</h5>
                        <ul className="text-sm text-muted-foreground">
                          {item.activities.map((activity: string, actIndex: number) => (
                            <li key={actIndex}>• {activity}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => handleCreateStrategy(selectedPhase)}
                  disabled={createStrategyMutation.isPending}
                  data-testid="button-create-strategy"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createStrategyMutation.isPending ? 'Creating...' : 'Create Communication Strategy'}
                </Button>
              </div>
            ) : (
              <p>Click "Generate AI Guidance" to get detailed recommendations for this phase.</p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Stakeholder Mapping Component
function StakeholderMapping() {
  const { currentProject } = useCurrentProject();

  const { data: stakeholders = [], isLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id
  });

  const stakeholderMatrix = {
    highInfluenceHighInterest: stakeholders.filter((s: Stakeholder) => s.influenceLevel === 'high' && s.engagementLevel === 'high'),
    highInfluenceLowInterest: stakeholders.filter((s: Stakeholder) => s.influenceLevel === 'high' && s.engagementLevel === 'low'),
    lowInfluenceHighInterest: stakeholders.filter((s: Stakeholder) => s.influenceLevel === 'low' && s.engagementLevel === 'high'),
    lowInfluenceLowInterest: stakeholders.filter((s: Stakeholder) => s.influenceLevel === 'low' && s.engagementLevel === 'low'),
  };

  const communicationFrequency = {
    weekly: stakeholders.filter((s: Stakeholder) => s.communicationPreference === 'weekly').length,
    biweekly: stakeholders.filter((s: Stakeholder) => s.communicationPreference === 'biweekly').length,
    monthly: stakeholders.filter((s: Stakeholder) => s.communicationPreference === 'monthly').length,
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <span>Stakeholder Mapping</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Influence vs Interest Matrix */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Stakeholder Matrix</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* High Influence, High Interest */}
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="font-medium text-red-800 dark:text-red-200 mb-2">Manage Closely</div>
                <div className="text-xs text-red-600 dark:text-red-300 mb-1">High Influence, High Interest</div>
                <div className="space-y-1">
                  {stakeholderMatrix.highInfluenceHighInterest.map((s: Stakeholder) => (
                    <div key={s.id} className="flex items-center space-x-2" data-testid={`stakeholder-matrix-${s.id}`}>
                      <User className="w-3 h-3" />
                      <span className="text-xs">{s.name} ({s.role})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Influence, Low Interest */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="font-medium text-orange-800 dark:text-orange-200 mb-2">Keep Satisfied</div>
                <div className="text-xs text-orange-600 dark:text-orange-300 mb-1">High Influence, Low Interest</div>
                <div className="space-y-1">
                  {stakeholderMatrix.highInfluenceLowInterest.map((s: Stakeholder) => (
                    <div key={s.id} className="flex items-center space-x-2" data-testid={`stakeholder-matrix-${s.id}`}>
                      <User className="w-3 h-3" />
                      <span className="text-xs">{s.name} ({s.role})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Influence, High Interest */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">Keep Informed</div>
                <div className="text-xs text-blue-600 dark:text-blue-300 mb-1">Low Influence, High Interest</div>
                <div className="space-y-1">
                  {stakeholderMatrix.lowInfluenceHighInterest.map((s: Stakeholder) => (
                    <div key={s.id} className="flex items-center space-x-2" data-testid={`stakeholder-matrix-${s.id}`}>
                      <User className="w-3 h-3" />
                      <span className="text-xs">{s.name} ({s.role})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Influence, Low Interest */}
              <div className="p-3 bg-gray-50 dark:bg-gray-950/30 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-2">Monitor</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Low Influence, Low Interest</div>
                <div className="space-y-1">
                  {stakeholderMatrix.lowInfluenceLowInterest.map((s: Stakeholder) => (
                    <div key={s.id} className="flex items-center space-x-2" data-testid={`stakeholder-matrix-${s.id}`}>
                      <User className="w-3 h-3" />
                      <span className="text-xs">{s.name} ({s.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Communication Frequency */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Communication Frequency</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Weekly Updates</span>
                <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  {communicationFrequency.weekly} stakeholders
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Bi-weekly Updates</span>
                <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {communicationFrequency.biweekly} stakeholders
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Monthly Updates</span>
                <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {communicationFrequency.monthly} stakeholders
                </Badge>
              </div>
            </div>

            <div className="pt-4">
              <h5 className="text-sm font-medium mb-2">Support Levels</h5>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Supportive</span>
                  <Badge variant="outline" className="text-green-700">
                    {stakeholders.filter((s: Stakeholder) => s.supportLevel === 'supportive').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Neutral</span>
                  <Badge variant="outline" className="text-yellow-700">
                    {stakeholders.filter((s: Stakeholder) => s.supportLevel === 'neutral').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Resistant</span>
                  <Badge variant="outline" className="text-red-700">
                    {stakeholders.filter((s: Stakeholder) => s.supportLevel === 'resistant').length}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Button variant="outline" size="sm" data-testid="button-manage-stakeholders">
          <Edit className="w-3 h-3 mr-1" />
          Manage Stakeholder Groups
        </Button>
      </CardContent>
    </Card>
  );
}

// Resistance Identification Component
function ResistanceIdentification() {
  const { currentProject } = useCurrentProject();
  const [resistancePoints, setResistancePoints] = useState<ResistancePoint[]>([]);
  const [showAddResistance, setShowAddResistance] = useState(false);
  const [showCounterMessages, setShowCounterMessages] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(resistancePointSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: 'medium' as 'low' | 'medium' | 'high',
      affectedGroups: [] as string[]
    }
  });

  const { data: counterMessages, isLoading: counterMessagesLoading } = useQuery({
    queryKey: ['/api/gpt/resistance-counter-messages', resistancePoints],
    queryFn: () => apiRequest('/api/gpt/resistance-counter-messages', {
      method: 'POST',
      body: {
        projectId: currentProject?.id,
        resistancePoints: resistancePoints.map(r => ({
          title: r.title,
          description: r.description,
          severity: r.severity,
          affectedGroups: r.affectedGroups
        }))
      }
    }),
    enabled: !!currentProject?.id && showCounterMessages && resistancePoints.length > 0
  });

  const handleAddResistance = (data: any) => {
    const newResistance: ResistancePoint = {
      id: Date.now().toString(),
      ...data
    };
    setResistancePoints([...resistancePoints, newResistance]);
    form.reset();
    setShowAddResistance(false);
    toast({ title: "Resistance point added" });
  };

  const handleRemoveResistance = (id: string) => {
    setResistancePoints(resistancePoints.filter(r => r.id !== id));
    toast({ title: "Resistance point removed" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Resistance Identification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Resistance Points */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Identified Resistance Points</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddResistance(true)}
                data-testid="button-add-resistance"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Resistance
              </Button>
            </div>

            <div className="space-y-2">
              {resistancePoints.map((resistance) => (
                <div 
                  key={resistance.id} 
                  className={`p-3 rounded-lg border ${
                    resistance.severity === 'high' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' :
                    resistance.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' :
                    'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  }`}
                  data-testid={`resistance-point-${resistance.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className={`w-3 h-3 ${
                        resistance.severity === 'high' ? 'text-red-600' :
                        resistance.severity === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`} />
                      <span className={`text-xs font-medium ${
                        resistance.severity === 'high' ? 'text-red-800' :
                        resistance.severity === 'medium' ? 'text-yellow-800' :
                        'text-green-800'
                      }`}>
                        {resistance.severity.toUpperCase()} Risk
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveResistance(resistance.id)}
                      data-testid={`button-remove-resistance-${resistance.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs font-medium mb-1">{resistance.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{resistance.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Affects: {resistance.affectedGroups.join(', ')}
                  </p>
                </div>
              ))}

              {resistancePoints.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No resistance points identified yet</p>
                  <p className="text-xs">Add potential resistance concerns to get AI-powered counter-strategies</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Counter-Messages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">GPT Coach Suggestions</h4>
              {resistancePoints.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCounterMessages(true)}
                  data-testid="button-generate-counter-messages"
                >
                  <Bot className="w-3 h-3 mr-1" />
                  Generate Counter-Messages
                </Button>
              )}
            </div>

            {showCounterMessages && counterMessages ? (
              <div className="space-y-4">
                {counterMessages.counterMessages.map((counter: any, index: number) => (
                  <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Response to: {counter.resistanceTitle}
                    </h5>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">{counter.counterMessage}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Tactics:</p>
                      <ul className="text-xs text-muted-foreground">
                        {counter.tactics.map((tactic: string, tacticIndex: number) => (
                          <li key={tacticIndex}>• {tactic}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
                
                {counterMessages.generalStrategies.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      General Resistance Management
                    </h5>
                    <ul className="text-xs text-green-700 dark:text-green-300">
                      {counterMessages.generalStrategies.map((strategy: string, index: number) => (
                        <li key={index}>• {strategy}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add resistance points and get AI-powered counter-strategies</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Resistance Modal */}
        <Dialog open={showAddResistance} onOpenChange={setShowAddResistance}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Resistance Point</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddResistance)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resistance Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Fear of job loss" {...field} data-testid="input-resistance-title" />
                      </FormControl>
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
                        <Textarea placeholder="Describe the resistance concern in detail..." {...field} data-testid="textarea-resistance-description" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-resistance-severity">
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="affectedGroups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affected Groups</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Operations team, Management" 
                          value={field.value ? field.value.join(', ') : ''}
                          onChange={(e) => field.onChange(e.target.value.split(', ').filter(g => g.trim()))}
                          data-testid="input-affected-groups"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddResistance(false)}
                    data-testid="button-cancel-resistance"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-save-resistance">
                    <Save className="w-4 h-4 mr-2" />
                    Save Resistance Point
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Channel Preferences Component
function ChannelPreferences() {
  const { currentProject } = useCurrentProject();
  const [channelPreferences, setChannelPreferences] = useState({
    flyers: { enabled: true, effectiveness: 'medium', audiences: ['all_staff'] },
    group_emails: { enabled: true, effectiveness: 'high', audiences: ['teams', 'departments'] },
    p2p_emails: { enabled: true, effectiveness: 'very_high', audiences: ['individuals', 'key_stakeholders'] },
    meetings: { enabled: true, effectiveness: 'high', audiences: ['leadership', 'project_teams'] }
  });

  const handleChannelToggle = (channel: string, enabled: boolean) => {
    setChannelPreferences(prev => ({
      ...prev,
      [channel]: { ...prev[channel as keyof typeof prev], enabled }
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Channel Preferences</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Communication Channels</h4>
            {COMMUNICATION_CHANNELS.map((channel) => (
              <div 
                key={channel.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
                data-testid={`channel-preference-${channel.id}`}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={channelPreferences[channel.id as keyof typeof channelPreferences]?.enabled}
                    onCheckedChange={(checked) => handleChannelToggle(channel.id, checked as boolean)}
                    data-testid={`checkbox-channel-${channel.id}`}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      {channel.id === 'flyers' && <FileText className="w-4 h-4" />}
                      {channel.id === 'group_emails' && <Mail className="w-4 h-4" />}
                      {channel.id === 'p2p_emails' && <Send className="w-4 h-4" />}
                      {channel.id === 'meetings' && <Calendar className="w-4 h-4" />}
                      <span className="font-medium text-sm">{channel.name}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Effectiveness: {channel.effectiveness}</span>
                      <span>Best for: {channel.audience}</span>
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={channelPreferences[channel.id as keyof typeof channelPreferences]?.enabled ? 'default' : 'secondary'}
                >
                  {channelPreferences[channel.id as keyof typeof channelPreferences]?.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Audience Matching</h4>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h5 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">High-Touch Stakeholders</h5>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p>• P2P Emails: Executives, Key Decision Makers</p>
                  <p>• Meetings: Leadership Team, Department Heads</p>
                  <p>• Frequency: Weekly</p>
                </div>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <h5 className="font-medium text-sm text-green-800 dark:text-green-200 mb-2">Team Communication</h5>
                <div className="text-xs text-green-700 dark:text-green-300">
                  <p>• Group Emails: Department Updates, Team News</p>
                  <p>• Meetings: Team Standups, Training Sessions</p>
                  <p>• Frequency: Bi-weekly</p>
                </div>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <h5 className="font-medium text-sm text-purple-800 dark:text-purple-200 mb-2">Organization-Wide</h5>
                <div className="text-xs text-purple-700 dark:text-purple-300">
                  <p>• Flyers: Awareness Campaigns, Announcements</p>
                  <p>• Group Emails: Company Updates, Policy Changes</p>
                  <p>• Frequency: Monthly</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" data-testid="button-save-preferences">
          <Save className="w-4 h-4 mr-2" />
          Save Channel Preferences
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Communications() {
  const [activeTab, setActiveTab] = useState<string>("strategy");
  const { currentProject } = useCurrentProject();

  return (
    <div className="space-y-6" data-testid="communications-page">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground">
            Plan and execute strategic communications for your change initiative
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" data-testid="button-export">
            <FileText className="w-4 h-4 mr-2" />
            Export Plan
          </Button>
          <Button data-testid="button-new-communication">
            <Plus className="w-4 h-4 mr-2" />
            New Communication
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Communication Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="strategy" data-testid="tab-strategy">
                Strategy
              </TabsTrigger>
              <TabsTrigger value="execution" data-testid="tab-execution">
                Execution
              </TabsTrigger>
            </TabsList>

            {/* Strategy Tab Content */}
            <TabsContent value="strategy" className="space-y-6" data-testid="strategy-content">
              <PhaseGuidance />
              <StakeholderMapping />
              <ResistanceIdentification />
              <ChannelPreferences />
            </TabsContent>

            {/* Execution Tab Content (Flyers and Group Emails Implementation) */}
            <TabsContent value="execution" className="space-y-6" data-testid="execution-content">
              <div className="space-y-6">
                <GroupEmailsExecutionModule />
                <FlyersExecutionModule />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}