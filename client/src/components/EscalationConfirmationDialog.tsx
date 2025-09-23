import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Mail, Clock, User, ArrowUp } from "lucide-react";

interface EscalationConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  escalationData: {
    category: string;
    reason: string;
    userMessage: string;
    assistantResponse: string;
    priority: string;
  };
  isLoading?: boolean;
}

export function EscalationConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  escalationData,
  isLoading = false,
}: EscalationConfirmationDialogProps) {
  const [userConfirmed, setUserConfirmed] = useState(false);

  const handleConfirm = () => {
    if (userConfirmed) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setUserConfirmed(false);
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-black";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "technical": return "🔧";
      case "permissions": return "🔐";
      case "guidance": return "💡";
      case "escalation": return "🚨";
      default: return "❓";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-escalation-confirmation">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Escalate to Support Team?
          </DialogTitle>
          <DialogDescription>
            This will create a support ticket and notify our technical team for immediate assistance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Escalation Overview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCategoryIcon(escalationData.category)}</span>
                <span className="font-medium text-sm capitalize">{escalationData.category} Issue</span>
              </div>
              <Badge className={getPriorityColor(escalationData.priority)} data-testid={`badge-priority-${escalationData.priority}`}>
                {escalationData.priority.toUpperCase()} Priority
              </Badge>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Reason:</strong> {escalationData.reason}
            </div>
          </div>

          {/* What Happens Next */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">What happens when you escalate:</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>System administrator will be notified via email</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                <span>Support ticket created with your conversation history</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>Technical team will review and respond within 24 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-purple-500" />
                <span>This conversation will be marked as escalated</span>
              </div>
            </div>
          </div>

          {/* User Confirmation */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <input
              id="escalation-confirm"
              type="checkbox"
              checked={userConfirmed}
              onChange={(e) => setUserConfirmed(e.target.checked)}
              className="mt-0.5"
              data-testid="checkbox-escalation-confirm"
            />
            <label 
              htmlFor="escalation-confirm" 
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              I understand that this will create a support ticket and notify the technical team. 
              I confirm that I need additional assistance beyond what the helpdesk can provide.
            </label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            data-testid="button-escalation-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!userConfirmed || isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-escalation-confirm"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating Ticket...
              </>
            ) : (
              "Escalate Issue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}