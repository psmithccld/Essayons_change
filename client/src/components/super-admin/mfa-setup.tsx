import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Smartphone, Download, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MfaSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface MfaSetupData {
  setupId: string;
  qrCode: string;
  backupCodes: string[];
}

export function MfaSetup({ onComplete, onCancel }: MfaSetupProps) {
  const [step, setStep] = useState<"init" | "scan" | "verify" | "backup">("init");
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);
  const { toast } = useToast();

  const initiateMfaSetup = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/super-admin/mfa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSetupData(data);
        setStep("scan");
      } else {
        setError(data.error || "Failed to initiate MFA setup");
      }
    } catch (error) {
      console.error("MFA setup error:", error);
      setError("Network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const completeMfaSetup = async () => {
    if (!setupData || !totpCode.trim() || totpCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/super-admin/mfa/setup/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setupId: setupData.setupId,
          totpCode: totpCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("backup");
        toast({
          title: "MFA Enabled",
          description: "Multi-factor authentication has been successfully enabled for your account.",
        });
      } else {
        setError(data.error || "Failed to complete MFA setup");
      }
    } catch (error) {
      console.error("MFA setup completion error:", error);
      setError("Network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    if (!setupData) return;
    
    const codesText = setupData.backupCodes.join("\n");
    try {
      await navigator.clipboard.writeText(codesText);
      setBackupCodesCopied(true);
      toast({
        title: "Copied",
        description: "Backup codes copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy backup codes:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy backup codes. Please copy them manually.",
        variant: "destructive",
      });
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData) return;

    const codesText = setupData.backupCodes.join("\n");
    const blob = new Blob([`Super Admin MFA Backup Codes\n\n${codesText}\n\nKeep these codes safe and secure!`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "super-admin-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Backup codes downloaded successfully",
    });
  };

  if (step === "init") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Enable Multi-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your Super Admin account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">Authenticator App Required</p>
                <p className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or similar</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">Backup Codes Provided</p>
                <p className="text-sm text-muted-foreground">For account recovery if device is lost</p>
              </div>
            </div>
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
              data-testid="button-cancel-setup"
            >
              Cancel
            </Button>
            <Button 
              onClick={initiateMfaSetup}
              disabled={isLoading}
              className="flex-1"
              data-testid="button-start-setup"
            >
              {isLoading ? "Setting up..." : "Start Setup"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "scan" && setupData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan this QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <img 
              src={setupData.qrCode} 
              alt="MFA QR Code" 
              className="w-48 h-48 border rounded-lg"
              data-testid="img-qr-code"
            />
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Can't scan? Enter the code manually in your authenticator app
            </p>
            <Badge variant="secondary" className="font-mono text-xs">
              Super Admin - Project Management Platform
            </Badge>
          </div>

          <Button 
            onClick={() => setStep("verify")}
            className="w-full"
            data-testid="button-next-verify"
          >
            I've Added This Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify" && setupData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verify Setup</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verifyCode">Verification Code</Label>
            <Input
              id="verifyCode"
              type="text"
              placeholder="000000"
              value={totpCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTotpCode(value);
              }}
              maxLength={6}
              className="text-center text-lg tracking-widest"
              data-testid="input-verify-code"
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
              onClick={() => setStep("scan")}
              className="flex-1"
              data-testid="button-back"
            >
              Back
            </Button>
            <Button 
              onClick={completeMfaSetup}
              disabled={isLoading || totpCode.length !== 6}
              className="flex-1"
              data-testid="button-verify-setup"
            >
              {isLoading ? "Verifying..." : "Verify & Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "backup" && setupData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle className="text-xl">MFA Enabled Successfully!</CardTitle>
            <CardDescription>
              Save your backup codes for account recovery
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Important:</strong> Store these backup codes in a safe place. Each code can only be used once.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Backup Recovery Codes</Label>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm space-y-1">
              {setupData.backupCodes.map((code, index) => (
                <div key={index} className="flex justify-between">
                  <span>{code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyBackupCodes}
              className="flex-1"
              data-testid="button-copy-codes"
            >
              <Copy className="w-4 h-4 mr-1" />
              {backupCodesCopied ? "Copied!" : "Copy"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadBackupCodes}
              className="flex-1"
              data-testid="button-download-codes"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>

          <Button 
            onClick={onComplete}
            className="w-full"
            data-testid="button-complete-setup"
          >
            Complete Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}