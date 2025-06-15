
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const chpFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

export type ChpFormValues = z.infer<typeof chpFormSchema>;

interface ChpFormProps {
  onSave: (data: ChpFormValues) => void;
  onFinished: () => void;
  open: boolean;
}

export function ChpForm({ onSave, onFinished, open }: ChpFormProps) {
  const { toast } = useToast();

  const form = useForm<ChpFormValues>({
    resolver: zodResolver(chpFormSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
      });
    }
  }, [open, form]);

  const onSubmit = (data: ChpFormValues) => {
    toast({
      title: "CHP Added",
      description: "The new community health practitioner has been successfully added.",
    });
    onSave(data);
    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                CHP Name
              </FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="pt-4">
          <Button type="submit">
            Save CHP
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
