-- Add dose_day column to medications table for weekly dosing schedule
-- dose_day: 0=Sunday, 1=Monday, ..., 6=Saturday

ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS dose_day INTEGER CHECK (dose_day >= 0 AND dose_day <= 6);

-- Update frequency constraint to be 'weekly' only (for GLP-1 medications like Wegovy, Mounjaro)
-- Note: Keeping existing constraint for backward compatibility, but new entries will use 'weekly'
