import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Mail, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

const verificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type VerificationFormData = z.infer<typeof verificationSchema>;

interface AuthResponse {
  user: any;
  role: any;
  permissions: any;
  sessionEstablished: boolean;
  message?: string;
}

interface EmailVerifyPageProps {
  onAuthSuccess: (authData: AuthResponse) => void;
}

export function EmailVerifyPage({ onAuthSuccess }: EmailVerifyPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      token: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      form.setValue('token', token);
    }
  }, [form]);

  const verificationMutation = useMutation({
    mutationFn: async (data: VerificationFormData): Promise<AuthResponse> => {
      return await apiRequest('POST', '/api/auth/verify-email', {
        token: data.token,
        password: data.password,
      });
    },
    onSuccess: (data: AuthResponse) => {
      setVerificationComplete(true);
      toast({
        title: "Email verified successfully",
        description: data.message || "Your account has been activated!",
      });
      
      // Automatically redirect to the app after successful verification
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
        onAuthSuccess(data);
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify email and set password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerificationFormData) => {
    verificationMutation.mutate(data);
  };

  const goToLogin = () => {
    setLocation('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-blue-600 to-green-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-white rounded-full"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute bottom-40 right-10 w-16 h-16 bg-white rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <Mail className="w-16 h-16 mb-6 text-green-200" />
            <h1 className="text-5xl font-bold mb-4 leading-tight">
              Email Verification
              <span className="block text-3xl font-medium text-green-200 mt-2">
                Complete Setup
              </span>
            </h1>
            <p className="text-xl text-green-100 mb-8 max-w-md">
              You're just one step away from accessing your secure project management platform
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-200" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Email Confirmed</h3>
                <p className="text-green-200">Your email address has been verified</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure Password</h3>
                <p className="text-blue-200">Create a strong password for your account</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-200" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Account Activation</h3>
                <p className="text-green-200">Full access to all platform features</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Verification Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Email Verification
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Complete your account setup</p>
          </div>

          {verificationComplete ? (
            <Card data-testid="card-verification-success">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                  Welcome to the Platform!
                </CardTitle>
                <CardDescription className="text-base">
                  Your account has been successfully activated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You're being signed in automatically. You'll be redirected to the application in a few seconds.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="card-verification-form">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Set Your Password
                </CardTitle>
                <CardDescription>
                  Complete your account setup by creating a secure password
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Token</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Token from email link"
                              readOnly
                              className="bg-gray-100 dark:bg-gray-800"
                              data-testid="input-token"
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
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
                                className="pl-10 pr-10"
                                data-testid="input-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
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
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                className="pl-10 pr-10"
                                data-testid="input-confirm-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                data-testid="button-toggle-confirm-password"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Password must be at least 8 characters long and contain uppercase, lowercase, and number characters.
                      </AlertDescription>
                    </Alert>

                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={verificationMutation.isPending}
                      data-testid="button-verify"
                    >
                      {verificationMutation.isPending ? "Verifying..." : "Complete Setup"}
                    </Button>
                  </form>
                </Form>

                <div className="text-center mt-6">
                  <Button
                    variant="link"
                    onClick={goToLogin}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    data-testid="button-back-to-login"
                  >
                    Back to Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}