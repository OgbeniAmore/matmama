import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Users, AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    console.error("404: unknown route", location.pathname);
  }, [location.pathname]);

  const links: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/clients", label: "Clients", icon: Users },
    { to: "/defaulters", label: "Defaulters", icon: AlertTriangle },
  ];

  if (role === "system_admin") links.push({ to: "/admin", label: "Admin", icon: Home });
  if (role === "program_manager" || role === "system_admin") {
    links.push({ to: "/team", label: "Team", icon: Users });
    links.push({ to: "/facilities", label: "Facilities", icon: Home });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center"><Logo className="h-10 w-auto" /></div>
        <div>
          <h1 className="text-5xl font-bold text-primary">404</h1>
          <p className="text-lg text-muted-foreground mt-2">
            We couldn't find <span className="font-mono text-foreground">{location.pathname}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button asChild>
            <Link to={user ? "/" : "/auth"}>
              <Home className="h-4 w-4 mr-2" /> {user ? "Go to Dashboard" : "Sign In"}
            </Link>
          </Button>
        </div>

        {user && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">Or jump to:</p>
            <div className="grid grid-cols-2 gap-2">
              {links.map((l) => (
                <Button key={l.to} asChild variant="ghost" size="sm" className="justify-start">
                  <Link to={l.to}>
                    <l.icon className="h-4 w-4 mr-2" /> {l.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;
