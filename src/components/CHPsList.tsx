
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PhoneCall, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CHP {
  id: string;
  first_name: string | null;
  last_name: string | null;
  local_government: string | null;
  ward: string | null;
  facility: string | null;
  role: string;
}

const fetchCHPs = async (): Promise<CHP[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      local_government,
      ward,
      facility,
      user_roles!inner(role)
    `)
    .eq("user_roles.role", "chp")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching CHPs:", error);
    throw new Error(error.message);
  }

  return data.map((profile) => ({
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    local_government: profile.local_government,
    ward: profile.ward,
    facility: profile.facility,
    role: profile.user_roles[0]?.role || "chp",
  }));
};

export function CHPsList() {
  const { data: chps = [], isLoading, error } = useQuery<CHP[]>({
    queryKey: ["chps"],
    queryFn: fetchCHPs,
  });

  const handleCall = (chpId: string) => {
    // This would need to be implemented with actual contact info
    console.log(`Calling CHP: ${chpId}`);
  };

  const handleMessage = (chpId: string) => {
    // This would need to be implemented with actual contact info
    console.log(`Messaging CHP: ${chpId}`);
  };

  if (error) {
    return <div className="text-red-500 p-4">Error loading CHPs: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Community Health Practitioners</h3>
        <p className="text-sm text-muted-foreground">
          CHPs working with defaulted patients
        </p>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Local Government</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : chps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No CHPs found
                </TableCell>
              </TableRow>
            ) : (
              chps.map((chp) => (
                <TableRow key={chp.id}>
                  <TableCell className="font-medium">
                    {`${chp.first_name || ''} ${chp.last_name || ''}`.trim() || 'N/A'}
                  </TableCell>
                  <TableCell>{chp.local_government || 'N/A'}</TableCell>
                  <TableCell>{chp.ward || 'N/A'}</TableCell>
                  <TableCell>{chp.facility || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {chp.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCall(chp.id)}>
                          <PhoneCall className="mr-2 h-4 w-4" />
                          <span>Call</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMessage(chp.id)}>
                          <Send className="mr-2 h-4 w-4" />
                          <span>Message</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
