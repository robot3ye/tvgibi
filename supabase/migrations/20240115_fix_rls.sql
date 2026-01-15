
-- Enable RLS for programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (Drop first to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for all users" ON programs;
CREATE POLICY "Enable read access for all users" ON programs FOR SELECT USING (true);

-- Allow insert/update/delete access to anon role (for development)
-- IN PRODUCTION: You should restrict this to authenticated users only!
DROP POLICY IF EXISTS "Enable insert for anon" ON programs;
CREATE POLICY "Enable insert for anon" ON programs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for anon" ON programs;
CREATE POLICY "Enable update for anon" ON programs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for anon" ON programs;
CREATE POLICY "Enable delete for anon" ON programs FOR DELETE USING (true);
