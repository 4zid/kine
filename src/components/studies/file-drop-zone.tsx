"use client";

import { CloudUpload, RefreshCw, Undo2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FileTypeIcon } from "@/components/studies/file-visual";
import { FILE_ACCEPT, FILE_CATEGORY_LABEL, FORMATS_HINT, fileCategory, fileSize } from "@/components/studies/files";

export type PickedFile = { file: File; mime: string; previewUrl: string | null };
export type ExistingFile = {
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  thumbnailUrl: string | null;
};

type Props = {
  /** Archivo nuevo elegido (todavía no subido). */
  picked: PickedFile | null;
  /** Archivo actual del estudio (edición). */
  existing: ExistingFile | null;
  /** El archivo actual se quitará al guardar. */
  removeExisting: boolean;
  onPick: (file: File) => void;
  onClearPicked: () => void;
  onRemoveExisting: () => void;
  onRestoreExisting: () => void;
  /** Progreso de subida 0..1 (null si no se está subiendo). */
  progress: number | null;
  error?: string | null;
  disabled?: boolean;
};

function Thumb({ url, mime, alt }: { url: string | null; mime: string | null; alt: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob: / URL firmada de Storage privado
      <img src={url} alt={alt} className="size-14 shrink-0 rounded-[14px] object-cover shadow-inset" />
    );
  }
  return <FileTypeIcon mime={mime} className="size-14 rounded-[14px]" />;
}

