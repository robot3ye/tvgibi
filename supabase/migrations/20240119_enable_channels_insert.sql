-- Enable insert for anon users on channels table (since we don't have auth yet)
CREATE POLICY "Enable insert for all users" ON "public"."channels"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);
