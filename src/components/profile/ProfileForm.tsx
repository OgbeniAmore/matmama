import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry Officer",
};

export default function ProfileForm() {
  const { user, profile, role } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.first_name || user?.user_metadata.first_name || '',
      lastName: profile?.last_name || user?.user_metadata.last_name || '',
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);

    // Update profiles table
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_name: data.firstName, last_name: data.lastName })
        .eq('user_id', user.id);

      if (profileError) {
        toast.error(profileError.message);
        setLoading(false);
        return;
      }
    }

    // Also update user_metadata
    const { error } = await supabase.auth.updateUser({
      data: { first_name: data.firstName, last_name: data.lastName },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profile updated successfully!');
      await supabase.auth.refreshSession();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </div>
          {role && (
            <Badge variant="secondary">{roleLabels[role] || role}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {user?.email && (
              <div className="text-sm text-muted-foreground">
                Email: {user.email}
              </div>
            )}
            <Button type="submit" disabled={loading || !form.formState.isDirty}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
