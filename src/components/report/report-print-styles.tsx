/**
 * Reglas de impresión del informe: hoja A4 vertical y colores exactos.
 * (Las globales ya ocultan el cromo de la app con `print:hidden` y ponen fondo blanco.)
 */
export function ReportPrintStyles() {
  return (
    <style>{`
@media print {
  @page { size: A4 portrait; margin: 14mm 13mm; }
  html, body { background: #fff !important; }
  [data-sonner-toaster] { display: none !important; }
}
`}</style>
  );
}
