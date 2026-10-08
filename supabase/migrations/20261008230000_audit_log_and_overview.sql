-- =====================================================================
-- 1) Registro de auditoría clínica (inviolabilidad y custodia de la
--    historia clínica, Ley 26.529 art. 18). Cada UPDATE y DELETE de datos
--    clínicos guarda la versión anterior (y la nueva en los UPDATE).
--    Solo lo escribe el trigger; el profesional puede leer lo suyo.
-- =====================================================================
create table if not exists public.clinical_audit_log (
  id bigint generated always as identity primary key,
  professional_id uuid not null,
  patient_id uuid,
  table_name text not null,
  record_id text not null,
  operation text not null check (operation in ('UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

comment on table public.clinical_audit_log is
  'Auditoría de cambios y borrados de datos clínicos. Solo escritura por trigger.';

create index if not exists clinical_audit_log_professional_idx
  on public.clinical_audit_log (professional_id, changed_at desc);
create index if not exists clinical_audit_log_patient_idx
  on public.clinical_audit_log (patient_id, changed_at desc);

alter table public.clinical_audit_log enable row level security;

create policy clinical_audit_log_select_own on public.clinical_audit_log
  for select to authenticated using (professional_id = (select auth.uid()));

revoke all on table public.clinical_audit_log from anon;
revoke insert, update, delete, truncate on table public.clinical_audit_log from authenticated;

create or replace function public.audit_clinical_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) end;
  ref jsonb := coalesce(new_row, old_row);
begin
  -- Un UPDATE que no cambia nada no deja rastro.
  if tg_op = 'UPDATE' and old_row = new_row then
    return null;
  end if;

  insert into public.clinical_audit_log (
    professional_id, patient_id, table_name, record_id, operation, old_data, new_data
  )
  values (
    (ref ->> 'professional_id')::uuid,
    case when tg_table_name = 'patients' then (ref ->> 'id')::uuid else (ref ->> 'patient_id')::uuid end,
    tg_table_name,
    coalesce(ref ->> 'id', ref ->> 'patient_id'),
    tg_op,
    old_row,
    new_row
  );
  return null;
end;
$$;

revoke execute on function public.audit_clinical_change() from public, anon, authenticated;

create trigger patients_audit
  after update or delete on public.patients
  for each row execute function public.audit_clinical_change();
create trigger clinical_histories_audit
  after update or delete on public.clinical_histories
  for each row execute function public.audit_clinical_change();
create trigger treatment_sessions_audit
  after update or delete on public.treatment_sessions
  for each row execute function public.audit_clinical_change();
create trigger pain_records_audit
  after update or delete on public.pain_records
  for each row execute function public.audit_clinical_change();
create trigger patient_studies_audit
  after update or delete on public.patient_studies
  for each row execute function public.audit_clinical_change();

-- =====================================================================
-- 2) patient_overview:
--    - max_pain / active_regions solo cuentan zonas con intensidad > 0
--      (misma regla de "dolor activo" que el resto de la app).
--    - last_activity_at: última actividad real (datos del paciente, sesiones
--      o registros de dolor) para ordenar "Recientes".
-- =====================================================================
create or replace view public.patient_overview
with (security_invoker = true) as
select
  p.id,
  p.professional_id,
  p.first_name,
  p.last_name,
  p.document_type,
  p.document_number,
  p.birth_date,
  p.sex,
  p.phone,
  p.email,
  p.health_insurance,
  p.consultation_reason,
  p.medical_diagnosis,
  p.kinesic_diagnosis,
  p.status,
  p.tags,
  p.created_at,
  p.updated_at,
  s.last_session_date,
  coalesce(s.session_count, 0)::int as session_count,
  pc.max_pain,
  coalesce(pc.active_regions, 0)::int as active_regions,
  p.search_text,
  greatest(p.updated_at, a.last_session_change, a.last_pain_record) as last_activity_at
from public.patients p
left join lateral (
  select
    max(ts.session_date) as last_session_date,
    count(*) as session_count
  from public.treatment_sessions ts
  where ts.patient_id = p.id
    and ts.attendance = 'attended'
    and ts.session_date <= (now() at time zone 'America/Argentina/Buenos_Aires')::date
) s on true
left join lateral (
  select
    max(c.intensity)::int as max_pain,
    count(*) as active_regions
  from public.patient_pain_current c
  where c.patient_id = p.id
    and c.status <> 'resolved'
    and c.intensity > 0
) pc on true
left join lateral (
  select
    (select max(ts2.updated_at) from public.treatment_sessions ts2 where ts2.patient_id = p.id) as last_session_change,
    (select max(pr.created_at) from public.pain_records pr where pr.patient_id = p.id) as last_pain_record
) a on true;

revoke all on table public.patient_overview from anon;
