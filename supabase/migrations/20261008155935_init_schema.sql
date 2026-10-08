-- =====================================================================
-- kine · esquema inicial
-- Plataforma para que kinesiólogos registren pacientes, historia clínica,
-- dolores por zona corporal, sesiones de tratamiento y estudios.
--
-- Modelo multi-tenant: cada fila clínica pertenece a un profesional
-- (professional_id = auth.uid()). RLS en todas las tablas.
-- Las FKs compuestas (patient_id, professional_id) garantizan que ningún
-- registro pueda colgar de un paciente de otro profesional.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profesionales (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.professionals (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  first_name text not null default '' check (char_length(first_name) <= 100),
  last_name text not null default '' check (char_length(last_name) <= 100),
  license_number text check (char_length(license_number) <= 50),       -- matrícula
  license_type text check (license_type in ('nacional', 'provincial')), -- MN / MP
  license_province text check (char_length(license_province) <= 100),
  specialties text[] not null default '{}',
  phone text check (char_length(phone) <= 50),
  clinic_name text check (char_length(clinic_name) <= 150),
  clinic_address text check (char_length(clinic_address) <= 250),
  city text check (char_length(city) <= 100),
  province text check (char_length(province) <= 100),
  country text not null default 'AR' check (char_length(country) <= 2),
  bio text check (char_length(bio) <= 2000),
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.professionals is 'Kinesiólogos registrados. Se crea automáticamente al registrarse (trigger en auth.users).';

create trigger professionals_set_updated_at
  before update on public.professionals
  for each row execute function public.set_updated_at();

-- Crea el perfil profesional a partir de los metadatos del registro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  specs text[];
begin
  if jsonb_typeof(meta -> 'specialties') = 'array' then
    select coalesce(array_agg(left(x, 80)), '{}')
      into specs
      from jsonb_array_elements_text(meta -> 'specialties') as t(x);
  else
    specs := '{}';
  end if;

  insert into public.professionals (
    id, email, first_name, last_name, license_number, license_type,
    license_province, specialties, phone, clinic_name, city, province
  )
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(meta ->> 'first_name', ''), 100),
    left(coalesce(meta ->> 'last_name', ''), 100),
    nullif(left(coalesce(meta ->> 'license_number', ''), 50), ''),
    case when meta ->> 'license_type' in ('nacional', 'provincial') then meta ->> 'license_type' end,
    nullif(left(coalesce(meta ->> 'license_province', ''), 100), ''),
    specs,
    nullif(left(coalesce(meta ->> 'phone', ''), 50), ''),
    nullif(left(coalesce(meta ->> 'clinic_name', ''), 150), ''),
    nullif(left(coalesce(meta ->> 'city', ''), 100), ''),
    nullif(left(coalesce(meta ->> 'province', ''), 100), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene sincronizado el email del perfil si cambia en auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.professionals
     set email = coalesce(new.email, '')
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Pacientes
-- ---------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null default auth.uid() references public.professionals (id) on delete cascade,

  -- Datos personales
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  document_type text not null default 'DNI' check (document_type in ('DNI', 'LC', 'LE', 'CI', 'PASAPORTE', 'OTRO')),
  document_number text check (char_length(document_number) <= 30),
  birth_date date check (birth_date > date '1900-01-01'),
  sex text check (sex in ('female', 'male', 'intersex', 'unspecified')),
  gender_identity text check (char_length(gender_identity) <= 60),
  phone text check (char_length(phone) <= 50),
  email text check (char_length(email) <= 200),
  address text check (char_length(address) <= 250),
  city text check (char_length(city) <= 100),
  occupation text check (char_length(occupation) <= 150),
  dominant_side text check (dominant_side in ('right', 'left', 'ambidextrous')),

  -- Cobertura y derivación
  health_insurance text check (char_length(health_insurance) <= 150),        -- obra social / prepaga
  health_insurance_plan text check (char_length(health_insurance_plan) <= 100),
  health_insurance_number text check (char_length(health_insurance_number) <= 60),
  referring_doctor text check (char_length(referring_doctor) <= 150),

  -- Contacto de emergencia
  emergency_contact_name text check (char_length(emergency_contact_name) <= 150),
  emergency_contact_phone text check (char_length(emergency_contact_phone) <= 50),
  emergency_contact_relation text check (char_length(emergency_contact_relation) <= 60),

  -- Consulta
  consultation_reason text check (char_length(consultation_reason) <= 4000),  -- motivo de consulta
  medical_diagnosis text check (char_length(medical_diagnosis) <= 4000),
  kinesic_diagnosis text check (char_length(kinesic_diagnosis) <= 4000),      -- diagnóstico kinésico funcional
  onset_date date,                                                            -- inicio de síntomas
  injury_mechanism text check (char_length(injury_mechanism) <= 4000),

  -- Estado
  status text not null default 'active' check (status in ('active', 'discharged', 'archived')),
  discharged_at timestamptz,
  archived_at timestamptz,
  tags text[] not null default '{}',
  notes text check (char_length(notes) <= 8000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patients_id_professional_key unique (id, professional_id)
);

comment on table public.patients is 'Pacientes de cada kinesiólogo.';

create index patients_professional_status_idx on public.patients (professional_id, status, last_name, first_name);
create index patients_professional_created_idx on public.patients (professional_id, created_at desc);
create unique index patients_professional_document_uidx
  on public.patients (professional_id, document_type, document_number)
  where document_number is not null and document_number <> '';

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Historia clínica (1:1 con paciente; se crea sola al crear el paciente)
-- ---------------------------------------------------------------------
create table public.clinical_histories (
  patient_id uuid primary key,
  professional_id uuid not null default auth.uid(),

  -- Antecedentes
  conditions text[] not null default '{}',            -- checklist (slugs)
  conditions_notes text check (char_length(conditions_notes) <= 4000),
  surgeries text check (char_length(surgeries) <= 4000),
  fractures text check (char_length(fractures) <= 4000),
  medications text check (char_length(medications) <= 4000),
  allergies text check (char_length(allergies) <= 2000),
  family_history text check (char_length(family_history) <= 4000),
  previous_treatments text check (char_length(previous_treatments) <= 4000),
  red_flags text check (char_length(red_flags) <= 4000),  -- alertas / contraindicaciones

  -- Hábitos y estilo de vida
  physical_activity text check (char_length(physical_activity) <= 1000),
  physical_activity_frequency text check (char_length(physical_activity_frequency) <= 200),
  smoking text check (smoking in ('never', 'former', 'current')),
  alcohol text check (alcohol in ('none', 'occasional', 'frequent')),
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 24),
  sleep_quality text check (sleep_quality in ('good', 'regular', 'poor')),
  work_type text check (work_type in ('sedentary', 'standing', 'mixed', 'physical')),
  work_posture_notes text check (char_length(work_posture_notes) <= 2000),
  stress_level smallint check (stress_level between 0 and 10),

  -- Examen físico
  height_cm numeric(5, 1) check (height_cm between 30 and 260),
  weight_kg numeric(5, 1) check (weight_kg between 1 and 400),
  blood_pressure text check (char_length(blood_pressure) <= 20),
  heart_rate smallint check (heart_rate between 20 and 250),
  respiratory_rate smallint check (respiratory_rate between 4 and 80),
  oxygen_saturation smallint check (oxygen_saturation between 50 and 100),
  posture_assessment text check (char_length(posture_assessment) <= 4000),
  gait_assessment text check (char_length(gait_assessment) <= 4000),
  palpation text check (char_length(palpation) <= 4000),

  -- Evaluaciones estructuradas (arrays JSON)
  -- range_of_motion:  [{ id, joint, movement, side, active_deg, passive_deg, notes }]
  -- muscle_strength:  [{ id, muscle, side, grade (0-5) }]
  -- special_tests:    [{ id, name, side, result ('positive'|'negative'|'inconclusive'), notes }]
  -- functional_scales:[{ id, name, score, max, date }]
  range_of_motion jsonb not null default '[]' check (jsonb_typeof(range_of_motion) = 'array'),
  muscle_strength jsonb not null default '[]' check (jsonb_typeof(muscle_strength) = 'array'),
  special_tests jsonb not null default '[]' check (jsonb_typeof(special_tests) = 'array'),
  functional_scales jsonb not null default '[]' check (jsonb_typeof(functional_scales) = 'array'),

  -- Plan terapéutico
  short_term_goals text check (char_length(short_term_goals) <= 4000),
  long_term_goals text check (char_length(long_term_goals) <= 4000),
  treatment_plan text check (char_length(treatment_plan) <= 8000),
  prescribed_sessions smallint check (prescribed_sessions between 0 and 500),
  session_frequency text check (char_length(session_frequency) <= 100),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clinical_histories_patient_fk
    foreign key (patient_id, professional_id)
    references public.patients (id, professional_id) on delete cascade
);

create index clinical_histories_professional_idx on public.clinical_histories (professional_id);

create trigger clinical_histories_set_updated_at
  before update on public.clinical_histories
  for each row execute function public.set_updated_at();

create or replace function public.create_clinical_history_for_patient()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.clinical_histories (patient_id, professional_id)
  values (new.id, new.professional_id)
  on conflict (patient_id) do nothing;
  return new;
end;
$$;

create trigger patients_create_clinical_history
  after insert on public.patients
  for each row execute function public.create_clinical_history_for_patient();

revoke execute on function public.create_clinical_history_for_patient() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Sesiones de tratamiento (evolución, formato SOAP)
-- ---------------------------------------------------------------------
create table public.treatment_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  professional_id uuid not null default auth.uid(),

  session_date date not null,
  start_time time,
  duration_minutes smallint check (duration_minutes between 1 and 600),
  attendance text not null default 'attended' check (attendance in ('attended', 'absent', 'cancelled')),

  subjective text check (char_length(subjective) <= 8000),  -- S: lo que refiere el paciente
  objective text check (char_length(objective) <= 8000),    -- O: hallazgos
  assessment text check (char_length(assessment) <= 8000),  -- A: análisis
  plan text check (char_length(plan) <= 8000),              -- P: plan

  techniques text[] not null default '{}',
  pain_before smallint check (pain_before between 0 and 10),
  pain_after smallint check (pain_after between 0 and 10),
  home_exercises text check (char_length(home_exercises) <= 8000),
  notes text check (char_length(notes) <= 8000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint treatment_sessions_id_professional_key unique (id, professional_id),
  constraint treatment_sessions_patient_fk
    foreign key (patient_id, professional_id)
    references public.patients (id, professional_id) on delete cascade
);

create index treatment_sessions_patient_date_idx on public.treatment_sessions (patient_id, session_date desc);
create index treatment_sessions_professional_date_idx on public.treatment_sessions (professional_id, session_date desc);

create trigger treatment_sessions_set_updated_at
  before update on public.treatment_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Registros de dolor por zona corporal (mapa corporal)
-- Cada fila es una "foto" del dolor de una zona en un momento dado.
-- El estado actual de una zona es su registro más reciente.
-- ---------------------------------------------------------------------
create table public.pain_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  professional_id uuid not null default auth.uid(),
  session_id uuid,

  region text not null check (region ~ '^[a-z0-9_]{2,60}$'),  -- slug de zona (ver src/lib/body-regions.ts)
  view text not null check (view in ('front', 'back')),
  point_x real check (point_x between 0 and 1),               -- punto exacto (normalizado al SVG)
  point_y real check (point_y between 0 and 1),

  intensity smallint not null check (intensity between 0 and 10),  -- EVA 0-10
  pain_types text[] not null default '{}',
  frequency text check (frequency in ('constant', 'intermittent', 'movement', 'rest', 'night', 'morning')),
  started_on date,
  irradiation text check (char_length(irradiation) <= 1000),
  aggravating_factors text check (char_length(aggravating_factors) <= 2000),
  relieving_factors text check (char_length(relieving_factors) <= 2000),
  notes text check (char_length(notes) <= 4000),
  status text not null default 'active' check (status in ('active', 'improving', 'resolved')),

  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint pain_records_patient_fk
    foreign key (patient_id, professional_id)
    references public.patients (id, professional_id) on delete cascade,
  constraint pain_records_session_fk
    foreign key (session_id, professional_id)
    references public.treatment_sessions (id, professional_id) on delete set null (session_id)
);

