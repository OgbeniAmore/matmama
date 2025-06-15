
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
import { Loader2, MessageSquare, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Patient } from "@/types";

interface AIReminderDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIReminderDialog({ patient, open, onOpenChange }: AIReminderDialogProps) {
  const { toast } = useToast();
  const [reminderType, setReminderType] = useState<"sms" | "whatsapp">("sms");

  const sendReminderMutation = useMutation({
    mutationFn: async ({ patientId, type }: { patientId: string; type: "sms" | "whatsapp" }) => {
      const { data, error } = await supabase.functions.invoke('send-ai-reminder', {
        body: {
          patientId,
          reminderType: type,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Reminder Sent!",
        description: `AI-generated ${reminderType.toUpperCase()} reminder sent successfully.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Reminder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendReminder = () => {
    if (!patient) return;
    sendReminderMutation.mutate({ patientId: patient.id, type: reminderType });
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send AI-Generated Reminder</DialogTitle>
          <DialogDescription>
            Send a personalized reminder to {patient.name} for their {patient.service} appointment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Choose reminder method:</Label>
            <RadioGroup
              value={reminderType}
              onValueChange={(value) => setReminderType(value as "sms" | "whatsapp")}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer">
                  <Phone className="h-4 w-4" />
                  SMS Text Message
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp Message
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendReminderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReminder}
              disabled={sendReminderMutation.isPending}
            >
              {sendReminderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send AI Reminder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
