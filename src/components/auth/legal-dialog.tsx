"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export type LegalDoc = "terms" | "privacy";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <div className="space-y-2 text-[14px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

function TermsContent() {
  return (
    <div className="space-y-5">
      <Section title="Qué es kine">
        <p>
          kine es una herramienta para que profesionales de la kinesiología registren y organicen la información clínica de
          sus pacientes: datos personales, historia clínica, mapa corporal del dolor, sesiones y estudios.
        </p>
      </Section>
      <Section title="Tu cuenta">
        <p>
          La cuenta es personal e intransferible. Sos responsable de mantener tu contraseña en reserva y de toda actividad
          realizada con tu usuario. Si sospechás un acceso indebido, cambiá tu contraseña de inmediato.
        </p>
      </Section>
      <Section title="Información que cargás">
        <p>
          Sos responsable de la veracidad de los datos que registrás y de contar con el consentimiento de tus pacientes para
          registrar su información de salud, como establece la normativa vigente.
        </p>
        <p>La información clínica que cargás es tuya: podés consultarla, editarla, imprimirla o eliminarla.</p>
      </Section>
      <Section title="Uso adecuado">
        <p>
          No uses kine para fines distintos del registro clínico profesional ni intentes acceder a datos de otras cuentas.
          Podemos suspender cuentas que hagan un uso indebido del servicio.
        </p>
      </Section>
      <Section title="Disponibilidad">
        <p>
          Trabajamos para que el servicio esté disponible siempre, aunque puede haber interrupciones breves por
          mantenimiento o causas ajenas. Te recomendamos conservar copias impresas de los informes que necesites presentar.
        </p>
      </Section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-5">
      <Section title="Qué datos tratamos">
        <p>
          Tus datos de registro (nombre, email, teléfono, matrícula y consultorio) y los datos de tus pacientes que vos
          cargás, incluidos datos de salud.
        </p>
      </Section>
      <Section title="Para qué los usamos">
        <p>
          Únicamente para prestarte el servicio: guardar, mostrar y organizar tus registros. No vendemos ni compartimos
          datos con terceros con fines comerciales.
        </p>
      </Section>
      <Section title="Confidencialidad">
        <p>
          Los datos de salud son datos sensibles según la Ley 25.326 de Protección de Datos Personales, y la historia clínica
          es confidencial según la Ley 26.529 de Derechos del Paciente. Cada cuenta accede únicamente a sus propios
          registros.
        </p>
      </Section>
      <Section title="Seguridad">
        <p>
          La información viaja cifrada (HTTPS) y el acceso está restringido por usuario a nivel de base de datos. Los
          archivos adjuntos se guardan en almacenamiento privado.
        </p>
      </Section>
      <Section title="Tus derechos">
        <p>
          Podés pedir el acceso, la rectificación, la actualización o la supresión de tus datos (arts. 14 a 16 de la Ley
          25.326). La Agencia de Acceso a la Información Pública es el órgano de control de esa ley.
        </p>
      </Section>
    </div>
  );
}

/** Diálogo con el resumen de Términos y condiciones / Política de privacidad. */
export function LegalDialog({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  return (
    <Dialog
      open={doc !== null}
      onClose={onClose}
      size="lg"
      title={doc === "privacy" ? "Política de privacidad" : "Términos y condiciones"}
      description="Resumen de los puntos principales."
      footer={
        <Button variant="primary" onClick={onClose}>
          Entendido
        </Button>
      }
    >
      {doc === "privacy" ? <PrivacyContent /> : <TermsContent />}
    </Dialog>
  );
}
