import type { ChipOption } from "@/components/ui/chip";
import { STUDY_KINDS } from "@/lib/constants";
import type { StudyKind } from "@/lib/types";

/** Color (token del tema) de cada tipo de estudio. */
export const STUDY_KIND_COLOR: Record<StudyKind, string> = {
  xray: "var(--color-blue)",
  mri: "var(--color-violet)",
  ultrasound: "var(--color-green)",
  ct: "var(--color-orange)",
  emg: "var(--color-yellow)",
  densitometry: "var(--color-pink)",
  lab: "var(--color-red)",
  medical_report: "var(--color-brand-500)",
  other: "var(--color-subtle)",
};

export const STUDY_KIND_ORDER = Object.keys(STUDY_KINDS) as StudyKind[];

export const STUDY_KIND_OPTIONS: ChipOption[] = STUDY_KIND_ORDER.map((k) => ({
  value: k,
  label: STUDY_KINDS[k].label,
  dot: STUDY_KIND_COLOR[k],
}));
