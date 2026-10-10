import { Badge } from "@/components/ui/badge";
import { Client } from "@/types";

const isAlert = (v?: string | null) => v === "Reactive" || v === "Positive";

export function AncBaselineCard({ client }: { client: Client }) {
  const rows: [string, string | null | undefined, boolean][] = [
    ["Blood group", client.blood_group, !!client.blood_group?.endsWith("-")],
    ["Genotype", client.genotype, client.genotype === "SS" || client.genotype === "SC"],
    ["HIV I & II", client.hiv_status, isAlert(client.hiv_status)],
    ["Hepatitis B", client.hepatitis_b_status, isAlert(client.hepatitis_b_status)],
    ["VDRL", client.vdrl_status, isAlert(client.vdrl_status)],
  ];
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-sm">Booking history & tests</h4>
        <Badge variant="outline">
          G{client.gravida ?? "?"} P{client.para ?? "?"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {rows.map(([label, value, alert]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{label}</span>
            <Badge variant={alert ? "destructive" : "secondary"}>{value || "Not recorded"}</Badge>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Requested at first contact only. Reactive/positive results or Rh-negative/SS need follow-up per protocol.</p>
    </div>
  );
}
