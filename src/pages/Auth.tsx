
import AuthForm from "@/components/auth/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function AuthPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md p-6 md:p-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-lg">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <Logo className="h-14 w-auto" />
          </div>
          <p className="text-muted-foreground">Sign in or create an account to continue</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
