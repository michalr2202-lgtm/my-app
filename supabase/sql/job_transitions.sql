-- Job status transition RPCs - added 2026-09-09, closing the loop
-- discussed at length with the user: nothing in this repo, before this
-- file, ever advances a job past `searching_professional` (the status
-- `submit_booking` creates it at, in address_book.sql). Everything past
-- that point was documented only (docs/project-prd.md §5) - no
-- professional auth, no professional app, no RPC.
--
-- Scope, deliberately NOT the full professional app (per that discussion):
-- these two RPCs are the real, reusable backend contract the eventual
-- professional app will call - nothing here is throwaway or needs
-- redesigning later. What IS temporary/provisional, clearly marked below:
--   1. Both RPCs take an explicit actor id/status as a parameter instead
--      of reading it from a real professional's own authenticated session
--      (`auth.uid()`) - there is no professional login yet. Tightening
--      this later is a one-line change (read `auth.uid()` instead of a
--      parameter), not a redesign - the write logic itself doesn't move.
--   2. Both are granted to `authenticated` (not revoked, unlike
--      `delete_address`/`restore_address` in address_book.sql) so the
--      dev-only test harness (`src/app/dev/job-actions/page.tsx`) can
--      call them directly from a signed-in customer's own browser session
--      without a separate service-role code path - acceptable ONLY
--      because this route is unlinked from any nav and this whole file is
--      an internal testing tool, not because a customer SHOULD be able to
--      call these. MUST be revoked from `authenticated` (same pattern as
--      `delete_address` below) once either a real professional session
--      exists to gate on instead, or this app is exposed beyond internal
--      testing - do not treat the current grant as a long-term decision.
--   3. `advance_job_status` below (added 2026-09-09, same day as this
--      file) now validates `p_new_status` against a real transition
--      graph keyed on the job's CURRENT status, instead of accepting any
--      of the 9 statuses from any status - see
--      `docs/order-model.md`'s "Confirmed transition graph (v1)" section
--      for the full graph and its rationale. Two pieces of that graph are
--      still open product decisions, not modeled precisely here (see
--      that doc's "Open questions"): (a) exactly who can cancel and until
--      when - v1 allows `cancelled` from every non-terminal status as a
--      placeholder; (b) whether `incomplete_work` still exists as its
--      own status - v1 makes it unreachable (excluded from every
--      transition list), since "didn't finish this session" now routes
--      through `rescheduled` instead, per a customer decision.
--
-- Schema caveats (this repo has no local migrations - `jobs`/
-- `job_assignments`/`job_updates`/`professionals` all live in Supabase,
-- created outside this repo, same as `job_attachments` was before
-- job_attachments.sql's header comment - see that file's "REVISED" note
-- for the exact kind of mismatch that already happened once with this
-- pattern). `job_updates`'s shape IS confirmed here (read directly by
-- `src/lib/queries/notifications.ts`: `job_id, type, priority, data
-- jsonb, created_at`). `job_assignments`'s exact column list is NOT
-- confirmed beyond `job_id`/`professional_id` (read via a nested select in
-- `src/lib/queries/jobRow.ts`, which doesn't prove what else the table
-- requires on insert) - if `accept_job` below fails on a NOT NULL column
-- this comment doesn't account for, run this diagnostic first (same
-- approach job_attachments.sql's fix used) and adjust the insert:
--
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'job_assignments';
--
-- Safe to run in full, including re-running after a previous attempt -
-- `create or replace function` and `drop function if exists` are
-- idempotent. Apply manually in the Supabase SQL editor.

-- =========================================================================
-- 0. One-time manual seed: a test professional to accept jobs against, per
-- the documented MVP professional-onboarding model (project-prd.md §14 -
-- "created manually in DB", no public professional signup).
--
-- `public.users.id` is documented (project-prd.md §11) as being the SAME
-- id as `auth.users.id` - almost certainly FK-enforced (every other
-- user-linked row in this schema assumes that), so a synthetic uuid with
-- no matching `auth.users` row would fail here. Create the auth user
-- first (Supabase Dashboard -> Authentication -> Users -> Add User - any
-- placeholder phone/email works, e.g. a phone number you don't otherwise
-- use), then substitute its uuid for YOUR_TEST_PROFESSIONAL_AUTH_ID below.
-- =========================================================================

