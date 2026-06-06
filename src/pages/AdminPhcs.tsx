import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LAGOS_LGAS } from "@/lib/lagos-lgas";
import { LAGOS_WARDS } from "@/lib/lagos-wards";
import { LAGOS_PHCS } from "@/lib/lagos-phcs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Phc = {
  id: string;
  lga: string;
  ward: string;
  name: string;
  notes: string | null;
  created_at: string;
};

const AdminPhcs = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = role === "system_admin" || role === "program_manager";

  const [lga, setLga] = useState<string>(LAGOS_LGAS[0]);
  const [filterWard, setFilterWard] = useState<string>("");
  const [newWard, setNewWard] = useState<string>("");
  const [newName, setNewName] = useState<string>("");

  const { data: customPhcs = [], isLoading } = useQuery<Phc[]>({
    queryKey: ["phcs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phcs" as any)
        .select("*")
        .order("lga")
        .order("ward")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Phc[];
    },
  });

  const addPhc = useMutation({
    mutationFn: async () => {
      if (!lga || !newWard || !newName.trim()) {
        throw new Error("LGA, ward, and PHC name are required.");
      }
      const { error } = await supabase.from("phcs" as any).insert({
        lga,
        ward: newWard,
        name: newName.trim(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PHC added");
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["phcs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePhc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("phcs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PHC removed");
      queryClient.invalidateQueries({ queryKey: ["phcs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Build a merged map for the selected LGA: ward -> PHCs (static + custom)
  const merged = useMemo(() => {
    const staticWards = LAGOS_PHCS[lga] ?? {};
    const map: Record<string, { name: string; source: "static" | "custom"; id?: string }[]> = {};
    Object.entries(staticWards).forEach(([w, list]) => {
      map[w] = list.map((n) => ({ name: n, source: "static" as const }));
    });
    customPhcs
      .filter((p) => p.lga === lga)
      .forEach((p) => {
        if (!map[p.ward]) map[p.ward] = [];
        if (!map[p.ward].some((x) => x.name.toLowerCase() === p.name.toLowerCase())) {
          map[p.ward].push({ name: p.name, source: "custom", id: p.id });
        }
      });
    return map;
  }, [lga, customPhcs]);

  const wardKeys = Object.keys(merged).sort();
  const visibleWards = filterWard ? wardKeys.filter((w) => w === filterWard) : wardKeys;
  const availableWards = LAGOS_WARDS[lga] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">PHC Management</h1>
        <p className="text-muted-foreground">
          Review the canonical PHC list per LGA and ward, and add new PHCs when one is missing.
        </p>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <ShieldAlert className="h-4 w-4" /> You can view the PHC list, but only System Admins and Program Managers can add or remove PHCs.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">LGA / LCDA</label>
            <Select value={lga} onValueChange={(v) => { setLga(v); setFilterWard(""); setNewWard(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LAGOS_LGAS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ward (optional)</label>
            <Select value={filterWard || "__all__"} onValueChange={(v) => setFilterWard(v === "__all__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="All wards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All wards</SelectItem>
                {availableWards.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a missing PHC</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ward</label>
              <Select value={newWard} onValueChange={setNewWard}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {availableWards.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PHC name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. New Era PHC"
              />
            </div>
            <Button onClick={() => addPhc.mutate()} disabled={addPhc.isPending} className="gap-2">
              {addPhc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add PHC
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PHCs in {lga}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!isLoading && visibleWards.length === 0 && (
            <p className="text-sm text-muted-foreground">No PHCs listed yet for this {filterWard ? "ward" : "LGA"}.</p>
          )}
          {visibleWards.map((w) => (
            <div key={w} className="rounded-md border">
              <div className="bg-muted/40 px-3 py-2 text-sm font-semibold uppercase">PHC {w}</div>
              <ul className="divide-y">
                {merged[w].map((p) => (
                  <li key={`${w}:${p.name}`} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      {p.name}
                      <Badge variant="outline" className="text-[10px]">
                        {p.source === "static" ? "Canonical" : "Added"}
                      </Badge>
                    </span>
                    {canEdit && p.source === "custom" && p.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (window.confirm(`Remove ${p.name}?`)) deletePhc.mutate(p.id!);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPhcs;
