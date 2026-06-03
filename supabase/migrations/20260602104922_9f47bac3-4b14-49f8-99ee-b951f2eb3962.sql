
-- 1) user_roles: lock down writes (only admins can grant/revoke roles)
CREATE POLICY "user_roles admin insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_roles admin update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_roles admin delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) likes: restrict SELECT to own rows; expose counts via SECURITY DEFINER functions
DROP POLICY IF EXISTS "likes read all" ON public.likes;
CREATE POLICY "likes read own" ON public.likes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_script_likes_count(_script_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(*)::int FROM public.likes WHERE script_id = _script_id $$;

CREATE OR REPLACE FUNCTION public.get_total_likes_count()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(*)::int FROM public.likes $$;

REVOKE EXECUTE ON FUNCTION public.get_script_likes_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_total_likes_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_script_likes_count(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_total_likes_count() TO anon, authenticated, service_role;

-- 3) scripts.source_code: revoke column-level SELECT from public/anon/authenticated.
-- Service role (server functions) keeps full access via GRANT ALL.
REVOKE SELECT ON public.scripts FROM anon, authenticated;
GRANT SELECT (id, name, slug, description, tags, features, screenshots, youtube_url,
  discord_url, status, is_premium, payment_method, sellauth_url, paypal_url,
  ltc_address, verified_by_nalyy, badges, views, developer, created_at, updated_at)
  ON public.scripts TO anon, authenticated;

-- sources.source_code: same treatment
REVOKE SELECT ON public.sources FROM anon, authenticated;
GRANT SELECT (id, name, slug, description, screenshots, discord_url, tags, status,
  access_method, sellauth_url, paypal_url, ltc_address, discord_redirect_url, views,
  created_at, updated_at)
  ON public.sources TO anon, authenticated;

-- 4) site_settings: restrict SELECT to admin only (contains webhook_url + LTC address)
DROP POLICY IF EXISTS "settings read all" ON public.site_settings;
CREATE POLICY "settings admin read" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
