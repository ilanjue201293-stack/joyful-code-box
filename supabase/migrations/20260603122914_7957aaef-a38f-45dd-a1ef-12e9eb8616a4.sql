
-- 1. Backfill profiles for any existing auth user that doesn't have one
INSERT INTO public.profiles (id, username, avatar_url)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'username', u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
       u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2. Ensure trigger exists so new signups always get a profile row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure default site_settings row exists
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 4. Allow admins to INSERT site_settings (needed for upsert())
DROP POLICY IF EXISTS "settings admin insert" ON public.site_settings;
CREATE POLICY "settings admin insert"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
