CREATE TABLE public.premium_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  used_by uuid,
  used_at timestamptz,
  revoked boolean not null default false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_codes TO authenticated;
GRANT ALL ON public.premium_codes TO service_role;

ALTER TABLE public.premium_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "premium_codes admin read" ON public.premium_codes
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "premium_codes admin write" ON public.premium_codes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add 'premium' to access_method enum for sources so Premium pass unlocks them
ALTER TYPE access_method ADD VALUE IF NOT EXISTS 'premium';