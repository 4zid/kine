// Genera src/components/body-map/geometry.data.ts a partir de geometry-builder.ts.
//
//   node src/components/body-map/scripts/generate-geometry.mjs
//
// Requiere Node >= 22.18 (type stripping nativo). Escribe geometry.data.ts y las siluetas neutras
// estáticas de BodyMapPreview (assets/neutral-{front,back}.svg). Además verifica que:
//   - cada zona de src/lib/body-regions.ts tenga exactamente UNA forma en su vista (ni faltantes ni sobrantes);
//   - las zonas teselen la silueta (suma de áreas ≈ área de la silueta: sin huecos ni superposiciones).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  bbox,
  buildBodyGeometry,
  flatten,
  poleOfInaccessibility,
  polygonArea,
  toPathData,
} from "../geometry-builder.ts";
import { BODY_REGIONS } from "../../../lib/body-regions.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "geometry.data.ts");

const round = (n) => Math.round(n * 10) / 10;
const geometry = buildBodyGeometry();
const errors = [];
const report = [];

function serializeView(view) {
  const built = geometry[view];
  const expected = BODY_REGIONS.filter((r) => r.view === view).map((r) => r.id);
  const ids = built.shapes.map((s) => s.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  const missing = expected.filter((id) => !ids.includes(id));
  const extra = ids.filter((id) => !expected.includes(id));
  if (dupes.length) errors.push(`[${view}] zonas duplicadas: ${dupes.join(", ")}`);
  if (missing.length) errors.push(`[${view}] zonas sin forma: ${missing.join(", ")}`);
  if (extra.length) errors.push(`[${view}] formas que no existen en el catálogo: ${extra.join(", ")}`);

  const outlineArea = polygonArea(flatten(built.outline, 24));
  let sum = 0;
  const shapes = built.shapes.map((s) => {
    const poly = flatten(s.curve, 24);
    const area = polygonArea(poly);
    sum += area;
    const [x0, y0, x1, y1] = bbox(poly);
    const pole = poleOfInaccessibility(poly);
    const small = Math.min(x1 - x0, y1 - y0) < 30 || area < 900;
    return {
      id: s.id,
      d: toPathData(s.curve),
      anchor: [round(pole.point[0]), round(pole.point[1])],
      radius: round(pole.radius),
      bbox: [round(x0), round(y0), round(x1), round(y1)],
      small,
    };
  });
  const ratio = sum / outlineArea;
  report.push(`[${view}] ${shapes.length} zonas · cobertura ${(ratio * 100).toFixed(2)}% de la silueta`);
  if (Math.abs(ratio - 1) > 0.004) errors.push(`[${view}] las zonas no teselan la silueta (cobertura ${(ratio * 100).toFixed(2)}%)`);

  // Orden de tabulación natural: de arriba hacia abajo, y de izquierda a derecha en cada franja.
  shapes.sort((a, b) => {
    const band = (s) => Math.round(s.anchor[1] / 14);
    return band(a) - band(b) || a.anchor[0] - b.anchor[0];
  });
  return shapes;
}

const front = serializeView("front");
const back = serializeView("back");
const outline = toPathData(geometry.front.outline);

report.forEach((r) => console.log(r));
if (errors.length) {
  console.error("\nErrores de geometría:\n - " + errors.join("\n - "));
  process.exit(1);
}

const line = (s) =>
  `    { id: ${JSON.stringify(s.id)}, d: ${JSON.stringify(s.d)}, anchor: [${s.anchor.join(", ")}], radius: ${s.radius}, bbox: [${s.bbox.join(", ")}], small: ${s.small} },`;

const file = `// ⚠️ ARCHIVO GENERADO — no editar a mano.
// Fuente: src/components/body-map/geometry-builder.ts
// Regenerar con: node src/components/body-map/scripts/generate-geometry.mjs
import type { RegionShape } from "./geometry";

export const VIEWBOX_WIDTH = ${VIEWBOX_WIDTH};
export const VIEWBOX_HEIGHT = ${VIEWBOX_HEIGHT};

/** Silueta completa (igual en frente y espalda). */
export const OUTLINE_PATH =
  ${JSON.stringify(outline)};

export const FRONT_SHAPES: RegionShape[] = [
${front.map(line).join("\n")}
];

export const BACK_SHAPES: RegionShape[] = [
${back.map(line).join("\n")}
];
`;

writeFileSync(out, file);
console.log(`\nEscrito ${out}`);

// Siluetas neutras para BodyMapPreview: se sirven como archivo estático (cacheable) y solo las zonas
// con dolor van en línea. Colores = FIGURE.neutral / FIGURE.gap de figure-style.ts.
const assets = join(here, "..", "assets");
mkdirSync(assets, { recursive: true });
for (const [view, shapes] of [
  ["front", front],
  ["back", back],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}"><style>path{vector-effect:non-scaling-stroke}</style><g fill="#E2E2E9" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round">${shapes.map((s) => `<path d="${s.d}"/>`).join("")}</g></svg>\n`;
  const file = join(assets, `neutral-${view}.svg`);
  writeFileSync(file, svg);
  console.log(`Escrito ${file}`);
}
