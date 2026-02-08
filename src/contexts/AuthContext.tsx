import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'system_admin' | 'program_manager' | 'facility_officer' | 'data_entry_officer';

export type Profile = {
  id: string;
  user_id: string;
  account_id: string;
  facility_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  accountId: string | null;
  facilityId: string | null;
  signOut: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error('Profile fetch error:', err);
      return null;
    }
  }, []);

  const fetchRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      return (data?.role as UserRole) ?? null;
    } catch (err) {
      console.error('Role fetch error:', err);
      return null;
    }
  }, []);

  const setupAccount = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.functions.invoke('setup-account');
      if (error) {
        console.error('Setup account error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Setup account error:', err);
      return false;
    }
  }, []);

  const initializeUser = useCallback(async (currentUser: User) => {
    let userProfile = await fetchProfile(currentUser.id);

    if (!userProfile) {
      const success = await setupAccount();
      if (success) {
        // Brief delay for profile to be queryable through RLS
        await new Promise(resolve => setTimeout(resolve, 800));
        userProfile = await fetchProfile(currentUser.id);
      }
    }

    if (userProfile) {
      setProfile(userProfile);
      const userRole = await fetchRole(currentUser.id);
      setRole(userRole);
    }

    setLoading(false);
  }, [fetchProfile, fetchRole, setupAccount]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        initializeUser(currentSession.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);

      if (newUser) {
        initializeUser(newUser);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initializeUser]);

  const signOut = async () => {
    setProfile(null);
    setRole(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      role,
      accountId: profile?.account_id ?? null,
      facilityId: profile?.facility_id ?? null,
      signOut,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
