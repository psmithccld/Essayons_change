import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Lock, Users, Key, AlertTriangle } from "lucide-react";

export default function SecurityManagement() {
  return (
    <div className="space-y-6" data-testid="security-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Security & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage roles, permissions, and security settings</p>
        </div>
        <Button data-testid="button-create-role">
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Roles</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-roles">
                  6
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-permissions">
                  24
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Key className="text-secondary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Secure Sessions</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-secure-sessions">
                  18
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Lock className="text-accent w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Alerts</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-security-alerts">
                  2
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-destructive w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Super Admin", users: 2, permissions: 24, level: "critical" },
                { name: "Project Manager", users: 5, permissions: 18, level: "high" },
                { name: "Team Lead", users: 8, permissions: 12, level: "medium" },
                { name: "Team Member", users: 15, permissions: 8, level: "low" },
                { name: "Stakeholder", users: 12, permissions: 4, level: "low" },
                { name: "Observer", users: 8, permissions: 2, level: "low" }
              ].map((role, index) => (
                <Card key={index} className="border" data-testid={`role-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium text-foreground">{role.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {role.users} users
                            </span>
                            <span className="flex items-center">
                              <Key className="w-3 h-3 mr-1" />
                              {role.permissions} permissions
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={role.level === 'critical' ? 'destructive' : 
                               role.level === 'high' ? 'default' : 
                               role.level === 'medium' ? 'secondary' : 'outline'}
                      >
                        {role.level}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security & Role Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                Advanced security and role management features will be available soon.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground text-left">
                <p>• Create and manage custom roles</p>
                <p>• Define granular permissions</p>
                <p>• Assign roles to users and groups</p>
                <p>• Monitor security events and logs</p>
                <p>• Configure authentication settings</p>
                <p>• Generate security reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { event: "Failed login attempt", user: "unknown", time: "2 minutes ago", severity: "warning" },
              { event: "Role updated", user: "admin@example.com", time: "1 hour ago", severity: "info" },
              { event: "New user created", user: "manager@example.com", time: "3 hours ago", severity: "success" },
              { event: "Permission granted", user: "team.lead@example.com", time: "5 hours ago", severity: "info" }
            ].map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`security-event-${index}`}>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className={`w-4 h-4 ${
                    event.severity === 'warning' ? 'text-destructive' :
                    event.severity === 'success' ? 'text-secondary' : 'text-accent'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.event}</p>
                    <p className="text-xs text-muted-foreground">User: {event.user}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{event.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}