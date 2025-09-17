import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Shield, UserCheck } from "lucide-react";

export default function UserManagement() {
  return (
    <div className="space-y-6" data-testid="user-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        <Button data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-users">
                  24
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-users">
                  18
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <UserCheck className="text-secondary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-admin-users">
                  3
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Shield className="text-accent w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              User management functionality including user creation, role assignment, 
              and permission management will be available in the next release.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Create and manage user accounts</p>
              <p>• Assign roles and permissions</p>
              <p>• Monitor user activity and status</p>
              <p>• Bulk user operations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}