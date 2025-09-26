import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  UserPlus, 
  Shield, 
  Trash2, 
  Lock, 
  Unlock,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { queryClient } from "@/lib/queryClient";

const createAdminSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 
      "Password must contain uppercase, lowercase, number, and special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;

interface SuperAdminUser {
  id: string;
  username: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  mustChangePassword: boolean;
}

export function SuperAdminUserManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { isAuthenticated } = useSuperAdmin();
  const { toast } = useToast();

  const form = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Fetch Super Admin users
  const { data: adminUsers, isLoading, refetch } = useQuery({
    queryKey: ["/api/super-admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/users", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch admin users");
      return response.json() as Promise<SuperAdminUser[]>;
    },
    enabled: isAuthenticated,
  });

  // Create new Super Admin user
  const createAdminMutation = useMutation({
    mutationFn: async (data: CreateAdminForm) => {
      const response = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create admin user");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin User Created",
        description: "New Super Admin user has been created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle user status
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "activate" | "deactivate" }) => {
      const response = await fetch(`/api/super-admin/users/${userId}/${action}`, {
        method: "POST",
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} user`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: `User ${variables.action === "activate" ? "Activated" : "Deactivated"}`,
        description: `Super Admin user has been ${variables.action}d successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Force password reset
  const forcePasswordResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/super-admin/users/${userId}/force-password-reset`, {
        method: "POST",
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to force password reset");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Required",
        description: "User will be required to change password on next login",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAdminForm) => {
    createAdminMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Super Admin User Management
              </CardTitle>
              <CardDescription>
                Manage Super Administrator accounts and security settings
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-admin">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Super Admin</DialogTitle>
                  <DialogDescription>
                    Create a new Super Administrator account with secure credentials
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter username"
                              data-testid="input-create-username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter secure password"
                                data-testid="input-create-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm password"
                                data-testid="input-confirm-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Password must be at least 12 characters with uppercase, lowercase, number, and special character.
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createAdminMutation.isPending}
                        data-testid="button-submit-create"
                      >
                        {createAdminMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create Admin
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading admin users...</p>
            </div>
          ) : adminUsers && adminUsers.length > 0 ? (
            <div className="space-y-4">
              {adminUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium" data-testid={`admin-username-${user.id}`}>
                        {user.username}
                      </h4>
                      <div className="flex gap-2">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {user.mfaEnabled && (
                          <Badge variant="outline" className="border-green-500 text-green-700">
                            MFA Enabled
                          </Badge>
                        )}
                        {user.mustChangePassword && (
                          <Badge variant="destructive">
                            Must Change Password
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(user.createdAt).toLocaleDateString()} • 
                      Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserMutation.mutate({ 
                        userId: user.id, 
                        action: user.isActive ? "deactivate" : "activate" 
                      })}
                      disabled={toggleUserMutation.isPending}
                      data-testid={`button-toggle-${user.id}`}
                    >
                      {user.isActive ? (
                        <>
                          <Lock className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => forcePasswordResetMutation.mutate(user.id)}
                      disabled={forcePasswordResetMutation.isPending}
                      data-testid={`button-reset-password-${user.id}`}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Force Reset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No admin users found</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create First Admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}