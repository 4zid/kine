"use client";

import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { FileTypeIcon } from "@/components/studies/file-visual";
import { FILE_CATEGORY_LABEL, fileCategory, fileSize, isViewableInBrowser } from "@/components/studies/files";
import { STUDY_KIND_COLOR } from "@/components/studies/kinds";
import type { StudyListItem } from "@/components/studies/schema";
import type { StudyServices } from "@/components/studies/services";
import { STUDY_KINDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LONG_FINDINGS = 220;

export function StudyCard({
  study,
  services,
  onEdit,
  index = 0,
}: {
  study: StudyListItem;
  services: StudyServices;
  onEdit: () => void;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [, startTransition] = useTransition();
  const kind = STUDY_KINDS[study.kind];
  const file = study.file;
  const viewable = file ? isViewableInBrowser(file.mime_type) : false;
  const longFindings = (study.findings?.length ?? 0) > LONG_FINDINGS || (study.findings?.split("\n").length ?? 0) > 4;

  const openFile = (mode: "view" | "download") => {
    // La pestaña se abre sincrónicamente (si no, el navegador la bloquea) y se completa con la URL firmada.
    const win = mode === "view" ? window.open("", "_blank") : null;
    setBusy(mode);
    startTransition(async () => {
      let res: Awaited<ReturnType<StudyServices["getFileUrl"]>>;
      try {
        res = await services.getFileUrl(study.id, mode);
      } catch {
        res = { ok: false, message: "No pudimos abrir el archivo. Revisá tu conexión." };
      }
      setBusy(null);
      if (!res.ok || !res.data) {
        win?.close();
        toast.error(res.message ?? "No pudimos abrir el archivo.");
        return;
      }
      if (win) {
        win.opener = null;
        win.location.href = res.data.url;
        return;
      }
      const a = document.createElement("a");
      a.href = res.data.url;
      a.rel = "noopener";
      if (mode === "view") a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  return (
    <article
      className="flex min-w-0 animate-fade-up flex-col rounded-card bg-surface p-5 sm:p-6"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      aria-labelledby={`study-${study.id}-title`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3 text-[12px] font-semibold tracking-[0.06em] text-ink">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: STUDY_KIND_COLOR[study.kind] }}
            />
            {kind.short}
          </span>
          <span className="truncate text-[13px] text-muted">{kind.label}</span>
        </div>
        <span className="tabular shrink-0 text-[13px] text-muted">
          {study.dateLabel ?? <span className="text-subtle">Sin fecha</span>}
        </span>
      </header>

      <h3 id={`study-${study.id}-title`} className="display mt-4 text-[22px] font-medium text-ink sm:text-2xl">
        {study.title}
      </h3>

      {study.findings ? (
        <div className="mt-2.5">
          <p className={cn("text-[14px] leading-relaxed whitespace-pre-line text-ink-2", !expanded && "line-clamp-3")}>
            {study.findings}
          </p>
          {longFindings ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-1 -ml-2 inline-flex h-9 items-center rounded-full px-2 text-[13px] font-medium text-ink hover:bg-surface-2"
            >
              {expanded ? "Ver menos" : "Ver informe completo"}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2.5 text-[14px] text-subtle">Sin hallazgos cargados.</p>
      )}

      {file ? (
        <div className="mt-5">
          {study.thumbnailUrl ? (
            <button
              type="button"
              onClick={() => openFile("view")}
              className="group relative block aspect-[16/9] w-full overflow-hidden rounded-panel bg-surface-2"
              aria-label={`Ver imagen ${file.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage privado */}
              <img
                src={study.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 text-left text-white">
                <span className="min-w-0 truncate text-[13px] font-medium">{file.name}</span>
                <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3 text-[12px] font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Eye className="size-3.5" />
                  Ver
                </span>
              </span>
            </button>
          ) : null}
          {/* Angosto: acciones debajo a todo el ancho. Ancho (@sm): todo en una línea. */}
          <div className={cn("@container", study.thumbnailUrl && "mt-2")}>
            <div className="flex flex-col gap-3 rounded-panel bg-surface-2 p-3 @sm:flex-row @sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {!study.thumbnailUrl ? <FileTypeIcon mime={file.mime_type} /> : null}
                <div className="min-w-0 flex-1">
                  {!study.thumbnailUrl ? (
                    <p className="truncate text-[14px] font-medium text-ink" title={file.name}>
                      {file.name}
                    </p>
                  ) : null}
                  <p className={cn("tabular text-[13px] text-muted", study.thumbnailUrl ? "pl-1" : "mt-0.5")}>
                    {FILE_CATEGORY_LABEL[fileCategory(file.mime_type)]} · {fileSize(file.size_bytes)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 *:flex-1 @sm:*:flex-none">
                {viewable ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10"
                    onClick={() => openFile("view")}
                    disabled={busy !== null}
                    icon={busy === "view" ? <Spinner /> : <Eye />}
                  >
                    Ver
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  className={cn("h-10", viewable && "@sm:size-10 @sm:px-0")}
                  onClick={() => openFile("download")}
                  disabled={busy !== null}
                  aria-label={`Descargar ${file.name}`}
                  title="Descargar"
                  icon={busy === "download" ? <Spinner /> : <Download />}
                >
                  <span className={cn(viewable && "@sm:sr-only")}>Descargar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-[13px] text-subtle">Cargado {study.createdLabel}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-10"
            onClick={onEdit}
            aria-label={`Editar ${study.title}`}
            title="Editar"
          >
            <Pencil />
          </Button>
          <ConfirmDialog
            title="¿Eliminar este estudio?"
            description={
              file
                ? `Se eliminarán “${study.title}” y su archivo adjunto. Esta acción no se puede deshacer.`
                : `Se eliminará “${study.title}”. Esta acción no se puede deshacer.`
            }
            confirmLabel="Eliminar"
            successMessage="Estudio eliminado"
            onConfirm={() => services.deleteStudy(study.id)}
            trigger={(open) => (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={open}
                aria-label={`Eliminar ${study.title}`}
                title="Eliminar"
                className="size-10 hover:bg-danger-50 hover:text-danger"
              >
                <Trash2 />
              </Button>
            )}
          />
        </div>
      </footer>
    </article>
  );
}
