CREATE POLICY "Service role only - select lead pdfs" ON storage.objects FOR SELECT TO service_role USING (bucket_id = 'lead-pdfs');
CREATE POLICY "Service role only - insert lead pdfs" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'lead-pdfs');
CREATE POLICY "Service role only - update lead pdfs" ON storage.objects FOR UPDATE TO service_role USING (bucket_id = 'lead-pdfs') WITH CHECK (bucket_id = 'lead-pdfs');
CREATE POLICY "Service role only - delete lead pdfs" ON storage.objects FOR DELETE TO service_role USING (bucket_id = 'lead-pdfs');