-- Lightweight address book: lets a returning customer pick a previously
-- used address, add a new one, or edit one of their own - see the
-- "Address Book" subsection of docs/client-booking-flow-prd.md
-- "Submission", and ChooseAddressStep.tsx for the client side.
--
-- Safe to run in full, including re-running after a previous attempt -
-- every statement is idempotent (`add column if not exists`, `drop
-- function if exists`, `create or replace function`).
--
-- `created_at` (list-order use confirmed 2026-09-03): `ChooseAddressStep`'s
-- list sorts by this, ascending - oldest (i.e. first-ever-added) address on
-- top, most recently added at the bottom - deliberately NOT by `is_default`
-- any more, which used to jump the most-recently-*used* address to the top
-- of the list every time it changed. With `MAX_TOTAL_ADDRESSES = 3` there's
-- nothing to scroll past either way, so a list that never reorders itself
-- is strictly better than one that saves a moment of scanning at the cost
-- of the customer never being sure where anything will be next time. Which
-- row shows the selected checkmark is still driven entirely by `is_default`
-- (see `fetchUserAddresses`/`loadReturningProfile`) - display order and
-- "what's selected" are two separate concerns now, not the same sort.
--
-- `is_default` means "most recently used", not a fixed pin: every
-- successful submission flips it onto whichever address that submission
-- just used and off every other address for that user. This is intentional
-- (confirmed 2026-08-23) - simplest MVP heuristic, no separate "set as
-- default" UI needed. A future fixed "home"/"work" pin would be an additive
-- change (e.g. a nullable `label` column) and wouldn't need to revisit this.
--
-- `is_primary` (added 2026-09-01) is a completely separate, never-changing
-- flag: `true` only for the one address created together with the profile
-- (the brand-new-profile branch of `submit_booking` below, via
-- `NewUserDetailsStep`), `false` for every address added afterward via
-- `add_address`. Unlike `is_default`, this never moves once set - it's the
-- only reliable way to answer "is this the account holder's own original
-- address" (confirmed 2026-09-01, replacing an earlier attempt at reusing
-- `is_default` for this, which doesn't work since `is_default` shifts to
-- whichever address was most recently *used*, not the one first created).
-- Two consequences, both enforced in `ChooseAddressStep.tsx` (client) and
-- `add_address`/`update_address` (server, defense-in-depth) below:
--   1. The primary address always shows the account holder's own
--      first/last name (from `public.users`, locked/non-editable) as its
--      first line when edited - never `contact_name`/`contact_phone`.
--   2. The primary address can never carry a `contact_name`/`contact_phone`
--      override at all - it's definitionally the account holder's own
--      place. This is also what keeps the other-contact cap simple: with
--      `MAX_TOTAL_ADDRESSES = 3` and the primary address never eligible,
--      at most the 2 *additional* addresses can ever have another contact
--      - exactly `MAX_OTHER_CONTACT_ADDRESSES`.
--
-- `contact_name`/`contact_phone` (confirmed 2026-08-23): who the
-- professional should actually expect to meet/call at this address, when
-- it's not the account holder (e.g. booking for a parent) - deliberately
-- separate from `public.users.first_name`/`last_name`/`phone`, which stay
-- the fixed billing/accountable identity on the job regardless of which
-- saved address is used. Only ever settable on a non-primary address (see
-- `is_primary` above) - via `add_address` at creation, or filled in later
-- via `update_address` if left blank.
--
-- Other-contact cap (confirmed 2026-08-23, refined from an earlier "no
-- limit needed yet" draft; count reduced from 3 to 2 on 2026-08-24 - see
-- `MAX_OTHER_CONTACT_ADDRESSES`'s doc comment in `src/lib/addresses.ts`):
-- a flat cap on total saved addresses doesn't by itself prevent one account
-- being shared by several unrelated people - N addresses each naming a
-- different person IS that exact abuse pattern. The signal that matters is
-- the number of DISTINCT OTHER PEOPLE an account places orders for, not how
-- many address rows it has. So only addresses whose `contact_phone` names
-- someone other than the account holder are capped (`v_max_other_contacts`)
-- - an address with no override, or one matching the account holder's own
-- phone, doesn't count against this at all (several properties of your own
-- is normal and not the risk). Today's business model (customers pay the
-- professional directly, no customer-side subscription yet) means this
-- doesn't block a payment circumvention today, but it's cheap groundwork
-- now - once a subscription tier exists, this exact same "distinct
-- other-contact count" is the natural number to tie to it, no redesign
-- needed, just a config lookup instead of a hardcoded constant.
--
-- Total address cap (added 2026-08-24, `v_max_total_addresses` kept in sync
-- with `MAX_TOTAL_ADDRESSES` in `src/lib/addresses.ts`; reduced from 5 to 3
-- on 2026-08-28, confirmed decision): a flat ceiling on every saved address
-- row, regardless of whose contact is on it. This is a separate, additional
-- limit on top of the other-contact cap above. The other-contact cap
-- itself is unchanged at 2.
--
-- Phone comparison is by last-9-digits suffix, not raw equality: the
-- account's own phone is E.164 from Supabase Auth (`+972501234567`) while
-- `contact_phone` is stored exactly as typed (`"050-1234567"`) - see
-- `phoneNumbersMatch` in `src/lib/phone.ts` for the client-side twin of
-- this same comparison (used there to pre-empt this error with a friendlier
-- message before ever calling these RPCs).
--
-- Immediate persistence (confirmed 2026-09-01, replacing the previous
-- design where "add new"/"edit" only staged a choice client-side until the
-- final `submit_booking` call): a real bug this fixes - staged-only edits
-- silently vanished if the order they were staged for was never actually
-- submitted. `add_address`/`update_address` below are now their own
-- standalone RPCs, called the moment "שמור כתובת"/"עדכן כתובת" is pressed
-- in `ChooseAddressStep.tsx` - independent of whether that order ever gets
-- submitted. `submit_booking`'s only remaining address-related work for a
-- returning profile is looking up and verifying ownership of an
-- already-fully-formed `p_address_id`; it no longer creates or edits
-- addresses itself except for the one brand-new-profile insert.
--
-- Editing an existing saved address (refined 2026-09-03): every filled
-- field except `entrance_code` locks the moment a job is submitted with
-- that value on the row. `entrance_code` is the one exception that stays
-- editable indefinitely - a building's code really does change from time
-- to time, unlike a house number or apartment. `city`/`street` still
-- freeze as a pair once the address has been used in any job at all
-- (they're the place itself; a different street is a move). `building_
-- number`/`apartment` use the same per-value `_locked` columns as
-- `contact_name`/`contact_phone` below - a still-blank apartment stays
-- fillable even after earlier jobs used this address without one. Typos
-- in a locked field are a support-side fix, not a self-service one.
--
-- Contact name/phone lock (confirmed 2026-09-01, refined from an earlier
-- "locked forever the instant it's set" rule; refined again 2026-09-02,
-- from a `v_has_job` ("has this ADDRESS ever been used in any job")
-- version to the `contact_name_locked`/`contact_phone_locked` columns
-- version below - see why in "Per-value lock" further down): each of
-- `contact_name`/`contact_phone` can be filled in on its own the first
-- time it's null, always. *Replacing* an already-set value - including
-- clearing it back to blank (fixed 2026-09-02, see `update_address`'s own
-- comment) - is allowed only until that specific value has actually gone
-- out in a submitted job - this is what lets a customer freely correct (or
-- remove) a just-added contact any number of times while still building
-- their current, not-yet-submitted order, while still making it permanent
-- ("locked from next time") the moment a real order has actually gone out
-- using it. One address row still can't be cycled through unlimited
-- distinct contacts *after* it's genuinely been used, which is what the
-- cap exists to prevent; see `add_address`'s/`update_address`'s own
-- comments for the exact mechanics.
--
-- Per-value lock, not per-address (fixed 2026-09-02, a real bug found
-- live; `building_number_locked`/`apartment_locked` joined the same
-- pattern 2026-09-03): `*_locked` columns track, independently per field,
-- whether the value *currently* on the row has actually been submitted in
-- a job - not merely whether *some* job, at some point, possibly with
-- this field still blank, has used this address at all. The original
-- `v_has_job` version conflated the two: once ANY job had ever used the
-- address, a value added afterward - in a brand-new, not-yet-submitted
-- order - was wrongly treated as already-locked and became instantly
-- uneditable, purely because the address itself had history, even though
-- that specific value had never gone out anywhere yet. `submit_booking`
-- below is the only place any of these flags ever flips to `true` - at
-- the exact moment a job is actually created, and only for whichever
-- fields are non-null right then (a still-blank field stays unlocked, so
-- it's still freely fillable/replaceable in some future order). Monotonic
-- (`or`, never reset back to `false`) - once a value has genuinely gone
-- out once, it stays permanently locked from then on, matching the
-- original "locked from next time" intent exactly.
--
-- Deleting a saved address: soft delete only (`deleted_at`), never a hard
-- `delete from`, and service-side only (not granted to `authenticated` -
-- see `delete_address`'s own comment near the end of this file). Kept a
-- soft delete for two reasons, since a support agent using it hits the
-- exact same constraints a customer would have:
--   1. `public.jobs.address_id` references a specific address row - a past
--      job must keep pointing at real data, not a row that's vanished out
--      from under it.
--   2. Cap integrity (confirmed 2026-08-25): if deleting just removed the
--      row, an account could delete-then-recreate indefinitely, always
--      staying under both caps below at any single snapshot while cycling
--      through unlimited distinct addresses/contacts over time - exactly
--      the sharing pattern both caps exist to prevent. So `v_total_count`/
--      `v_other_contacts_count` below deliberately do NOT filter out
--      soft-deleted rows - once a slot is used, it's used forever, for
--      both caps. `deleted_at` only ever affects what `fetchUserAddresses`
--      shows the customer and what `submit_booking`/`update_address` will
--      accept as a live address id - never what counts against a cap.

alter table public.addresses
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists deleted_at timestamptz,
  add column if not exists is_primary boolean not null default false,
  add column if not exists contact_name_locked boolean not null default false,
  add column if not exists contact_phone_locked boolean not null default false,
  add column if not exists building_number_locked boolean not null default false,
  add column if not exists apartment_locked boolean not null default false,
  -- Almost certainly already present (a default column on any table created
  -- via the Supabase dashboard) - added defensively (added 2026-09-03) so
  -- this file doesn't assume that without a way to verify it here. A no-op
  -- if it already exists; if it somehow doesn't, every pre-existing row
  -- gets the same backfilled timestamp (this `alter`'s run time) since
  -- `now()` is volatile, which only affects relative order among rows that
  -- existed before this line ever ran - every row created afterward via
  -- `add_address`/`submit_booking` gets its own real, distinct value.
  add column if not exists created_at timestamptz not null default now();

-- One-time backfill (safe to re-run): rows that already have job history
-- from before these columns existed would otherwise stay unlocked until
-- the *next* submit. Same monotonic `or` as `submit_booking` itself.
update public.addresses a
set
  building_number_locked = a.building_number_locked or (
    a.building_number is not null
    and exists (select 1 from public.jobs j where j.address_id = a.id)
  ),
  apartment_locked = a.apartment_locked or (
    a.apartment is not null
    and exists (select 1 from public.jobs j where j.address_id = a.id)
  ),
  contact_name_locked = a.contact_name_locked or (
    a.contact_name is not null
    and exists (select 1 from public.jobs j where j.address_id = a.id)
  ),
  contact_phone_locked = a.contact_phone_locked or (
    a.contact_phone is not null
    and exists (select 1 from public.jobs j where j.address_id = a.id)
  );

-- =========================================================================
-- 1. submit_booking - simplified 2026-09-01: no longer creates or edits a
-- returning profile's address at all (see "Immediate persistence" above) -
-- `add_address`/`update_address` below now own that entirely. The only
-- address-creation left here is the one brand-new-profile insert.
-- =========================================================================

-- Postgres identifies a function by name AND its parameter type list - drop
-- every previous signature this function has ever had before recreating it
-- with fewer parameters, otherwise `create or replace` would leave the old,
-- wider-signature version behind as a separate, ambiguous overload.
-- Original booking_flow_auth.sql signature (10 params, no address_id/
-- contact fields):
drop function if exists public.submit_booking(
  uuid, timestamptz, text, text, text, text, text, text, text, text
);
-- Live signature immediately before this file's 2026-09-01 change (13
-- params - added p_address_id, p_contact_name, p_contact_phone):
drop function if exists public.submit_booking(
  uuid, timestamptz, text, text, text, text, text, text, text, text, uuid, text, text
);

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
  p_entrance_code text default null,
  p_address_id uuid default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_address_id uuid;
  v_job_id uuid;
  v_total_count int;
  -- Keep in sync with `MAX_TOTAL_ADDRESSES` in src/lib/addresses.ts.
  v_max_total_addresses constant int := 3;
begin
  if v_user_id is null then
    raise exception 'submit_booking: no authenticated user';
  end if;

  if p_first_name is not null then
    -- Brand-new profile path (NewUserDetailsStep) - unchanged: profile +
    -- first address + job all created atomically in one call, since there's
    -- no "come back and re-edit before submitting" loop for this step the
    -- way ChooseAddressStep has.
    insert into public.users (id, phone, first_name, last_name, role)
    values (v_user_id, auth.jwt() ->> 'phone', p_first_name, p_last_name, 'customer')
    on conflict (id) do nothing;

    -- Total address cap (see file header) - trivially satisfied for a
    -- brand-new profile's first-ever address, but checked anyway since this
    -- is still one of the two places an address row is ever created.
    select count(*) into v_total_count
    from public.addresses
    where user_id = v_user_id;

    if v_total_count >= v_max_total_addresses then
      raise exception 'submit_booking: total address limit reached (max %)', v_max_total_addresses;
    end if;

    -- `is_primary = true` (added 2026-09-01) - this is the one and only
    -- address ever created this way; see `is_primary`'s doc comment above.
    insert into public.addresses (user_id, city, street, building_number, apartment, entrance_code, is_default, is_primary)
    values (v_user_id, p_city, p_street, p_building_number, p_apartment, p_entrance_code, true, true)
    returning id into v_address_id;
  elsif p_address_id is not null then
    -- Returning profile, explicitly chose one of their saved addresses
    -- (ChooseAddressStep "list" view) - by this point it's already fully
    -- formed (created via `add_address`, edited via `update_address` if
    -- needed), so this is just an ownership/liveness check, nothing more.
    -- Scoped to v_user_id so a client can never point this at another
    -- customer's address row; `deleted_at is null` so a soft-deleted row
    -- can never be reused even by a stale/tampered client call.
    select id into v_address_id
    from public.addresses
    where id = p_address_id and user_id = v_user_id and deleted_at is null;

    if v_address_id is null then
      raise exception 'submit_booking: address % not found for user %', p_address_id, v_user_id;
    end if;
  else
    -- Fallback: no explicit choice made (older client, or ChooseAddressStep
    -- never opened) - reuse the existing default address, same as before
    -- this file existed. `deleted_at is null` so a since-deleted default
    -- is never resurrected by an in-flight/stale call.
    select id into v_address_id
    from public.addresses
    where user_id = v_user_id and is_default = true and deleted_at is null
    limit 1;

    if v_address_id is null then
      raise exception 'submit_booking: no default address found for existing user %', v_user_id;
    end if;
  end if;

  -- Whichever address this submission actually used becomes the new
  -- default for next time (see file header) - a no-op when it already was.
  -- Scoped to live rows only; a deleted row's `is_default` no longer means
  -- anything.
  update public.addresses
  set is_default = (id = v_address_id)
  where user_id = v_user_id and deleted_at is null;

  insert into public.jobs (customer_id, address_id, service_id, scheduled_time, notes, status)
  values (v_user_id, v_address_id, p_service_id, p_scheduled_time, p_notes, 'searching_professional')
  returning id into v_job_id;

  -- Per-value lock commit (added 2026-09-02, building/apartment joined
  -- 2026-09-03) - see the file header's "Per-value lock, not per-address"
  -- note. Contact flags are a no-op on the brand-new-profile branch
  -- (`is_primary`, never carries those fields). Building number is
  -- required so it locks on first submit; apartment only locks if it was
  -- actually filled.
  update public.addresses
  set building_number_locked = building_number_locked or (building_number is not null),
      apartment_locked = apartment_locked or (apartment is not null),
      contact_name_locked = contact_name_locked or (contact_name is not null),
      contact_phone_locked = contact_phone_locked or (contact_phone is not null)
  where id = v_address_id;

  return v_job_id;
end;
$$;

grant execute on function public.submit_booking to authenticated;

-- =========================================================================
-- 2. Adding a new saved address (added 2026-09-01, replacing the previous
-- design where this only happened inline inside `submit_booking`) - called
-- immediately when "שמור כתובת" is pressed in `ChooseAddressStep`'s "add
-- new" view, independent of whether the order being built ever gets
-- submitted. Same cap checks `submit_booking`'s old "add new" branch used
-- to run. Never accepts a contact name/phone override for a primary
-- address - not applicable here since every address this creates is
-- `is_primary = false` by construction (the one primary address only ever
-- comes from `submit_booking`'s brand-new-profile branch above).
-- =========================================================================

create or replace function public.add_address(
  p_city text,
  p_street text,
  p_building_number text,
  p_apartment text default null,
  p_entrance_code text default null,
  p_contact_name text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_own_phone text := auth.jwt() ->> 'phone';
  v_address_id uuid;
  v_other_contacts_count int;
  v_total_count int;
  -- Keep in sync with `MAX_OTHER_CONTACT_ADDRESSES` in src/lib/addresses.ts.
  v_max_other_contacts constant int := 2;
  -- Keep in sync with `MAX_TOTAL_ADDRESSES` in src/lib/addresses.ts.
  v_max_total_addresses constant int := 3;
begin
  if v_user_id is null then
    raise exception 'add_address: no authenticated user';
  end if;

  -- Total address cap (see file header) - checked first since it's the
  -- more fundamental limit, independent of who the contact is.
  select count(*) into v_total_count
  from public.addresses
  where user_id = v_user_id;

  if v_total_count >= v_max_total_addresses then
    raise exception 'add_address: total address limit reached (max %)', v_max_total_addresses;
  end if;

  -- Other-contact cap (see file header): only blocks when this new
  -- address's contact_phone names someone other than the account holder
  -- AND that would be the (v_max_other_contacts + 1)th such address - an
  -- address with no override, or one matching the account's own phone,
  -- never counts against this at all.
  if p_contact_phone is not null
    and right(regexp_replace(p_contact_phone, '\D', '', 'g'), 9)
        is distinct from right(regexp_replace(coalesce(v_own_phone, ''), '\D', '', 'g'), 9)
  then
    select count(*) into v_other_contacts_count
    from public.addresses a
    where a.user_id = v_user_id
      and a.contact_phone is not null
      and right(regexp_replace(a.contact_phone, '\D', '', 'g'), 9)
          is distinct from right(regexp_replace(coalesce(v_own_phone, ''), '\D', '', 'g'), 9);

    if v_other_contacts_count >= v_max_other_contacts then
      raise exception 'add_address: other-contact address limit reached (max %)', v_max_other_contacts;
    end if;
  end if;

  -- `is_default = true`: this is the address the customer just added,
  -- almost always about to be the one this order uses next - `submit_
  -- booking`'s own `is_default` flip at actual submission time remains the
  -- authoritative correction if that turns out not to be the case.
  -- `is_primary = false`: only `submit_booking`'s brand-new-profile branch
  -- ever sets `is_primary = true` - see that flag's doc comment above.
  insert into public.addresses (user_id, city, street, building_number, apartment, entrance_code, contact_name, contact_phone, is_default, is_primary)
  values (v_user_id, p_city, p_street, p_building_number, p_apartment, p_entrance_code, p_contact_name, p_contact_phone, true, false)
  returning id into v_address_id;

  return v_address_id;
end;
$$;

grant execute on function public.add_address to authenticated;

-- Same "drop every previous signature first" reasoning as `submit_booking`
-- above - `p_city`/`p_street` were added 2026-09-02, right after
-- `p_address_id`, changing the parameter list's shape (not just appending
-- a trailing optional one), so the function's identity itself changed.
drop function if exists public.update_address(uuid, text, text, text, text, text);

-- =========================================================================
-- 3. Editing an existing saved address (added 2026-09-01, replacing the
-- "Edit path" that used to live inside `submit_booking`) - called
-- immediately when "עדכן כתובת" is pressed in `ChooseAddressStep`'s "edit"
-- view, independent of whether the order being built ever gets submitted.
-- See the "Contact name/phone lock" note in the file header for the
-- `v_has_job` reasoning below.
--
-- `p_city`/`p_street` (added 2026-09-02, refining the original "city/street
-- always locked" rule): editable, just like everything else here, for as
-- long as `v_has_job` is false - a customer who saved an address, hasn't
-- submitted an order with it yet, and realizes they picked the wrong
-- street shouldn't have to delete-and-recreate the whole row just to fix
-- that. Only once a real job has actually used this address does the
-- location become truly fixed (a different street/city past that point is
-- a move, which "add new address" is for) - never applied via `submit_
-- booking`'s "no job yet" case, since that function only ever creates or
-- looks up an address, never edits one.
--
-- Contact name/phone clearing (fixed 2026-09-02, a real bug found live):
-- while a field is unlocked (see below), `p_contact_name`/`p_contact_phone`
-- are now fully replaceable with whatever the client currently holds,
-- including back to blank (`null`) - not just fillable from blank or
-- replaceable-with-another-value as the previous version of this function
-- had it. The previous version's `if p_contact_name is not null and (...)`
-- guard meant an explicit clear (the client omitting the key / sending
-- `null` to mean "make this blank") was indistinguishable from "field not
-- touched this call" and was silently ignored - a contact name/phone once
-- set could be replaced with a different value but never actually removed,
-- before this fix.
--
-- Contact name/phone lock is per-value, not per-address (fixed 2026-09-02,
-- a real bug found live): whether either field is replaceable/clearable
-- here is now driven by `contact_name_locked`/`contact_phone_locked`
-- (columns, set by `submit_booking` the moment a job actually goes out) -
-- not by whether `public.jobs` merely has *any* row referencing this
-- address at all, which is what the earlier `v_has_job`-based version used
-- and is still exactly right for `city`/`street` above. The difference
-- matters because a contact name/phone can be added *after* an address
-- already has job history: under the old `v_has_job` version, that
-- brand-new, never-yet-submitted value was wrongly treated as
-- already-locked purely because the address had a past job, not because
-- this value did. See the file header's "Per-value lock, not per-address"
-- note for the full reasoning.
-- =========================================================================

create or replace function public.update_address(
  p_address_id uuid,
  p_city text,
  p_street text,
  p_building_number text,
  p_apartment text default null,
  p_entrance_code text default null,
  p_contact_name text default null,
  p_contact_phone text default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_own_phone text := auth.jwt() ->> 'phone';
  v_address_id uuid;
  v_is_primary boolean;
  v_existing_contact_name text;
  v_existing_contact_phone text;
  v_existing_apartment text;
  v_contact_name_locked boolean;
  v_contact_phone_locked boolean;
  v_building_number_locked boolean;
  v_apartment_locked boolean;
  v_has_job boolean;
  v_other_contacts_count int;
  -- Keep in sync with `MAX_OTHER_CONTACT_ADDRESSES` in src/lib/addresses.ts.
  v_max_other_contacts constant int := 2;
begin
  if v_user_id is null then
    raise exception 'update_address: no authenticated user';
  end if;

  -- Scoped to v_user_id so a client can never point this at another
  -- customer's address row; `deleted_at is null` so a soft-deleted row can
  -- never be edited back to life by a stale/tampered client call.
  select id, is_primary, contact_name, contact_phone, apartment, contact_name_locked, contact_phone_locked,
         building_number_locked, apartment_locked
    into v_address_id, v_is_primary, v_existing_contact_name, v_existing_contact_phone, v_existing_apartment,
         v_contact_name_locked, v_contact_phone_locked, v_building_number_locked, v_apartment_locked
  from public.addresses
  where id = p_address_id and user_id = v_user_id and deleted_at is null;

  if v_address_id is null then
    raise exception 'update_address: address % not found for user %', p_address_id, v_user_id;
  end if;

  -- Whether this address has ever actually been used in a submitted job -
  -- used for `city`/`street` only (see this function's own comment
  -- above). Deliberately NOT used for the contact fields below anymore -
  -- see `v_contact_name_locked`/`v_contact_phone_locked`, selected above,
  -- and the file header's "Per-value lock, not per-address" note.
  select exists (select 1 from public.jobs where address_id = v_address_id) into v_has_job;

  if not v_has_job then
    -- Everything is still editable, including `city`/`street`, while this
    -- address hasn't actually been used in a real job yet.
    update public.addresses
    set city = p_city,
        street = p_street,
        building_number = p_building_number,
        apartment = p_apartment,
        entrance_code = p_entrance_code
    where id = v_address_id;
  else
    -- `city`/`street` are frozen from here on (see this function's own
    -- comment above). `entrance_code` stays editable indefinitely - a
    -- building's code really does change. `building_number`/`apartment`
    -- follow the same per-value lock as contact fields (confirmed
    -- 2026-09-03): replaceable until that value itself has gone out in a
    -- job, fillable-from-blank afterward. Typos in a locked field are a
    -- support-side fix.
    update public.addresses
    set entrance_code = p_entrance_code
    where id = v_address_id;

    if not v_building_number_locked then
      update public.addresses
      set building_number = p_building_number
      where id = v_address_id;
    end if;

    if not v_apartment_locked then
      update public.addresses
      set apartment = p_apartment
      where id = v_address_id;
    elsif v_existing_apartment is null and p_apartment is not null then
      update public.addresses
      set apartment = p_apartment
      where id = v_address_id;
    end if;
  end if;

  -- A primary address never carries a contact override at all (see
  -- `is_primary`'s doc comment) - both blocks below are skipped entirely
  -- for it, regardless of what the client sends (defense-in-depth; the
  -- client itself never shows these fields for a primary address either).
  if not v_is_primary then
    -- Name: fully replaceable - including back to blank - as long as the
    -- value currently on the row hasn't itself actually gone out in a
    -- submitted job yet (`v_contact_name_locked`, flipped by `submit_
    -- booking`, NOT by `public.addresses` merely having *some* job
    -- history at all - see this function's own "Contact name/phone lock
    -- is per-value" comment above); once locked, only ever fillable from
    -- blank, never replaced/cleared. No cap implications either way - the
    -- other-contact cap counts distinct *phone numbers*, never names.
    if not v_contact_name_locked then
      update public.addresses
      set contact_name = p_contact_name
      where id = v_address_id;
    elsif v_existing_contact_name is null and p_contact_name is not null then
      update public.addresses
      set contact_name = p_contact_name
      where id = v_address_id;
    end if;

    -- Phone: the cap check only ever applies to a genuinely brand-new
    -- contact on this address - neither a name nor a phone previously set
    -- (matches `submit_booking`'s old "Edit path" exactly, confirmed
    -- 2026-08-28 fix - once either half was already set, this address has
    -- already been "spoken for" as an other-contact slot, so completing
    -- the other half, replacing it, or clearing and later re-filling it
    -- - all before first use - is never a new addition).
    if v_existing_contact_phone is null
      and v_existing_contact_name is null
      and p_contact_phone is not null
      and right(regexp_replace(p_contact_phone, '\D', '', 'g'), 9)
          is distinct from right(regexp_replace(coalesce(v_own_phone, ''), '\D', '', 'g'), 9)
    then
      select count(*) into v_other_contacts_count
      from public.addresses a
      where a.user_id = v_user_id
        and a.contact_phone is not null
        and right(regexp_replace(a.contact_phone, '\D', '', 'g'), 9)
            is distinct from right(regexp_replace(coalesce(v_own_phone, ''), '\D', '', 'g'), 9);

      if v_other_contacts_count >= v_max_other_contacts then
        raise exception 'update_address: other-contact address limit reached (max %)', v_max_other_contacts;
      end if;
    end if;

    -- Same fully-replaceable-until-locked / fillable-from-blank-only-after
    -- rule as name, above - `v_contact_phone_locked`, independent of
    -- `v_contact_name_locked`.
    if not v_contact_phone_locked then
      update public.addresses
      set contact_phone = p_contact_phone
      where id = v_address_id;
    elsif v_existing_contact_phone is null and p_contact_phone is not null then
      update public.addresses
      set contact_phone = p_contact_phone
      where id = v_address_id;
    end if;
  end if;
end;
$$;

grant execute on function public.update_address to authenticated;

-- =========================================================================
-- Deleting a saved address (added 2026-08-25) - see the file header's
-- "Deleting a saved address" note for why this is a soft delete, and why
-- the caps above deliberately never filter it out.
-- =========================================================================

create or replace function public.delete_address(p_address_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_remaining_count int;
  v_was_default boolean;
begin
  if v_user_id is null then
    raise exception 'delete_address: no authenticated user';
  end if;

  -- A customer must always have at least one live address to book with -
  -- ChooseAddressStep's "add new" view is the only other way to get one,
  -- and hides the trash icon entirely once this would be the last one, so
  -- this is a defense-in-depth check, not the primary UX.
  select count(*) into v_remaining_count
  from public.addresses
  where user_id = v_user_id and deleted_at is null;

  if v_remaining_count <= 1 then
    raise exception 'delete_address: cannot delete your only saved address';
  end if;

  select is_default into v_was_default
  from public.addresses
  where id = p_address_id and user_id = v_user_id and deleted_at is null;

  if v_was_default is null then
    raise exception 'delete_address: address % not found for user %', p_address_id, v_user_id;
  end if;

  update public.addresses
  set deleted_at = now(), is_default = false
  where id = p_address_id and user_id = v_user_id;

  -- The deleted row was the one future bookings would have defaulted to
  -- (submit_booking's fallback branch, and BookingFlowSheet.loadReturningProfile) -
  -- promote any one remaining live address so there's always still a
  -- default. Which one is arbitrary (no recency column to order by here);
  -- correctness only requires that some row ends up `is_default = true`.
  if v_was_default then
    update public.addresses
    set is_default = true
    where id = (
      select id from public.addresses
      where user_id = v_user_id and deleted_at is null
      limit 1
    );
  end if;
end;
$$;

-- Service-side only (confirmed 2026-08-31, not granted to `authenticated`)
-- - the customer-facing UI that called this (`ChooseAddressStep`'s trash
-- icon, plus the whole "archive"/restore view below) has been removed;
-- see "Deleting a saved address" in docs/client-booking-flow-prd.md for
-- why. The function itself is untouched and still fully callable via the
-- Supabase *service role* key (bypasses grants entirely) - i.e. by us,
-- direct SQL, or a future admin tool - just no longer by any customer
-- session. `revoke` is a no-op if the grant was never applied, so this
-- stays safe to re-run like the rest of this file. To re-enable this for
-- customers again, re-add `grant execute on function public.delete_address
-- to authenticated;` and restore the trash-icon UI removed from
-- `ChooseAddressStep.tsx` (see git history around 2026-08-31).
revoke execute on function public.delete_address from authenticated;

-- =========================================================================
-- Restoring a soft-deleted address (added 2026-08-28) - see "Restoring a
-- deleted address" in docs/client-booking-flow-prd.md's "Address Book"
-- subsection for the product reasoning. Deliberately the mirror image of
-- `delete_address` above (`deleted_at = now()` -> `deleted_at = null`), and
-- deliberately does NOT re-run either cap check above: restoring can only
-- ever bring back a row that was already this user's own and was already
-- counted toward both `v_total_count`/`v_other_contacts_count` the moment
-- it was first created (both caps count every address ever created,
-- deleted or not - see this file's header). So a restore never increases
-- either cumulative count and can never be the thing that pushes a user
-- over a cap - it only ever un-hides something already "paid for". This is
-- exactly what makes it safe to offer as unconditional self-service, unlike
-- creating a genuinely new address.
-- =========================================================================

create or replace function public.restore_address(p_address_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_was_deleted boolean;
begin
  if v_user_id is null then
    raise exception 'restore_address: no authenticated user';
  end if;

  select (deleted_at is not null) into v_was_deleted
  from public.addresses
  where id = p_address_id and user_id = v_user_id;

  if v_was_deleted is null then
    raise exception 'restore_address: address % not found for user %', p_address_id, v_user_id;
  end if;

  if not v_was_deleted then
    -- Not actually deleted (e.g. a stale/double-tapped client call) - a
    -- no-op, not an error, since the end state the caller wanted (this
    -- address being live) already holds.
    return;
  end if;

  -- Deliberately does NOT touch `is_default` - a restored address starts
  -- out not-default (same as `delete_address` leaves it, and same as a
  -- brand-new address never being retroactively pinned) and only becomes
  -- default the normal way, by actually being used in a submission (see
  -- `submit_booking`'s own `is_default` update above).
  update public.addresses
  set deleted_at = null
  where id = p_address_id and user_id = v_user_id;
end;
$$;

-- Service-side only, same reasoning and same date as `delete_address`
-- above - restoring only ever matters if deleting is also possible, and
-- deleting is no longer customer-facing either.
revoke execute on function public.restore_address from authenticated;
