-- 1. Add screenshots array + slug to store_products
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS screenshots TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill: existing image -> screenshots[0], generate slug
UPDATE public.store_products
SET screenshots = CASE WHEN image IS NOT NULL AND coalesce(array_length(screenshots,1),0)=0 THEN ARRAY[image] ELSE screenshots END
WHERE image IS NOT NULL;

UPDATE public.store_products
SET slug = lower(regexp_replace(coalesce(name,'product'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE public.store_products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS store_products_slug_unique ON public.store_products(slug);

-- 2. Add FK store_requests.user_id -> profiles.id so PostgREST embed profiles(username) works
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='store_requests_user_id_profiles_fkey') THEN
    ALTER TABLE public.store_requests
      ADD CONSTRAINT store_requests_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Same for reviews (so admin panel embeds work)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviews_user_id_profiles_fkey') THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviews_script_id_scripts_fkey') THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_script_id_scripts_fkey
      FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
  END IF;
END $$;
