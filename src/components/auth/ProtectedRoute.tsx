import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoSplash, useLogoSplash } from '@/components/layout/LogoSplash';

const ProtectedRoute = () => {
  const { user, loading, profile, signOut } = useAuth();
  const splash = useLogoSplash(!loading && !!user && !!profile);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Setting up your workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4 p-4 text-center">
        <p className="text-destructive font-medium">Account setup failed</p>
        <p className="text-muted-foreground text-sm max-w-sm">
          We couldn't set up your workspace. Please try signing out and back in.
        </p>
        <Button variant="outline" onClick={signOut}>Sign Out & Retry</Button>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
