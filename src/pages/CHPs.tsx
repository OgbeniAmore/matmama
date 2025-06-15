import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { MoreHorizontal, UserPlus, Edit, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddEditChpDialog } from "@/components/AddEditChpDialog";
import { ChpFormValues } from "@/components/ChpForm";
import { toast } from "sonner";

interface CHP {
  id: string;
  first_name: string | null;
  last_name: string | null;
  local_government: string | null;
  ward: string | null;
  facility: string | null;
  role: string;
}

interface ProfileWithRole {
  id: string;
  first_name: string | null;
  last_name: string | null;
  local_government: string | null;
  ward: string | null;
  facility: string | null;
  user_roles: Array<{ role: string }>;
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

  return (data as ProfileWithRole[]).map((profile) => ({
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    local_government: profile.local_government,
    ward: profile.ward,
    facility: profile.facility,
    role: profile.user_roles[0]?.role || "chp",
  }));
};

const addChp = async (values: ChpFormValues) => {
  const newChpId = crypto.randomUUID();

  const { error: profileError } = await supabase.from("profiles").insert({
    id: newChpId,
    first_name: values.first_name,
    last_name: values.last_name,
    local_government: values.local_government || null,
    ward: values.ward || null,
    facility: values.facility || null,
  });

  if (profileError) {
    console.error("Error creating profile:", profileError);
    throw new Error("Failed to create CHP profile.");
  }

  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: newChpId, role: "chp" });

  if (roleError) {
    console.error("Error assigning role:", roleError);
    await supabase.from("profiles").delete().eq("id", newChpId);
    throw new Error("Failed to assign CHP role.");
  }
};

const editChp = async ({ values, id }: { values: ChpFormValues; id: string }) => {
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: values.first_name,
      last_name: values.last_name,
      local_government: values.local_government || null,
      ward: values.ward || null,
      facility: values.facility || null,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error("Failed to update CHP profile.");
  }
};

const CHPs = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChp, setSelectedChp] = useState<CHP | null>(null);

  const { data: chps = [], isLoading, error } = useQuery<CHP[]>({
    queryKey: ["chps"],
    queryFn: fetchCHPs,
  });

  const addMutation = useMutation({
    mutationFn: addChp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chps"] });
      toast.success("CHP added successfully!");
      setIsDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: editChp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chps"] });
      toast.success("CHP updated successfully!");
      setIsDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleOpenAddDialog = () => {
    setSelectedChp(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (chp: CHP) => {
    setSelectedChp(chp);
    setIsDialogOpen(true);
  };

  const handleDialogSubmit = async (values: ChpFormValues, chpId?: string) => {
    if (chpId) {
      await editMutation.mutateAsync({ values, id: chpId });
    } else {
      await addMutation.mutateAsync(values);
    }
  };

  if (error) {
    return <div className="text-red-500 p-4">Error loading CHPs: {error.message}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community Health Practitioners</h1>
          <p className="text-muted-foreground">
            Manage and communicate with CHPs in your area
          </p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add CHP
        </Button>
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
                    {`${chp.first_name || ""} ${chp.last_name || ""}`.trim() || "N/A"}
                  </TableCell>
                  <TableCell>{chp.local_government || "N/A"}</TableCell>
                  <TableCell>{chp.ward || "N/A"}</TableCell>
                  <TableCell>{chp.facility || "N/A"}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenEditDialog(chp)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.info("Assign action coming soon!")}
                        >
                          <User className="mr-2 h-4 w-4" />
                          <span>Assign</span>
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
      <AddEditChpDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        chp={selectedChp}
        isSubmitting={addMutation.isPending || editMutation.isPending}
      />
    </div>
  );
};

export default CHPs;
