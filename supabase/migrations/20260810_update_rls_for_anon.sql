DROP POLICY IF EXISTS "Enable all access for authenticated users on content_pool" ON public.content_pool;
DROP POLICY IF EXISTS "Enable all access for authenticated users on channel_pool_config" ON public.channel_pool_config;

CREATE POLICY "Enable all access for all users on content_pool" 
    ON public.content_pool FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for all users on channel_pool_config" 
    ON public.channel_pool_config FOR ALL USING (true) WITH CHECK (true);