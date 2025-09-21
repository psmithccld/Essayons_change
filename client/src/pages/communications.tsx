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
  X,
  Send,
  Bot,
  Save,
  Trash2,
  CalendarPlus,
  MapPin,
  Users2,
  Timer,
  CheckSquare,
  Archive
} from "lucide-react";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CommunicationStrategy, type CommunicationTemplate, type Communication, type Stakeholder, insertCommunicationStrategySchema } from "@shared/schema";
import { z } from "zod";
import CommunicationRepository from "@/components/CommunicationRepository";

// P2P Emails Execution Module Component
function P2PEmailsExecutionModule() {
  const { currentProject } = useCurrentProject();
  const { user } = useAuth();
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
  const [showSendModal, setShowSendModal] = useState(false);
  const [distributionEmail, setDistributionEmail] = useState<Communication | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientRole, setRecipientRole] = useState('');
  const [selectedRaidLogs, setSelectedRaidLogs] = useState<string[]>([]);
  const [tone, setTone] = useState('professional');
  const [urgency, setUrgency] = useState('normal');
  const [communicationPurpose, setCommunicationPurpose] = useState('update');
  const [relationship, setRelationship] = useState('colleague');
  const [visibility, setVisibility] = useState('private');
  const { toast } = useToast();

  // Fetch communication templates for P2P emails
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/communication-templates/category/p2p_email']
  });

  // Fetch created P2P emails
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id
  });

  const p2pEmails = communications.filter((comm: Communication) => comm.type === 'point_to_point_email');

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

  // Create P2P email mutation - Modified to save AND send automatically
  const createP2PEmailMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/projects/${currentProject?.id}/communications`, {
      ...data,
      type: 'point_to_point_email',
      status: 'draft'
    }),
    onSuccess: async (newEmail) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      
      // Automatically send the email after saving
      try {
        const sendResult = await apiRequest('POST', `/api/communications/${newEmail.id}/send-p2p`, {
          recipientEmail,
          recipientName,
          visibility,
          dryRun: false,
          senderEmail: user?.email // Include sender email for CC
        });
        
        toast({ 
          title: "Personal email saved and sent successfully", 
          description: `Email sent to ${recipientName} with copy to ${user?.email || 'sender'}` 
        });
      } catch (sendError) {
        console.error('Failed to send email after saving:', sendError);
        toast({ 
          title: "Email saved but failed to send", 
          description: "The email was saved to the repository but could not be sent automatically.",
          variant: "destructive" 
        });
      }
      
      setShowCreateModal(false);
      setEmailContent({ title: '', content: '', callToAction: '' });
      setSelectedRaidLogs([]);
      setRecipientEmail('');
      setRecipientName('');
      setRecipientRole('');
    },
    onError: () => {
      toast({ title: "Failed to create P2P email", variant: "destructive" });
    }
  });

  // GPT content generation for P2P emails
  const generateP2PContentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/gpt/generate-p2p-email-content', data),
    onSuccess: (content) => {
      setEmailContent(content);
      setIsGeneratingContent(false);
      toast({ title: "Personal email content generated successfully" });
    },
    onError: () => {
      setIsGeneratingContent(false);
      toast({ title: "Failed to generate personal email content", variant: "destructive" });
    }
  });

  // Send P2P email mutation
  const sendP2PEmailMutation = useMutation({
    mutationFn: ({ emailId, recipientEmail, recipientName, dryRun }: { 
      emailId: string; 
      recipientEmail: string;
      recipientName: string;
      dryRun?: boolean 
    }) => 
      apiRequest('POST', `/api/communications/${emailId}/send-p2p`, {
        recipientEmail,
        recipientName,
        visibility,
        dryRun: dryRun || false
      }),
    onSuccess: (data, { dryRun }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      
      if (dryRun) {
        toast({ 
          title: "Dry Run Complete", 
          description: "Email preview generated successfully. No email was actually sent.",
          variant: "default"
        });
      } else {
        toast({ 
          title: "Personal Email Sent", 
          description: `Email successfully sent to ${recipientName}.`
        });
      }
      
      setShowSendModal(false);
      setDistributionEmail(null);
    },
    onError: () => {
      toast({ title: "Failed to send personal email", variant: "destructive" });
    }
  });

  const handleStakeholderSelect = (stakeholder: any) => {
    setRecipientEmail(stakeholder.email || '');
    setRecipientName(stakeholder.name || '');
    setRecipientRole(stakeholder.role || '');
  };

  const handleGenerateP2PContent = () => {
    if (!currentProject || !recipientName) {
      toast({ title: "Please enter recipient name before generating content", variant: "destructive" });
      return;
    }
    
    setIsGeneratingContent(true);
    
    // Get selected RAID log context
    const raidLogContext = selectedRaidLogs.length > 0 
      ? raidLogs.filter((log: any) => selectedRaidLogs.includes(log.id))
      : [];
    
    generateP2PContentMutation.mutate({
      projectName: currentProject.name,
      recipientName,
      recipientRole,
      changeDescription: currentProject.description,
      communicationPurpose,
      keyMessages: ['Personal communication regarding change initiative'],
      raidLogContext,
      tone,
      urgency,
      relationship
    });
  };

  const handleSaveP2PEmail = () => {
    if (!emailContent.title || !emailContent.content) {
      toast({ title: "Please fill in subject and content", variant: "destructive" });
      return;
    }

    if (!recipientEmail || !recipientName) {
      toast({ title: "Please specify recipient details", variant: "destructive" });
      return;
    }

    // Modified to save AND send automatically
    createP2PEmailMutation.mutate({
      title: emailContent.title,
      content: emailContent.content,
      targetAudience: [recipientName],
      templateId: selectedTemplate?.id || null,
      raidLogReferences: selectedRaidLogs,
      isGptGenerated: isGeneratingContent,
      visibilitySettings: visibility,
      // Store recipient info in metadata
      metadata: {
        recipientEmail,
        recipientName,
        recipientRole,
        communicationPurpose,
        relationship,
        tone,
        urgency,
        senderEmail: user?.email // Store sender email for CC
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Person-to-Person Emails</span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={activeView === 'repository' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('repository')}
              data-testid="button-p2p-repository"
            >
              <Eye className="w-4 h-4 mr-2" />
              Repository
            </Button>
            <Button
              variant={activeView === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('create')}
              data-testid="button-p2p-create"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeView === 'repository' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Personal Email Repository</h3>
              <Button
                onClick={() => setActiveView('create')}
                data-testid="button-new-p2p-email"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Personal Email
              </Button>
            </div>
            
            <div className="grid gap-4">
              {communicationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : p2pEmails.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Personal Emails Created</h3>
                  <p className="text-muted-foreground mb-4">Create your first personal email to get started</p>
                  <Button onClick={() => setActiveView('create')} data-testid="button-create-first-p2p">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Personal Email
                  </Button>
                </div>
              ) : (
                p2pEmails.map((email: Communication) => (
                  <Card key={email.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{email.title}</h4>
                            <Badge variant={
                              email.visibilitySettings === 'private' ? 'destructive' :
                              email.visibilitySettings === 'team' ? 'default' : 'secondary'
                            }>
                              {email.visibilitySettings === 'private' ? 'Private' :
                               email.visibilitySettings === 'team' ? 'Team Visible' : 'Archived'}
                            </Badge>
                            <Badge variant={email.status === 'sent' ? 'default' : 'outline'}>
                              {email.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {email.content}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>To: {email.targetAudience?.join(', ') || 'Unknown'}</span>
                            <span>Created: {new Date(email.createdAt).toLocaleDateString()}</span>
                            {email.isGptGenerated && (
                              <Badge variant="outline">
                                <Bot className="w-3 h-3 mr-1" />
                                AI Generated
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentEmail(email);
                              setShowPreviewModal(true);
                            }}
                            data-testid={`button-preview-p2p-${email.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {email.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDistributionEmail(email);
                                setRecipientEmail(email.metadata?.recipientEmail || '');
                                setRecipientName(email.metadata?.recipientName || '');
                                setShowSendModal(true);
                              }}
                              data-testid={`button-send-p2p-${email.id}`}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'create' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Create Personal Email</h3>
              <Button
                variant="outline"
                onClick={() => setActiveView('repository')}
                data-testid="button-back-to-repository"
              >
                Back to Repository
              </Button>
            </div>

            {/* Recipient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Select Recipient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-email">Recipient Email</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      placeholder="Enter email address"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      data-testid="input-recipient-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-name">Recipient Name</Label>
                    <Input
                      id="recipient-name"
                      placeholder="Enter recipient name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      data-testid="input-recipient-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-role">Role (Optional)</Label>
                    <Input
                      id="recipient-role"
                      placeholder="e.g., Department Manager"
                      value={recipientRole}
                      onChange={(e) => setRecipientRole(e.target.value)}
                      data-testid="input-recipient-role"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship</Label>
                    <Select value={relationship} onValueChange={setRelationship}>
                      <SelectTrigger data-testid="select-relationship">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colleague">Colleague</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="stakeholder">Stakeholder</SelectItem>
                        <SelectItem value="external">External Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Stakeholder Quick Select */}
                {stakeholders.length > 0 && (
                  <div>
                    <Label className="text-sm">Or select from stakeholders:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {stakeholders.slice(0, 5).map((stakeholder: any) => (
                        <Button
                          key={stakeholder.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleStakeholderSelect(stakeholder)}
                          data-testid={`button-select-stakeholder-${stakeholder.id}`}
                        >
                          {stakeholder.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Communication Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Communication Settings</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Communication Purpose</Label>
                  <Select value={communicationPurpose} onValueChange={setCommunicationPurpose}>
                    <SelectTrigger data-testid="select-purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check_in">Check-in</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="request">Request</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="collaboration">Collaboration</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger data-testid="select-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger data-testid="select-urgency">
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
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Privacy & Visibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility Settings</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger data-testid="select-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private - Only visible to me</SelectItem>
                      <SelectItem value="team">Shared with Team - Visible to project team</SelectItem>
                      <SelectItem value="archive">Project Archive - Stored in project records</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {visibility === 'private' && "This email will only be visible to you and can be found in your personal communications."}
                    {visibility === 'team' && "This email will be visible to all project team members for transparency."}
                    {visibility === 'archive' && "This email will be archived with the project for future reference and reporting."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Content Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">4. Email Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Content Generation */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">AI-Powered Personal Email</h4>
                    <p className="text-sm text-muted-foreground">
                      Generate personalized email content tailored for one-on-one communication
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateP2PContent}
                    disabled={isGeneratingContent || !recipientName}
                    data-testid="button-generate-p2p-content"
                  >
                    {isGeneratingContent ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Generating...
                      </div>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        Generate Personal Email
                      </>
                    )}
                  </Button>
                </div>

                {/* Manual Content Entry */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-subject">Subject Line</Label>
                    <Input
                      id="email-subject"
                      placeholder="Enter email subject"
                      value={emailContent.title}
                      onChange={(e) => setEmailContent(prev => ({ ...prev, title: e.target.value }))}
                      data-testid="input-email-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-content">Email Content</Label>
                    <Textarea
                      id="email-content"
                      placeholder="Write your personal email message..."
                      value={emailContent.content}
                      onChange={(e) => setEmailContent(prev => ({ ...prev, content: e.target.value }))}
                      rows={8}
                      data-testid="textarea-email-content"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="call-to-action">Call to Action (Optional)</Label>
                    <Input
                      id="call-to-action"
                      placeholder="What should the recipient do next?"
                      value={emailContent.callToAction}
                      onChange={(e) => setEmailContent(prev => ({ ...prev, callToAction: e.target.value }))}
                      data-testid="input-call-to-action"
                    />
                  </div>
                </div>

                {/* RAID Log Integration */}
                {raidLogs.length > 0 && (
                  <div className="space-y-2">
                    <Label>Include RAID Log Context (Optional)</Label>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {raidLogs.map((log: any) => (
                        <div key={log.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedRaidLogs.includes(log.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRaidLogs(prev => [...prev, log.id]);
                              } else {
                                setSelectedRaidLogs(prev => prev.filter(id => id !== log.id));
                              }
                            }}
                            data-testid={`checkbox-raid-log-${log.id}`}
                          />
                          <span className="text-sm">{log.type.toUpperCase()}: {log.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailContent({ title: '', content: '', callToAction: '' });
                      setSelectedRaidLogs([]);
                    }}
                    data-testid="button-clear-content"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleSaveP2PEmail}
                    disabled={!emailContent.title || !emailContent.content || !recipientEmail}
                    data-testid="button-save-p2p-email"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Personal Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Send P2P Email Modal */}
        <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Personal Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{recipientName}</p>
                  <p className="text-sm text-muted-foreground">{recipientEmail}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <p className="text-sm">{distributionEmail?.title}</p>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Badge variant={
                  visibility === 'private' ? 'destructive' :
                  visibility === 'team' ? 'default' : 'secondary'
                }>
                  {visibility === 'private' ? 'Private' :
                   visibility === 'team' ? 'Team Visible' : 'Archived'}
                </Badge>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSendModal(false)}
                  data-testid="button-cancel-send"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (distributionEmail) {
                      sendP2PEmailMutation.mutate({
                        emailId: distributionEmail.id,
                        recipientEmail,
                        recipientName,
                        dryRun: true
                      });
                    }
                  }}
                  data-testid="button-preview-send"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={() => {
                    if (distributionEmail) {
                      sendP2PEmailMutation.mutate({
                        emailId: distributionEmail.id,
                        recipientEmail,
                        recipientName,
                        dryRun: false
                      });
                    }
                  }}
                  data-testid="button-confirm-send"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            {currentEmail && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <p className="font-medium">{currentEmail.title}</p>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {currentEmail.content}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Metadata</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>Purpose: {currentEmail.metadata?.communicationPurpose || 'N/A'}</span>
                    <span>Tone: {currentEmail.metadata?.tone || 'N/A'}</span>
                    <span>Urgency: {currentEmail.metadata?.urgency || 'N/A'}</span>
                    <span>Relationship: {currentEmail.metadata?.relationship || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreviewModal(false)}
                    data-testid="button-close-preview"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Meetings Execution Module Component
function MeetingsExecutionModule() {
  const { currentProject } = useCurrentProject();
  const [activeView, setActiveView] = useState<'repository' | 'create' | 'manage'>('repository');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<Communication | null>(null);
  const [isGeneratingAgenda, setIsGeneratingAgenda] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRaidLogs, setSelectedRaidLogs] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch users for participant selection
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users']
  });

  // Fetch stakeholders for participant selection in meetings
  const { data: meetingStakeholders = [], isLoading: meetingStakeholdersLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id
  });

  // Fetch RAID logs for context integration in meetings
  const { data: meetingRaidLogs = [], isLoading: meetingRaidLogsLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'raid-logs'],
    enabled: !!currentProject?.id
  });

  // Meeting form state - 5Ws Capture System
  const [meetingWho, setMeetingWho] = useState<{ participants: Array<{ name: string; role: string; email?: string }> }>({
    participants: []
  });
  const [externalParticipantName, setExternalParticipantName] = useState('');
  const [externalParticipantEmail, setExternalParticipantEmail] = useState('');
  const [externalParticipantRole, setExternalParticipantRole] = useState('');
  const [activeParticipantTab, setActiveParticipantTab] = useState('stakeholders');
  const [meetingWhat, setMeetingWhat] = useState({
    title: '',
    purpose: '',
    objectives: [] as string[],
    expectedOutcomes: ''
  });
  const [meetingWhen, setMeetingWhen] = useState({
    date: '',
    time: '',
    duration: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [meetingWhere, setMeetingWhere] = useState({
    locationType: 'virtual' as 'physical' | 'virtual' | 'hybrid',
    physicalAddress: '',
    virtualLink: '',
    dialInDetails: ''
  });
  const [meetingWhy, setMeetingWhy] = useState({
    context: '',
    urgency: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    projectRelation: '',
    decisionRequired: false
  });

  // Generated agenda state
  const [generatedAgenda, setGeneratedAgenda] = useState<{
    agenda: Array<{
      item: string;
      timeAllocation: number;
      owner: string;
      type: string;
    }>;
    meetingStructure: {
      opening: string;
      mainTopics: string[];
      closing: string;
    };
    preparationNotes: string[];
    bestPractices: string[];
  } | null>(null);

  // Meeting type
  const [meetingType, setMeetingType] = useState<'status' | 'planning' | 'review' | 'decision' | 'brainstorming'>('status');

  // Fetch communications filtered for meetings
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id
  });

  const meetings = communications.filter((comm: Communication) => comm.type === 'meeting');

  // Fetch stakeholders for participant selection
  const { data: stakeholders = [], isLoading: stakeholdersLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id
  });

  // Fetch RAID logs for context integration
  const { data: raidLogs = [], isLoading: raidLogsLoading } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'raid-logs'],
    enabled: !!currentProject?.id
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/projects/${currentProject?.id}/communications`, {
      ...data,
      type: 'meeting',
      status: 'draft'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      toast({ title: "Meeting created successfully" });
      setShowCreateModal(false);
      resetMeetingForm();
    },
    onError: () => {
      toast({ title: "Failed to create meeting", variant: "destructive" });
    }
  });

  // Generate meeting agenda mutation
  const generateAgendaMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/gpt/generate-meeting-agenda', data),
    onSuccess: (agendaData) => {
      setGeneratedAgenda(agendaData);
      setIsGeneratingAgenda(false);
      toast({ title: "Meeting agenda generated successfully" });
    },
    onError: () => {
      setIsGeneratingAgenda(false);
      toast({ title: "Failed to generate meeting agenda", variant: "destructive" });
    }
  });

  // Send meeting invites mutation
  const sendInvitesMutation = useMutation({
    mutationFn: ({ meetingId, recipients, meetingData, dryRun }: {
      meetingId: string;
      recipients: Array<{ email: string; name: string; role?: string }>;
      meetingData: any;
      dryRun?: boolean;
    }) => apiRequest('POST', `/api/communications/${meetingId}/send-meeting-invites`, {
      recipients, meetingData, dryRun: dryRun || false
    }),
    onSuccess: (data, { dryRun }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'communications'] });
      
      if (dryRun) {
        toast({ 
          title: "Dry Run Complete", 
          description: "Meeting invites preview generated successfully. No invites were actually sent.",
          variant: "default"
        });
      } else {
        toast({ 
          title: "Meeting Invites Sent", 
          description: `Invites successfully sent to ${data.distributionResult?.sent || 0} participants.`
        });
      }
      
      setShowInviteModal(false);
      setCurrentMeeting(null);
    },
    onError: () => {
      toast({ title: "Failed to send meeting invites", variant: "destructive" });
    }
  });

  const handleAddExternalParticipant = () => {
    if (!externalParticipantName.trim() || !externalParticipantEmail.trim()) {
      toast({ title: "Please enter both name and email for external participant", variant: "destructive" });
      return;
    }

    // Check if participant already exists
    const exists = meetingWho.participants.some(
      p => p.email === externalParticipantEmail.trim() || 
      (p.name === externalParticipantName.trim() && !p.email)
    );

    if (exists) {
      toast({ title: "Participant already added", variant: "destructive" });
      return;
    }

    setMeetingWho(prev => ({
      participants: [...prev.participants, {
        name: externalParticipantName.trim(),
        role: externalParticipantRole.trim() || 'External Participant',
        email: externalParticipantEmail.trim()
      }]
    }));

    // Clear form
    setExternalParticipantName('');
    setExternalParticipantEmail('');
    setExternalParticipantRole('');
    
    toast({ title: "External participant added successfully" });
  };

  const resetMeetingForm = () => {
    setMeetingWho({ participants: [] });
    setMeetingWhat({ title: '', purpose: '', objectives: [], expectedOutcomes: '' });
    setMeetingWhen({ date: '', time: '', duration: 60, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    setMeetingWhere({ locationType: 'virtual', physicalAddress: '', virtualLink: '', dialInDetails: '' });
    setMeetingWhy({ context: '', urgency: 'normal', projectRelation: '', decisionRequired: false });
    setGeneratedAgenda(null);
    setSelectedRaidLogs([]);
    setExternalParticipantName('');
    setExternalParticipantEmail('');
    setExternalParticipantRole('');
    setActiveParticipantTab('stakeholders');
  };

  const handleGenerateAgenda = () => {
    if (!meetingWhat.title || !meetingWhat.purpose || meetingWho.participants.length === 0) {
      toast({ title: "Please fill in meeting basics before generating agenda", variant: "destructive" });
      return;
    }

    setIsGeneratingAgenda(true);
    
    const agendaData = {
      projectName: currentProject?.name || 'Project',
      meetingType,
      meetingPurpose: meetingWhat.purpose,
      duration: meetingWhen.duration,
      participants: meetingWho.participants,
      objectives: meetingWhat.objectives,
      raidLogContext: selectedRaidLogs.map(id => {
        const raidLog = meetingRaidLogs.find((log: any) => log.id === id);
        return raidLog ? {
          id: raidLog.id,
          title: raidLog.title,
          type: raidLog.type,
          description: raidLog.description
        } : null;
      }).filter(Boolean)
    };

    generateAgendaMutation.mutate(agendaData);
  };

  const handleCreateMeeting = () => {
    if (!meetingWhat.title || !meetingWhat.purpose || !meetingWhen.date || !meetingWhen.time) {
      toast({ title: "Please fill in all required meeting details", variant: "destructive" });
      return;
    }

    const meetingData = {
      title: meetingWhat.title,
      content: meetingWhat.purpose,
      targetAudience: meetingWho.participants.map(p => p.name),
      meetingWhen: new Date(`${meetingWhen.date}T${meetingWhen.time}`),
      meetingWhere: meetingWhere.locationType === 'physical' ? meetingWhere.physicalAddress : 
                   meetingWhere.locationType === 'virtual' ? meetingWhere.virtualLink :
                   `${meetingWhere.physicalAddress} / ${meetingWhere.virtualLink}`,
      meetingDuration: meetingWhen.duration,
      meetingTimezone: meetingWhen.timezone,
      meetingType,
      meetingObjectives: meetingWhat.objectives,
      meetingAgenda: generatedAgenda?.agenda || [],
      meetingParticipants: meetingWho.participants,
      meetingContext: meetingWhy.context,
      meetingUrgency: meetingWhy.urgency
    };

    createMeetingMutation.mutate(meetingData);
  };

  const handleSendInvites = (meeting: Communication) => {
    if (!meeting.meetingParticipants || meeting.meetingParticipants.length === 0) {
      toast({ title: "No participants found for this meeting", variant: "destructive" });
      return;
    }

    const startTime = meeting.meetingWhen ? new Date(meeting.meetingWhen) : new Date();
    const endTime = new Date(startTime.getTime() + (meeting.meetingDuration || 60) * 60000);

    const meetingData = {
      title: meeting.title,
      description: meeting.content || '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: meeting.meetingWhere || 'TBD',
      organizerName: 'Meeting Organizer', // Should be current user name
      organizerEmail: 'organizer@changemanagement.com', // Should be current user email
      agenda: meeting.meetingAgenda || [],
      preparation: meeting.meetingPreparation,
      projectName: currentProject?.name || 'Project'
    };

    const recipients = meeting.meetingParticipants.map((p: any) => ({
      email: p.email || `${p.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      name: p.name,
      role: p.role
    }));

    sendInvitesMutation.mutate({
      meetingId: meeting.id,
      recipients,
      meetingData,
      dryRun: false
    });
  };

  const filteredMeetings = meetings.filter((meeting: Communication) => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || meeting.meetingType === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Card className="border-2 border-red-100" data-testid="meetings-execution-module">
      <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-red-800">Meeting Management</CardTitle>
              <p className="text-red-600 text-sm">AI-powered meeting planning and execution</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            {meetings.length} Meetings
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" data-testid="create-tab" className="flex items-center space-x-2">
              <CalendarPlus className="h-4 w-4" />
              <span>Create</span>
            </TabsTrigger>
            <TabsTrigger value="repository" data-testid="repository-tab" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Repository</span>
            </TabsTrigger>
            <TabsTrigger value="manage" data-testid="manage-tab" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Manage</span>
            </TabsTrigger>
          </TabsList>

          {/* Meeting Repository View */}
          <TabsContent value="repository" className="space-y-6" data-testid="repository-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Input 
                  placeholder="Search meetings..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                  data-testid="search-meetings"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48" data-testid="category-filter">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="status">Status Meetings</SelectItem>
                    <SelectItem value="planning">Planning Meetings</SelectItem>
                    <SelectItem value="review">Review Meetings</SelectItem>
                    <SelectItem value="decision">Decision Meetings</SelectItem>
                    <SelectItem value="brainstorming">Brainstorming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communicationsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </Card>
                ))
              ) : filteredMeetings.length > 0 ? (
                filteredMeetings.map((meeting: Communication) => (
                  <Card key={meeting.id} className="p-4 hover:shadow-md transition-shadow" data-testid={`meeting-card-${meeting.id}`}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm truncate" data-testid={`meeting-title-${meeting.id}`}>
                          {meeting.title}
                        </h4>
                        <Badge 
                          variant={meeting.status === 'sent' ? 'default' : 'secondary'}
                          className="text-xs"
                          data-testid={`meeting-status-${meeting.id}`}
                        >
                          {meeting.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-xs text-gray-600">
                        {meeting.meetingWhen && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span data-testid={`meeting-time-${meeting.id}`}>
                              {new Date(meeting.meetingWhen).toLocaleDateString()} at {new Date(meeting.meetingWhen).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate" data-testid={`meeting-location-${meeting.id}`}>
                            {meeting.meetingWhere || 'Location TBD'}
                          </span>
                        </div>
                        
                        {meeting.meetingParticipants && (
                          <div className="flex items-center space-x-1">
                            <Users2 className="h-3 w-3" />
                            <span data-testid={`meeting-participants-${meeting.id}`}>
                              {meeting.meetingParticipants.length} participants
                            </span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1">
                          <Timer className="h-3 w-3" />
                          <span data-testid={`meeting-duration-${meeting.id}`}>
                            {meeting.meetingDuration || 60} minutes
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentMeeting(meeting);
                            setShowAgendaModal(true);
                          }}
                          data-testid={`view-agenda-${meeting.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        {meeting.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvites(meeting)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            data-testid={`send-invites-${meeting.id}`}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Send Invites
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500" data-testid="no-meetings-message">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No meetings found</p>
                  <p className="text-sm">Create your first meeting to get started</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Meeting Creation View - 5Ws Capture System */}
          <TabsContent value="create" className="space-y-6" data-testid="create-meeting-content">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Schedule New Meeting</h3>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      onClick={handleGenerateAgenda}
                      disabled={isGeneratingAgenda || !meetingWhat.purpose}
                      data-testid="generate-agenda-button"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      {isGeneratingAgenda ? 'Generating...' : 'AI Agenda'}
                    </Button>
                    <Button 
                      onClick={handleCreateMeeting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      data-testid="create-meeting-submit"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  </div>
                </div>

                {/* 5Ws Meeting Capture System */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* WHO - Participants */}
                  <Card className="p-4 border-blue-200 bg-blue-50">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Users2 className="h-5 w-5 text-blue-600" />
                        <h4 className="font-medium text-blue-800">WHO - Participants</h4>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Meeting Type</Label>
                        <Select value={meetingType} onValueChange={(value: any) => setMeetingType(value)}>
                          <SelectTrigger data-testid="meeting-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="status">Status Meeting</SelectItem>
                            <SelectItem value="planning">Planning Meeting</SelectItem>
                            <SelectItem value="review">Review Meeting</SelectItem>
                            <SelectItem value="decision">Decision Meeting</SelectItem>
                            <SelectItem value="brainstorming">Brainstorming Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label>Add Participants</Label>
                        
                        <Tabs value={activeParticipantTab} onValueChange={setActiveParticipantTab} className="space-y-3">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="users" data-testid="tab-users">
                              Users
                            </TabsTrigger>
                            <TabsTrigger value="stakeholders" data-testid="tab-stakeholders">
                              Stakeholders
                            </TabsTrigger>
                            <TabsTrigger value="external" data-testid="tab-external">
                              External
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="users" className="space-y-2">
                            {usersLoading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {users.map((user: any) => (
                                  <div key={user.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={meetingWho.participants.some(p => p.email === (user.email || `${user.username}@company.com`))}
                                      onCheckedChange={(checked) => {
                                        const userEmail = user.email || `${user.username}@company.com`;
                                        if (checked) {
                                          setMeetingWho(prev => ({
                                            participants: [...prev.participants, {
                                              name: user.name,
                                              role: 'Team Member',
                                              email: userEmail
                                            }]
                                          }));
                                        } else {
                                          setMeetingWho(prev => ({
                                            participants: prev.participants.filter(p => p.email !== userEmail)
                                          }));
                                        }
                                      }}
                                      data-testid={`user-checkbox-${user.id}`}
                                    />
                                    <span className="text-sm">{user.name} ({user.username})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="stakeholders" className="space-y-2">
                            {meetingStakeholdersLoading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {meetingStakeholders.map((stakeholder: Stakeholder) => (
                                  <div key={stakeholder.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={meetingWho.participants.some(p => p.email === stakeholder.email)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setMeetingWho(prev => ({
                                            participants: [...prev.participants, {
                                              name: stakeholder.name,
                                              role: stakeholder.role,
                                              email: stakeholder.email
                                            }]
                                          }));
                                        } else {
                                          setMeetingWho(prev => ({
                                            participants: prev.participants.filter(p => p.email !== stakeholder.email)
                                          }));
                                        }
                                      }}
                                      data-testid={`stakeholder-checkbox-${stakeholder.id}`}
                                    />
                                    <span className="text-sm">{stakeholder.name} ({stakeholder.role})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="external" className="space-y-3">
                            <div className="space-y-2">
                              <Input
                                placeholder="Participant name"
                                value={externalParticipantName}
                                onChange={(e) => setExternalParticipantName(e.target.value)}
                                data-testid="input-external-name"
                              />
                              <Input
                                placeholder="Participant email"
                                type="email"
                                value={externalParticipantEmail}
                                onChange={(e) => setExternalParticipantEmail(e.target.value)}
                                data-testid="input-external-email"
                              />
                              <Input
                                placeholder="Role (optional)"
                                value={externalParticipantRole}
                                onChange={(e) => setExternalParticipantRole(e.target.value)}
                                data-testid="input-external-role"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddExternalParticipant}
                                data-testid="button-add-external"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add External Participant
                              </Button>
                            </div>
                          </TabsContent>
                        </Tabs>

                        {/* Selected participants list */}
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 font-medium">
                            Selected: {meetingWho.participants.length} participants
                          </div>
                          {meetingWho.participants.length > 0 && (
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {meetingWho.participants.map((participant, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                                  <span>
                                    {participant.name} ({participant.role})
                                    {participant.email && <span className="text-gray-500 ml-1">- {participant.email}</span>}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setMeetingWho(prev => ({
                                        participants: prev.participants.filter((_, i) => i !== index)
                                      }));
                                    }}
                                    data-testid={`remove-participant-${index}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* WHAT - Purpose & Objectives */}
                  <Card className="p-4 border-green-200 bg-green-50">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-800">WHAT - Purpose & Objectives</h4>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Meeting Title *</Label>
                        <Input
                          value={meetingWhat.title}
                          onChange={(e) => setMeetingWhat(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter meeting title"
                          data-testid="meeting-title-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Meeting Purpose *</Label>
                        <Textarea
                          value={meetingWhat.purpose}
                          onChange={(e) => setMeetingWhat(prev => ({ ...prev, purpose: e.target.value }))}
                          placeholder="Describe the main purpose of this meeting"
                          rows={3}
                          data-testid="meeting-purpose-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Objectives</Label>
                        <div className="space-y-2">
                          {meetingWhat.objectives.map((objective, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={objective}
                                onChange={(e) => {
                                  const newObjectives = [...meetingWhat.objectives];
                                  newObjectives[index] = e.target.value;
                                  setMeetingWhat(prev => ({ ...prev, objectives: newObjectives }));
                                }}
                                placeholder={`Objective ${index + 1}`}
                                data-testid={`objective-input-${index}`}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newObjectives = meetingWhat.objectives.filter((_, i) => i !== index);
                                  setMeetingWhat(prev => ({ ...prev, objectives: newObjectives }));
                                }}
                                data-testid={`remove-objective-${index}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMeetingWhat(prev => ({ ...prev, objectives: [...prev.objectives, ''] }))}
                            data-testid="add-objective"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Objective
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* WHEN - Date & Time */}
                  <Card className="p-4 border-purple-200 bg-purple-50">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <h4 className="font-medium text-purple-800">WHEN - Date & Time</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date *</Label>
                          <Input
                            type="date"
                            value={meetingWhen.date}
                            onChange={(e) => setMeetingWhen(prev => ({ ...prev, date: e.target.value }))}
                            data-testid="meeting-date-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Time *</Label>
                          <Input
                            type="time"
                            value={meetingWhen.time}
                            onChange={(e) => setMeetingWhen(prev => ({ ...prev, time: e.target.value }))}
                            data-testid="meeting-time-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Select 
                            value={meetingWhen.duration.toString()} 
                            onValueChange={(value) => setMeetingWhen(prev => ({ ...prev, duration: parseInt(value) }))}
                          >
                            <SelectTrigger data-testid="meeting-duration-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="45">45 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="90">1.5 hours</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                              <SelectItem value="180">3 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Timezone</Label>
                          <Input
                            value={meetingWhen.timezone}
                            onChange={(e) => setMeetingWhen(prev => ({ ...prev, timezone: e.target.value }))}
                            placeholder="Timezone"
                            data-testid="meeting-timezone-input"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* WHERE - Location */}
                  <Card className="p-4 border-orange-200 bg-orange-50">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-orange-600" />
                        <h4 className="font-medium text-orange-800">WHERE - Location</h4>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Location Type</Label>
                        <Select 
                          value={meetingWhere.locationType} 
                          onValueChange={(value: any) => setMeetingWhere(prev => ({ ...prev, locationType: value }))}
                        >
                          <SelectTrigger data-testid="location-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">Physical Location</SelectItem>
                            <SelectItem value="virtual">Virtual Meeting</SelectItem>
                            <SelectItem value="hybrid">Hybrid (Physical + Virtual)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(meetingWhere.locationType === 'physical' || meetingWhere.locationType === 'hybrid') && (
                        <div className="space-y-2">
                          <Label>Physical Address</Label>
                          <Textarea
                            value={meetingWhere.physicalAddress}
                            onChange={(e) => setMeetingWhere(prev => ({ ...prev, physicalAddress: e.target.value }))}
                            placeholder="Enter physical meeting location"
                            rows={2}
                            data-testid="physical-address-input"
                          />
                        </div>
                      )}

                      {(meetingWhere.locationType === 'virtual' || meetingWhere.locationType === 'hybrid') && (
                        <div className="space-y-2">
                          <Label>Virtual Meeting Link</Label>
                          <Input
                            value={meetingWhere.virtualLink}
                            onChange={(e) => setMeetingWhere(prev => ({ ...prev, virtualLink: e.target.value }))}
                            placeholder="Teams, Zoom, or other virtual meeting link"
                            data-testid="virtual-link-input"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Dial-in Details (Optional)</Label>
                        <Textarea
                          value={meetingWhere.dialInDetails}
                          onChange={(e) => setMeetingWhere(prev => ({ ...prev, dialInDetails: e.target.value }))}
                          placeholder="Phone number, access codes, etc."
                          rows={2}
                          data-testid="dial-in-details-input"
                        />
                      </div>
                    </div>
                  </Card>

                  {/* WHY - Context & RAID Integration */}
                  <Card className="p-4 border-red-200 bg-red-50 lg:col-span-2">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h4 className="font-medium text-red-800">WHY - Context & Integration</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Meeting Context</Label>
                          <Textarea
                            value={meetingWhy.context}
                            onChange={(e) => setMeetingWhy(prev => ({ ...prev, context: e.target.value }))}
                            placeholder="Background information, previous discussions, etc."
                            rows={3}
                            data-testid="meeting-context-input"
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Urgency Level</Label>
                            <Select 
                              value={meetingWhy.urgency} 
                              onValueChange={(value: any) => setMeetingWhy(prev => ({ ...prev, urgency: value }))}
                            >
                              <SelectTrigger data-testid="meeting-urgency-select">
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

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={meetingWhy.decisionRequired}
                              onCheckedChange={(checked) => setMeetingWhy(prev => ({ ...prev, decisionRequired: !!checked }))}
                              data-testid="decision-required-checkbox"
                            />
                            <Label>Decision Required</Label>
                          </div>
                        </div>
                      </div>

                      {/* RAID Logs Integration */}
                      {!raidLogsLoading && raidLogs.length > 0 && (
                        <div className="space-y-2">
                          <Label>Related RAID Items (Optional)</Label>
                          <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                            {raidLogs.map((raidLog: any) => (
                              <div key={raidLog.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={selectedRaidLogs.includes(raidLog.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRaidLogs(prev => [...prev, raidLog.id]);
                                    } else {
                                      setSelectedRaidLogs(prev => prev.filter(id => id !== raidLog.id));
                                    }
                                  }}
                                  data-testid={`raid-checkbox-${raidLog.id}`}
                                />
                                <span className="text-sm">
                                  <Badge variant="outline" className="mr-1">{raidLog.type}</Badge>
                                  {raidLog.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Generated Agenda Display */}
                {generatedAgenda && (
                  <Card className="p-4 border-green-200 bg-green-50">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-800">AI-Generated Meeting Agenda</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2">Agenda Items</h5>
                            <div className="space-y-2">
                              {generatedAgenda.agenda.map((item, index) => (
                                <div key={index} className="bg-white p-2 rounded border">
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">{item.item}</span>
                                    <Badge variant="outline" className="text-xs">{item.timeAllocation}min</Badge>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Owner: {item.owner} | Type: {item.type}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <h5 className="font-medium mb-2">Meeting Structure</h5>
                              <div className="bg-white p-2 rounded border text-sm">
                                <div><strong>Opening:</strong> {generatedAgenda.meetingStructure.opening}</div>
                                <div className="mt-1"><strong>Main Topics:</strong> {generatedAgenda.meetingStructure.mainTopics.join(', ')}</div>
                                <div className="mt-1"><strong>Closing:</strong> {generatedAgenda.meetingStructure.closing}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium mb-2">Preparation Notes</h5>
                              <div className="bg-white p-2 rounded border text-sm">
                                <ul className="list-disc pl-4 space-y-1">
                                  {generatedAgenda.preparationNotes.map((note, index) => (
                                    <li key={index}>{note}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Best Practices</h5>
                          <div className="bg-white p-2 rounded border text-sm">
                            <ul className="list-disc pl-4 space-y-1">
                              {generatedAgenda.bestPractices.map((practice, index) => (
                                <li key={index}>{practice}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Meeting Management View */}
          <TabsContent value="manage" className="space-y-6" data-testid="manage-meetings-content">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Meeting Management</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <h4 className="font-medium">Total Meetings</h4>
                    <p className="text-2xl font-bold text-red-600">{meetings.length}</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h4 className="font-medium">Completed</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {meetings.filter((m: Communication) => m.status === 'sent').length}
                    </p>
                  </Card>
                  <Card className="p-4 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <h4 className="font-medium">Pending</h4>
                    <p className="text-2xl font-bold text-yellow-600">
                      {meetings.filter((m: Communication) => m.status === 'draft').length}
                    </p>
                  </Card>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <p>Meeting analytics and management features coming soon</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

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
    mutationFn: (data: any) => apiRequest('POST', `/api/projects/${currentProject?.id}/communications`, {
      ...data,
      type: 'group_email',
      status: 'draft'
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
    mutationFn: (data: any) => apiRequest('POST', '/api/gpt/generate-group-email-content', data),
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
      apiRequest('POST', `/api/communications/${emailId}/distribute`, {
        distributionMethod: 'email',
        recipients,
        dryRun: dryRun || false
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
    mutationFn: (templateId: string) => apiRequest('POST', `/api/communication-templates/${templateId}/usage`),
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
    mutationFn: (data: any) => apiRequest('POST', `/api/projects/${currentProject?.id}/communications`, {
      ...data,
      type: 'flyer',
      status: 'draft'
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
    mutationFn: (data: any) => apiRequest('POST', '/api/gpt/generate-flyer-content', data),
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
    mutationFn: (templateId: string) => apiRequest('POST', `/api/communication-templates/${templateId}/usage`),
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
      apiRequest('POST', `/api/communications/${flyerId}/distribute`, {
        distributionMethod: method,
        recipients: recipients || [],
        dryRun: dryRun || false
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
      apiRequest('POST', `/api/communications/${flyerId}/export`, {
        format
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
    queryFn: () => apiRequest('POST', '/api/gpt/phase-guidance', {
      projectId: currentProject?.id,
      phase: selectedPhase,
      projectName: currentProject?.name,
      description: currentProject?.description,
      currentPhase: currentProject?.currentPhase || 'identify_need'
    }),
    enabled: !!currentProject?.id && showGuidanceModal
  });

  const createStrategyMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/projects/${currentProject?.id}/communication-strategies`, data),
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
      const guidance = await apiRequest('POST', '/api/gpt/phase-guidance', {
        projectId: currentProject.id,
        phase: selectedPhase,
        projectName: currentProject.name,
        description: currentProject.description,
        currentPhase: currentProject.currentPhase || 'identify_need'
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="strategy" data-testid="tab-strategy">
                Strategy
              </TabsTrigger>
              <TabsTrigger value="execution" data-testid="tab-execution">
                Execution
              </TabsTrigger>
              <TabsTrigger value="repository" data-testid="tab-repository">
                <Archive className="w-4 h-4 mr-2" />
                Repository
              </TabsTrigger>
            </TabsList>

            {/* Strategy Tab Content */}
            <TabsContent value="strategy" className="space-y-6" data-testid="strategy-content">
              <PhaseGuidance />
              <StakeholderMapping />
              <ResistanceIdentification />
              <ChannelPreferences />
            </TabsContent>

            {/* Execution Tab Content (Meetings, P2P Emails, Group Emails, and Flyers Implementation) */}
            <TabsContent value="execution" className="space-y-6" data-testid="execution-content">
              <div className="space-y-6">
                <MeetingsExecutionModule />
                <P2PEmailsExecutionModule />
                <GroupEmailsExecutionModule />
                <FlyersExecutionModule />
              </div>
            </TabsContent>

            {/* Repository Tab Content - Unified Archive and Search System */}
            <TabsContent value="repository" className="space-y-6" data-testid="repository-content">
              <CommunicationRepository
                onCreateNew={(type) => {
                  // Switch to execution tab and trigger creation based on type
                  setActiveTab("execution");
                  // You could add specific handlers here for different communication types
                }}
                onViewCommunication={(communication) => {
                  // Handle viewing/editing a communication
                  console.log("Viewing communication:", communication);
                  // You could open a modal or navigate to edit view
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}