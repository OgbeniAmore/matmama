
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, Shield, Lock, Mail } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const lagosLgasAndLcdas = [
  "Agege","Agbado/Oke-Odo","Agboyi-Ketu","Ajeromi-Ifelodun","Alimosho",
  "Amuwo-Odofin","Apapa","Apapa-Iganmu","Ayobo-Ipaja","Badagry",
  "Badagry West","Bariga","Coker-Aguda","Egbe-Idimu","Ejigbo",
  "Epe","Eredo","Eti-Osa","Eti-Osa East","Iba",
  "Ibeju-Lekki","Ifako-Ijaiye","Ifelodun","Igando-Ikotun","Igbogbo-Baiyeku",
  "Ijede","Ikeja","Ikorodu","Ikorodu North","Ikorodu West",
  "Ikosi-Ejinrin","Ikosi-Isheri","Ikoyi-Obalende","Imota","Iru Victoria Island",
  "Isolo","Itire-Ikate","Kosofe","Lagos Island","Lagos Island East",
  "Lagos Mainland","Lekki","Mosan-Okunola","Mushin","Odi-Olowo/Ojuwoye",
  "Ojo","Ojodu","Ojokoro","Olorunda","Onigbongbo",
  "Oriade","Orile Agege","Oshodi-Isolo","Oto-Awori","Shomolu",
  "Surulere","Yaba",
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score < 30) return { score, label: "Weak", color: "bg-destructive" };
  if (score < 60) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score < 80) return { score, label: "Good", color: "bg-blue-500" };
  return { score: Math.min(score, 100), label: "Strong", color: "bg-green-500" };
}

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localGovernment, setLocalGovernment] = useState('');
  const [ward, setWard] = useState('');
  const [facility, setFacility] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent! Check your email.");
      setIsForgotPassword(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            local_government: localGovernment,
            ward: ward,
            facility: facility,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user && data.session) {
        toast.success('Signed up successfully!');
        navigate('/');
      } else if (data.user) {
        toast.success('Please check your email for a confirmation link to complete registration.');
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setLocalGovernment('');
        setWard('');
        setFacility('');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed in successfully!');
        navigate('/');
      }
    }
    setLoading(false);
  };

  if (isForgotPassword) {
    return (
      <form onSubmit={handleForgotPassword} className="space-y-5">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Lock className="h-5 w-5" />
          <span className="text-sm font-medium">Reset your password</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            We'll send a password reset link to this address.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
        <button
          type="button"
          onClick={() => setIsForgotPassword(false)}
          className="w-full text-center text-sm text-primary hover:underline"
        >
          Back to Sign In
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleAuth} className="space-y-5">
      {isSignUp && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" type="text" value="Nigeria" readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" type="text" value="Lagos" readOnly className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="localGovernment">Local Government</Label>
              <Select onValueChange={setLocalGovernment} value={localGovernment}>
                <SelectTrigger id="localGovernment">
                  <SelectValue placeholder="Select a local government" />
                </SelectTrigger>
                <SelectContent>
                  {lagosLgasAndLcdas.map((lg) => (
                    <SelectItem key={lg} value={lg}>{lg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Input id="ward" type="text" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Oregun" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facility">Facility</Label>
              <Input id="facility" type="text" value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="e.g. Oregun General Hospital" />
            </div>
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="pl-9 pr-10"
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="space-y-1">
            <Progress value={passwordStrength.score} className="h-1.5" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Password strength: <span className="font-medium">{passwordStrength.label}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {!isSignUp && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsForgotPassword(true)}
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
      </Button>

      {isSignUp && (
        <p className="text-xs text-center text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="font-medium text-primary hover:underline"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </form>
  );
}
