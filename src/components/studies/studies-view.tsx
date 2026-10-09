"use client";

import { CloudUpload, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StudyCard } from "@/components/studies/study-card";
import { StudyDialog } from "@/components/studies/study-dialog";
import { STUDY_KIND_COLOR, STUDY_KIND_ORDER } from "@/components/studies/kinds";
import { FORMATS_HINT } from "@/components/studies/files";
import type { StudyListItem } from "@/components/studies/schema";
import { defaultStudyServices, type StudyServices } from "@/components/studies/services";
import { STUDY_KINDS } from "@/lib/constants";
import type { StudyKind } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  /** Hoy en Argentina ("YYYY-MM-DD"), calculado en el servidor. */
  today: string;
  studies: StudyListItem[];
  /** Solo para vistas previas: reemplaza las operaciones reales. */
  services?: Partial<StudyServices>;
};

type DialogState = { key: number; study: StudyListItem | null; file: File | null };

/** Composición decorativa del estado vacío (tarjetas flotantes como en el onboarding). */
function EmptyIllustration() {
  const chip = "absolute flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 text-[13px] shadow-soft";
  return (
    <div aria-hidden className="relative mx-auto h-36 w-full max-w-[320px]">
      <div className={cn(chip, "top-2 left-2 -rotate-[5deg]")}>
        <span className="size-2 rounded-full" style={{ backgroundColor: STUDY_KIND_COLOR.xray }} />
        <span className="font-semibold tracking-wide">RX</span>
        <span className="text-muted">Columna lumbar</span>
      </div>
      <div className={cn(chip, "top-12 right-0 rotate-[4deg]")}>
        <span className="size-2 rounded-full" style={{ backgroundColor: STUDY_KIND_COLOR.mri }} />
        <span className="font-semibold tracking-wide">RMN</span>
        <span className="text-muted">Rodilla der.</span>
      </div>
      <div className={cn(chip, "bottom-1 left-10 -rotate-[2deg]")}>
        <span className="inline-flex h-6 items-center rounded-md bg-danger-50 px-1.5 text-[11px] font-semibold text-danger">
          PDF
        </span>
        <span className="text-muted">informe-traumato.pdf</span>
      </div>
    </div>
  );
}

/**
 * Si el foco quedó perdido (en <body> o en un elemento que ya no existe), lo lleva a `preferred`
 * o, si tampoco está en la página, al título de la pestaña.
 */
function restoreFocusTo(preferred: HTMLElement | null, fallback: RefObject<HTMLElement | null>) {
  requestAnimationFrame(() => {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    if (preferred?.isConnected) preferred.focus();
    else fallback.current?.focus();
  });
}

