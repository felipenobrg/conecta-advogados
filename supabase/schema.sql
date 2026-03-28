-- Conecta Advogados - Supabase schema (PostgreSQL)
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Enums used by application and Prisma models
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('CLIENT', 'LAWYER', 'ADMIN');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
    CREATE TYPE "Plan" AS ENUM ('START', 'PRO', 'PREMIUM');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStatus') THEN
    CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONVERTED', 'LOST');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubStatus') THEN
    CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE');
  END IF;
END
$$;

-- Core users table (matches Prisma model naming)
create table if not exists public."User" (
  "id" text primary key default gen_random_uuid()::text,
  "email" text not null unique,
  "name" text not null,
  "phone" text not null,
  "whatsappVerified" boolean not null default false,
  "role" "Role" not null default 'CLIENT',
  "plan" "Plan" not null default 'START',
  "planExpiresAt" timestamptz null,
  "createdAt" timestamptz not null default now()
);

-- Leads captured by onboarding/traffic
create table if not exists public."Lead" (
  "id" text primary key default gen_random_uuid()::text,
  "name" text not null,
  "email" text not null,
  "phone" text not null,
  "whatsappVerified" boolean not null default false,
  "area" text not null,
  "state" text not null,
  "status" "LeadStatus" not null default 'PENDING',
  "createdAt" timestamptz not null default now()
);

-- Lead unlock relation (lawyer x lead)
create table if not exists public."LeadUnlock" (
  "id" text primary key default gen_random_uuid()::text,
  "leadId" text not null references public."Lead"("id") on delete cascade,
  "userId" text not null references public."User"("id") on delete cascade,
  "unlockedAt" timestamptz not null default now(),
  constraint "LeadUnlock_leadId_userId_key" unique ("leadId", "userId")
);

create index if not exists "LeadUnlock_leadId_idx" on public."LeadUnlock" ("leadId");
create index if not exists "LeadUnlock_userId_idx" on public."LeadUnlock" ("userId");

-- Subscription state linked to users
create table if not exists public."Subscription" (
  "id" text primary key default gen_random_uuid()::text,
  "userId" text not null unique references public."User"("id") on delete cascade,
  "provider" text not null,
  "providerId" text not null,
  "status" "SubStatus" not null,
  "plan" "Plan" not null,
  "createdAt" timestamptz not null default now()
);

-- Lawyer professional profile (separate flow from client/lead)
create table if not exists public."LawyerProfile" (
  "id" text primary key default gen_random_uuid()::text,
  "userId" text not null unique references public."User"("id") on delete cascade,
  "officeName" text not null,
  "officeLogoUrl" text,
  "oabNumber" text not null,
  "oabState" text not null,
  "age" integer not null,
  "gender" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "LawyerProfile_oabNumber_oabState_key" unique ("oabNumber", "oabState")
);

create index if not exists "LawyerProfile_userId_idx" on public."LawyerProfile" ("userId");

-- Onboarding step persistence table used by /api/onboarding/step
create table if not exists public.onboarding_steps (
  session_id text not null,
  step integer not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, step)
);

-- OTP persistence for multi-instance validation and rate limiting.
create table if not exists public.otp_sessions (
  id text primary key default gen_random_uuid()::text,
  phone text not null,
  code_hash text not null,
  requester_ip text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists otp_sessions_phone_created_idx on public.otp_sessions (phone, created_at desc);
create index if not exists otp_sessions_ip_created_idx on public.otp_sessions (requester_ip, created_at desc);
create index if not exists otp_sessions_active_idx on public.otp_sessions (phone, expires_at) where consumed_at is null;

-- Optional helper table for tracking unlock policy events
create table if not exists public.unlock_policy_audit (
  id bigserial primary key,
  lead_id text not null,
  checked_user_id text not null,
  eligible boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);