insert into public.users (id, phone, first_name, last_name, role)
values ('5a532701-1873-41cf-8b69-a0058ab979e6', '+972500000000', 'בדיקה', 'קבלן', 'professional')
on conflict (id) do update set role = 'professional';

insert into public.professionals (user_id)
values ('5a532701-1873-41cf-8b69-a0058ab979e6')
on conflict (user_id) do nothing
returning id;
-- ^ Copy the returned `id` (or, if the `on conflict` skipped the insert
-- because it already exists, `select id from public.professionals where
-- user_id = 'YOUR_TEST_PROFESSIONAL_AUTH_ID'`) - that's the
-- `professionalId` the dev test harness needs for "accept as...".

-- =========================================================================
-- 1. accept_job - the "first professional to accept wins" transition
-- (project-prd.md §5 "Accept Job"): searching_professional -> confirmed.
-- Deliberately skips modeling `pending_approval` as its own separately-
-- triggered step (see order-model.md: "brief transitional state before
-- assignment finalized") - nothing else acts during that window today, so
-- this goes straight to `confirmed` in one atomic call. Revisit only if a
-- real second actor (e.g. a finalization step) is ever introduced there.
-- =========================================================================

drop function if exists public.accept_job(uuid, uuid);

create or replace function public.accept_job(
  p_job_id uuid,
  p_professional_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
  v_professional_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'accept_job: no authenticated user';
  end if;

  select exists (select 1 from public.professionals where id = p_professional_id)
    into v_professional_exists;

  if not v_professional_exists then
    raise exception 'accept_job: professional % not found', p_professional_id;
  end if;

  -- Atomic first-to-accept-wins: only succeeds if the job is still
  -- unassigned - the only legal entry into `confirmed` per the v1
  -- transition graph (docs/order-model.md). A real business rule,
  -- enforced here even though only the dev test harness calls this today
  -- (see this file's header).
  update public.jobs
  set status = 'confirmed'
  where id = p_job_id and status = 'searching_professional'
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'accept_job: job % is not awaiting a professional (already accepted/cancelled, or does not exist)', p_job_id;
  end if;

  insert into public.job_assignments (job_id, professional_id)
  values (p_job_id, p_professional_id);

  insert into public.job_updates (job_id, type, priority, data)
  values (
    p_job_id,
    'professional_assigned',
    'normal',
    jsonb_build_object('message', 'נמצא בעל מקצוע להזמנה שלך')
  );
end;
$$;

grant execute on function public.accept_job to authenticated;

-- =========================================================================
-- 2. advance_job_status - one shared RPC for every status past
-- `confirmed` (on_the_way / arrived / in_progress / completed / cancelled /
-- waiting_for_customer / waiting_for_professional / rescheduled), instead
-- of one bespoke RPC per status - they're all the same shape (flip
-- `jobs.status`, log a `job_updates` row). As of 2026-09-09 this DOES
-- validate that `p_new_status` is a legal transition from the job's
-- CURRENT status (v1 graph below, mirrored in `docs/order-model.md`) -
-- jumping straight from `confirmed` to `completed`, for example, is now
-- rejected. `incomplete_work` is deliberately excluded from every branch
-- below (unreachable) - see this file's header comment, item 3.
-- =========================================================================

drop function if exists public.advance_job_status(uuid, text);

create or replace function public.advance_job_status(
  p_job_id uuid,
  p_new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
  v_current_status text;
  v_valid_next_statuses text[];
  v_notification_type text;
  v_notification_message text;
  v_notification_priority text := 'normal';
begin
  if auth.uid() is null then
    raise exception 'advance_job_status: no authenticated user';
  end if;

  select status into v_current_status from public.jobs where id = p_job_id;

  if v_current_status is null then
    raise exception 'advance_job_status: job % not found', p_job_id;
  end if;

  -- v1 transition graph (docs/order-model.md "Confirmed transition graph
  -- (v1)") - see this file's header comment, item 3, for what's still
  -- provisional here (the cancellation cutoff, and incomplete_work's
  -- absence). `rescheduled` from `on_the_way`/`arrived` covers "ran into
  -- a problem before starting work" (confirmed by the customer
  -- 2026-09-09 for `on_the_way`; extended to `arrived` as the same kind
  -- of pre-work-start moment, not separately confirmed) - the actual
  -- professional-facing "I hit a problem" screen/flow that triggers this
  -- is intentionally out of scope here; only the resulting status
  -- transition is modeled.
  v_valid_next_statuses := case v_current_status
    -- `searching_professional`/`pending_approval` -> `cancelled` (added
    -- 2026-10-01, closing a real code/doc mismatch): both were already
    -- documented in docs/order-model.md's "Confirmed Transition Graph
    -- (v1)" (`searching_professional` explicitly; `pending_approval` only
    -- implicitly, via docs/cancellation-and-rescheduling.md's "Customer-
    -- Side Cancellation" scope, which includes it alongside `confirmed`/
    -- `rescheduled`) but neither branch actually existed here before this
    -- change - both silently fell through to the `else` (no valid
    -- transitions at all), which would have made `JobDetailsScreen`'s new
    -- customer self-service cancel action fail with a RAISE EXCEPTION for
    -- a `searching_professional` job specifically (the one status that
    -- same feature cancels unconditionally, regardless of the 2-hour
    -- window - see that doc's "Customer-Side Cancellation UI" section).
    -- `pending_approval` is still unreachable in practice today (no real
    -- job can have this status - see order-model.md), so this half is
    -- precautionary, not something currently exercised.
    when 'searching_professional' then array['cancelled']
    when 'pending_approval' then array['cancelled']
    when 'confirmed' then array['on_the_way', 'cancelled', 'rescheduled']
    when 'on_the_way' then array['arrived', 'waiting_for_customer', 'cancelled', 'rescheduled']
    when 'arrived' then array['in_progress', 'waiting_for_customer', 'cancelled', 'rescheduled']
    when 'waiting_for_customer' then array['on_the_way', 'arrived', 'cancelled']
    when 'in_progress' then array['completed', 'rescheduled', 'waiting_for_professional', 'cancelled']
    when 'waiting_for_professional' then array['in_progress', 'cancelled']
    when 'rescheduled' then array['confirmed']
    else array[]::text[]
  end;

  if not (p_new_status = any(v_valid_next_statuses)) then
    raise exception 'advance_job_status: cannot move job % from % to % (not a valid transition - use accept_job for searching_professional -> confirmed)', p_job_id, v_current_status, p_new_status;
  end if;

  update public.jobs
  set status = p_new_status
  where id = p_job_id
  returning id into v_updated_id;

  -- Notification copy mirrors COPY.notification.customer.* in
  -- src/lib/copy.json exactly, and `type` mirrors the keys
  -- src/lib/notificationVisuals.ts already maps to an icon/tone - so a
  -- row inserted here renders on the Home Screen's banner exactly like a
  -- real one would.
  v_notification_type := case p_new_status
    when 'on_the_way' then 'on_the_way'
    when 'arrived' then 'arrived'
    when 'completed' then 'job_summary'
    when 'cancelled' then 'cancelled'
    when 'rescheduled' then 'rescheduled'
    else 'system_info'
  end;

  v_notification_message := case p_new_status
    when 'on_the_way' then 'בעל המקצוע בדרך אליך'
    when 'arrived' then 'בעל המקצוע הגיע ליעד'
    when 'completed' then 'העבודה הושלמה – סיכום מוכן לצפייה'
    when 'cancelled' then 'העבודה בוטלה'
    when 'rescheduled' then 'נקבע מועד חדש להשלמת העבודה'
    else 'הסטטוס עודכן ל-' || p_new_status
  end;

  if p_new_status = 'cancelled' then
    v_notification_priority := 'critical';
  elsif p_new_status in ('on_the_way', 'arrived') then
    v_notification_priority := 'urgent';
  end if;

  insert into public.job_updates (job_id, type, priority, data)
  values (p_job_id, v_notification_type, v_notification_priority, jsonb_build_object('message', v_notification_message));
end;
$$;

grant execute on function public.advance_job_status to authenticated;
