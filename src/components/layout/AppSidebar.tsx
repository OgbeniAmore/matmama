
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
import { LayoutDashboard, Users, HeartPulse } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200">
            FamilyFocus
          </h1>
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
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <h3 className="font-semibold">Need Help?</h3>
          <p className="text-sm text-gray-600 mt-1">
            Contact support for any questions.
          </p>
          <Button size="sm" className="mt-3 w-full">
            Contact
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
