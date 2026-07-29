import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ActiveWorker = {
  name: string;
  designation: string;
};

const STORAGE_KEY = "matmama.active-worker";

type ActiveWorkerContextType = {
  worker: ActiveWorker | null;
  setWorker: (w: ActiveWorker | null) => void;
  /** Prompts for the health worker if not yet identified. Resolves null if cancelled. */
  requireWorker: () => Promise<ActiveWorker | null>;
  /** Prompts (always) so the user can switch the acting health worker. */
  changeWorker: () => Promise<ActiveWorker | null>;
  /** Records an action in the audit log attributed to the active health worker. */
  logAction: (
    action: string,
    tableName: string,
    recordId: string | null,
    details?: Record<string, unknown>,
  ) => Promise<void>;
};

const ActiveWorkerContext = createContext<ActiveWorkerContextType | undefined>(
  undefined,
);

const readStored = (): ActiveWorker | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveWorker) : null;
  } catch {
    return null;
  }
};

export const ActiveWorkerProvider = ({ children }: { children: ReactNode }) => {
  const { facilityId, profile, role } = useAuth();
  const [worker, setWorkerState] = useState<ActiveWorker | null>(readStored);
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((w: ActiveWorker | null) => void) | null>(null);

  const [selected, setSelected] = useState<string>("");
  const [manualName, setManualName] = useState("");
  const [manualDesignation, setManualDesignation] = useState("");

  const { data: roster = [] } = useQuery({
    queryKey: ["active-worker-roster", facilityId],
    enabled: !!facilityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_roster")
        .select("id, name, designation")
        .eq("facility_id", facilityId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const setWorker = useCallback((w: ActiveWorker | null) => {
    setWorkerState(w);
    try {
      if (w) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(w));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const prompt = useCallback(() => {
    setSelected("");
    setManualName("");
    setManualDesignation("");
    setOpen(true);
    return new Promise<ActiveWorker | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const requireWorker = useCallback(async () => {
    if (worker) return worker;
    return prompt();
  }, [worker, prompt]);

  const finish = (w: ActiveWorker | null) => {
    setOpen(false);
    resolverRef.current?.(w);
    resolverRef.current = null;
  };

  const handleConfirm = () => {
    let next: ActiveWorker | null = null;
    if (selected && selected !== "__other__") {
      const match = roster.find((r) => r.id === selected);
      if (match) next = { name: match.name, designation: match.designation };
    } else if (manualName.trim()) {
      next = {
        name: manualName.trim(),
        designation: manualDesignation.trim() || "Health Worker",
      };
    }
    if (!next) return;
    setWorker(next);
    finish(next);
  };

  const logAction = useCallback(
    async (
      action: string,
      tableName: string,
      recordId: string | null,
      details?: Record<string, unknown>,
    ) => {
      const current = worker ?? readStored();
      const fallbackName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        "Unknown user";
      const { error } = await supabase.rpc("log_action_with_actor", {
        _action: action,
        _table_name: tableName,
        _record_id: recordId,
        _actor_name: current?.name ?? fallbackName,
        _actor_designation: current?.designation ?? (role ?? "user"),
        _new_data: (details ?? null) as never,
      });
      if (error) console.warn("Audit log failed:", error.message);
    },
    [worker, profile, role],
  );

  const canConfirm =
    (selected && selected !== "__other__") || manualName.trim().length > 1;

  return (
    <ActiveWorkerContext.Provider
      value={{ worker, setWorker, requireWorker, changeWorker: prompt, logAction }}
    >
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) finish(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Who is recording this?</DialogTitle>
            <DialogDescription>
              Select the health worker performing this action. This name is saved
              to the audit log for accountability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {roster.length > 0 && (
              <div className="space-y-2">
                <Label>Health worker</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from facility roster" />
                  </SelectTrigger>
                  <SelectContent>
                    {roster.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} — {r.designation}
                      </SelectItem>
                    ))}
                    <SelectItem value="__other__">Other (type name)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(roster.length === 0 || selected === "__other__") && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="worker-name">Full name</Label>
                  <Input
                    id="worker-name"
                    value={manualName}
                    maxLength={100}
                    placeholder="e.g. Amina Bello"
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-designation">Designation</Label>
                  <Input
                    id="worker-designation"
                    value={manualDesignation}
                    maxLength={100}
                    placeholder="e.g. Nurse / Midwife"
                    onChange={(e) => setManualDesignation(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => finish(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ActiveWorkerContext.Provider>
  );
};

export const useActiveWorker = () => {
  const ctx = useContext(ActiveWorkerContext);
  if (!ctx)
    throw new Error("useActiveWorker must be used within ActiveWorkerProvider");
  return ctx;
};
