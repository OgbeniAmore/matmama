import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LogoSplash, useLogoSplash } from '@/components/layout/LogoSplash';

const ProtectedRoute = () => {
  const { user, loading, profile } = useAuth();
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

  // A missing profile is no longer treated as a hard failure — the app shell
  // loads and the workspace finishes provisioning in the background.


  return (
    <>
      {splash.visible && <LogoSplash onDone={splash.dismiss} />}
      <Outlet />
    </>
  );
};

export default ProtectedRoute;
