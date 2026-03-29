-- Fix schema mismatch for public lead submission and Prisma Lead model
-- Run in Supabase SQL Editor

alter table if exists public."Lead"
  add column if not exists "clientId" text null references public."User"("id") on delete set null,
  add column if not exists "statusUpdatedAt" timestamptz null,
  add column if not exists "statusUpdatedBy" "Role" null,
  add column if not exists "updatedAt" timestamptz not null default now();

create index if not exists "Lead_clientId_idx" on public."Lead" ("clientId");

-- Keep updatedAt maintained automatically
create or replace function public.set_updated_at_lead()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists trg_lead_updated_at on public."Lead";
create trigger trg_lead_updated_at
before update on public."Lead"
for each row execute function public.set_updated_at_lead();
