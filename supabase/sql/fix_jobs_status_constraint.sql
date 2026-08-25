-- Fix: `public.jobs.status` check constraint is out of sync with the
-- documented order lifecycle.
--
-- This is a brand-new file - safe to copy/run in full, and safe to re-run
-- (drops the constraint only if present, then re-adds it).
--
-- Root cause (reproduced live 2026-08-21, right after the jobs RLS fix):
-- submitting a booking failed with Postgres error 23514
-- ("new row for relation \"jobs\" violates check constraint
-- \"jobs_status_check\""). Probing the constraint by trial-inserting
-- candidate values directly (bypassing `submit_booking`, which hardcodes
-- the literal and so can't be used to probe) showed the live constraint
-- only allows: pending, on_the_way, arrived, in_progress, completed,
-- cancelled - a smaller, different vocabulary than what the rest of the
-- app already uses.
--
-- The actual intended lifecycle is documented in full in
-- docs/order-model.md ("Order Lifecycle") and mirrored exactly by
-- `JobStatus` in src/lib/types.ts (13 states, confirmed against a live
-- schema per that file's own header comment) - `submit_booking` already
-- inserts new jobs with `status = 'searching_professional'`, the correct
-- first persisted state per that lifecycle (`Draft` itself is never
-- written to the DB - see client-booking-flow-prd.md: closing the sheet
-- before submission discards the draft, no partial Job row is created).
-- So the code and docs are already correct - only the DB constraint needed
-- to catch up to them. (`pending` - the one value the old constraint
-- allowed that isn't part of the documented lifecycle at all - is
-- dropped here rather than kept alongside the real set, to avoid two
-- overlapping "not started yet" concepts.)

alter table public.jobs drop constraint if exists jobs_status_check;

alter table public.jobs add constraint jobs_status_check check (
  status in (
    'draft',
    'searching_professional',
    'pending_approval',
    'confirmed',
    'on_the_way',
    'arrived',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled',
    'waiting_for_customer',
    'waiting_for_professional',
    'incomplete_work'
  )
);
