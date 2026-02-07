
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, MessageSquare, Phone, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkReminderDialogProps {
  clients: Client[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type SendStatus = "pending" | "sending" | "success" | "error";

interface ClientSendState {
  client: Client;
  status: SendStatus;
  error?: string;
}

export function BulkReminderDialog({ clients, open, onOpenChange, onComplete }: BulkReminderDialogProps) {
  const { toast } = useToast();
  const [reminderType, setReminderType] = useState<"sms" | "whatsapp">("sms");
  const [isSending, setIsSending] = useState(false);
  const [sendStates, setSendStates] = useState<ClientSendState[]>([]);

  const totalClients = clients.length;
  const completedCount = sendStates.filter(s => s.status === "success" || s.status === "error").length;
  const successCount = sendStates.filter(s => s.status === "success").length;
  const errorCount = sendStates.filter(s => s.status === "error").length;
  const progressPercent = totalClients > 0 ? Math.round((completedCount / totalClients) * 100) : 0;

  const handleSendBulk = async () => {
    setIsSending(true);
    const initialStates: ClientSendState[] = clients.map(c => ({ client: c, status: "pending" as SendStatus }));
    setSendStates(initialStates);

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];

      setSendStates(prev =>
        prev.map((s, idx) => idx === i ? { ...s, status: "sending" } : s)
      );

      try {
        const { data, error } = await supabase.functions.invoke('send-ai-reminder', {
          body: { patientId: client.id, reminderType: reminderType },
        });

        if (error) throw error;

        setSendStates(prev =>
          prev.map((s, idx) => idx === i ? { ...s, status: "success" } : s)
        );
        successes++;
      } catch (err: any) {
        setSendStates(prev =>
          prev.map((s, idx) => idx === i ? { ...s, status: "error", error: err.message } : s)
        );
        failures++;
      }
    }

    setIsSending(false);
    toast({
      title: "Bulk Reminder Complete",
      description: `${successes} sent successfully${failures > 0 ? `, ${failures} failed` : ""}.`,
      variant: failures > 0 ? "destructive" : "default",
    });
    onComplete();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isSending) {
      onOpenChange(isOpen);
      if (!isOpen) {
        setSendStates([]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Bulk AI Reminders</DialogTitle>
          <DialogDescription>
            Send personalized AI-generated reminders to {totalClients} selected defaulter{totalClients !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sendStates.length === 0 ? (
            <>
              <div>
                <Label className="text-base font-medium">Choose reminder method:</Label>
                <RadioGroup
                  value={reminderType}
                  onValueChange={(value) => setReminderType(value as "sms" | "whatsapp")}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="bulk-sms" />
                    <Label htmlFor="bulk-sms" className="flex items-center gap-2 cursor-pointer">
                      <Phone className="h-4 w-4" />
                      SMS Text Message
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whatsapp" id="bulk-whatsapp" />
                    <Label htmlFor="bulk-whatsapp" className="flex items-center gap-2 cursor-pointer">
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp Message
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-sm font-medium mb-2">Selected clients:</p>
                <ScrollArea className="max-h-32">
                  <ul className="space-y-1">
                    {clients.map(c => (
                      <li key={c.id} className="text-sm text-muted-foreground">
                        • {c.name} — {c.service}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {completedCount} of {totalClients} processed
                  </span>
                  <span className="text-muted-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {completedCount === totalClients && (
                <div className="flex gap-4 text-sm">
                    <span className="text-secondary flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {successCount} sent
                    </span>
                    {errorCount > 0 && (
                      <span className="text-destructive flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> {errorCount} failed
                      </span>
                    )}
                  </div>
                )}
              </div>

              <ScrollArea className="max-h-48">
                <div className="space-y-1.5">
                  {sendStates.map((state) => (
                    <div key={state.client.id} className="flex items-center justify-between text-sm py-1">
                      <span className="truncate mr-2">{state.client.name}</span>
                      <div className="flex-shrink-0">
                        {state.status === "pending" && (
                          <span className="text-muted-foreground">Waiting...</span>
                        )}
                        {state.status === "sending" && (
                          <span className="flex items-center gap-1 text-primary">
                            <Loader2 className="h-3 w-3 animate-spin" /> Sending
                          </span>
                        )}
                        {state.status === "success" && (
                          <span className="flex items-center gap-1 text-secondary">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                          </span>
                        )}
                        {state.status === "error" && (
                          <span className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSending}
            >
              {completedCount === totalClients && sendStates.length > 0 ? "Close" : "Cancel"}
            </Button>
            {sendStates.length === 0 && (
              <Button onClick={handleSendBulk} disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send to {totalClients} Client{totalClients !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
