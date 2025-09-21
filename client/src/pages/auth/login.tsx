import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, User, Lock, Mail, Shield, CheckCircle, Clock, Users } from "lucide-react";
import essayonsLogo from "@assets/image_1758488024387.png";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface AuthResponse {
  user: any;
  role: any;
  permissions: any;
  sessionEstablished: boolean;
  message?: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  isEmailVerified: boolean;
  roleId: string;
}

interface LoginPageProps {
  onAuthSuccess: (authData: AuthResponse) => void;
}

export function LoginPage({ onAuthSuccess }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData): Promise<AuthResponse> => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json();
    },
    onSuccess: (data: AuthResponse) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.name}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      onAuthSuccess(data);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData): Promise<{ message: string; email: string; emailSent: boolean }> => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response.json();
    },
    onSuccess: (data: { message: string; email: string; emailSent: boolean }) => {
      setRegistrationComplete(true);
      setRegisteredEmail(data.email);
      toast({
        title: "Registration successful",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const resetToLogin = () => {
    setIsLoginMode(true);
    setRegistrationComplete(false);
    setRegisteredEmail("");
    registerForm.reset();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center items-center px-12 w-full">
          <div className="text-center">
            <img src={essayonsLogo} alt="Essayons Change Logo" className="w-80 h-auto mb-8 mx-auto" />
            <h1 className="text-5xl font-bold mb-4 leading-tight text-gray-900 dark:text-white">
              Essayons Change
              <span className="block text-3xl font-medium text-blue-600 mt-2">
                — Let us try!
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md">
              Guiding change with clarity, accountability, and results. Built to ensure both organizational and individual needs are addressed. Developed through extensive research and grounded in operational focus.
            </p>
          </div>

        </div>
      </div>

      {/* Right Side - Authentication Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <img src={essayonsLogo} alt="Essayons Change Logo" className="w-20 h-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Essayons Change
            </h1>
            <p className="text-gray-600 dark:text-gray-400">— Let us try!</p>
          </div>

          {registrationComplete ? (
            <Card data-testid="card-registration-success">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-base">
                  We've sent a verification link to <strong>{registeredEmail}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please check your email and click the verification link to set your password and activate your account.
                  </AlertDescription>
                </Alert>
                
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={resetToLogin}
                    data-testid="button-back-to-login"
                  >
                    Back to Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="card-auth-form">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoginMode ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription>
                  {isLoginMode 
                    ? "Sign in to your account to continue" 
                    : "Join our secure platform today"
                  }
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isLoginMode ? (
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  {...field}
                                  placeholder="Enter your username"
                                  className="pl-10"
                                  data-testid="input-username"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
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
                                  placeholder="Enter your password"
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

                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  {...field}
                                  placeholder="Enter your full name"
                                  className="pl-10"
                                  data-testid="input-name"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  {...field}
                                  placeholder="Choose a username"
                                  className="pl-10"
                                  data-testid="input-username-register"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="Enter your email"
                                  className="pl-10"
                                  data-testid="input-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                )}

                <Separator className="my-6" />

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    data-testid="button-switch-mode"
                  >
                    {isLoginMode ? "Sign up here" : "Sign in here"}
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