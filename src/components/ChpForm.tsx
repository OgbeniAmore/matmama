
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  contact: z.string().min(10, { message: "Contact number must be at least 10 digits." }),
});

export type ChpFormValues = z.infer<typeof chpFormSchema>;

interface ChpFormProps {
  onSave: (data: ChpFormValues) => boolean;
  onFinished: () => void;
  open: boolean;
  initialValues?: ChpFormValues;
}

export function ChpForm({ onSave, onFinished, open, initialValues }: ChpFormProps) {
  const form = useForm<ChpFormValues>({
    resolver: zodResolver(chpFormSchema),
    defaultValues: initialValues || {
      name: "",
      contact: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initialValues || {
          name: "",
          contact: "",
        }
      );
    }
  }, [open, form, initialValues]);

  const onSubmit = (data: ChpFormValues) => {
    const success = onSave(data);
    if (success) {
      onFinished();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
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
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Contact Number
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 2348012345678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="pt-4">
          <Button type="submit">
            {initialValues ? "Update CHP" : "Save CHP"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
