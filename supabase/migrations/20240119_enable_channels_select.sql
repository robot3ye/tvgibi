-- Enable read access for anon users on channels table
CREATE POLICY "Enable read access for all users" ON "public"."channels"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
