"use client";

import { useActionState, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FileDropZone, type PickedFile } from "@/components/studies/file-drop-zone";
import {
  guessKindFromName,
  isPreviewableImage,
  resolveMimeType,
  titleFromFileName,
  validateStudyFile,
} from "@/components/studies/files";
import { STUDY_KIND_OPTIONS } from "@/components/studies/kinds";
import {
  studyMetaSchema,
  zodFieldErrors,
  type StudyFileChange,
  type StudyFileInput,
  type StudyListItem,
  type StudyMetaInput,
} from "@/components/studies/schema";
import type { StudyServices } from "@/components/studies/services";
import { UploadError } from "@/components/studies/upload";
import type { ActionState, StudyKind } from "@/lib/types";

const TITLE_PLACEHOLDER: Record<StudyKind | "", string> = {
  "": "Ej.: RMN de rodilla derecha",
  xray: "Ej.: Rx de columna lumbar frente y perfil",
  mri: "Ej.: RMN de rodilla derecha",
  ultrasound: "Ej.: Ecografía de hombro izquierdo",
  ct: "Ej.: TAC de columna cervical",
  emg: "Ej.: EMG de miembros inferiores",
  densitometry: "Ej.: Densitometría de columna y cadera",
  lab: "Ej.: Hemograma y eritrosedimentación",
  medical_report: "Ej.: Informe del traumatólogo",
  other: "Ej.: Orden médica de kinesiología",
};

type Props = {
  /** null = estudio nuevo. */
  study: StudyListItem | null;
  /** Archivo soltado sobre la página antes de abrir el diálogo. */
  initialFile: File | null;
  patientId: string;
  userId: string;
  today: string;
  services: StudyServices;
  onClose: () => void;
};

function pickFile(file: File): { picked: PickedFile | null; error: string | null } {
  const error = validateStudyFile(file);
  if (error) return { picked: null, error };
  const mime = resolveMimeType(file) as string;
  return {
    picked: { file, mime, previewUrl: isPreviewableImage(mime) ? URL.createObjectURL(file) : null },
    error: null,
  };
}

