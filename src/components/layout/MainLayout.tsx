import { Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, HeartPulse } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry",
};

export function MainLayout() {
  const { signOut, profile, role } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <AppSidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-14 items-center gap-3 border-b bg-muted/40 px-4 md:px-6">
            {/* Sidebar trigger - tablet only */}
            <SidebarTrigger className="hidden md:block lg:hidden" />

            {/* Mobile logo */}
            <div className="flex items-center gap-2 md:hidden">
              <HeartPulse className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">FamilyFocus</span>
            </div>

            <div className="flex-1" />

            {/* Role badge - all screens */}
            {role && (
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {roleLabels[role] || role}
              </Badge>
            )}

            {/* User menu - desktop */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {profile?.first_name
                      ? `${profile.first_name} ${profile.last_name || ''}`
                      : 'My Account'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 pb-20 md:pb-6 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
        {/* Mobile bottom navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
