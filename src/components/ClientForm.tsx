
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
import { format, subMonths } from "date-fns";
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
import { Client, Service, PreferredChannel } from "@/types";
import { Phone, MessageSquare, Baby } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  calculateEddFromLmp,
  calculateGestationalAge,
  calculateTrimester,
} from "@/utils/ancUtils";

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
  lmp: z.date().optional(),
  lasraaId: z.string().max(50).optional(),
  ninId: z.string().max(20).optional(),
  preferredChannel: z.enum(["sms", "whatsapp"]).default("sms"),
  gravida: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).max(30).optional()),
  para: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(30).optional()),
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  hivStatus: z.string().optional(),
  hepatitisBStatus: z.string().optional(),
  vdrlStatus: z.string().optional(),
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
    return !!data.lmp;
  }
  return true;
}, {
  message: "LMP (Last Menstrual Period) is required for Ante Natal Care",
  path: ["lmp"],
}).refine((d) => d.gravida == null || d.para == null || d.para < d.gravida, {
  message: "Para must be less than Gravida (Gravida includes this pregnancy)",
  path: ["para"],
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

const BASELINE_FIELDS: { name: "bloodGroup" | "genotype" | "hivStatus" | "hepatitisBStatus" | "vdrlStatus"; label: string; options: string[] }[] = [
  { name: "bloodGroup", label: "Blood group", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Pending"] },
  { name: "genotype", label: "Genotype", options: ["AA", "AS", "AC", "SS", "SC", "Pending"] },
  { name: "hivStatus", label: "HIV I & II", options: ["Non-Reactive", "Reactive", "Pending"] },
  { name: "hepatitisBStatus", label: "Hepatitis B (HBsAg)", options: ["Negative", "Positive", "Pending"] },
  { name: "vdrlStatus", label: "VDRL (Syphilis)", options: ["Non-Reactive", "Reactive", "Pending"] },
];

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

  const watchedLmp = form.watch("lmp");

  const ancPreview = (() => {
    if (watchedService !== "Ante Natal Care" || !watchedLmp) return null;
    const edd = calculateEddFromLmp(watchedLmp);
    const ga = calculateGestationalAge(watchedLmp);
    const trimester = calculateTrimester(ga);
    return { edd, ga, trimester };
  })();

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
          lmp: clientToEdit.lmp,
          lasraaId: clientToEdit.lasraa_id || "",
          ninId: clientToEdit.nin_id || "",
          preferredChannel: (clientToEdit.preferred_channel || "sms") as "sms" | "whatsapp",
          gravida: clientToEdit.gravida ?? undefined,
          para: clientToEdit.para ?? undefined,
          bloodGroup: clientToEdit.blood_group ?? undefined,
          genotype: clientToEdit.genotype ?? undefined,
          hivStatus: clientToEdit.hiv_status ?? undefined,
          hepatitisBStatus: clientToEdit.hepatitis_b_status ?? undefined,
          vdrlStatus: clientToEdit.vdrl_status ?? undefined,
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
          lmp: undefined,
          lasraaId: "",
          ninId: "",
          preferredChannel: "sms" as const,
        });
      }
    }
  }, [clientToEdit, open, form, isEditMode]);

  const onSubmit = (data: ClientFormValues) => {
    // For ANC, derive EDD and trimester from LMP so downstream code keeps working.
    if (data.service === "Ante Natal Care" && data.lmp) {
      const edd = calculateEddFromLmp(data.lmp);
      const ga = calculateGestationalAge(data.lmp);
      data.edd = edd;
      data.trimester = calculateTrimester(ga);
      // Default the dueDate to EDD if not set
      if (!data.dueDate) data.dueDate = edd;
    }
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
                  name="lmp"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Last Menstrual Period (LMP) *</FormLabel>
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
                                <span>Pick first day of last menstrual period</span>
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
                            className="p-3 pointer-events-auto"
                            disabled={(date) => date > new Date() || date < subMonths(new Date(), 10)}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {ancPreview && (
                  <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Baby className="h-4 w-4 text-primary" />
                      Pregnancy Summary (auto-calculated)
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">EDD (Naegele's rule)</span>
                      <span className="font-medium">{format(ancPreview.edd, "PPP")}</span>
                      <span className="text-muted-foreground">Gestational age</span>
                      <span className="font-medium">{ancPreview.ga} week{ancPreview.ga === 1 ? "" : "s"}</span>
                      <span className="text-muted-foreground">Trimester</span>
                      <span className="font-medium">
                        {ancPreview.trimester === 1 && "First (1–12 weeks)"}
                        {ancPreview.trimester === 2 && "Second (13–26 weeks)"}
                        {ancPreview.trimester === 3 && "Third (27–40 weeks)"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1 border-t">
                      8 ANC visits will be scheduled automatically (WHO recommendation).
                    </p>
                  </div>
                )}

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold">Pregnancy history</p>
                  <FormField control={form.control} name="gravida" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gravida (G) — total pregnancies</FormLabel>
                      <p className="text-xs text-muted-foreground">Ask: "How many times have you ever been pregnant, counting this pregnancy and any miscarriage, abortion or lost pregnancy?"</p>
                      <FormControl><Input type="number" inputMode="numeric" min={1} placeholder="e.g. 3" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="para" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Para (P) — past births from 28 weeks</FormLabel>
                      <p className="text-xs text-muted-foreground">Ask: "How many times have you given birth to a baby after about 7 months of pregnancy, whether the baby was born alive or not?" (Do not count this pregnancy.)</p>
                      <FormControl><Input type="number" inputMode="numeric" min={0} placeholder="e.g. 2" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Booking tests (first contact only)</p>
                    <p className="text-xs text-muted-foreground">Requested once at registration. Leave as "Pending" until results are back.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BASELINE_FIELDS.map((b) => (
                      <FormField key={b.name} control={form.control} name={b.name} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{b.label}</FormLabel>
                          <Select onValueChange={field.onChange} value={(field.value as string) || undefined}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                            <SelectContent>{b.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </div>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lasraaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LASRAA ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter LASRAA ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ninId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIN</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter NIN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Provide LASRAA ID or NIN for cross-facility identification. A system ID will be auto-generated if neither is provided.
            </p>

            <FormField
              control={form.control}
              name="preferredChannel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Reminder Channel</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sms">
                        <span className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          SMS
                        </span>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5" />
                          WhatsApp
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
