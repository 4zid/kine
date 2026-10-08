-- Búsqueda de pacientes sin distinguir acentos ni mayúsculas ("perez" encuentra "Pérez"),
-- con índice trigram para que siga siendo rápida con miles de pacientes.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() no es IMMUTABLE; este wrapper con diccionario fijo sí, y permite usarlo en
-- columnas generadas e índices.
create or replace function public.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;

revoke execute on function public.immutable_unaccent(text) from public, anon;

alter table public.patients
  add column if not exists search_text text
  generated always as (
    lower(public.immutable_unaccent(
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(document_number, '')
    ))
  ) stored;

create index if not exists patients_search_text_trgm_idx
  on public.patients using gin (search_text extensions.gin_trgm_ops);

-- Expone search_text en la vista de listado (se agrega al final: CREATE OR REPLACE lo permite)
-- y excluye turnos futuros de "última sesión" y del conteo de sesiones.
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
  p.search_text
from public.patients p
left join lateral (
  select
    max(ts.session_date) as last_session_date,
    count(*) as session_count
  from public.treatment_sessions ts
  where ts.patient_id = p.id
    and ts.attendance = 'attended'
    -- Las sesiones con fecha futura son turnos programados: no cuentan como realizadas.
    and ts.session_date <= (now() at time zone 'America/Argentina/Buenos_Aires')::date
) s on true
left join lateral (
  select
    max(c.intensity)::int as max_pain,
    count(*) filter (where c.intensity > 0) as active_regions
  from public.patient_pain_current c
  where c.patient_id = p.id
    and c.status <> 'resolved'
) pc on true;
