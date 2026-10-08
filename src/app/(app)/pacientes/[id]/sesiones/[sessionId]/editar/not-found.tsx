import { ArrowLeft, CalendarX2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function SessionNotFound() {
  return (
    <div className="rounded-card bg-surface">
      <EmptyState
        icon={<CalendarX2 />}
        title="No encontramos esta sesión"
        description="Puede que se haya eliminado o que el enlace no sea correcto."
        action={
          <ButtonLink href="/pacientes" variant="secondary" icon={<ArrowLeft />}>
            Volver a pacientes
          </ButtonLink>
        }
      />
    </div>
  );
}
