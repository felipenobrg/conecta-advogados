-- Fix: missing Prisma table public."LawyerProfile"
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

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

-- Optional: ensure onboarding support table exists as well``
create table if not exists public.onboarding_steps (
  session_id text not null,
  step integer not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, step)
);
