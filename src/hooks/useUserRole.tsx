
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'super_admin' | 'chp' | 'user';

const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
  const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
  
  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
  
  return data;
};

export const useUserRole = () => {
  const { user } = useAuth();
  
  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: () => fetchUserRole(user!.id),
    enabled: !!user?.id,
  });

  const isSuperAdmin = userRole === 'super_admin';
  const isChp = userRole === 'chp';

  return {
    userRole,
    isSuperAdmin,
    isChp,
    isLoading,
  };
};
