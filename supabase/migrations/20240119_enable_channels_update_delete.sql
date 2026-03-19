-- Enable update and delete access for anon users on channels table
CREATE POLICY "Enable update for all users" ON "public"."channels"
AS PERMISSIVE FOR UPDATE
TO public
USING (true);

CREATE POLICY "Enable delete for all users" ON "public"."channels"
AS PERMISSIVE FOR DELETE
TO public
USING (true);
