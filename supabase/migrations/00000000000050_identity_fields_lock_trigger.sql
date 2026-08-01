-- Lock client/owner identity fields after create at the database layer.
-- App actions already strip/reject these fields; this blocks PostgREST / DevTools
-- bypasses. Master Admin corrections go through master_correct_identity_field()
-- which sets a transaction-local flag the triggers honour.
--
-- Also harden identity_field_audit.requester_name as NOT NULL.

-- ---------------------------------------------------------------------------
-- Audit: requester_name required
-- ---------------------------------------------------------------------------
update identity_field_audit
set requester_name = coalesce(nullif(btrim(requester_name), ''), '—')
where requester_name is null or btrim(requester_name) = '';

alter table identity_field_audit
  alter column requester_name set default '—',
  alter column requester_name set not null;

-- ---------------------------------------------------------------------------
-- Immutable identity trigger (clients + owners)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_identity_fields_immutable()
returns trigger
language plpgsql
as $$
begin
  -- Allowed only inside master_correct_identity_field() (transaction-local flag).
  if current_setting('app.allow_identity_correction', true) = 'true' then
    return new;
  end if;

  if tg_table_name = 'clients' then
    if new.name is distinct from old.name
      or new.name_en is distinct from old.name_en
      or new.name_ar is distinct from old.name_ar
      or new.phone is distinct from old.phone
      or new.country_code is distinct from old.country_code then
      raise exception
        using message = 'Identity fields (name, phone, country) are locked after create. Only Master Admin can apply an exceptional correction with a full audit log.',
              errcode = 'P0001';
    end if;
  elsif tg_table_name = 'owners' then
    if new.name is distinct from old.name
      or new.name_en is distinct from old.name_en
      or new.name_ar is distinct from old.name_ar
      or new.phone is distinct from old.phone
      or new.country is distinct from old.country then
      raise exception
        using message = 'Identity fields (name, phone, country) are locked after create. Only Master Admin can apply an exceptional correction with a full audit log.',
              errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_clients_identity_immutable on public.clients;
create trigger trg_clients_identity_immutable
  before update on public.clients
  for each row
  execute function public.enforce_identity_fields_immutable();

drop trigger if exists trg_owners_identity_immutable on public.owners;
create trigger trg_owners_identity_immutable
  before update on public.owners
  for each row
  execute function public.enforce_identity_fields_immutable();

-- ---------------------------------------------------------------------------
-- Master Admin correction RPC (sets flag → update → audit in one transaction)
-- ---------------------------------------------------------------------------
create or replace function public.master_correct_identity_field(
  p_entity_type text,
  p_entity_id uuid,
  p_field_name text,
  p_new_value text,
  p_reason text,
  p_requester_name text,
  p_performed_by uuid,
  p_requested_by uuid default null,
  p_company_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text;
  v_company_id uuid;
  v_old_value text;
  v_new_value text;
  v_reason text;
  v_requester text;
  v_sql text;
  v_entity jsonb;
  v_audit identity_field_audit%rowtype;
  v_allowed text[];
begin
  if p_entity_type not in ('client', 'owner') then
    raise exception 'Invalid entity type.';
  end if;

  if p_performed_by is null or not exists (
    select 1 from profiles where id = p_performed_by and role = 'master_admin'
  ) then
    raise exception 'Only Master Admin can correct identity fields.';
  end if;

  v_reason := btrim(coalesce(p_reason, ''));
  if v_reason = '' then
    raise exception 'A reason is required for identity corrections.';
  end if;

  v_requester := btrim(coalesce(p_requester_name, ''));
  if v_requester = '' then
    raise exception 'Requester name is required for identity corrections.';
  end if;

  v_new_value := btrim(coalesce(p_new_value, ''));

  if p_entity_type = 'client' then
    v_table := 'clients';
    v_allowed := array['name', 'name_en', 'name_ar', 'phone', 'country_code'];
  else
    v_table := 'owners';
    v_allowed := array['name', 'name_en', 'name_ar', 'phone', 'country'];
  end if;

  if not (p_field_name = any (v_allowed)) then
    raise exception 'Field "%" cannot be corrected.', p_field_name;
  end if;

  execute format(
    'select company_id, %I::text from %I where id = $1',
    p_field_name,
    v_table
  )
  into v_company_id, v_old_value
  using p_entity_id;

  if v_company_id is null then
    raise exception '% not found', p_entity_type;
  end if;

  if p_company_id is not null and p_company_id is distinct from v_company_id then
    raise exception 'Entity does not belong to the given company.';
  end if;

  -- Permit identity column writes for this transaction only.
  perform set_config('app.allow_identity_correction', 'true', true);

  if p_field_name = 'name_en' then
    execute format(
      'update %I set name_en = $1, name = $1 where id = $2 returning to_jsonb(%I.*)',
      v_table,
      v_table
    )
    into v_entity
    using v_new_value, p_entity_id;
  elsif p_field_name = 'name' then
    execute format(
      'update %I set name = $1, name_en = $1 where id = $2 returning to_jsonb(%I.*)',
      v_table,
      v_table
    )
    into v_entity
    using v_new_value, p_entity_id;
  else
    execute format(
      'update %I set %I = $1 where id = $2 returning to_jsonb(%I.*)',
      v_table,
      p_field_name,
      v_table
    )
    into v_entity
    using v_new_value, p_entity_id;
  end if;

  insert into identity_field_audit (
    company_id,
    entity_type,
    entity_id,
    field_name,
    old_value,
    new_value,
    reason,
    requester_name,
    requested_by,
    performed_by
  )
  values (
    v_company_id,
    p_entity_type,
    p_entity_id,
    p_field_name,
    v_old_value,
    v_new_value,
    v_reason,
    v_requester,
    p_requested_by,
    p_performed_by
  )
  returning * into v_audit;

  return jsonb_build_object(
    'entity', v_entity,
    'audit', to_jsonb(v_audit)
  );
end;
$$;

revoke all on function public.master_correct_identity_field(
  text, uuid, text, text, text, text, uuid, uuid, uuid
) from public;

grant execute on function public.master_correct_identity_field(
  text, uuid, text, text, text, text, uuid, uuid, uuid
) to service_role;
