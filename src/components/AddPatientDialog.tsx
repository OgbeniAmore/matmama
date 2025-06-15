
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { Patient, Service } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const services: [Service, ...Service[]] = [
  "Routine Immunization",
  "Family Planning",
  "Ante Natal Care",
];

export const patientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contact: z.string().min(10, { message: "Please enter a valid phone number." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  service: z.enum(services),
  dueDate: z.date({
    required_error: "A due date is required.",
  }),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

interface AddPatientDialogProps {
  onSave: (data: PatientFormValues, patientId?: string) => void;
  patientToEdit?: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPatientDialog({ onSave, patientToEdit, open, onOpenChange }: AddPatientDialogProps) {
  const { toast } = useToast();
  const isEditMode = !!patientToEdit;

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && patientToEdit) {
        form.reset({
          name: patientToEdit.name,
          contact: patientToEdit.contact,
          address: patientToEdit.address,
          service: patientToEdit.service,
          dueDate: patientToEdit.dueDate,
        });
      } else {
        form.reset({
          name: "",
          contact: "",
          address: "",
          service: undefined,
          dueDate: undefined,
        });
      }
    }
  }, [patientToEdit, open, form, isEditMode]);

  const onSubmit = (data: PatientFormValues) => {
    toast({
      title: isEditMode ? "Patient Updated" : "Patient Added",
      description: isEditMode
        ? "The patient's details have been successfully updated."
        : "The new patient has been successfully added to the system.",
    });
    onSave(data, patientToEdit?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Patient" : "Add New Patient"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the patient's details below." : "Fill in the details below to add a new patient."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 pr-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Patient Name
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="08012345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Residential Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter full residential address"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date / Next Appointment</FormLabel>
                      <Popover>
                        <PopoverTrigger
                          asChild
                        >
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4">
              <Button type="submit">
                {isEditMode ? "Save Changes" : "Save Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
