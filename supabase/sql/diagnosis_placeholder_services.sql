-- Diagnosis-priced placeholder services (one per category).
-- Backend deliverable for the "no_price_yet" fix - see
-- docs/client-booking-flow-prd.md "Submission" and src/components/client/
-- booking/BookingFlowSheet.tsx (`diagnosisServiceId`).
--
-- This is a brand-new file - nothing in it has been run against this
-- project before, so it's safe to copy/run in full (unlike
-- booking_flow_auth.sql, which already has earlier sections applied - only
-- run NEW sections from that file, never the whole thing again). This file
-- is also safe to re-run: the insert below is a no-op for any category that
-- already has its placeholder row.
--
-- Why this exists: the "no_price_yet" match outcome (a category is
-- confidently matched, e.g. "אינסטלטור", but no priced catalog service
-- fits the query) has nothing to put in `jobs.service_id`, a required FK
-- (see project-prd.md §11) - submitting a job from that population fails
-- with a foreign-key violation without it. One placeholder service per
-- CATEGORY (not one single global row) is required, not just convenient -
-- `jobs` has no `category_id` column of its own, so professional-matching
-- ("job sent to all professionals in the relevant category", per
-- project-prd.md §6/13) can only ever resolve a job's category via
-- `jobs.service_id -> services.category_id`. A single shared placeholder
-- would silently misroute every "no_price_yet" job outside whichever one
-- category it happened to be assigned to.
--
-- Why a new `is_diagnosis_placeholder` column (rather than reusing
-- `is_active = false` alone, or `pricing_type = 'diagnosis'` alone) as the
-- lookup key:
--   - `is_active = false` is necessary (keeps it out of
--     `fetchServicesWithCategory`'s catalog - i.e. invisible to AI
--     matching, `SearchMatchStep` pills, and any "popular services" list),
--     but isn't a sufficient search key on its own - plenty of ordinary
--     retired services could also end up `is_active = false` over time.
--   - `pricing_type = 'diagnosis'` is already a real, meaningful value for
--     genuine catalog services that a customer *can* select from
--     `SearchMatchStep` but whose exact price still needs an in-person
--     diagnosis (see `SearchMatchStep.tsx`) - it does not mean "this row is
--     a synthetic placeholder", so it can't double as that signal either.
-- Hence a dedicated boolean that means exactly one thing.

alter table public.services
  add column if not exists is_diagnosis_placeholder boolean not null default false;

insert into public.services (
  category_id,
  name_en,
  label_he,
  description,
  keywords,
  price_min,
  price_max,
  pricing_type,
  is_active,
  is_diagnosis_placeholder,
  sort_order
)
select
  c.id,
  c.name_en || '_diagnosis_placeholder',
  'אבחון - ' || c.label_he,
  null,
  array[]::text[],
  0,
  0,
  'diagnosis',
  false,
  true,
  999
from public.categories c
where c.is_active = true
  and not exists (
    select 1 from public.services s
    where s.category_id = c.id and s.is_diagnosis_placeholder = true
  );
