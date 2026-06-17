import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, AlertTriangle, Menu, History, User, FileText, LogOut, UsersRound, Building2, SearchCheck, ArrowRightLeft, Bell, Activity, MessageSquareText, ShieldCheck, Hospital } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/defaulters", label: "Alerts", icon: AlertTriangle },
];

export function BottomNav() {
  const location = useLocation();
  const { signOut, role, profile } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium rounded-lg transition-colors min-w-[60px]",
                location.pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", location.pathname === item.href && "stroke-[2.5px]")} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium rounded-lg transition-colors min-w-[60px]",
              moreOpen ? "text-primary" : "text-muted-foreground active:text-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left">
              {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Menu'}
            </SheetTitle>
          </SheetHeader>
          <Separator />
          <div className="grid gap-1 py-3">
            <NavLink
              to="/client-search"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
            >
              <SearchCheck className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Client Search</span>
            </NavLink>
            <NavLink
              to="/transfers"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
            >
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Transfer Requests</span>
            </NavLink>
            <NavLink
              to="/reminders"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
            >
              <History className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Reminder History</span>
            </NavLink>
            {(role === 'facility_officer' || role === 'program_manager' || role === 'system_admin') && (
              <NavLink
                to="/sms-runs"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
              >
                <Activity className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">SMS Runs</span>
              </NavLink>
            )}
            {(role === 'program_manager' || role === 'system_admin') && (
              <>
                <NavLink
                  to="/team"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                >
                  <UsersRound className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Team Management</span>
                </NavLink>
                <NavLink
                  to="/facilities"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Facilities</span>
                </NavLink>
                <NavLink
                  to="/admin/phcs"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                >
                  <Hospital className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">PHC Management</span>
                </NavLink>
                <NavLink
                  to="/sms-templates"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                >
                  <MessageSquareText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">SMS Templates</span>
                </NavLink>
                <NavLink
                  to="/audit-log"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Audit Log</span>
                </NavLink>
              </>
            )}
            {role === 'system_admin' && (
              <NavLink
                to="/admin"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
              >
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">System Admin</span>
              </NavLink>
            )}
            <NavLink
              to="/profile"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Profile & Settings</span>
            </NavLink>
            <NavLink
              to="/notification-preferences"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Notification Preferences</span>
            </NavLink>
            <Separator className="my-1" />
            <button
              onClick={() => { signOut(); setMoreOpen(false); }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 active:bg-destructive/10 transition-colors text-destructive w-full text-left"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
