
-- Create user_roles table to store user role assignments
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'chp', 'supervisor', 'data_clerk')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view all user roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage user roles" 
  ON public.user_roles 
  FOR ALL 
  USING (true);

-- Create index for efficient querying
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Insert some sample CHP users (optional - you can remove this if not needed)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'chp'
FROM public.profiles
WHERE facility IS NOT NULL
LIMIT 5;
