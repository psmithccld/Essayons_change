import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpDeskChat } from "@/components/HelpDeskChat";

export function HelpDeskButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Support Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-helpdesk-open"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white">
            <p>Need help? Get instant support</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Chat Modal */}
      <HelpDeskChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}