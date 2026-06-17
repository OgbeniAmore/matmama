
-- Add new location-related columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN country TEXT NOT NULL DEFAULT 'Nigeria',
ADD COLUMN state TEXT NOT NULL DEFAULT 'Lagos',
ADD COLUMN local_government TEXT,
ADD COLUMN ward TEXT,
ADD COLUMN facility TEXT;

-- Update the function to populate the new fields during user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
