
import AuthForm from "@/components/auth/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";

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
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-lg">
        <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
                <HeartPulse className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">FamilyFocus</h1>
            </div>
          <p className="text-muted-foreground">Sign in or create an account to continue</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
