-- Photo attachments for a job (booking's AttachmentsStep photos) - Phase 3
-- of the "real Orders data" plan (2026-09-08), see
-- docs/architecture/component-library.md's `AttachmentsStep` entry and
-- docs/client-booking-flow-prd.md's Attachments step.
--
-- This repo has no local Supabase migrations set up yet, so this file is
-- not run automatically - apply it manually in the Supabase SQL editor.
-- Review before running against production data. Safe to run in full,
-- including re-running after a previous attempt - every statement is
-- idempotent (`if not exists`, `drop policy if exists`).
--
-- REVISED 2026-09-08: a first version of this file assumed
-- `public.job_attachments` didn't exist yet and tried to `create table`
-- it with a `uploaded_by text` column - it turns out this table already
-- existed in this Supabase project (created outside this repo's SQL
-- files, same as `jobs`/`job_assignments`/`job_updates`), with a
-- DIFFERENT, already-decided shape:
--
--   id uuid, job_id uuid not null, user_id uuid not null,
--   content_type text not null, file_url text, text_content text,
--   created_at timestamp without time zone
--
-- This file now only ADDS what was missing (RLS + policies + the Storage
-- bucket) on top of that existing shape - it does not recreate or alter
-- the table's columns. This turns out to be a nicer design than the
-- customer/professional-tagged version originally planned:
--   - `content_type` is NOT a MIME type column, despite the name -
--     confirmed 2026-09-08 via its own check constraint
--     (`job_attachments_content_type_check`: `content_type = ANY
--     (ARRAY['image', 'note'])`). It's a coarse row-kind tag: `'image'`
--     rows use `file_url`, `'note'` rows use `text_content` - this
--     feature only ever inserts `'image'` rows (see
--     `src/lib/queries/jobAttachments.ts`'s `CONTENT_TYPE_IMAGE`).
--   - `user_id` (not a `'customer' | 'professional'` text tag) is simply
--     "whoever uploaded this" (`auth.uid()` at insert time) - a customer
--     and a future professional uploader are handled by the exact same
--     policy shape below, not a separate one added later. Confirmed with
--     the customer 2026-09-08: this table must stay usable by both sides
--     without a schema change when the professional side is built - this
--     already satisfies that, better than the original plan did.
--   - `file_url` holds the *Storage object path* (`{job_id}/{uuid}.{ext}`
--     in the private `job-attachments` bucket below - extension only, no
--     original file name at all, see `jobAttachments.ts`'s
--     `safeFileExtension` doc comment: a real upload 2026-09-08 hit
--     Supabase Storage's "Invalid key" error from a Hebrew/space/
--     parenthesis-containing original file name), not a public URL - the
--     bucket is private, so display code must still exchange this for a
--     short-lived signed URL
--     (`supabase.storage.from('job-attachments').createSignedUrl(...)`).
--     There is no separate original-filename column, and none of the
--     original name survives in the path either.
--   - `text_content` is unused by this feature (a job's free-text note
--     already lives on `jobs.notes` directly) - left null on every row
--     this feature inserts; some other feature may already or later use
--     this table's `text_content`-only shape for a non-photo attachment.

-- =========================================================================
-- 1. Storage bucket
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('job-attachments', 'job-attachments', false)
on conflict (id) do nothing;

-- =========================================================================
-- 2. RLS on the existing `public.job_attachments` table.
--
-- Both policies below use the same "am I involved with this job" check -
-- the job's customer, OR (once that side exists) a professional assigned
-- to it via `job_assignments` - so a future professional-side upload
-- needs no new policy, just a signed-in professional session.
-- =========================================================================

alter table public.job_attachments enable row level security;

drop policy if exists "Users can view attachments on jobs they're involved with" on public.job_attachments;
create policy "Users can view attachments on jobs they're involved with"
  on public.job_attachments for select
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = job_attachments.job_id
        and jobs.customer_id = auth.uid()
    )
    or exists (
      select 1 from public.job_assignments ja
      join public.professionals p on p.id = ja.professional_id
      where ja.job_id = job_attachments.job_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can attach files to jobs they're involved with" on public.job_attachments;
create policy "Users can attach files to jobs they're involved with"
  on public.job_attachments for insert
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from public.jobs
        where jobs.id = job_attachments.job_id
          and jobs.customer_id = auth.uid()
      )
      or exists (
        select 1 from public.job_assignments ja
        join public.professionals p on p.id = ja.professional_id
        where ja.job_id = job_attachments.job_id
          and p.user_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- 3. Storage RLS policies - scope `job-attachments` bucket access the same
-- way as the table above, keyed off the `{job_id}/...` path convention
-- (see this file's top comment).
-- =========================================================================

drop policy if exists "Users can read attachments on jobs they're involved with" on storage.objects;
create policy "Users can read attachments on jobs they're involved with"
  on storage.objects for select
  using (
    bucket_id = 'job-attachments'
    and (
      exists (
        select 1 from public.jobs
        where jobs.id::text = (storage.foldername(name))[1]
          and jobs.customer_id = auth.uid()
      )
      or exists (
        select 1 from public.job_assignments ja
        join public.professionals p on p.id = ja.professional_id
        where ja.job_id::text = (storage.foldername(name))[1]
          and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can upload attachments on jobs they're involved with" on storage.objects;
create policy "Users can upload attachments on jobs they're involved with"
  on storage.objects for insert
  with check (
    bucket_id = 'job-attachments'
    and (
      exists (
        select 1 from public.jobs
        where jobs.id::text = (storage.foldername(name))[1]
          and jobs.customer_id = auth.uid()
      )
      or exists (
        select 1 from public.job_assignments ja
        join public.professionals p on p.id = ja.professional_id
        where ja.job_id::text = (storage.foldername(name))[1]
          and p.user_id = auth.uid()
      )
    )
  );