create index pain_records_patient_region_idx on public.pain_records (patient_id, region, recorded_at desc);
create index pain_records_professional_recorded_idx on public.pain_records (professional_id, recorded_at desc);
create index pain_records_session_idx on public.pain_records (session_id) where session_id is not null;

-- ---------------------------------------------------------------------
-- Estudios complementarios y archivos adjuntos
-- ---------------------------------------------------------------------
create table public.patient_studies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  professional_id uuid not null default auth.uid(),

  kind text not null default 'other' check (kind in (
    'xray', 'mri', 'ultrasound', 'ct', 'emg', 'densitometry', 'lab', 'medical_report', 'other'
  )),
  title text not null check (char_length(title) between 1 and 200),
  study_date date,
  findings text check (char_length(findings) <= 8000),

  -- Archivo en Storage (bucket privado "patient-files")
  -- Ruta: {professional_id}/{patient_id}/{uuid}-{nombre}
  file_path text check (char_length(file_path) <= 500),
  file_name text check (char_length(file_name) <= 255),
  mime_type text check (char_length(mime_type) <= 150),
  size_bytes bigint check (size_bytes >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patient_studies_patient_fk
    foreign key (patient_id, professional_id)
    references public.patients (id, professional_id) on delete cascade
);

create index patient_studies_patient_idx on public.patient_studies (patient_id, study_date desc nulls last);
create index patient_studies_professional_idx on public.patient_studies (professional_id);

