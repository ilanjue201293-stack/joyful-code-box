-- ENUMS
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.script_status AS ENUM ('working','patched','updating'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.source_status AS ENUM ('ready','needs_modification'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.access_method AS ENUM ('free','sellauth','paypal','ltc','discord'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('sellauth','paypal','ltc'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- USER ROLES (table first, then function, then policies)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "user_roles own read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_roles admin insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "user_roles admin update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "user_roles admin delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SCRIPTS
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  screenshots TEXT[] DEFAULT '{}',
  cover_screenshot TEXT,
  youtube_url TEXT,
  discord_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status public.script_status NOT NULL DEFAULT 'working',
  source_code TEXT DEFAULT '',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  payment_method public.payment_method,
  sellauth_url TEXT,
  paypal_url TEXT,
  ltc_address TEXT,
  verified_by_nalyy BOOLEAN NOT NULL DEFAULT false,
  badges TEXT[] DEFAULT '{}',
  views INTEGER NOT NULL DEFAULT 0,
  developer TEXT DEFAULT 'Nalyy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT (id,name,slug,description,features,screenshots,cover_screenshot,youtube_url,discord_url,tags,status,is_premium,payment_method,sellauth_url,paypal_url,ltc_address,verified_by_nalyy,badges,views,developer,created_at,updated_at) ON public.scripts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scripts read all" ON public.scripts FOR SELECT USING (true);
CREATE POLICY "scripts admin write" ON public.scripts FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scripts_updated BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SOURCES
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  screenshots TEXT[] DEFAULT '{}',
  cover_screenshot TEXT,
  discord_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status public.source_status NOT NULL DEFAULT 'ready',
  source_code TEXT DEFAULT '',
  access_method public.access_method NOT NULL DEFAULT 'free',
  sellauth_url TEXT,
  paypal_url TEXT,
  ltc_address TEXT,
  discord_redirect_url TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT (id,name,slug,description,screenshots,cover_screenshot,discord_url,tags,status,access_method,sellauth_url,paypal_url,ltc_address,discord_redirect_url,views,created_at,updated_at) ON public.sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources read all" ON public.sources FOR SELECT USING (true);
CREATE POLICY "sources admin write" ON public.sources FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_sources_updated BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  script_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_user_script_unique UNIQUE (user_id, script_id),
  CONSTRAINT reviews_script_fk FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE,
  CONSTRAINT reviews_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews read all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews insert own" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews update own" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews delete own or admin" ON public.reviews FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- LIKES
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, script_id)
);
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes read own" ON public.likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "likes own write" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes own delete" ON public.likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_script_likes_count(_script_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(*)::int FROM public.likes WHERE script_id = _script_id $$;
CREATE OR REPLACE FUNCTION public.get_total_likes_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(*)::int FROM public.likes $$;
GRANT EXECUTE ON FUNCTION public.get_script_likes_count(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_total_likes_count() TO anon, authenticated, service_role;

-- FAVORITES
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, script_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites own all" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STORES
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores read all" ON public.stores FOR SELECT USING (true);
CREATE POLICY "stores owner update" ON public.stores FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "stores admin write" ON public.stores FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- STORE PRODUCTS
CREATE TABLE IF NOT EXISTS public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image TEXT,
  cover_screenshot TEXT,
  payment_method public.payment_method NOT NULL DEFAULT 'sellauth',
  sellauth_url TEXT,
  paypal_url TEXT,
  ltc_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store read all" ON public.store_products FOR SELECT USING (true);
CREATE POLICY "store admin write" ON public.store_products FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_store_updated BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STORE REQUESTS
CREATE TABLE IF NOT EXISTS public.store_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_name text NOT NULL,
  store_logo text,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_requests TO authenticated;
GRANT ALL ON public.store_requests TO service_role;
ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr own read" ON public.store_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sr own insert" ON public.store_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sr admin update" ON public.store_requests FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sr admin delete" ON public.store_requests FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  discord_url TEXT,
  webhook_url TEXT,
  default_ltc_address TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings admin read" ON public.site_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "settings admin write" ON public.site_settings FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- ADMIN CODES
CREATE TABLE IF NOT EXISTS public.admin_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID,
  used_by UUID,
  used_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_codes TO authenticated;
GRANT ALL ON public.admin_codes TO service_role;
ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_codes admin read" ON public.admin_codes FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_codes admin write" ON public.admin_codes FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Storage policies for 'media' bucket
CREATE POLICY "media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
CREATE POLICY "media authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media');
CREATE POLICY "media authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media');