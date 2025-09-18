import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Send
} from "lucide-react";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";

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
              {/* Phase Guidance Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Phase Guidance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                          Phase 1
                        </Badge>
                        <span className="text-sm font-medium">Awareness</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Build initial awareness and understanding of the change
                      </p>
                      <div className="flex items-center space-x-1 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Weeks 1-2</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                          Phase 2
                        </Badge>
                        <span className="text-sm font-medium">Engagement</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Actively engage stakeholders and gather feedback
                      </p>
                      <div className="flex items-center space-x-1 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Weeks 3-6</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                          Phase 3
                        </Badge>
                        <span className="text-sm font-medium">Reinforcement</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reinforce adoption and celebrate successes
                      </p>
                      <div className="flex items-center space-x-1 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Weeks 7+</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-view-phase-details">
                    <Eye className="w-3 h-3 mr-1" />
                    View Detailed Guidance
                  </Button>
                </CardContent>
              </Card>

              {/* Stakeholder Mapping Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Stakeholder Mapping</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">High Influence, High Interest</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3" />
                            <span className="text-xs">Executive Sponsors</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">4 stakeholders</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3" />
                            <span className="text-xs">Department Heads</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">8 stakeholders</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Communication Frequency</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Weekly Updates</span>
                          <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">12 stakeholders</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Bi-weekly Updates</span>
                          <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">25 stakeholders</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Monthly Updates</span>
                          <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">45 stakeholders</Badge>
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

              {/* Resistance Identification Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Resistance Identification</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Potential Resistance Sources</h4>
                      <div className="space-y-2">
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span className="text-xs font-medium text-red-800">High Risk</span>
                          </div>
                          <p className="text-xs text-red-700">Fear of job security changes</p>
                          <p className="text-xs text-muted-foreground mt-1">Affects: Operations team</p>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className="w-3 h-3 text-yellow-600" />
                            <span className="text-xs font-medium text-yellow-800">Medium Risk</span>
                          </div>
                          <p className="text-xs text-yellow-700">Increased workload during transition</p>
                          <p className="text-xs text-muted-foreground mt-1">Affects: All departments</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Mitigation Strategies</h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium">Transparent Communication</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Regular updates on job security</p>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium">Support Resources</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Additional training and assistance</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-add-resistance-factor">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Resistance Factor
                  </Button>
                </CardContent>
              </Card>

              {/* Channel Preferences Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Channel Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Preferred Channels by Audience</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3 h-3 text-blue-600" />
                            <span className="text-xs">Email</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Executives</Badge>
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3 h-3 text-green-600" />
                            <span className="text-xs">Town Halls</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">All Staff</Badge>
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center space-x-2">
                            <Megaphone className="w-3 h-3 text-purple-600" />
                            <span className="text-xs">Digital Displays</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">Operations</Badge>
                            <TrendingUp className="w-3 h-3 text-yellow-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Channel Effectiveness</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Face-to-face meetings</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-green-600 dark:bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                            <span className="text-green-600 font-medium">85%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Company-wide emails</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                            <span className="text-blue-600 font-medium">70%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Digital signage</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-yellow-600 dark:bg-yellow-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <span className="text-yellow-600 font-medium">45%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-configure-channels">
                    <Settings className="w-3 h-3 mr-1" />
                    Configure Channel Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Execution Tab Content */}
            <TabsContent value="execution" className="space-y-6" data-testid="execution-content">
              {/* Flyers Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Megaphone className="w-4 h-4" />
                    <span>Flyers & Posters</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">Change Announcement</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Initial awareness flyer for all staff</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
                          Draft
                        </Badge>
                        <span className="text-xs text-muted-foreground">Due: Next week</span>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" data-testid="button-edit-flyer-1">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" data-testid="button-preview-flyer-1">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Benefits Overview</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Key benefits and value proposition</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
                          Approved
                        </Badge>
                        <span className="text-xs text-muted-foreground">Ready to print</span>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" data-testid="button-edit-flyer-2">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" data-testid="button-print-flyer-2">
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center space-y-2">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <Button variant="outline" size="sm" data-testid="button-create-flyer">
                        Create New Flyer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Group Emails Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>Group Emails</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium">All Staff Announcement</div>
                          <div className="text-xs text-muted-foreground">Company-wide change introduction</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">582 recipients</Badge>
                            <span className="text-xs text-muted-foreground">Scheduled: Tomorrow 9:00 AM</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">Scheduled</Badge>
                        <Button size="sm" variant="outline" data-testid="button-edit-group-email-1">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-sm font-medium">Department Heads Update</div>
                          <div className="text-xs text-muted-foreground">Leadership briefing and expectations</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">12 recipients</Badge>
                            <span className="text-xs text-muted-foreground">Sent: 2 days ago</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">Sent</Badge>
                        <Button size="sm" variant="outline" data-testid="button-view-group-email-2">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-create-group-email">
                    <Plus className="w-3 h-3 mr-1" />
                    Create Group Email
                  </Button>
                </CardContent>
              </Card>

              {/* P2P Emails Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Point-to-Point Emails</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Key Stakeholder Communications</h4>
                      <div className="space-y-2">
                        <div className="p-2 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">CEO Personal Brief</div>
                              <div className="text-xs text-muted-foreground">Executive summary and timeline</div>
                            </div>
                            <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">Sent</Badge>
                          </div>
                        </div>
                        <div className="p-2 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">Union Representative</div>
                              <div className="text-xs text-muted-foreground">Impact assessment and concerns</div>
                            </div>
                            <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs">Draft</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Follow-up Communications</h4>
                      <div className="space-y-2">
                        <div className="p-2 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">Training Coordinators</div>
                              <div className="text-xs text-muted-foreground">Training schedule and resources</div>
                            </div>
                            <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">Scheduled</Badge>
                          </div>
                        </div>
                        <div className="p-2 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">IT Support Leads</div>
                              <div className="text-xs text-muted-foreground">Technical readiness checklist</div>
                            </div>
                            <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs">Pending</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-create-p2p-email">
                    <Plus className="w-3 h-3 mr-1" />
                    Create P2P Email
                  </Button>
                </CardContent>
              </Card>

              {/* Meetings Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Meetings & Sessions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Upcoming Meetings</h4>
                      <div className="space-y-3">
                        <div className="p-3 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3 h-3 text-blue-600" />
                              <span className="text-sm font-medium">All-Hands Town Hall</span>
                            </div>
                            <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">Confirmed</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Friday, 2:00 PM - 3:00 PM</div>
                            <div>Main Auditorium • 500 attendees</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-foreground">Agenda:</div>
                            <div className="text-xs text-muted-foreground space-y-1 pl-2">
                              <div>• Opening remarks (5 min)</div>
                              <div>• Change overview and timeline (15 min)</div>
                              <div>• Benefits and impact analysis (20 min)</div>
                              <div>• Q&A session (15 min)</div>
                              <div>• Next steps and closing (5 min)</div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" data-testid="button-view-agenda-townhall">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" data-testid="button-edit-meeting-townhall">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" data-testid="button-send-invites-townhall">
                              <Send className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3 h-3 text-orange-600" />
                              <span className="text-sm font-medium">Department Briefings</span>
                            </div>
                            <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs">Planning</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Next week • Various times</div>
                            <div>Department conference rooms • 8 sessions</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-foreground">Planned Agenda:</div>
                            <div className="text-xs text-muted-foreground space-y-1 pl-2">
                              <div>• Department-specific impact (10 min)</div>
                              <div>• Role changes and responsibilities (15 min)</div>
                              <div>• Training requirements (10 min)</div>
                              <div>• Timeline and milestones (10 min)</div>
                              <div>• Department Q&A (15 min)</div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" data-testid="button-view-agenda-briefings">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" data-testid="button-edit-meeting-briefings">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" data-testid="button-schedule-briefings">
                              <Calendar className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 border border-dashed border-gray-300 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span className="text-sm font-medium text-muted-foreground">Leadership Strategy Session</span>
                            </div>
                            <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800">Draft</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>TBD • Executive conference room</div>
                            <div>Senior leadership team • 12 attendees</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-foreground">Proposed Agenda:</div>
                            <div className="text-xs text-muted-foreground space-y-1 pl-2">
                              <div>• Risk assessment review (20 min)</div>
                              <div>• Resource allocation decisions (25 min)</div>
                              <div>• Communication strategy refinement (15 min)</div>
                              <div>• Success metrics definition (15 min)</div>
                              <div>• Action items and ownership (10 min)</div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" data-testid="button-finalize-leadership-meeting">
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" data-testid="button-edit-leadership-agenda">
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Meeting Resources & Templates</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span className="text-xs font-medium">Presentation Template</span>
                            </div>
                            <Button size="sm" variant="outline" data-testid="button-download-presentation-template">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">Standard change presentation slides</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• 25 slides with speaker notes</div>
                            <div>• Customizable for each department</div>
                            <div>• Includes data visualization templates</div>
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-3 h-3 text-green-600" />
                              <span className="text-xs font-medium">FAQ Document</span>
                            </div>
                            <Button size="sm" variant="outline" data-testid="button-view-faq-document">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">Common questions and approved answers</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• 47 frequently asked questions</div>
                            <div>• Categorized by topic area</div>
                            <div>• Updated weekly based on feedback</div>
                          </div>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-3 h-3 text-purple-600" />
                              <span className="text-xs font-medium">Feedback Forms</span>
                            </div>
                            <Button size="sm" variant="outline" data-testid="button-manage-feedback-forms">
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">Digital and printable feedback collection</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• Pre-meeting, post-meeting variants</div>
                            <div>• QR codes for mobile access</div>
                            <div>• Anonymous submission option</div>
                          </div>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Settings className="w-3 h-3 text-orange-600" />
                              <span className="text-xs font-medium">Meeting Setup Checklist</span>
                            </div>
                            <Button size="sm" variant="outline" data-testid="button-view-setup-checklist">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">Pre-meeting setup and logistics guide</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>• Room setup and AV requirements</div>
                            <div>• Material preparation checklist</div>
                            <div>• Post-meeting follow-up tasks</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" data-testid="button-schedule-meeting">
                      <Plus className="w-3 h-3 mr-1" />
                      Schedule New Meeting
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-create-agenda-template">
                      <FileText className="w-3 h-3 mr-1" />
                      Create Agenda Template
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-meeting-analytics">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Meeting Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Current Project Info */}
      {currentProject && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Active Project:</span>
              <span className="text-sm text-muted-foreground">{currentProject.name}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}