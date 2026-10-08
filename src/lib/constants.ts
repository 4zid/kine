import type {
  Alcohol,
  Attendance,
  DocumentType,
  DominantSide,
  LicenseType,
  PainFrequency,
  PainStatus,
  PatientStatus,
  Sex,
  Side,
  SleepQuality,
  Smoking,
  StudyKind,
  WorkType,
} from "@/lib/types";

export type Option<V extends string = string> = { value: V; label: string; hint?: string };

/** Paleta de puntos de color para chips (como las categorías de daily). */
export const DOT_COLORS = [
  "#2F6FE0", // azul
  "#EA6A2E", // naranja
  "#2F9E5B", // verde
  "#E6A82A", // amarillo
  "#E57AA6", // rosa
  "#3F8F2F", // verde oscuro
  "#4B3BB5", // violeta
  "#DC4B3E", // rojo
  "#7A7A85", // gris
] as const;

// ---------------------------------------------------------------------------
// Profesional
// ---------------------------------------------------------------------------
export const SPECIALTIES: Option[] = [
  { value: "traumatologia", label: "Traumatología y ortopedia" },
  { value: "deportiva", label: "Kinesiología deportiva" },
  { value: "neurologica", label: "Neurorrehabilitación" },
  { value: "respiratoria", label: "Respiratoria" },
  { value: "cardiovascular", label: "Cardiovascular" },
  { value: "pediatrica", label: "Pediatría" },
  { value: "geriatrica", label: "Geriatría" },
  { value: "suelo_pelvico", label: "Suelo pélvico" },
  { value: "reumatologia", label: "Reumatología" },
  { value: "dermatofuncional", label: "Dermatofuncional" },
  { value: "oncologica", label: "Oncología" },
  { value: "laboral", label: "Ergonomía y laboral" },
  { value: "terapia_manual", label: "Terapia manual / osteopatía" },
  { value: "rpg", label: "RPG / postural" },
  { value: "vestibular", label: "Vestibular" },
  { value: "atm", label: "ATM" },
];

export const LICENSE_TYPES: Option<LicenseType>[] = [
  { value: "nacional", label: "Nacional (MN)" },
  { value: "provincial", label: "Provincial (MP)" },
];

export const AR_PROVINCES = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

// ---------------------------------------------------------------------------
// Paciente
// ---------------------------------------------------------------------------
export const PATIENT_STATUS: Record<PatientStatus, { label: string; color: string }> = {
  active: { label: "En tratamiento", color: "#2F9E5B" },
  discharged: { label: "Alta", color: "#2F6FE0" },
  archived: { label: "Archivado", color: "#7A7A85" },
};

export const SEX_OPTIONS: Option<Sex>[] = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "intersex", label: "Intersex" },
  { value: "unspecified", label: "Prefiere no decir" },
];

export const DOCUMENT_TYPES: Option<DocumentType>[] = [
  { value: "DNI", label: "DNI" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "LC", label: "LC" },
  { value: "LE", label: "LE" },
  { value: "CI", label: "CI" },
  { value: "OTRO", label: "Otro" },
];

export const DOMINANT_SIDE_OPTIONS: Option<DominantSide>[] = [
  { value: "right", label: "Diestro/a" },
  { value: "left", label: "Zurdo/a" },
  { value: "ambidextrous", label: "Ambidiestro/a" },
];

/** Sugerencias para el campo de obra social / prepaga (datalist, texto libre). */
export const HEALTH_INSURANCE_SUGGESTIONS = [
  "Particular",
  "OSDE",
  "Swiss Medical",
  "Galeno",
  "Medifé",
  "Omint",
  "Sancor Salud",
  "Accord Salud",
  "Prevención Salud",
  "Hospital Italiano",
  "Hospital Alemán",
  "IOMA",
  "PAMI",
  "OSECAC",
  "OSDEPYM",
  "IOSFA",
  "Unión Personal",
  "OSPRERA",
  "ART",
] as const;

