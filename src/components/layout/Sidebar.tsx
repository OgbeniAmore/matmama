
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, HeartPulse } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r fixed h-full">
      <div className="flex items-center justify-center h-20 border-b">
        <HeartPulse className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold ml-2">FamilyFocus</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-2 text-gray-700 rounded-md hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
            <h3 className="font-semibold">Need Help?</h3>
            <p className="text-sm text-gray-600 mt-1">Contact support for any questions.</p>
            <Button size="sm" className="mt-3 w-full">Contact</Button>
        </div>
      </div>
    </aside>
  );
}
