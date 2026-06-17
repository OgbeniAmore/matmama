
-- Drop the user_roles table and its related functions
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop the app_role enum type
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Drop the role-related functions
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- Update the handle_new_user function to remove role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles only
  INSERT INTO public.profiles (id, first_name, last_name, local_government, ward, facility)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'local_government',
    new.raw_user_meta_data ->> 'ward',
    new.raw_user_meta_data ->> 'facility'
  );
  
  RETURN NEW;
END;
$$;
