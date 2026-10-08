import { FileImage, FileText, FileType2, ScanLine, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileCategory, type FileCategory } from "@/components/studies/files";

const CATEGORY_STYLE: Record<FileCategory, { icon: typeof FileText; tone: string }> = {
  pdf: { icon: FileText, tone: "bg-danger-50 text-danger" },
  image: { icon: FileImage, tone: "bg-success-50 text-success" },
  doc: { icon: FileType2, tone: "bg-accent-100 text-accent" },
  dicom: { icon: ScanLine, tone: "bg-violet/10 text-violet" },
  other: { icon: FileIcon, tone: "bg-surface-3 text-ink-2" },
};

/** Ícono del archivo según su tipo (PDF, imagen, Word, DICOM…). */
export function FileTypeIcon({ mime, className }: { mime: string | null | undefined; className?: string }) {
  const { icon: Icon, tone } = CATEGORY_STYLE[fileCategory(mime)];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-5",
        tone,
        className,
      )}
    >
      <Icon strokeWidth={1.8} />
    </span>
  );
}
