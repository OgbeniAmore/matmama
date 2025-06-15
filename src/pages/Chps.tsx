
import { useState, useMemo } from "react";
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
import { Patient } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChpForm, ChpFormValues } from "@/components/ChpForm";
import { PlusCircle, Pencil, MoreHorizontal, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { RoleAssignDialog } from "@/components/RoleAssignDialog";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  facility: string | null;
  local_government: string | null;
  ward: string | null;
}

interface ChpData extends Profile {
  patientCount: number;
  role?: UserRole;
}

const fetchChps = async (): Promise<Profile[]> => {
  // First, get all user IDs that have roles assigned
  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id");

  if (rolesError) {
    console.error("Error fetching user roles:", rolesError);
    throw new Error(rolesError.message);
  }

  if (!userRoles || userRoles.length === 0) {
    return [];
  }

  // Extract user IDs
  const userIds = userRoles.map(role => role.user_id);

  // Then fetch profiles for those users
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, facility, local_government, ward")
    .in("id", userIds)
    .order("first_name", { ascending: true });

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    throw new Error(profilesError.message);
  }

  return profiles || [];
};

const fetchChpRoles = async (): Promise<Record<string, UserRole>> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, role");

  if (error) {
    console.error("Error fetching CHP roles:", error);
    throw new Error(error.message);
  }

  return data.reduce((acc, item) => {
    acc[item.user_id] = item.role as UserRole;
    return acc;
  }, {} as Record<string, UserRole>);
};

const fetchAllPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase.from("patients").select("id, assigned_to");
  if (error) {
    console.error("Error fetching patients for CHP stats:", error);
    throw new Error(error.message);
  }
  return data.map(p => ({ assignedTo: p.assigned_to } as Patient));
}

const Chps = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const { data: chps = [], isLoading: chpsLoading } = useQuery<Profile[]>({
    queryKey: ['chps'],
    queryFn: fetchChps,
  });

  const { data: chpRoles = {} } = useQuery<Record<string, UserRole>>({
    queryKey: ['chp-roles'],
    queryFn: fetchChpRoles,
    enabled: isSuperAdmin,
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['chps-patients'],
    queryFn: fetchAllPatients,
  });

  const chpsData: ChpData[] = useMemo(() => {
    const chpPatientCounts = patients.reduce((acc, patient) => {
      const assignedTo = patient.assignedTo || "Unassigned";
      acc[assignedTo] = (acc[assignedTo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return chps.map((chp) => ({
      ...chp,
      patientCount: chpPatientCounts[chp.id] || 0,
      role: chpRoles[chp.id] || 'chp',
    }));
  }, [chps, patients, chpRoles]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chpToEdit, setChpToEdit] = useState<ChpData | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedChpForRole, setSelectedChpForRole] = useState<ChpData | null>(null);

  const saveChpMutation = useMutation({
    mutationFn: async ({ data, chpId }: { data: ChpFormValues; chpId?: string }) => {
      if (chpId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            first_name: data.name.split(' ')[0] || data.name,
            last_name: data.name.split(' ').slice(1).join(' ') || null,
          })
          .eq("id", chpId);
        if (error) throw error;
      } else {
        // When adding a new CHP, we need to create both profile and role
        const newChpId = crypto.randomUUID();
        
        // Insert profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: newChpId,
            first_name: data.name.split(' ')[0] || data.name,
            last_name: data.name.split(' ').slice(1).join(' ') || null,
          });
        if (profileError) throw profileError;

        // Insert role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: newChpId,
            role: 'chp'
          });
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chps'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['defaulters'] });
      queryClient.invalidateQueries({ queryKey: ['chps-patients'] });
      queryClient.invalidateQueries({ queryKey: ['chp-roles'] });
      toast({
        title: chpToEdit ? "CHP Updated" : "CHP Added",
        description: chpToEdit 
          ? "The community health practitioner has been successfully updated."
          : "The new community health practitioner has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${chpToEdit ? "update" : "add"} CHP. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveChp = (data: ChpFormValues): boolean => {
    saveChpMutation.mutate({ data, chpId: chpToEdit?.id });
    return true;
  };

  const onFormFinished = () => {
    setIsFormOpen(false);
    setChpToEdit(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setChpToEdit(null);
    }
  };

  const openAddForm = () => {
    setChpToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (chp: ChpData) => {
    setChpToEdit(chp);
    setIsFormOpen(true);
  };

  const openRoleDialog = (chp: ChpData) => {
    setSelectedChpForRole(chp);
    setIsRoleDialogOpen(true);
  };

  const getDisplayName = (chp: Profile) => {
    const name = [chp.first_name, chp.last_name].filter(Boolean).join(" ");
    return name || "Unknown User";
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'default';
      case 'chp':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleDisplay = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'chp':
        return 'CHP';
      default:
        return 'User';
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community Health Practitioners</h1>
          <p className="text-muted-foreground">
            A list of community health practitioners and their assigned patients.
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openAddForm}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add CHP
          </Button>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{chpToEdit ? "Edit CHP" : "Add New CHP"}</DialogTitle>
            <DialogDescription>
              {chpToEdit
                ? "Make changes to the CHP's details."
                : "Add a new CHP to the list. You can assign patients later."}
            </DialogDescription>
          </DialogHeader>
          <ChpForm
            onSave={handleSaveChp}
            onFinished={onFormFinished}
            open={isFormOpen}
            initialValues={chpToEdit ? { 
              name: getDisplayName(chpToEdit), 
              contact: ""
            } : undefined}
          />
        </DialogContent>
      </Dialog>

      <RoleAssignDialog
        open={isRoleDialogOpen}
        onOpenChange={setIsRoleDialogOpen}
        chpId={selectedChpForRole?.id || ''}
        chpName={selectedChpForRole ? getDisplayName(selectedChpForRole) : ''}
        currentRole={selectedChpForRole?.role}
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Location</TableHead>
              {isSuperAdmin && <TableHead>Role</TableHead>}
              <TableHead>Assigned Patients</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chpsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>Loading...</TableCell>
                  <TableCell>Loading...</TableCell>
                  <TableCell>Loading...</TableCell>
                  {isSuperAdmin && <TableCell>Loading...</TableCell>}
                  <TableCell>Loading...</TableCell>
                  <TableCell className="text-right">Loading...</TableCell>
                </TableRow>
              ))
            ) : (
              chpsData.map((chp) => (
                <TableRow key={chp.id}>
                  <TableCell className="font-medium">{getDisplayName(chp)}</TableCell>
                  <TableCell>{chp.facility || "Not specified"}</TableCell>
                  <TableCell>
                    {[chp.ward, chp.local_government].filter(Boolean).join(", ") || "Not specified"}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(chp.role || 'chp')}>
                        {getRoleDisplay(chp.role || 'chp')}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>{chp.patientCount}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isSuperAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => openEditForm(chp)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRoleDialog(chp)}>
                              <Shield className="mr-2 h-4 w-4" />
                              <span>Assign Role</span>
                            </DropdownMenuItem>
                          </>
                        )}
                        {!isSuperAdmin && (
                          <DropdownMenuItem disabled>
                            <span className="text-muted-foreground">No actions available</span>
                          </DropdownMenuItem>
                        )}
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
};

export default Chps;
