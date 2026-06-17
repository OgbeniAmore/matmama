import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LAGOS_LGAS } from "@/lib/lagos-lgas";
import {
  Building2,
  Users,
  AlertTriangle,
  UserCheck,
  UserX,
  UserCog,
} from "lucide-react";
import { ReassignPmDialog } from "./ReassignPmDialog";

export interface LgaStat {
  lga: string;
  facilities: number;
  clients: number;
  defaulters: number;
  programManager: string | null;
}

interface LgaPerformanceGridProps {
  data: LgaStat[] | undefined;
  isLoading: boolean;
}

export function LgaPerformanceGrid({ data, isLoading }: LgaPerformanceGridProps) {
  const [reassign, setReassign] = useState<{ lga: string; pm: string | null } | null>(null);
  // Always render all 20 LGAs, merging in stats where available
  const map = new Map(data?.map((d) => [d.lga, d]) ?? []);
  const rows = LAGOS_LGAS.map(
    (lga) =>
      map.get(lga) ?? {
        lga,
        facilities: 0,
        clients: 0,
        defaulters: 0,
        programManager: null,
      },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          LGA Performance — Lagos State
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rows.map((row) => {
              const defaulterRate =
                row.clients > 0 ? Math.round((row.defaulters / row.clients) * 100) : 0;
              const hasPm = !!row.programManager;
              const isInactive = row.facilities === 0 && row.clients === 0;

              return (
                <Card
                  key={row.lga}
                  className={`border ${isInactive ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-tight">{row.lga}</h3>
                      {hasPm ? (
                        <Badge variant="secondary" className="gap-1 text-[10px] shrink-0">
                          <UserCheck className="h-3 w-3" />
                          PM
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px] shrink-0">
                          <UserX className="h-3 w-3" />
                          No PM
                        </Badge>
                      )}
                    </div>
                    {hasPm && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {row.programManager}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <div className="text-center">
                        <p className="text-lg font-bold leading-tight">{row.facilities}</p>
                        <p className="text-[10px] text-muted-foreground">Facilities</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold leading-tight flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.clients}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Clients</p>
                      </div>
                      <div className="text-center">
                        <p
                          className={`text-lg font-bold leading-tight flex items-center justify-center gap-1 ${
                            defaulterRate > 20 ? "text-destructive" : ""
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {defaulterRate}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">Defaulting</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs gap-1 mt-1"
                      onClick={() => setReassign({ lga: row.lga, pm: row.programManager })}
                    >
                      <UserCog className="h-3.5 w-3.5" />
                      {hasPm ? "Reassign PM" : "Assign PM"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {reassign && (
        <ReassignPmDialog
          open={!!reassign}
          onOpenChange={(o) => !o && setReassign(null)}
          lga={reassign.lga}
          currentPmName={reassign.pm}
        />
      )}
    </Card>
  );
}