/** Zona para arrastrar o elegir un archivo + estado del archivo elegido / actual. */
export function FileDropZone({
  picked,
  existing,
  removeExisting,
  onPick,
  onClearPicked,
  onRemoveExisting,
  onRestoreExisting,
  progress,
  error,
  disabled,
}: Props) {
  const inputId = useId();
  const titleId = `${inputId}-title`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Control que recibe el foco cuando el botón usado desaparece (quitar / deshacer). */
  const focusNext = useRef<"zone" | "undo" | "replace" | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploading = progress != null;

  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    rootRef.current?.querySelector<HTMLElement>(`[data-dz="${target}"]`)?.focus();
  });

  const browse = () => inputRef.current?.click();

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onPick(file);
  };

  const dragProps = {
    onDragEnter: (e: DragEvent<HTMLElement>) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setDragging(false);
    },
    onDrop,
  };

  // Input oculto SIN name: el archivo nunca viaja en el body de la Server Action.
  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={FILE_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      disabled={disabled}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onPick(file);
        e.target.value = "";
      }}
    />
  );

  const fileRow = (opts: {
    name: string;
    mime: string | null;
    size: number | null;
    thumb: string | null;
    actions: ReactNode;
  }) => (
    <div
      {...dragProps}
      className={cn(
        "relative overflow-hidden rounded-panel bg-surface-2 p-3 transition-shadow sm:p-3.5",
        dragging && "shadow-[0_0_0_2px_var(--color-ink)]",
        error && "shadow-[0_0_0_1.5px_var(--color-danger)]",
      )}
    >
      <div className="flex items-center gap-3">
        <Thumb url={opts.thumb} mime={opts.mime} alt="" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink" title={opts.name}>
            {opts.name}
          </p>
          <p className="tabular mt-0.5 text-[13px] text-muted">
            {FILE_CATEGORY_LABEL[fileCategory(opts.mime)]} · {fileSize(opts.size)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">{opts.actions}</div>
      </div>
      {uploading ? (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-ink-2">{progress >= 1 ? "Guardando estudio…" : "Subiendo archivo…"}</span>
            <span className="tabular text-muted">{Math.round(progress * 100)}%</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Progreso de subida"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.max(3, progress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  const iconButton =
    "inline-flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40";

  let body: ReactNode;
  if (picked) {
    body = fileRow({
      name: picked.file.name,
      mime: picked.mime,
      size: picked.file.size,
      thumb: picked.previewUrl,
      actions: (
        <>
          <button
            type="button"
            onClick={browse}
            disabled={disabled}
            className={iconButton}
            aria-label="Elegir otro archivo"
            title="Elegir otro archivo"
          >
            <RefreshCw className="size-[18px]" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => {
              focusNext.current = existing && !removeExisting ? "replace" : "zone";
              onClearPicked();
            }}
            disabled={disabled}
            className={iconButton}
            aria-label="Quitar archivo elegido"
            title="Quitar"
          >
            <X className="size-5" strokeWidth={1.8} />
          </button>
        </>
      ),
    });
  } else if (existing && !removeExisting) {
    body = fileRow({
      name: existing.name,
      mime: existing.mime_type,
      size: existing.size_bytes,
      thumb: existing.thumbnailUrl,
      actions: (
        <>
          <button
            type="button"
            onClick={browse}
            disabled={disabled}
            data-dz="replace"
            aria-label={`Reemplazar ${existing.name}`}
            className={cn(iconButton, "w-auto gap-1.5 px-3 text-[13px] font-medium text-ink-2")}
          >
            <RefreshCw className="size-4" strokeWidth={1.8} />
            Reemplazar
          </button>
          <button
            type="button"
            onClick={() => {
              focusNext.current = "undo";
              onRemoveExisting();
            }}
            disabled={disabled}
            className={iconButton}
            aria-label="Quitar archivo adjunto"
            title="Quitar archivo"
          >
            <X className="size-5" strokeWidth={1.8} />
          </button>
        </>
      ),
    });
  } else {
    // Botón real (no un <label> enfocable): se anuncia como botón y se activa con Enter/Espacio.
    // Las ayudas quedan como descripción, no como parte del nombre.
    body = (
      <div {...dragProps} data-invalid={error ? true : undefined}>
        <button
          type="button"
          onClick={browse}
          disabled={disabled}
          data-dz="zone"
          aria-labelledby={titleId}
          aria-describedby={error ? errorId : hintId}
          className={cn(
            "group flex w-full cursor-pointer flex-col items-center justify-center rounded-panel border-[1.5px] border-dashed px-6 py-8 text-center transition-[background-color,border-color] duration-150 disabled:cursor-default disabled:opacity-60",
            dragging ? "border-ink bg-surface-2" : "border-line-strong hover:border-ink/40 hover:bg-surface-2/60",
            error && "border-danger",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "mb-3 inline-flex size-12 items-center justify-center rounded-full transition-colors",
              dragging ? "bg-ink text-white" : "bg-surface-2 text-ink-2 group-hover:bg-surface",
            )}
          >
            <CloudUpload className="size-[22px]" strokeWidth={1.8} />
          </span>
          <span id={titleId} className="text-[15px] font-medium text-ink">
            {dragging ? "Soltá el archivo acá" : "Arrastrá un archivo o tocá para elegirlo"}
          </span>
          {error ? (
            <span id={errorId} role="alert" className="mt-1.5 max-w-sm text-[13px] font-medium text-danger">
              {error}
            </span>
          ) : (
            <span id={hintId} className="mt-1 text-[13px] text-muted">
              {FORMATS_HINT}
            </span>
          )}
        </button>
      </div>
    );
  }
  const showErrorBelow = Boolean(error) && (picked != null || (existing != null && !removeExisting));

  return (
    <div ref={rootRef}>
      {input}
      {body}
      {existing && removeExisting && !picked ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          Se quitará <span className="font-medium text-ink-2">{existing.name}</span> al guardar.
          <button
            type="button"
            data-dz="undo"
            onClick={() => {
              focusNext.current = "replace";
              onRestoreExisting();
            }}
            className="inline-flex h-10 items-center gap-1 rounded-full px-3 font-medium text-ink hover:bg-surface-2"
          >
            <Undo2 aria-hidden className="size-3.5" />
            Deshacer
          </button>
        </p>
      ) : null}
      {existing && picked && !uploading ? (
        <p className="mt-2 text-[13px] text-muted">
          Reemplaza a <span className="font-medium text-ink-2">{existing.name}</span>.
        </p>
      ) : null}
      {showErrorBelow ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
