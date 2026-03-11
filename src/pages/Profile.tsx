
import PasswordForm from "@/components/profile/PasswordForm";
import ProfileForm from "@/components/profile/ProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry Officer",
};

const allPermissions = [
  { label: "View clients", roles: ["system_admin", "program_manager", "facility_officer", "data_entry_officer"] },
  { label: "Create & edit clients", roles: ["system_admin", "program_manager", "facility_officer", "data_entry_officer"] },
  { label: "Delete clients", roles: ["system_admin", "program_manager", "facility_officer"] },
  { label: "Manage transfers", roles: ["system_admin", "program_manager", "facility_officer"] },
  { label: "Manage team members", roles: ["system_admin", "program_manager"] },
  { label: "Manage facilities", roles: ["system_admin", "program_manager"] },
  { label: "View audit logs", roles: ["system_admin", "program_manager"] },
  { label: "Export data", roles: ["system_admin", "program_manager"] },
];

export default function ProfilePage() {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Profile & Settings</h1>
      <div className="grid gap-6 lg:grid-cols-1">
        <ProfileForm />

        {/* Permissions Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissions
                </CardTitle>
                <CardDescription>Your current role and access rights.</CardDescription>
              </div>
              {role && <Badge>{roleLabels[role] || role}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {allPermissions.map((perm) => {
                const hasAccess = role ? perm.roles.includes(role) : false;
                return (
                  <div key={perm.label} className="flex items-center gap-2 text-sm">
                    {hasAccess ? (
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={hasAccess ? "" : "text-muted-foreground/60"}>{perm.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <PasswordForm />

        {/* Link to notification preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Manage which alerts you receive and how they're delivered.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/notification-preferences">Manage Preferences</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
