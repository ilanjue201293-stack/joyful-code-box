
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_since timestamptz;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS premium_price numeric NOT NULL DEFAULT 5;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS premium_paypal_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS premium_ltc_address text;

GRANT SELECT ON public.site_settings TO anon, authenticated;

DROP POLICY IF EXISTS "settings public read" ON public.site_settings;
CREATE POLICY "settings public read"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);