create trigger patient_studies_set_updated_at
  before update on public.patient_studies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Vistas (security_invoker => respetan RLS del usuario)
-- ---------------------------------------------------------------------

-- Estado actual del dolor por zona: último registro de cada zona.
create view public.patient_pain_current
with (security_invoker = true) as
select distinct on (pr.patient_id, pr.region)
  pr.*
from public.pain_records pr
order by pr.patient_id, pr.region, pr.recorded_at desc, pr.created_at desc;

-- Resumen por paciente para listados y dashboard.
create view public.patient_overview
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
  coalesce(pc.active_regions, 0)::int as active_regions
from public.patients p
left join lateral (
  select
    max(ts.session_date) as last_session_date,
    count(*) as session_count
  from public.treatment_sessions ts
  where ts.patient_id = p.id
    and ts.attendance = 'attended'
) s on true
left join lateral (
  select
    max(c.intensity)::int as max_pain,
    count(*) filter (where c.intensity > 0) as active_regions
  from public.patient_pain_current c
  where c.patient_id = p.id
    and c.status <> 'resolved'
) pc on true;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.clinical_histories enable row level security;
alter table public.treatment_sessions enable row level security;
alter table public.pain_records enable row level security;
alter table public.patient_studies enable row level security;

-- Profesionales: cada uno ve y edita solo su perfil.
create policy professionals_select_own on public.professionals
  for select to authenticated using (id = (select auth.uid()));
