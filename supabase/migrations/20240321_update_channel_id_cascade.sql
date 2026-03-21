-- Update foreign key constraint on programs to cascade updates from channels
ALTER TABLE programs
  DROP CONSTRAINT IF EXISTS programs_channel_id_fkey,
  ADD CONSTRAINT programs_channel_id_fkey 
    FOREIGN KEY (channel_id) 
    REFERENCES channels(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
