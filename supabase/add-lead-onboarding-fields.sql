-- Add fields required by the new public conversational lead onboarding flow.
ALTER TABLE public."Lead"
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "problemDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "urgency" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "gender" TEXT;

-- Optional check constraints for safer values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_urgency_check'
  ) THEN
    ALTER TABLE public."Lead"
      ADD CONSTRAINT lead_urgency_check
      CHECK ("urgency" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_gender_check'
  ) THEN
    ALTER TABLE public."Lead"
      ADD CONSTRAINT lead_gender_check
      CHECK ("gender" IS NULL OR "gender" IN ('F', 'M', 'O', 'N'));
  END IF;
END $$;

-- Helpful index for filtering by location and intake area.
CREATE INDEX IF NOT EXISTS "Lead_state_city_area_idx"
  ON public."Lead" ("state", "city", "area");
