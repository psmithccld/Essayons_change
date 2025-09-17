import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Plus, Target, TrendingUp, Calendar } from "lucide-react";

export default function InitiativeManagement() {
  return (
    <div className="space-y-6" data-testid="initiative-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Initiative Management</h1>
          <p className="text-sm text-muted-foreground">Manage change initiatives and track progress</p>
        </div>
        <Button data-testid="button-create-initiative">
          <Plus className="w-4 h-4 mr-2" />
          Create Initiative
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Initiatives</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-initiatives">
                  8
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Briefcase className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-success-rate">
                  87%
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Target className="text-secondary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Progress</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-avg-progress">
                  64%
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-accent w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Initiatives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Digital Transformation", status: "Active", progress: 75, dueDate: "Mar 2024" },
                { name: "Office Relocation", status: "Planning", progress: 30, dueDate: "Jun 2024" },
                { name: "ERP Implementation", status: "Development", progress: 45, dueDate: "Sep 2024" }
              ].map((initiative, index) => (
                <Card key={index} className="border" data-testid={`initiative-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-foreground">{initiative.name}</h3>
                      <Badge variant="outline">{initiative.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">Progress: {initiative.progress}%</div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 mr-1" />
                        Due: {initiative.dueDate}
                      </div>
                    </div>
                    <Progress value={initiative.progress} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initiative Management Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                Advanced initiative management features will be available soon.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground text-left">
                <p>• Create and manage change initiatives</p>
                <p>• Track initiative progress and milestones</p>
                <p>• Assign teams and resources</p>
                <p>• Generate initiative reports</p>
                <p>• Monitor success metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}