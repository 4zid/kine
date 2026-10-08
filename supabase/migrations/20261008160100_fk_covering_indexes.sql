-- Índices que cubren las FKs compuestas (patient_id, professional_id)
-- y (session_id, professional_id), recomendados por el linter de Supabase.
create index if not exists clinical_histories_patient_professional_idx
  on public.clinical_histories (patient_id, professional_id);

create index if not exists treatment_sessions_patient_professional_idx
  on public.treatment_sessions (patient_id, professional_id);

create index if not exists pain_records_patient_professional_idx
  on public.pain_records (patient_id, professional_id);

create index if not exists patient_studies_patient_professional_idx
  on public.patient_studies (patient_id, professional_id);

create index if not exists pain_records_session_professional_idx
  on public.pain_records (session_id, professional_id);
