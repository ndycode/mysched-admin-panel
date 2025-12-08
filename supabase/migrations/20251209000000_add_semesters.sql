-- Migration: Add semester system for academic term management
-- This allows sections to be grouped by semester, enabling:
-- 1. Easy semester transitions without deleting data
-- 2. Historical schedule preservation
-- 3. Clean separation between academic terms

-- 1. Create semesters table
CREATE TABLE IF NOT EXISTS public.semesters (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,                    -- e.g., "2025-2026-1" or "SY2526-1"
  name TEXT NOT NULL,                           -- e.g., "1st Semester 2025-2026"
  academic_year TEXT,                           -- e.g., "2025-2026"
  term INTEGER CHECK (term BETWEEN 1 AND 3),    -- 1 = 1st sem, 2 = 2nd sem, 3 = summer
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add semester_id to sections (nullable for backward compatibility)
ALTER TABLE public.sections 
ADD COLUMN IF NOT EXISTS semester_id BIGINT REFERENCES public.semesters(id);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sections_semester ON public.sections(semester_id);
CREATE INDEX IF NOT EXISTS idx_semesters_active ON public.semesters(is_active) WHERE is_active = true;

-- 4. Function to ensure only one active semester at a time
CREATE OR REPLACE FUNCTION ensure_single_active_semester()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.semesters 
    SET is_active = false, updated_at = now()
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to enforce single active semester
DROP TRIGGER IF EXISTS trg_single_active_semester ON public.semesters;
CREATE TRIGGER trg_single_active_semester
  BEFORE INSERT OR UPDATE OF is_active ON public.semesters
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_semester();

-- 6. Create a default semester for existing sections (optional)
-- Uncomment and modify if you want to migrate existing data:
-- 
-- INSERT INTO public.semesters (code, name, academic_year, term, is_active)
-- VALUES ('2024-2025-2', '2nd Semester 2024-2025', '2024-2025', 2, true)
-- ON CONFLICT (code) DO NOTHING;
--
-- UPDATE public.sections 
-- SET semester_id = (SELECT id FROM public.semesters WHERE code = '2024-2025-2')
-- WHERE semester_id IS NULL;

-- 7. Add RLS policies for semesters (if RLS is enabled)
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read semesters
CREATE POLICY "Allow read access to semesters" ON public.semesters
  FOR SELECT USING (true);

-- Allow admins to manage semesters
CREATE POLICY "Allow admins to manage semesters" ON public.semesters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

-- 8. Comment for documentation
COMMENT ON TABLE public.semesters IS 'Academic semesters/terms for grouping sections';
COMMENT ON COLUMN public.semesters.is_active IS 'Only one semester can be active at a time';
COMMENT ON COLUMN public.sections.semester_id IS 'Links section to a specific academic semester';
