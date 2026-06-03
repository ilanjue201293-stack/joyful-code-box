
-- Fix duplicate FKs that break PostgREST embeds
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_profile_fk;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_script_fk;

-- Add kind to store_products + extra fields mirroring scripts/sources
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'script' CHECK (kind IN ('script','source')),
  ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS discord_url text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS access_method text,
  ADD COLUMN IF NOT EXISTS discord_redirect_url text,
  ADD COLUMN IF NOT EXISTS source_code text DEFAULT '';

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  kind text NOT NULL DEFAULT 'admin_broadcast',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif own read" ON public.notifications;
CREATE POLICY "notif own read" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "notif own update" ON public.notifications;
CREATE POLICY "notif own update" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "notif own delete" ON public.notifications;
CREATE POLICY "notif own delete" ON public.notifications FOR DELETE USING (auth.uid() = recipient_id);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (recipient_id, created_at DESC);

-- NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  free_script boolean NOT NULL DEFAULT true,
  paid_script boolean NOT NULL DEFAULT true,
  free_source boolean NOT NULL DEFAULT true,
  paid_source boolean NOT NULL DEFAULT true,
  new_store boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prefs own all" ON public.notification_preferences;
CREATE POLICY "prefs own all" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PRODUCT BUYERS (verified by admin)
CREATE TABLE IF NOT EXISTS public.product_buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.product_buyers TO anon, authenticated;
GRANT ALL ON public.product_buyers TO service_role;
ALTER TABLE public.product_buyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyers read all" ON public.product_buyers;
CREATE POLICY "buyers read all" ON public.product_buyers FOR SELECT USING (true);
DROP POLICY IF EXISTS "buyers admin write" ON public.product_buyers;
CREATE POLICY "buyers admin write" ON public.product_buyers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PRODUCT REVIEWS (only buyers can post)
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "previews read all" ON public.product_reviews;
CREATE POLICY "previews read all" ON public.product_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "previews insert buyers only" ON public.product_reviews;
CREATE POLICY "previews insert buyers only" ON public.product_reviews FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.product_buyers b WHERE b.product_id = product_reviews.product_id AND b.user_id = auth.uid())
);
DROP POLICY IF EXISTS "previews update own" ON public.product_reviews;
CREATE POLICY "previews update own" ON public.product_reviews FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "previews delete own or admin" ON public.product_reviews;
CREATE POLICY "previews delete own or admin" ON public.product_reviews FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- FKs to enable embeds
ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_user_profiles_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_product_fk FOREIGN KEY (product_id) REFERENCES public.store_products(id) ON DELETE CASCADE;
ALTER TABLE public.product_buyers
  ADD CONSTRAINT product_buyers_user_profiles_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.product_buyers
  ADD CONSTRAINT product_buyers_product_fk FOREIGN KEY (product_id) REFERENCES public.store_products(id) ON DELETE CASCADE;
