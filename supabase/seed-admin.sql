-- Conecta Advogados - Fake admin seed for Supabase
-- Run after schema.sql.
-- WARNING: use only for development/testing.

create extension if not exists pgcrypto;

do $$
declare
  admin_email text := 'admin@conecteadvogados.local';
  admin_password text := 'Admin@123456';
  admin_name text := 'Admin Fake Conecta';
  admin_uuid uuid;
begin
  -- Reuse existing auth user if present
  select id into admin_uuid from auth.users where email = admin_email limit 1;

  if admin_uuid is null then
    admin_uuid := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_uuid,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'ADMIN'),
      jsonb_build_object('full_name', admin_name, 'role', 'ADMIN'),
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      admin_uuid,
      jsonb_build_object('sub', admin_uuid::text, 'email', admin_email),
      'email',
      admin_email,
      now(),
      now(),
      now()
    );
  end if;

  -- App user record (Prisma table)
  insert into public."User" (
    "id", "email", "name", "phone", "whatsappVerified", "role", "plan"
  ) values (
    admin_uuid::text,
    admin_email,
    admin_name,
    '+5511999999999',
    true,
    'ADMIN',
    'PRIMUM'
  )
  on conflict ("email") do update
  set
    "name" = excluded."name",
    "phone" = excluded."phone",
    "whatsappVerified" = true,
    "role" = 'ADMIN',
    "plan" = 'PRIMUM';

  -- Active subscription for admin test account
  insert into public."Subscription" (
    "userId", "provider", "providerId", "status", "plan"
  ) values (
    admin_uuid::text,
    'internal',
    'internal-admin-seed',
    'ACTIVE',
    'PRIMUM'
  )
  on conflict ("userId") do update
  set
    "status" = 'ACTIVE',
    "plan" = 'PRIMUM',
    "provider" = 'internal',
    "providerId" = 'internal-admin-seed';
end
$$;

-- Login credentials (dev only)
-- email: admin@conecteadvogados.local
-- senha: Admin@123456
