-- Add creator column to programs table
ALTER TABLE programs ADD COLUMN IF NOT EXISTS creator TEXT;
