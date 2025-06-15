
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Calendar as CalendarIcon, PlusCircle } from "lucide-react";
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
import { Service } from "@/types";
import { calculateNextAppointment } from "@/lib/epi-schedule";
import { ScrollArea } from "@/components/ui/scroll-area";

const services: [Service, ...Service[]] = [
  "Routine Immunization",
  "Family Planning",
  "Ante Natal Care",
];

const patientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contact: z.string().min(10, { message: "Please enter a valid phone number." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  service: z.enum(services),
  dueDate: z.date({
    required_error: "A due date is required.",
  }),
  childName: z.string().optional(),
  childDob: z.date().optional(),
}).superRefine((data, ctx) => {
  if (data.service === "Routine Immunization") {
    if (!data.childName || data.childName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["childName"],
        message: "Child's name must be at least 2 characters.",
      });
    }
    if (!data.childDob) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["childDob"],
        message: "Child's date of birth is required.",
      });
    }
  }
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export function AddPatientDialog({ onPatientAdded }: { onPatientAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [appointmentName, setAppointmentName] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      contact: "",
      address: "",
      childName: "",
    },
  });

  const service = form.watch("service");
  const childDob = form.watch("childDob");

  useEffect(() => {
    if (service === "Routine Immunization") {
      if (childDob) {
        const nextAppointment = calculateNextAppointment(childDob);
        form.setValue("dueDate", nextAppointment.dueDate, { shouldValidate: true });
        setAppointmentName(nextAppointment.name);
      } else {
        form.setValue("dueDate", undefined);
        setAppointmentName(null);
      }
    } else {
      // Not RI, clear all related fields
      form.resetField("childName");
      form.resetField("childDob");
      form.resetField("dueDate");
      setAppointmentName(null);
    }
  }, [service, childDob, form]);

  const onSubmit = (data: PatientFormValues) => {
    console.log("New patient data:", data);
    toast({
      title: "Patient Added",
      description: "The new patient has been successfully added to the system.",
    });
    onPatientAdded();
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new patient.
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
                        {service === "Routine Immunization"
                          ? "Parent/Guardian Name"
                          : "Patient Name"}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {service === "Routine Immunization" && (
                  <>
                    <FormField
                      control={form.control}
                      name="childName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Child's Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Child's full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="childDob"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Child's Date of Birth</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
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
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

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
                          disabled={service === "Routine Immunization"}
                        >
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={service === "Routine Immunization"}
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
                      {appointmentName && (
                        <FormDescription>
                          {appointmentName}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4">
              <Button type="submit">
                {service === "Routine Immunization"
                  ? "Schedule Immunization"
                  : "Save Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
