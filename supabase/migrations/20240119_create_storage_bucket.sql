-- Create storage bucket for channel logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('channel-logos', 'channel-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to channel logos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'channel-logos' );

-- Policy to allow anon users to upload channel logos
CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'channel-logos' );

-- Policy to allow update/delete (optional, for editing later)
CREATE POLICY "Allow Update/Delete"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id = 'channel-logos' );
