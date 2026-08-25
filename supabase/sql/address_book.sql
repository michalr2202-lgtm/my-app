-- Lightweight address book: lets a returning customer pick a previously
-- used address, or add a new one, when submitting a booking - see the
-- "Address Book" subsection of docs/client-booking-flow-prd.md
-- "Submission", and ChooseAddressStep.tsx for the client side.
--
-- Safe to run in full, including re-running after a previous attempt -
-- every statement is idempotent (`add column if not exists`, `drop
-- function if exists`, `create or replace function`). A first attempt
-- 2026-08-24 failed on the final `grant` with error 42725 "function name
-- is not unique" (see the `drop function` comment below for why, and note
-- that Supabase's SQL Editor runs a pasted script as one implicit
-- transaction, so that failure likely rolled the whole attempt back
-- rather than partially applying it) - fixed by adding the `drop function`
-- statement below, no other changes needed.
--
-- No schema change is needed: `public.addresses` already has `user_id` (so
-- one user can own many rows) and `is_default`; `public.jobs.address_id`
-- already points at one specific address row per job, not at "the"
-- customer's address. What was missing was only the RPC surface to ever
-- pick among more than one saved row - `submit_booking` previously only
-- supported "create the one brand-new address" (new profile) or "reuse the
-- single default" (returning profile), with no way to choose a different
-- saved address or add a second one for an existing profile.
--
-- `is_default` now means "most recently used", not a fixed pin: every
-- successful submission flips it onto whichever address that submission
-- just used and off every other address for that user. This is intentional
-- (confirmed 2026-08-23) - simplest MVP heuristic, no separate "set as
-- default" UI needed. A future fixed "home"/"work" pin would be an additive
-- change (e.g. a nullable `label` column) and wouldn't need to revisit this.
--
-- `contact_name`/`contact_phone` (confirmed 2026-08-23): who the
-- professional should actually expect to meet/call at this address, when
-- it's not the account holder (e.g. booking for a parent) - deliberately
-- separate from `public.users.first_name`/`last_name`/`phone`, which stay
-- the fixed billing/accountable identity on the job regardless of which
-- saved address is used. Settable when a new address is created
-- (`ChooseAddressStep`'s "add new" view / a brand-new profile's first
-- address), or filled in later via an edit if it was left blank - but never
-- *replaced* once set (see "Editing" below).
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
-- with `MAX_TOTAL_ADDRESSES` in `src/lib/addresses.ts`): a flat ceiling on
-- every saved address row, regardless of whose contact is on it. This is a
-- separate, additional limit on top of the other-contact cap above (an
-- earlier draft of this file deliberately had no such flat cap, reasoning
-- that it doesn't by itself prevent multi-person sharing - see the
-- other-contact cap's own reasoning - but a small flat ceiling is still
-- useful as a second, independent backstop, and does no harm to the
-- legitimate case since 5 is well above how many properties one person
-- realistically manages).
--
-- Phone comparison is by last-9-digits suffix, not raw equality: the
-- account's own phone is E.164 from Supabase Auth (`+972501234567`) while
-- `contact_phone` is stored exactly as typed (`"050-1234567"`) - see
-- `phoneNumbersMatch` in `src/lib/phone.ts` for the client-side twin of
-- this same comparison (used there to pre-empt this error with a friendlier
-- message before ever calling this RPC).
--
-- Editing an existing saved address (added 2026-08-24, `ChooseAddressStep`'s
-- per-row "ערוך" link): `building_number`/`apartment`/`entrance_code` are
-- always editable post-creation. `contact_name` and `contact_phone` are now
-- (2026-08-25) independently fillable - each can be set once, on its own,
-- whenever it's still null, but never *replaced* once set - see the "Edit
-- path" comment inside `submit_booking` below (in the `p_address_id is not
-- null` branch) for the full reasoning, including why `city`/`street` stay
-- excluded entirely.
--
-- Deleting a saved address (added 2026-08-25, `ChooseAddressStep`'s per-row
-- trash icon): soft delete only (`deleted_at`), never a hard `delete from`.
-- Two independent reasons:
--   1. `public.jobs.address_id` references a specific address row - a past
--      job must keep pointing at real data, not a row that's vanished out
--      from under it.
--   2. Cap integrity (confirmed 2026-08-25, your call): if deleting just
--      removed the row, a customer could delete-then-recreate indefinitely,
--      always staying under both caps below at any single snapshot while
--      cycling through unlimited distinct addresses/contacts over time -
--      exactly the sharing pattern both caps exist to prevent. So
--      `v_total_count`/`v_other_contacts_count` below deliberately do NOT
--      filter out soft-deleted rows - once a slot is used, it's used
--      forever, for both caps. `deleted_at` only ever affects what
--      `fetchUserAddresses` shows the customer and what `submit_booking`
--      will accept as a live `p_address_id` - never what counts against a
--      cap. See `delete_address` at the end of this file.

alter table public.addresses
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists deleted_at timestamptz;

-- Found live 2026-08-24 (error 42725 "function name is not unique" on the
-- `grant` below): Postgres identifies a function by name AND its parameter
-- type list, not name alone - `create or replace function` only replaces an
-- existing definition when that list matches exactly. The version below
-- adds 3 parameters (`p_address_id`, `p_contact_name`, `p_contact_phone`) on
-- top of `booking_flow_auth.sql`'s original 10-parameter `submit_booking`,
-- so without this explicit drop first, `create or replace` would silently
-- create a second, separate overload alongside the old one rather than
-- replacing it - leaving two functions named `submit_booking` and making
-- any unqualified reference to the name (this file's own `grant`, and
-- potentially PostgREST's RPC resolution from the client) ambiguous.
drop function if exists public.submit_booking(
  uuid, timestamptz, text, text, text, text, text, text, text, text
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
  p_address_id uuid default null,
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
  v_existing_contact_name text;
  v_existing_contact_phone text;
  v_job_id uuid;
  v_other_contacts_count int;
  v_total_count int;
  -- Keep in sync with `MAX_OTHER_CONTACT_ADDRESSES` in src/lib/addresses.ts.
  v_max_other_contacts constant int := 2;
  -- Keep in sync with `MAX_TOTAL_ADDRESSES` in src/lib/addresses.ts.
  v_max_total_addresses constant int := 5;
begin
  if v_user_id is null then
    raise exception 'submit_booking: no authenticated user';
  end if;

  if p_first_name is not null then
    -- Brand-new profile path (NewUserDetailsStep) - unchanged.
    insert into public.users (id, phone, first_name, last_name, role)
    values (v_user_id, auth.jwt() ->> 'phone', p_first_name, p_last_name, 'customer')
    on conflict (id) do nothing;

    -- Total address cap (see file header) - trivially satisfied for a
    -- brand-new profile's first-ever address, but checked anyway for the
    -- same reason both insert sites below do: this function is the one
    -- place addresses are ever created, so the cap must hold regardless of
    -- which branch got here.
    select count(*) into v_total_count
    from public.addresses
    where user_id = v_user_id;

    if v_total_count >= v_max_total_addresses then
      raise exception 'submit_booking: total address limit reached (max %)', v_max_total_addresses;
    end if;

    insert into public.addresses (user_id, city, street, building_number, apartment, entrance_code, contact_name, contact_phone, is_default)
    values (v_user_id, p_city, p_street, p_building_number, p_apartment, p_entrance_code, p_contact_name, p_contact_phone, true)
    returning id into v_address_id;
  elsif p_address_id is not null then
    -- Returning profile, explicitly chose one of their saved addresses
    -- (ChooseAddressStep "list" view). Scoped to v_user_id so a client
    -- can never point this at another customer's address row; `deleted_at
    -- is null` so a soft-deleted row (see file header) can never be reused
    -- even by a stale/tampered client call.
    select id, contact_name, contact_phone
      into v_address_id, v_existing_contact_name, v_existing_contact_phone
    from public.addresses
    where id = p_address_id and user_id = v_user_id and deleted_at is null;

    if v_address_id is null then
      raise exception 'submit_booking: address % not found for user %', p_address_id, v_user_id;
    end if;

    -- Edit path (confirmed 2026-08-24, ChooseAddressStep's per-row "ערוך"
    -- link): `p_building_number` is only ever sent alongside `p_address_id`
    -- when the customer actually edited that saved address first - a plain
    -- reuse (tap the row, no edit) never sends address fields at all, so
    -- its presence here is what distinguishes the two without a separate
    -- boolean parameter.
    --
    -- Restricted to the fields a customer can plausibly need to fix post-
    -- creation - a typo'd building number, an added/removed apartment, a
    -- changed entrance code:
    --   - Never `city`/`street`: a different street or city is a
    --     different physical place (a move), which is what "add new
    --     address" is for, not an edit of this one - keeps "editing" from
    --     quietly turning into "this row now means something else",
    --     which would be confusing for any earlier job still pointing at
    --     this same `address_id`.
    if p_building_number is not null then
      update public.addresses
      set building_number = p_building_number,
          apartment = p_apartment,
          entrance_code = p_entrance_code
      where id = v_address_id;
    end if;

    -- Filling in a previously-unset contact name/phone (added 2026-08-24,
    -- made independent 2026-08-25 after a customer couldn't save a contact
    -- name because a phone-only contact had already locked the whole
    -- group): each of `contact_name`/`contact_phone` can be filled in on
    -- its own the first time it's null, but never *replaced* once set - if
    -- an existing address's contact could be swapped after the fact, one
    -- address row could serve unlimited different people over time, one at
    -- a time, since the cap only ever counts contacts *at the moment
    -- they're set*.
    --
    -- The name half has no cap implications at all - it's purely
    -- descriptive (who to ask for), and the other-contact cap counts
    -- distinct *phone numbers*, never names - so it fills in independently
    -- of the phone check below, and independently of whether a phone was
    -- ever set.
    if v_existing_contact_name is null and p_contact_name is not null then
      update public.addresses
      set contact_name = p_contact_name
      where id = v_address_id;
    end if;

    -- The phone half is what actually defines a distinct other-contact
    -- identity, so filling it in re-runs the same other-contact cap check
    -- the "add new address" branch below uses - gated only on this row's
    -- own prior phone value, independent of whether its name was already
    -- set (see the file header for why this cap must stay cumulative).
    if v_existing_contact_phone is null
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
        raise exception 'submit_booking: other-contact address limit reached (max %)', v_max_other_contacts;
      end if;

      update public.addresses
      set contact_phone = p_contact_phone
      where id = v_address_id;
    end if;
  elsif p_city is not null then
    -- Returning profile, typed a brand-new address instead of picking an
    -- existing one (ChooseAddressStep "add new" view) - same insert shape
    -- as the brand-new-profile branch above, just without touching `users`.
    --
    -- Total address cap (see file header) - checked first since it's the
    -- more fundamental limit, independent of who the contact is.
    select count(*) into v_total_count
    from public.addresses
    where user_id = v_user_id;

    if v_total_count >= v_max_total_addresses then
      raise exception 'submit_booking: total address limit reached (max %)', v_max_total_addresses;
    end if;

    -- Other-contact cap (see file header): only blocks when this new
    -- address's contact_phone names someone other than the account holder
    -- AND that would be the (v_max_other_contacts + 1)th such address -
    -- an address with no override, or one matching the account's own
    -- phone, never counts against this at all.
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
        raise exception 'submit_booking: other-contact address limit reached (max %)', v_max_other_contacts;
      end if;
    end if;

    insert into public.addresses (user_id, city, street, building_number, apartment, entrance_code, contact_name, contact_phone, is_default)
    values (v_user_id, p_city, p_street, p_building_number, p_apartment, p_entrance_code, p_contact_name, p_contact_phone, true)
    returning id into v_address_id;
  else
    -- Fallback: no explicit choice made (older client, or ChooseAddressStep
    -- never opened) - reuse the existing default address, same as before
    -- this file existed. `deleted_at is null` so a since-deleted default
    -- (see `delete_address`, which always promotes a replacement default
    -- when this happens) is never resurrected by an in-flight/stale call.
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
  -- anything (see `delete_address`), so there's nothing useful to update
  -- there.
  update public.addresses
  set is_default = (id = v_address_id)
  where user_id = v_user_id and deleted_at is null;

  insert into public.jobs (customer_id, address_id, service_id, scheduled_time, notes, status)
  values (v_user_id, v_address_id, p_service_id, p_scheduled_time, p_notes, 'searching_professional')
  returning id into v_job_id;

  return v_job_id;
end;
$$;

grant execute on function public.submit_booking to authenticated;

-- =========================================================================
-- Deleting a saved address (added 2026-08-25) - see the file header's
-- "Deleting a saved address" note for why this is a soft delete, and why
-- the caps in `submit_booking` above deliberately never filter it out.
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

grant execute on function public.delete_address to authenticated;
