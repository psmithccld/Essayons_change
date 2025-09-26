import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Smartphone, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MfaVerificationProps {
  sessionId: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export function MfaVerification({ sessionId, onSuccess, onCancel }: MfaVerificationProps) {
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim() || totpCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/super-admin/auth/verify-mfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          totpCode: totpCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        onSuccess(data.user);
      } else {
        setError(data.error || "MFA verification failed");
      }
    } catch (error) {
      console.error("MFA verification error:", error);
      setError("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackupCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim() || backupCode.length < 8) {
      setError("Please enter a valid backup code");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/super-admin/auth/verify-mfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          backupCode: backupCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        onSuccess(data.user);
      } else {
        setError(data.error || "MFA verification failed");
      }
    } catch (error) {
      console.error("MFA verification error:", error);
      setError("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <CardTitle className="text-xl">Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Please verify your identity to complete the login process
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="totp" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Authenticator
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Backup Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4">
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totpCode">6-Digit Code from Authenticator App</Label>
                <Input
                  id="totpCode"
                  type="text"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTotpCode(value);
                  }}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  data-testid="input-totp-code"
                  autoComplete="off"
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="flex-1"
                  data-testid="button-cancel-mfa"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || totpCode.length !== 6}
                  className="flex-1"
                  data-testid="button-verify-totp"
                >
                  {isSubmitting ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <form onSubmit={handleBackupCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backupCode">Backup Recovery Code</Label>
                <Input
                  id="backupCode"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  className="text-center font-mono"
                  data-testid="input-backup-code"
                  autoComplete="off"
                />
                <p className="text-sm text-muted-foreground">
                  Enter one of your backup recovery codes. Note: Each code can only be used once.
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="flex-1"
                  data-testid="button-cancel-mfa-backup"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || backupCode.length < 8}
                  className="flex-1"
                  data-testid="button-verify-backup"
                >
                  {isSubmitting ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}