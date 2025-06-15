
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PhoneCall, Send, MapPin, Bot } from "lucide-react";
import { Client } from "@/types";

interface DefaulterActionsProps {
  client: Client;
  onCall: (contact: string) => void;
  onSms: (contact: string) => void;
  onWhatsApp: (contact: string) => void;
  onFindClient: (address: string) => void;
  onAIReminder: (client: Client) => void;
}

export const DefaulterActions = ({
  client,
  onCall,
  onSms,
  onWhatsApp,
  onFindClient,
  onAIReminder,
}: DefaulterActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>View Details</DropdownMenuItem>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAIReminder(client)}>
          <Bot className="mr-2 h-4 w-4" />
          <span>Send AI Reminder</span>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Send className="mr-2 h-4 w-4" />
            <span>Manual Reminder</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onCall(client.contact)}>
                <PhoneCall className="mr-2 h-4 w-4" />
                <span>Call</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSms(client.contact)}>
                <Send className="mr-2 h-4 w-4" />
                <span>SMS</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onWhatsApp(client.contact)}>
                <Send className="mr-2 h-4 w-4" />
                <span>WhatsApp</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => onFindClient(client.address)}>
          <MapPin className="mr-2 h-4 w-4" />
          <span>Find/Visit Client</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-600">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
