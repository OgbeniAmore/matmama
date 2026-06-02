
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, Shield, ShieldAlert, Lock, Mail, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LAGOS_LGAS } from "@/lib/lagos-lgas";
import { LAGOS_WARDS } from "@/lib/lagos-wards";
import { LAGOS_PHCS } from "@/lib/lagos-phcs";

const OTHER_PHC = "__other__";

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

async function checkLeakedPassword(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) return false;

    const text = await response.text();
    return text.split('\n').some(line => line.startsWith(suffix));
  } catch {
    return false;
  }
}

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [leakedProtection, setLeakedProtection] = useState(true);
  const [checkingLeak, setCheckingLeak] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localGovernment, setLocalGovernment] = useState('');
  const [ward, setWard] = useState('');
  const [facility, setFacility] = useState('');
  const [facilitySelect, setFacilitySelect] = useState('');
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

      if (leakedProtection) {
        setCheckingLeak(true);
        const isLeaked = await checkLeakedPassword(password);
        setCheckingLeak(false);
        if (isLeaked) {
          toast.error("This password has been found in a data breach. Please choose a different password for your security.");
          setLoading(false);
          return;
        }
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
        setFacilitySelect('');
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || 'Google sign-in failed');
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    toast.success('Signed in successfully!');
    navigate('/');
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
    <div className="space-y-5">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>
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
              <Select
                onValueChange={(v) => { setLocalGovernment(v); setWard(''); setFacility(''); setFacilitySelect(''); }}
                value={localGovernment}
              >
                <SelectTrigger id="localGovernment">
                  <SelectValue placeholder="Select a local government" />
                </SelectTrigger>
                <SelectContent>
                  {LAGOS_LGAS.map((lg) => (
                    <SelectItem key={lg} value={lg}>{lg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Select
                onValueChange={(v) => { setWard(v); setFacility(''); setFacilitySelect(''); }}
                value={ward}
                disabled={!localGovernment}
              >
                <SelectTrigger id="ward">
                  <SelectValue placeholder={localGovernment ? "Select a ward" : "Select an LGA first"} />
                </SelectTrigger>
                <SelectContent>
                  {(LAGOS_WARDS[localGovernment] ?? []).map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="facility">Primary Health Centre (PHC)</Label>
              <Select
                value={facilitySelect}
                onValueChange={(v) => {
                  setFacilitySelect(v);
                  setFacility(v === OTHER_PHC ? '' : v);
                }}
                disabled={!localGovernment}
              >
                <SelectTrigger id="facility">
                  <SelectValue placeholder={localGovernment ? "Select a PHC" : "Select an LGA first"} />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const wards = LAGOS_PHCS[localGovernment] ?? {};
                    const list = ward ? (wards[ward] ?? []) : Object.values(wards).flat();
                    return list.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ));
                  })()}
                  <SelectItem value={OTHER_PHC}>Other (not listed)</SelectItem>
                </SelectContent>
              </Select>
              {facilitySelect === OTHER_PHC && (
                <Input
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder="Enter PHC / facility name"
                  className="mt-2"
                />
              )}
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
        {isSignUp && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3 mt-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-medium">Leaked password protection</p>
                <p className="text-[10px] text-muted-foreground">Block passwords found in data breaches</p>
              </div>
            </div>
            <Switch
              checked={leakedProtection}
              onCheckedChange={setLeakedProtection}
            />
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

      <Button type="submit" className="w-full" disabled={loading || checkingLeak}>
        {checkingLeak ? 'Checking password safety...' : loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
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
    </div>
  );
}
