import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, UsersRound } from "lucide-react";
import { LAGOS_LGAS } from "@/lib/lagos-lgas";

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry",
};

const roleVariant = (role: string | null) => {
  switch (role) {
    case "system_admin":
      return "destructive" as const;
    case "program_manager":
      return "default" as const;
    case "facility_officer":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

export interface AdminTeamMember {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  facility_name: string | null;
  lga: string | null;
  role: string | null;
}

interface AdminTeamSectionProps {
  members: AdminTeamMember[];
  isLoading: boolean;
  onInvite: () => void;
}

export function AdminTeamSection({ members, isLoading, onInvite }: AdminTeamSectionProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [lgaFilter, setLgaFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (lgaFilter !== "all" && m.lga !== lgaFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
        if (
          !name.includes(q) &&
          !m.facility_name?.toLowerCase().includes(q) &&
          !m.lga?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [members, search, roleFilter, lgaFilter]);

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-primary" />
          Team across Lagos State
        </CardTitle>
        <Button size="sm" onClick={onInvite} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Admin / PM
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, facility, LGA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(roleLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lgaFilter} onValueChange={setLgaFilter}>
            <SelectTrigger>
              <SelectValue placeholder="LGA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {LAGOS_LGAS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto -mx-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">LGA</TableHead>
                <TableHead className="hidden md:table-cell">Facility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    No team members match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {m.first_name || m.last_name
                            ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
                            : "Unnamed User"}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {m.lga ?? "No LGA"} · {m.facility_name ?? "No facility"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.role ? (
                        <Badge variant={roleVariant(m.role)}>
                          {roleLabels[m.role] ?? m.role}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">No role</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {m.lga ?? <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {m.facility_name ?? <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
