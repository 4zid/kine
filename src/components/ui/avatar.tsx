import { avatarTone, cn, initials } from "@/lib/utils";

type Person = { id?: string | null; first_name?: string | null; last_name?: string | null };

const sizes = {
  xs: "size-7 text-[11px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-2xl",
};

/** Avatar con iniciales y color estable por persona. */
export function Avatar({ person, size = "md", className }: { person: Person; size?: keyof typeof sizes; className?: string }) {
  const tone = avatarTone(person.id ?? `${person.first_name}${person.last_name}`);
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide", sizes[size], className)}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {initials(person)}
    </span>
  );
}
