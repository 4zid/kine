"use client";

import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/components/auth/legal-contact";
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

/** Canal para pedidos sobre datos (configurable con NEXT_PUBLIC_CONTACT_EMAIL). */
function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-ink underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <>el soporte de kine</>
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
        <p>La información clínica que cargás es tuya: podés consultarla, editarla e imprimirla cuando quieras.</p>
      </Section>
      <Section title="Conservación de la historia clínica">
        <p>
          Como profesional sos depositario de la historia clínica de tus pacientes y tenés que conservarla al menos 10 años
          desde la última actuación registrada (Ley 26.529, art. 18).
        </p>
        <p>
          Por eso los registros clínicos no se borran de forma inmediata ni definitiva: cada cambio o eliminación queda
          registrado, y si eliminás a un paciente deja de verse en kine, pero conservamos un registro de sus datos para la
          custodia legal. Si solo querés sacarlo de tu lista, usá <strong className="font-medium text-ink">Archivar</strong>.
        </p>
      </Section>
      <Section title="Cierre de la cuenta">
        <p>
          Podés pedir el cierre de tu cuenta y una copia de tus registros escribiendo a <Contact />. Al cerrarla, los datos
          clínicos se conservan durante el plazo que exige la ley, sin que nadie más pueda verlos.
        </p>
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
      <Section title="Quién es responsable de los datos">
        <p>
          Vos, como profesional, sos el responsable de los datos de tus pacientes. kine actúa como encargado del tratamiento
          (art. 25 de la Ley 25.326): guarda y procesa esa información solo para prestarte el servicio. De tus datos de
          registro, el responsable es kine.
        </p>
      </Section>
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
      <Section title="Dónde se guardan">
        <p>
          En proveedores de infraestructura en la nube: Supabase (base de datos y archivos, con servidores en San Pablo,
          Brasil) y Vercel (servidores de la aplicación). Esto implica una transferencia internacional de datos (art. 12 de
          la Ley 25.326), limitada a lo necesario para prestar el servicio.
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
          archivos adjuntos se guardan en almacenamiento privado, y cada cambio o eliminación de un dato clínico queda
          registrado.
        </p>
      </Section>
      <Section title="Cuánto tiempo se conservan">
        <p>
          Los datos clínicos, al menos 10 años desde la última actuación registrada (Ley 26.529, art. 18), aunque elimines a
          un paciente o cierres tu cuenta. Tus datos de registro, mientras tengas la cuenta.
        </p>
      </Section>
      <Section title="Tus derechos">
        <p>
          Podés pedir el acceso, la rectificación, la actualización o la supresión de tus datos (arts. 14 a 16 de la Ley
          25.326) escribiendo a <Contact />. Si un paciente quiere ejercerlos sobre su información de salud, te lo pide a
          vos como responsable de su historia clínica; la supresión de esos datos está limitada por el deber de
          conservación.
        </p>
        <p className="text-[13px] text-muted">
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
          gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo
          establecido en el artículo 14, inciso 3 de la Ley 25.326. La Agencia de Acceso a la Información Pública, en su
          carácter de Órgano de Control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que
          interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
          protección de datos personales.
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
