
-- STORES
CREATE TABLE public.stores (
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
CREATE POLICY "stores owner update" ON public.stores FOR UPDATE USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "stores admin write" ON public.stores FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- STORE_REQUESTS
CREATE TABLE public.store_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_name text NOT NULL,
  store_logo text,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.store_requests TO authenticated;
GRANT UPDATE, DELETE ON public.store_requests TO authenticated;
GRANT ALL ON public.store_requests TO service_role;
ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr own read" ON public.store_requests FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "sr own insert" ON public.store_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sr admin update" ON public.store_requests FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "sr admin delete" ON public.store_requests FOR DELETE USING (has_role(auth.uid(),'admin'));

-- store_products: link to a store
ALTER TABLE public.store_products ADD COLUMN store_id uuid;
