import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, LogOut, LogIn, User as UserIcon, AlertTriangle, History, FileText, UsersRound, Building2, SearchCheck, ArrowRightLeft, ShieldCheck, MessageSquareText, Activity, Hospital } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry",
};

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, profile, role } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/defaulters", label: "Defaulters", icon: AlertTriangle },
    { href: "/client-search", label: "Client Search", icon: SearchCheck },
    { href: "/transfers", label: "Transfers", icon: ArrowRightLeft },
    { href: "/reminders", label: "Reminders", icon: History },
  ];

  // Facility officers, PMs, and admins can see SMS run analytics
  if (role === 'facility_officer' || role === 'program_manager' || role === 'system_admin') {
    navItems.push({ href: "/sms-runs", label: "SMS Runs", icon: Activity });
  }

  // System Admin oversight dashboard
  if (role === 'system_admin') {
    navItems.push({ href: "/admin", label: "Admin", icon: ShieldCheck });
  }

  // Show for managers and admins
  if (role === 'program_manager' || role === 'system_admin') {
    navItems.push({ href: "/team", label: "Team", icon: UsersRound });
    navItems.push({ href: "/facilities", label: "Facilities", icon: Building2 });
    navItems.push({ href: "/admin/phcs", label: "PHC Management", icon: Hospital });
    navItems.push({ href: "/sms-templates", label: "SMS Templates", icon: MessageSquareText });
    navItems.push({ href: "/audit-log", label: "Audit Log", icon: FileText });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b justify-between">
        <div className="flex items-center min-w-0">
          <Logo className="h-9 w-auto group-data-[collapsible=icon]:hidden" />
          <Logo className="h-8 w-8 hidden group-data-[collapsible=icon]:block" />
        </div>
        <div className="hidden lg:block">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.href}
                tooltip={{ children: item.label, side: "right" }}
              >
                <NavLink to={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                <UserIcon className="h-8 w-8 rounded-full bg-primary/10 text-primary p-1.5 shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">
                    {profile?.first_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                  {role && (
                    <Badge variant="outline" className="text-[10px] mt-1 w-fit">
                      {roleLabels[role] || role}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
                <LogOut />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <Button asChild className="w-full justify-start">
              <NavLink to="/auth">
                <LogIn />
                <span>Login / Sign Up</span>
              </NavLink>
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
