-- Booking Flow: Authentication + New User Details
-- Backend deliverable for docs/client-booking-flow-prd.md Steps 5/6 + "Submission".
--
-- This repo has no local Supabase migrations set up yet, so this file is not
-- run automatically - apply it manually in the Supabase SQL editor (or wire
-- it into `supabase db push` / a migrations folder later, if/when that's set
-- up for this project). Review before running against production data.
--
-- Prerequisites this assumes:
--   - `public.users.id` is intended to equal `auth.users.id` (see
--     docs/project-prd.md §11) - i.e. this table is a profile extension of
--     Supabase Auth, not an independently-keyed identity.
--   - Phone/OTP auth (`supabase.auth.signInWithOtp` / `verifyOtp`) is enabled
--     with an SMS provider configured in the Supabase Auth dashboard - not
--     something this SQL file can set up.

-- =========================================================================
-- 1. Row Level Security - every customer may only read/write their own row.
-- Required for the client-side "does this phone already have a profile"
-- check (a plain `select` from `public.users` scoped to `auth.uid()`) to be
-- safe to run directly from the browser with the anon key.
-- =========================================================================

alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

alter table public.addresses enable row level security;

create policy "Users can view their own addresses"
  on public.addresses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own addresses"
  on public.addresses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own addresses"
  on public.addresses for update
  using (auth.uid() = user_id);

-- `public.jobs` - required for `submit_booking` below to be able to create
-- the job row at all. Without an insert policy here, RLS silently blocks the
-- insert with "new row violates row-level security policy for table jobs"
-- (Postgres error 42501) - this was reproduced live and is the root cause of
-- the "submission error" on the final "שלח הזמנה" tap: the whole
-- `submit_booking` transaction (including the brand-new profile/address rows
-- that come before it) then rolls back, so nothing is saved - which is also
-- why a returning customer's address never appears to "stick" between
-- separate booking attempts.
--
-- fetchActiveJob (src/lib/queries/activeJob.ts) needs the select policy for
-- the same customer_id-scoped read to actually return rows instead of
-- silently matching zero rows under RLS.

alter table public.jobs enable row level security;

create policy "Customers can view their own jobs"
  on public.jobs for select
  using (auth.uid() = customer_id);

create policy "Customers can insert their own jobs"
  on public.jobs for insert
  with check (auth.uid() = customer_id);

-- =========================================================================
-- 2. Atomic submission RPC.
--
-- Creating the Job (and, for a brand-new profile, the users/addresses rows
-- first) must not partially succeed - a failure partway through must not
-- leave an orphaned profile with no job, or a job with no address. Postgres
-- functions run in their own transaction, so any exception here rolls back
-- everything automatically.
--
-- `security invoker` (not `security definer`): runs as the calling user, so
-- it is still bound by the RLS policies above - it does not bypass them,
-- it just lets one client call replace several separate round-trips.
--
-- Profile fields (p_first_name onward) are only provided by the client when
-- NewUserDetailsStep collected them (a brand-new phone). When they're null,
-- this assumes a profile + default address already exist for auth.uid() -
-- true for both "session + profile complete" (Attachments terminal) and
-- "no session, but phone already has a profile" (Authentication terminal).
-- =========================================================================

create or replace function public.submit_booking(
  p_service_id uuid,
  p_scheduled_time timestamptz,
  p_notes text,
  p_first_name text default null,
  p_last_name text default null,
  p_city text default null,
  p_street text default null,
  p_building_number text default null,
  p_apartment text default null,
  p_entrance_code text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_address_id uuid;
  v_job_id uuid;
begin
  if v_user_id is null then
    raise exception 'submit_booking: no authenticated user';
  end if;

  if p_first_name is not null then
    -- Brand-new profile path (NewUserDetailsStep was shown).
    insert into public.users (id, phone, first_name, last_name, role)
    values (v_user_id, auth.jwt() ->> 'phone', p_first_name, p_last_name, 'customer')
    on conflict (id) do nothing;

    insert into public.addresses (user_id, city, street, building_number, apartment, entrance_code, is_default)
    values (v_user_id, p_city, p_street, p_building_number, p_apartment, p_entrance_code, true)
    returning id into v_address_id;
  else
    -- Returning profile - reuse the existing default address.
    select id into v_address_id
    from public.addresses
    where user_id = v_user_id and is_default = true
    limit 1;

    if v_address_id is null then
      raise exception 'submit_booking: no default address found for existing user %', v_user_id;
    end if;
  end if;

  insert into public.jobs (customer_id, address_id, service_id, scheduled_time, notes, status)
  values (v_user_id, v_address_id, p_service_id, p_scheduled_time, p_notes, 'searching_professional')
  returning id into v_job_id;

  return v_job_id;
end;
$$;

grant execute on function public.submit_booking to authenticated;
