
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, PhoneCall, MessageSquare, Send, MapPin, ChevronDown } from "lucide-react";
import { Client } from "@/types";

interface ClientActionBarProps {
  client: Client;
  onAIReminder: (client: Client) => void;
  onCall: (contact: string) => void;
  onSms: (contact: string) => void;
  onWhatsApp: (contact: string) => void;
  onFindClient: (address: string) => void;
}

export function ClientActionBar({
  client,
  onAIReminder,
  onCall,
  onSms,
  onWhatsApp,
  onFindClient,
}: ClientActionBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => onAIReminder(client)}
        className="gap-1.5"
      >
        <Bot className="h-4 w-4" />
        Send AI Reminder
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Send className="h-4 w-4" />
            Manual Reminder
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onCall(client.contact)}>
            <PhoneCall className="mr-2 h-4 w-4" />
            Call
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSms(client.contact)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onWhatsApp(client.contact)}>
            <Send className="mr-2 h-4 w-4" />
            WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm"
        variant="secondary"
        onClick={() => onFindClient(client.address)}
        className="gap-1.5"
      >
        <MapPin className="h-4 w-4" />
        Find/Visit Client
      </Button>
    </div>
  );
}