// ---------------------------------------------------------------------------
// Historia clínica
// ---------------------------------------------------------------------------
/** Antecedentes patológicos (checklist). `alert` = relevante para contraindicaciones. */
export const CONDITIONS: (Option & { alert?: boolean })[] = [
  { value: "hypertension", label: "Hipertensión" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Cardiopatía", alert: true },
  { value: "pacemaker", label: "Marcapasos", alert: true },
  { value: "metal_implants", label: "Implantes / prótesis metálicas", alert: true },
  { value: "anticoagulants", label: "Anticoagulación", alert: true },
  { value: "dvt", label: "Trombosis venosa", alert: true },
  { value: "cancer", label: "Cáncer (actual o previo)", alert: true },
  { value: "pregnancy", label: "Embarazo", alert: true },
  { value: "epilepsy", label: "Epilepsia", alert: true },
  { value: "asthma_copd", label: "Asma / EPOC" },
  { value: "osteoporosis", label: "Osteoporosis" },
  { value: "osteoarthritis", label: "Artrosis" },
  { value: "rheumatoid_arthritis", label: "Artritis reumatoidea" },
  { value: "fibromyalgia", label: "Fibromialgia" },
  { value: "disc_herniation", label: "Hernia de disco" },
  { value: "scoliosis", label: "Escoliosis" },
  { value: "thyroid", label: "Trastorno tiroideo" },
  { value: "obesity", label: "Obesidad" },
  { value: "stroke", label: "ACV" },
  { value: "parkinson", label: "Parkinson" },
  { value: "multiple_sclerosis", label: "Esclerosis múltiple" },
  { value: "anxiety_depression", label: "Ansiedad / depresión" },
  { value: "skin_sensitivity", label: "Alteraciones de sensibilidad", alert: true },
];

export const SMOKING_OPTIONS: Option<Smoking>[] = [
  { value: "never", label: "No fuma" },
  { value: "former", label: "Ex fumador/a" },
  { value: "current", label: "Fuma" },
];

export const ALCOHOL_OPTIONS: Option<Alcohol>[] = [
  { value: "none", label: "No consume" },
  { value: "occasional", label: "Ocasional" },
  { value: "frequent", label: "Frecuente" },
];

export const SLEEP_QUALITY_OPTIONS: Option<SleepQuality>[] = [
  { value: "good", label: "Buena" },
  { value: "regular", label: "Regular" },
  { value: "poor", label: "Mala" },
];

export const WORK_TYPE_OPTIONS: Option<WorkType>[] = [
  { value: "sedentary", label: "Sedentario (sentado)" },
  { value: "standing", label: "De pie" },
  { value: "mixed", label: "Mixto" },
  { value: "physical", label: "Esfuerzo físico" },
];

export const SIDE_OPTIONS: Option<Side>[] = [
  { value: "right", label: "Der." },
  { value: "left", label: "Izq." },
  { value: "bilateral", label: "Bilateral" },
  { value: "na", label: "—" },
];

/** Escala de Daniels (fuerza muscular 0-5). */
export const MUSCLE_GRADES = [
  { value: 0, label: "0 · Nula" },
  { value: 1, label: "1 · Vestigios" },
  { value: 2, label: "2 · Mala" },
  { value: 3, label: "3 · Regular" },
  { value: 4, label: "4 · Buena" },
  { value: 5, label: "5 · Normal" },
] as const;

export const SPECIAL_TEST_SUGGESTIONS = [
  "Lasègue",
  "Slump",
  "Neer",
  "Hawkins-Kennedy",
  "Jobe",
  "Patte",
  "Speed",
  "Yergason",
  "Lachman",
  "Cajón anterior",
  "Cajón posterior",
  "McMurray",
  "Apley",
  "Thomas",
  "Ober",
  "FABER (Patrick)",
  "Trendelenburg",
  "Phalen",
  "Tinel",
  "Finkelstein",
  "Spurling",
  "Thompson",
] as const;

export const FUNCTIONAL_SCALE_SUGGESTIONS = [
  "Oswestry (ODI)",
  "Roland-Morris",
  "Neck Disability Index (NDI)",
  "DASH",
  "QuickDASH",
  "WOMAC",
  "KOOS",
  "Lysholm",
  "LEFS",
  "Berg",
  "Tinetti",
  "Barthel",
  "SPADI",
] as const;

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------
export const TECHNIQUES: Option[] = [
  { value: "manual_therapy", label: "Terapia manual" },
  { value: "joint_mobilization", label: "Movilización articular" },
  { value: "massage", label: "Masoterapia" },
  { value: "myofascial", label: "Inducción miofascial" },
  { value: "therapeutic_exercise", label: "Ejercicio terapéutico" },
  { value: "strengthening", label: "Fortalecimiento" },
  { value: "stretching", label: "Elongación" },
  { value: "proprioception", label: "Propiocepción" },
  { value: "postural", label: "Reeducación postural (RPG)" },
  { value: "pilates", label: "Pilates" },
  { value: "neurodynamics", label: "Neurodinamia" },
  { value: "gait_training", label: "Reeducación de la marcha" },
  { value: "respiratory", label: "Kinesiología respiratoria" },
  { value: "tens", label: "TENS" },
  { value: "ems", label: "Electroestimulación (EMS)" },
  { value: "ultrasound", label: "Ultrasonido" },
  { value: "magnetotherapy", label: "Magnetoterapia" },
  { value: "laser", label: "Láser" },
  { value: "shortwave", label: "Onda corta" },
  { value: "shockwave", label: "Ondas de choque" },
  { value: "cryotherapy", label: "Crioterapia" },
  { value: "thermotherapy", label: "Termoterapia" },
  { value: "dry_needling", label: "Punción seca" },
  { value: "kinesiotape", label: "Vendaje neuromuscular" },
  { value: "lymphatic_drainage", label: "Drenaje linfático" },
  { value: "pressotherapy", label: "Presoterapia" },
  { value: "hydrotherapy", label: "Hidroterapia" },
];

export const ATTENDANCE: Record<Attendance, { label: string; color: string }> = {
  attended: { label: "Asistió", color: "#2F9E5B" },
  absent: { label: "Ausente", color: "#DC4B3E" },
  cancelled: { label: "Cancelada", color: "#7A7A85" },
};

export const SESSION_DURATIONS = [30, 45, 60, 90] as const;

// ---------------------------------------------------------------------------
// Dolor (mapa corporal)
// ---------------------------------------------------------------------------
export const PAIN_TYPES: Option[] = [
  { value: "stabbing", label: "Punzante" },
  { value: "burning", label: "Quemante" },
  { value: "dull", label: "Sordo" },
  { value: "electric", label: "Eléctrico" },
  { value: "pressing", label: "Opresivo" },
  { value: "throbbing", label: "Pulsátil" },
  { value: "tingling", label: "Hormigueo" },
  { value: "numbness", label: "Adormecimiento" },
  { value: "stiffness", label: "Rigidez" },
  { value: "cramp", label: "Calambre" },
  { value: "pulling", label: "Tirante" },
];

export const PAIN_FREQUENCY: Option<PainFrequency>[] = [
  { value: "constant", label: "Constante" },
  { value: "intermittent", label: "Intermitente" },
  { value: "movement", label: "Al movimiento" },
  { value: "rest", label: "En reposo" },
  { value: "night", label: "Nocturno" },
  { value: "morning", label: "Matinal" },
];

export const PAIN_STATUS: Record<PainStatus, { label: string; color: string }> = {
  active: { label: "Activo", color: "#DC4B3E" },
  improving: { label: "Mejorando", color: "#E6A82A" },
  resolved: { label: "Resuelto", color: "#2F9E5B" },
};

/** Etiquetas de la escala EVA (0-10). */
export const PAIN_SCALE_LABELS: Record<number, string> = {
  0: "Sin dolor",
  1: "Muy leve",
  2: "Leve",
  3: "Leve",
  4: "Moderado",
  5: "Moderado",
  6: "Moderado",
  7: "Intenso",
  8: "Intenso",
  9: "Muy intenso",
  10: "Insoportable",
};

// ---------------------------------------------------------------------------
// Estudios
// ---------------------------------------------------------------------------
export const STUDY_KINDS: Record<StudyKind, { label: string; short: string }> = {
  xray: { label: "Radiografía", short: "RX" },
  mri: { label: "Resonancia magnética", short: "RMN" },
  ultrasound: { label: "Ecografía", short: "ECO" },
  ct: { label: "Tomografía", short: "TAC" },
  emg: { label: "Electromiografía", short: "EMG" },
  densitometry: { label: "Densitometría", short: "DMO" },
  lab: { label: "Laboratorio", short: "LAB" },
  medical_report: { label: "Informe médico", short: "INF" },
  other: { label: "Otro", short: "DOC" },
};

export const PATIENT_FILES_BUCKET = "patient-files";
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
