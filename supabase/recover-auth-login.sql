-- Conecta Advogados - Recovery script for broken admin auth seed
-- Use this if login returns 500: "Database error querying schema"
-- Run in Supabase SQL Editor.

-- Remove old malformed admin auth/user rows from previous manual seed
DO $$
DECLARE
  bad_user_id uuid;
BEGIN
  SELECT id INTO bad_user_id FROM auth.users WHERE email = 'admin@conecteadvogados.local' LIMIT 1;

  IF bad_user_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = bad_user_id;
    DELETE FROM auth.sessions WHERE user_id = bad_user_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = bad_user_id;
    DELETE FROM auth.users WHERE id = bad_user_id;
  END IF;

  DELETE FROM public."Subscription" WHERE "userId" IN (
    SELECT "id" FROM public."User" WHERE "email" = 'admin@conecteadvogados.local'
  );

  DELETE FROM public."User" WHERE "email" = 'admin@conecteadvogados.local';
END
$$;

-- After this script:
-- 1) Create admin user in Supabase Dashboard > Authentication > Users > Add user
--    email: admin@conecteadvogados.local
--    password: Admin@123456
-- 2) Run supabase/seed-admin.sql