create policy professionals_insert_own on public.professionals
  for insert to authenticated with check (id = (select auth.uid()));
create policy professionals_update_own on public.professionals
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Tablas clínicas: acceso total solo a filas propias.
do $$
declare
  t text;
begin
  foreach t in array array['patients', 'clinical_histories', 'treatment_sessions', 'pain_records', 'patient_studies']
  loop
    execute format(
      'create policy %1$s_select_own on public.%1$I for select to authenticated using (professional_id = (select auth.uid()))', t);
    execute format(
      'create policy %1$s_insert_own on public.%1$I for insert to authenticated with check (professional_id = (select auth.uid()))', t);
    execute format(
      'create policy %1$s_update_own on public.%1$I for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()))', t);
    execute format(
      'create policy %1$s_delete_own on public.%1$I for delete to authenticated using (professional_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Defensa en profundidad: el rol anónimo no toca datos clínicos.
revoke all on table
  public.professionals,
  public.patients,
  public.clinical_histories,
  public.treatment_sessions,
  public.pain_records,
  public.patient_studies,
  public.patient_pain_current,
  public.patient_overview
from anon;

-- ---------------------------------------------------------------------
-- Storage: bucket privado para estudios / adjuntos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-files',
  'patient-files',
  false,
  20971520, -- 20 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf', 'application/dicom',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy patient_files_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy patient_files_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'patient-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy patient_files_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'patient-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy patient_files_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
