-- Add password_hash field for username-based auth simulation
-- Note: We'll use Supabase Auth with email but generate email from username

-- Create a function to get or create user by username
CREATE OR REPLACE FUNCTION public.get_profile_by_username(p_username TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_online BOOLEAN,
  last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    profiles.id,
    profiles.user_id,
    profiles.username,
    profiles.display_name,
    profiles.avatar_url,
    profiles.is_online,
    profiles.last_seen
  FROM public.profiles
  WHERE profiles.username = p_username;
END;
$$;

-- Allow public access to check username availability
CREATE POLICY "Anyone can check username availability" ON public.profiles
  FOR SELECT TO anon USING (true);