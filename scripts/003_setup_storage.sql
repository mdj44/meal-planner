-- Create storage bucket for recipe uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recipe-uploads', 'recipe-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for recipe uploads
CREATE POLICY "recipe_uploads_select_all" ON storage.objects FOR SELECT 
USING (bucket_id = 'recipe-uploads');

CREATE POLICY "recipe_uploads_insert_authenticated" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'recipe-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "recipe_uploads_update_own" ON storage.objects FOR UPDATE 
USING (bucket_id = 'recipe-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "recipe_uploads_delete_own" ON storage.objects FOR DELETE 
USING (bucket_id = 'recipe-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
