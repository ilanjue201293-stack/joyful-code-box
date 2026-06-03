
-- unique constraint to make review upsert work
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_script_unique UNIQUE (user_id, script_id);

-- FKs so PostgREST embed queries (admin dashboard) work
ALTER TABLE public.reviews ADD CONSTRAINT reviews_script_fk FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.store_products ADD CONSTRAINT store_products_store_fk FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
