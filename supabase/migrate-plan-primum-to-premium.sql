-- Run this once on existing databases that still use enum value 'PRIMUM'.
-- It renames the enum value to 'PREMIUM' without rewriting table data manually.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'Plan'
      AND e.enumlabel = 'PRIMUM'
  ) THEN
    ALTER TYPE "Plan" RENAME VALUE 'PRIMUM' TO 'PREMIUM';
  END IF;
END
$$;
