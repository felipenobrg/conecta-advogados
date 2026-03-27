-- Conecta Advogados - Safe admin seed for Supabase
-- Run after schema.sql.
-- IMPORTANT: create the auth user first in Supabase Dashboard (Authentication > Users > Add user)
-- Email suggested: admin@conecteadvogados.local

create extension if not exists pgcrypto;

do $$
declare
  admin_email text := 'admin@conecteadvogados.local';
  admin_name text := 'Admin Fake Conecta';
  admin_uuid uuid;
begin
  -- Use existing auth user id created by Supabase Auth
  select id into admin_uuid from auth.users where email = admin_email limit 1;

  if admin_uuid is null then
    raise exception 'Auth user % nao encontrado. Crie primeiro no Dashboard Supabase > Authentication > Users.', admin_email;
  end if;

  -- App user record
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

-- Result: auth user + app admin role linked.
