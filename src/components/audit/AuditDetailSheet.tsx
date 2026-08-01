import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { diffAuditRow, labelField } from "@/lib/auditDiff";

export interface AuditDetailEntry {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  created_at: string;
  user_id: string | null;
  actor_name: string | null;
  actor_designation: string | null;
  old_data: unknown;
  new_data: unknown;
}

interface Props {
  entry: AuditDetailEntry | null;
  affectedLabel: string;
  performedBy: string;
  role?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-3 gap-2 py-1.5 border-b last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="col-span-2 text-sm break-words">{value}</span>
  </div>
);

const AuditDetailSheet = ({
  entry,
  affectedLabel,
  performedBy,
  role,
  open,
  onOpenChange,
}: Props) => {
  const changes = entry ? diffAuditRow(entry.old_data, entry.new_data) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline">{entry?.action}</Badge>
            <span className="capitalize text-base">
              {entry?.table_name?.replace(/_/g, " ") || "—"}
            </span>
          </SheetTitle>
          <SheetDescription>
            {entry
              ? format(new Date(entry.created_at), "EEEE, MMM d yyyy 'at' HH:mm:ss")
              : ""}
          </SheetDescription>
        </SheetHeader>

        {entry && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              <section>
                <h3 className="text-sm font-semibold mb-2">Context</h3>
                <Row label="Affected" value={affectedLabel} />
                <Row label="Record ID" value={entry.record_id || "—"} />
                <Row label="Performed by" value={performedBy} />
                <Row
                  label="Designation"
                  value={entry.actor_designation || "—"}
                />
                {role && <Row label="Role" value={role.replace(/_/g, " ")} />}
              </section>

              <section>
                <h3 className="text-sm font-semibold mb-2">
                  Changed fields ({changes.length})
                </h3>
                {changes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No field-level changes were recorded for this action.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {changes.map((c) => (
                      <div
                        key={c.field}
                        className="rounded-md border p-2 space-y-1"
                      >
                        <p className="text-xs font-medium">
                          {labelField(c.field)}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Before</span>
                            <p className="break-words">{c.before}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">After</span>
                            <p className="break-words font-medium">{c.after}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold mb-2">Raw payload</h3>
                <pre className="rounded-md bg-muted p-2 text-[10px] overflow-x-auto">
                  {JSON.stringify(
                    { old_data: entry.old_data, new_data: entry.new_data },
                    null,
                    2,
                  )}
                </pre>
              </section>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AuditDetailSheet;