/** Diálogo para agregar o editar un estudio (con subida de archivo y progreso). */
export function StudyDialog({ study, initialFile, patientId, userId, today, services, onClose }: Props) {
  const formId = useId();
  const editing = study != null;

  // Estado inicial (con archivo soltado: se sugieren título y tipo).
  const [initial] = useState(() => {
    const fromFile = initialFile ? pickFile(initialFile) : { picked: null, error: null };
    return {
      ...fromFile,
      kind: (study?.kind ?? (initialFile ? guessKindFromName(initialFile.name) : null) ?? "") as StudyKind | "",
      title: study?.title ?? (initialFile && fromFile.picked ? titleFromFileName(initialFile.name) : ""),
    };
  });

  const [kind, setKind] = useState<StudyKind | "">(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(study?.study_date ?? "");
  const [findings, setFindings] = useState(study?.findings ?? "");
  const [picked, setPicked] = useState<PickedFile | null>(initial.picked);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initial.error ? { file: initial.error } : {});
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearError = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  const replacePicked = (next: PickedFile | null) => {
    setPicked((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return next;
    });
  };

  const onPick = (file: File) => {
    const res = pickFile(file);
    if (res.error) {
      setErrors((e) => ({ ...e, file: res.error as string }));
      return;
    }
    clearError("file");
    replacePicked(res.picked);
    if (!title.trim()) {
      setTitle(titleFromFileName(file.name));
      clearError("title");
    }
    if (!kind) {
      const guess = guessKindFromName(file.name);
      if (guess) {
        setKind(guess);
        clearError("kind");
      }
    }
  };

  const [, formAction, isPending] = useActionState<ActionState, FormData>(
    async () => {
      const meta: StudyMetaInput = { kind, title, study_date: date, findings };
      const parsed = studyMetaSchema(today).safeParse(meta);
      if (!parsed.success) {
        const fe = zodFieldErrors(parsed.error.issues);
        setErrors((e) => ({ ...fe, ...(e.file ? { file: e.file } : {}) }));
        toast.error("Revisá los campos marcados.");
        return { ok: false, fieldErrors: fe };
      }
      if (!picked) clearError("file");

      // 1) Subir el archivo (si hay uno nuevo) directo a Storage.
      let uploaded: StudyFileInput | null = null;
      if (picked) {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          uploaded = await services.upload({
            file: picked.file,
            userId,
            patientId,
            onProgress: setProgress,
            signal: controller.signal,
          });
        } catch (err) {
          setProgress(null);
          if (err instanceof UploadError && err.aborted) return { ok: false };
          const message = err instanceof UploadError ? err.message : "No pudimos subir el archivo. Intentá de nuevo.";
          setErrors((e) => ({ ...e, file: message }));
          toast.error(message);
          return { ok: false, message };
        } finally {
          abortRef.current = null;
        }
      }

      // 2) Guardar los datos. Si falla, se borra el archivo recién subido.
      let res: Pick<ActionState, "ok" | "message" | "fieldErrors">;
      try {
        if (editing) {
          const change: StudyFileChange = uploaded
            ? { mode: "replace", file: uploaded }
            : removeExisting
              ? { mode: "remove" }
              : { mode: "keep" };
          res = await services.updateStudy(study.id, meta, change);
        } else {
          res = await services.createStudy(patientId, meta, uploaded);
        }
      } catch {
        res = { ok: false, message: "No pudimos guardar el estudio. Revisá tu conexión e intentá de nuevo." };
      }

      if (!res.ok) {
        if (uploaded) await services.remove(uploaded.path);
        setProgress(null);
        if (res.fieldErrors) setErrors(res.fieldErrors as Record<string, string>);
        toast.error(res.message ?? "No pudimos guardar el estudio.");
        return res;
      }

      if (picked?.previewUrl) URL.revokeObjectURL(picked.previewUrl);
      toast.success(res.message ?? (editing ? "Estudio actualizado" : "Estudio agregado"));
      onClose();
      return res;
    },
    { ok: false },
  );

  const uploading = progress != null && progress < 1;

  const close = () => {
    if (isPending) {
      if (!uploading) return; // guardando datos: esperar
      abortRef.current?.abort();
      toast("Subida cancelada");
    }
    if (picked?.previewUrl) URL.revokeObjectURL(picked.previewUrl);
    onClose();
  };

  const existing =
    study?.file != null
      ? {
          name: study.file.name,
          mime_type: study.file.mime_type,
          size_bytes: study.file.size_bytes,
          thumbnailUrl: study.thumbnailUrl,
        }
      : null;

  return (
    <Dialog
      open
      onClose={close}
      size="lg"
      title={editing ? "Editar estudio" : "Agregar estudio"}
      description={
        editing
          ? "Actualizá los datos o reemplazá el archivo adjunto."
          : "Radiografías, resonancias, ecografías, laboratorio o informes médicos."
      }
      footer={
        <>
          <p className="mr-auto hidden text-[13px] text-muted sm:block">
            {uploading ? "No cierres esta ventana." : "Los archivos se guardan de forma privada."}
          </p>
          <Button variant="ghost" onClick={close} disabled={isPending && !uploading}>
            {uploading ? "Cancelar subida" : "Cancelar"}
          </Button>
          <SubmitButton
            form={formId}
            pending={isPending}
            pendingLabel={uploading ? `Subiendo ${Math.round((progress ?? 0) * 100)}%` : "Guardando…"}
          >
            {editing ? "Guardar cambios" : "Agregar estudio"}
          </SubmitButton>
        </>
      }
    >
      <form id={formId} action={formAction} noValidate className="space-y-6">
        <div>
          <p id={`${formId}-kind`} className="mb-2.5 text-[13px] font-medium text-ink-2">
            Tipo de estudio
          </p>
          <ChipGroup
            aria-label="Tipo de estudio"
            size="sm"
            allowEmpty={false}
            options={STUDY_KIND_OPTIONS}
            value={kind ? [kind] : []}
            onChange={(next) => {
              setKind((next[0] as StudyKind | undefined) ?? "");
              clearError("kind");
            }}
          />
          {errors.kind ? (
            <p role="alert" className="mt-2 text-[13px] text-danger">
              {errors.kind}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_190px]">
          <Field label="Título" htmlFor={`${formId}-title`} error={errors.title}>
            <Input
              id={`${formId}-title`}
              value={title}
              maxLength={200}
              placeholder={TITLE_PLACEHOLDER[kind]}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
              aria-invalid={errors.title ? true : undefined}
              autoComplete="off"
            />
          </Field>
          <Field label="Fecha del estudio" htmlFor={`${formId}-date`} error={errors.study_date} optional>
            <Input
              id={`${formId}-date`}
              type="date"
              value={date}
              max={today}
              onChange={(e) => {
                setDate(e.target.value);
                clearError("study_date");
              }}
              aria-invalid={errors.study_date ? true : undefined}
              className="tabular"
            />
          </Field>
        </div>

        <Field
          label="Hallazgos / informe"
          htmlFor={`${formId}-findings`}
          error={errors.findings}
          optional
          hint={findings.length > 6400 ? `${findings.length.toLocaleString("es-AR")}/8.000` : undefined}
        >
          <Textarea
            id={`${formId}-findings`}
            rows={5}
            value={findings}
            placeholder="Transcribí la conclusión del informe o lo relevante para el tratamiento."
            onChange={(e) => {
              setFindings(e.target.value);
              clearError("findings");
            }}
            aria-invalid={errors.findings ? true : undefined}
          />
        </Field>

        <div>
          <p className="mb-2.5 flex items-baseline justify-between text-[13px] font-medium text-ink-2">
            <span>Archivo</span>
            <span className="text-xs font-normal text-subtle">Opcional</span>
          </p>
          <FileDropZone
            picked={picked}
            existing={existing}
            removeExisting={removeExisting}
            onPick={onPick}
            onClearPicked={() => {
              replacePicked(null);
              clearError("file");
            }}
            onRemoveExisting={() => setRemoveExisting(true)}
            onRestoreExisting={() => setRemoveExisting(false)}
            progress={progress}
            error={errors.file}
            disabled={isPending}
          />
        </div>
      </form>
    </Dialog>
  );
}
