
-- This migration removes the user_roles table, effectively deleting the concept 
-- of different user roles like 'CHP' from the database.
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- This command updates the handle_new_user function to remove role assignment logic,
-- as the user_roles table will no longer exist.
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
