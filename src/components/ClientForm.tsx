
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import { Client, Service } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const services: [Service, ...Service[]] = [
  "Routine Immunization",
  "Family Planning",
  "Ante Natal Care",
];

export const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contact: z.string().min(10, { message: "Please enter a valid phone number." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  service: z.enum(services),
  dueDate: z.date({
    required_error: "A due date is required.",
  }),
  childName: z.string().optional(),
  childDob: z.date().optional(),
  trimester: z.coerce.number().min(1).max(3).optional(),
  edd: z.date().optional(),
  lasraaId: z.string().max(50).optional(),
  ninId: z.string().max(20).optional(),
}).refine((data) => {
  if (data.service === "Routine Immunization") {
    return data.childName && data.childName.trim().length > 0 && data.childDob;
  }
  return true;
}, {
  message: "Child name and date of birth are required for Routine Immunization",
  path: ["childName"],
}).refine((data) => {
  if (data.service === "Ante Natal Care") {
    return data.trimester && data.edd;
  }
  return true;
}, {
  message: "Trimester and EDD are required for Ante Natal Care",
  path: ["trimester"],
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  onSave: (data: ClientFormValues) => void;
  clientToEdit?: Client | null;
  onFinished: () => void;
  open: boolean;
}

export function ClientForm({ onSave, clientToEdit, onFinished, open }: ClientFormProps) {
  const { toast } = useToast();
  const isEditMode = !!clientToEdit;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
  });

  const watchedService = form.watch("service");

  useEffect(() => {
    if (open) {
      if (isEditMode && clientToEdit) {
        form.reset({
          name: clientToEdit.name,
          contact: clientToEdit.contact,
          address: clientToEdit.address,
          service: clientToEdit.service,
          dueDate: clientToEdit.dueDate,
          childName: clientToEdit.childName || "",
          childDob: clientToEdit.childDob,
          trimester: clientToEdit.trimester || undefined,
          edd: clientToEdit.edd,
        });
      } else {
        form.reset({
          name: "",
          contact: "",
          address: "",
          service: undefined,
          dueDate: undefined,
          childName: "",
          childDob: undefined,
          trimester: undefined,
          edd: undefined,
        });
      }
    }
  }, [clientToEdit, open, form, isEditMode]);

  const onSubmit = (data: ClientFormValues) => {
    onSave(data);
    onFinished();
  };

  return (
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
                    {watchedService === "Routine Immunization" ? "Parent/Guardian Name" : "Client Name"}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedService === "Routine Immunization" && (
              <>
                <FormField
                  control={form.control}
                  name="childName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child Name *</FormLabel>
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
                      <FormLabel>Child Date of Birth *</FormLabel>
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
                                <span>Pick child's date of birth</span>
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
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {watchedService === "Ante Natal Care" && (
              <>
                <FormField
                  control={form.control}
                  name="trimester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trimester *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trimester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">First Trimester (1-12 weeks)</SelectItem>
                          <SelectItem value="2">Second Trimester (13-26 weeks)</SelectItem>
                          <SelectItem value="3">Third Trimester (27-40 weeks)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="edd"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Estimated Due Date (EDD) *</FormLabel>
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
                                <span>Pick estimated due date</span>
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
                            disabled={(date) => date < new Date()}
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
                  <FormLabel>
                    {watchedService === "Routine Immunization" ? "Next Immunization Date" : 
                     watchedService === "Ante Natal Care" ? "Next Appointment Date" : 
                     "Due Date / Next Appointment"}
                  </FormLabel>
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
            {isEditMode ? "Save Changes" : "Save Client"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