/** Pestaña de estudios complementarios del paciente. */
export function StudiesView({ patientId, today, studies, services }: Props) {
  const svc = useMemo<StudyServices>(() => ({ ...defaultStudyServices, ...services }), [services]);
  const [filter, setFilter] = useState<StudyKind | "all">("all");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dragging, setDragging] = useState(false);
  const dialogKey = useRef(0);
  const dragDepth = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  /** Botón que abrió el diálogo (el foco vuelve ahí al cerrarlo). */
  const openerRef = useRef<HTMLElement | null>(null);
  /** Después de quitar un estudio de la lista, el foco no debe quedar perdido en <body>. */
  const restoreFocusPending = useRef(false);

  const restoreFocus = (preferred: HTMLElement | null) => restoreFocusTo(preferred, titleRef);

  // Cuando la lista cambia (p. ej. se eliminó un estudio y su tarjeta desapareció).
  useEffect(() => {
    if (!restoreFocusPending.current) return;
    restoreFocusPending.current = false;
    restoreFocusTo(null, titleRef);
  }, [studies]);

  const counts = useMemo(() => {
    const c = new Map<StudyKind, number>();
    for (const s of studies) c.set(s.kind, (c.get(s.kind) ?? 0) + 1);
    return c;
  }, [studies]);
  const kindsPresent = STUDY_KIND_ORDER.filter((k) => counts.has(k));
  const activeFilter = filter !== "all" && counts.has(filter) ? filter : "all";
  const visible = activeFilter === "all" ? studies : studies.filter((s) => s.kind === activeFilter);
  const withFile = studies.filter((s) => s.file).length;

  const openDialog = (study: StudyListItem | null, file: File | null = null) => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    dialogKey.current += 1;
    setDialog({ key: dialogKey.current, study, file });
  };

  const closeDialog = () => {
    setDialog(null);
    // El <dialog> se desmonta abierto: el navegador no devuelve el foco solo.
    restoreFocus(openerRef.current);
    openerRef.current = null;
  };

  const onStudyDeleted = () => {
    restoreFocusPending.current = true;
    restoreFocus(null);
  };

  // Soltar un archivo en cualquier parte de la página abre "Agregar estudio" con ese archivo.
  const dialogOpen = dialog !== null;
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      if (!dialogOpen) setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = dialogOpen ? "none" : "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (dialogOpen) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        openerRef.current = null;
        dialogKey.current += 1;
        setDialog({ key: dialogKey.current, study: null, file });
      }
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [dialogOpen]);

  return (
    <section aria-labelledby="studies-title" className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="studies-title"
            ref={titleRef}
            tabIndex={-1}
            className="display text-2xl font-medium text-ink outline-none"
          >
            Estudios
          </h2>
          <p className="mt-1 text-[15px] text-muted">
            {studies.length === 0
              ? "Imágenes, informes médicos y laboratorio del paciente."
              : `${studies.length} ${studies.length === 1 ? "estudio" : "estudios"} · ${withFile} con archivo adjunto`}
          </p>
        </div>
        {studies.length > 0 ? (
          <Button variant="primary" icon={<Plus />} onClick={() => openDialog(null)}>
            Agregar estudio
          </Button>
        ) : null}
      </header>

      {studies.length === 0 ? (
        <div className="rounded-card bg-surface p-2.5 sm:p-3">
          <div className="flex flex-col items-center rounded-[22px] border-[1.5px] border-dashed border-line-strong px-6 py-10 text-center sm:py-14">
            <EmptyIllustration />
            <h3 className="display mt-8 text-[24px] font-medium text-ink sm:text-[28px]">Todavía no hay estudios.</h3>
            <p className="mt-2 max-w-sm text-[15px] text-muted">Subí radiografías, resonancias o informes médicos.</p>
            <Button variant="primary" size="lg" className="mt-7" icon={<Plus />} onClick={() => openDialog(null)}>
              Agregar estudio
            </Button>
            <p className="mt-4 hidden items-center gap-1.5 text-[13px] text-muted sm:inline-flex">
              <CloudUpload className="size-4" strokeWidth={1.8} />o arrastrá un archivo a esta página · {FORMATS_HINT}
            </p>
          </div>
        </div>
      ) : (
        <>
          {kindsPresent.length > 1 ? (
            <div
              role="group"
              aria-label="Filtrar por tipo de estudio"
              className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
            >
              <Chip size="sm" selected={activeFilter === "all"} onClick={() => setFilter("all")} className="shrink-0">
                Todos <span className="tabular opacity-70">{studies.length}</span>
              </Chip>
              {kindsPresent.map((k) => (
                <Chip
                  key={k}
                  size="sm"
                  dot={STUDY_KIND_COLOR[k]}
                  selected={activeFilter === k}
                  onClick={() => setFilter(activeFilter === k ? "all" : k)}
                  className="shrink-0"
                  title={STUDY_KINDS[k].label}
                >
                  {STUDY_KINDS[k].short} <span className="tabular opacity-70">{counts.get(k)}</span>
                </Chip>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visible.map((study, i) => (
              <StudyCard
                key={study.id}
                study={study}
                index={i}
                services={svc}
                onEdit={() => openDialog(study)}
                onDeleted={onStudyDeleted}
              />
            ))}
          </div>
        </>
      )}

      {dialog ? (
        <StudyDialog
          key={dialog.key}
          study={dialog.study}
          initialFile={dialog.file}
          patientId={patientId}
          today={today}
          services={svc}
          onClose={closeDialog}
        />
      ) : null}

      {dragging ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 flex animate-fade-in items-center justify-center bg-canvas/80 p-6 backdrop-blur-sm"
        >
          <div className="flex w-full max-w-md flex-col items-center rounded-card border-2 border-dashed border-ink/30 bg-surface px-8 py-12 text-center shadow-float">
            <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-ink text-white">
              <CloudUpload className="size-6" strokeWidth={1.8} />
            </span>
            <p className="display text-2xl font-medium text-ink">Soltá el archivo</p>
            <p className="mt-1.5 text-sm text-muted">Vas a poder completar los datos del estudio antes de guardarlo.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
