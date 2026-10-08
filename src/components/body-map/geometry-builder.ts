/**
 * Constructor de la geometría del mapa corporal.
 *
 * NO se importa en tiempo de ejecución: `scripts/generate-geometry.mjs` lo ejecuta con Node
 * (type stripping) y escribe los paths finales en `geometry.data.ts`. Así el cliente solo recibe
 * strings ya calculados y el servidor no hace trabajo extra.
 *
 * Cómo está armada la figura
 * --------------------------
 * - Se dibuja SOLO la mitad izquierda del observador (x < CX) y se espeja: simetría perfecta.
 * - El contorno exterior son tres curvas suaves (Catmull-Rom centrípeta → Bézier cúbicas):
 *     HEAD (cráneo → mentón), ARM (cuello → hombro → brazo → mano → axila) y
 *     SIDE (axila → costado → pierna → pie → cara interna de la pierna → entrepierna).
 * - Cada zona es un path cerrado formado por TRAMOS de esas curvas (cortados con De Casteljau en
 *   el punto exacto) + líneas interiores compartidas. Dos zonas vecinas usan exactamente la misma
 *   curva (una invertida), así que teselan sin huecos ni superposiciones; el "gap" fino entre zonas
 *   lo pone el trazo blanco al renderizar.
 * - Frente y espalda comparten silueta; cambia la segmentación interior.
 *
 * Convención anatómica: vista FRENTE → la mitad izquierda del observador es el lado DERECHO del
 * paciente; vista ESPALDA → la mitad izquierda del observador es el lado IZQUIERDO del paciente.
 *
 * Solo usa sintaxis TypeScript "borrable" (sin enums ni parameter properties) para que Node pueda
 * ejecutarlo directamente.
 */

export type Pt = [number, number];
export type Seg = [Pt, Pt, Pt, Pt];
export type Loc = { i: number; t: number };

export const VIEWBOX_WIDTH = 340;
export const VIEWBOX_HEIGHT = 780;
export const CX = VIEWBOX_WIDTH / 2;

// ---------------------------------------------------------------------------
// Utilidades geométricas
// ---------------------------------------------------------------------------
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const dot = (a: Pt, b: Pt): number => a[0] * b[0] + a[1] * b[1];
const dist = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const norm = (a: Pt): Pt => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};

function evalSeg(s: Seg, t: number): Pt {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return [
    a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0],
    a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1],
  ];
}

function splitSeg(s: Seg, t: number): [Seg, Seg] {
  const p01 = lerp(s[0], s[1], t);
  const p12 = lerp(s[1], s[2], t);
  const p23 = lerp(s[2], s[3], t);
  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);
  const m = lerp(p012, p123, t);
  return [
    [s[0], p01, p012, m],
    [m, p123, p23, s[3]],
  ];
}

const segLength = (s: Seg) => dist(s[0], s[1]) + dist(s[1], s[2]) + dist(s[2], s[3]);

export class Curve {
  readonly segs: Seg[];

  constructor(segs: Seg[]) {
    if (!segs.length) throw new Error("Curva vacía");
    this.segs = segs;
  }

  get start(): Pt {
    return this.segs[0][0];
  }

  get end(): Pt {
    return this.segs[this.segs.length - 1][3];
  }

  get startLoc(): Loc {
    return { i: 0, t: 0 };
  }

  get endLoc(): Loc {
    return { i: this.segs.length - 1, t: 1 };
  }

  reversed(): Curve {
    return new Curve(
      this.segs
        .slice()
        .reverse()
        .map((s) => [s[3], s[2], s[1], s[0]] as Seg),
    );
  }

  mirrored(): Curve {
    const m = (p: Pt): Pt => [2 * CX - p[0], p[1]];
    return new Curve(this.segs.map((s) => [m(s[0]), m(s[1]), m(s[2]), m(s[3])] as Seg));
  }

  at(loc: Loc): Pt {
    return evalSeg(this.segs[loc.i], loc.t);
  }

  /** Ubicación del nudo `k` (los splines tienen un segmento entre nudos consecutivos). */
  knot(k: number): Loc {
    if (k >= this.segs.length) return { i: this.segs.length - 1, t: 1 };
    return { i: k, t: 0 };
  }

  /**
   * Primer punto (después de `from`) donde f(p) cruza `value`.
   * Muestrea cada segmento y refina por bisección.
   */
  locate(f: (p: Pt) => number, value: number, from?: Loc): Loc {
    const startI = from?.i ?? 0;
    const STEPS = 96;
    for (let i = startI; i < this.segs.length; i++) {
      const seg = this.segs[i];
      let t0 = i === startI && from ? from.t + 1e-7 : 0;
      if (t0 >= 1) continue;
      let g0 = f(evalSeg(seg, t0)) - value;
      if (Math.abs(g0) < 1e-10 && !(i === startI && from)) return { i, t: t0 };
      for (let k = 1; k <= STEPS; k++) {
        const t1 = Math.max(t0, k / STEPS);
        if (t1 <= t0) continue;
        const g1 = f(evalSeg(seg, t1)) - value;
        if (g0 === 0 || g0 * g1 < 0 || g1 === 0) {
          let a = t0;
          let b = t1;
          let ga = g0;
          if (g1 === 0) return { i, t: t1 };
          for (let it = 0; it < 60; it++) {
            const m = (a + b) / 2;
            const gm = f(evalSeg(seg, m)) - value;
            if (ga * gm <= 0) {
              b = m;
            } else {
              a = m;
              ga = gm;
            }
          }
          return { i, t: (a + b) / 2 };
        }
        t0 = t1;
        g0 = g1;
      }
    }
    throw new Error(`locate: no se encontró cruce para el valor ${value}`);
  }

  /** Tramo de la curva entre dos ubicaciones (si a > b, el tramo sale invertido). */
  slice(a: Loc, b: Loc): Curve {
    const na = normLoc(a, this.segs.length);
    const nb = normLoc(b, this.segs.length);
    if (cmpLoc(na, nb) > 0) return this.slice(nb, na).reversed();
    if (na.i === nb.i) {
      const right = splitSeg(this.segs[na.i], na.t)[1];
      const tt = na.t >= 1 ? 0 : (nb.t - na.t) / (1 - na.t);
      return new Curve([splitSeg(right, tt)[0]]);
    }
    const first = splitSeg(this.segs[na.i], na.t)[1];
    const middle = this.segs.slice(na.i + 1, nb.i);
    const last = splitSeg(this.segs[nb.i], nb.t)[0];
    const parts = [first, ...middle, last].filter((s) => segLength(s) > 1e-6);
    return new Curve(parts);
  }
}

function normLoc(l: Loc, n: number): Loc {
  if (l.t >= 1 - 1e-12 && l.i < n - 1) return { i: l.i + 1, t: 0 };
  return l;
}

function cmpLoc(a: Loc, b: Loc): number {
  return a.i !== b.i ? a.i - b.i : a.t - b.t;
}

/** Bézier de un segmento Catmull-Rom centrípeto (alpha = 0.5) entre p1 y p2. */
function crSeg(p0: Pt, p1: Pt, p2: Pt, p3: Pt): Seg {
  const alpha = 0.5;
  const d1 = Math.max(Math.pow(dist(p0, p1), alpha), 1e-6);
  const d2 = Math.max(Math.pow(dist(p1, p2), alpha), 1e-6);
  const d3 = Math.max(Math.pow(dist(p2, p3), alpha), 1e-6);
  const d1s = d1 * d1;
  const d2s = d2 * d2;
  const d3s = d3 * d3;
  const b1: Pt = mul(
    add(add(mul(p2, d1s), mul(p0, -d2s)), mul(p1, 2 * d1s + 3 * d1 * d2 + d2s)),
    1 / (3 * d1 * (d1 + d2)),
  );
  const b2: Pt = mul(
    add(add(mul(p1, d3s), mul(p3, -d2s)), mul(p2, 2 * d3s + 3 * d3 * d2 + d2s)),
    1 / (3 * d3 * (d3 + d2)),
  );
  return [p1, b1, b2, p2];
}

/** Spline suave que pasa por todos los puntos. `prev`/`next` fijan la tangente en los extremos. */
export function spline(points: Pt[], opts: { prev?: Pt; next?: Pt } = {}): Curve {
  const n = points.length;
  if (n < 2) throw new Error("spline: hacen falta al menos 2 puntos");
  const first = opts.prev ?? add(points[0], sub(points[0], points[1]));
  const last = opts.next ?? add(points[n - 1], sub(points[n - 1], points[n - 2]));
  const pts = [first, ...points, last];
  const segs: Seg[] = [];
  for (let i = 1; i < pts.length - 2; i++) segs.push(crSeg(pts[i - 1], pts[i], pts[i + 1], pts[i + 2]));
  return new Curve(segs);
}

export function cubic(a: Pt, c1: Pt, c2: Pt, b: Pt): Curve {
  return new Curve([[a, c1, c2, b]]);
}

export function line(a: Pt, b: Pt): Curve {
  return new Curve([[a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b]]);
}

/** Corte levemente curvo de a → b: el punto medio se desplaza `bulge` hacia `toward`. */
export function arc(a: Pt, b: Pt, bulge: number, toward: Pt): Curve {
  const dir = sub(b, a);
  let n = norm([-dir[1], dir[0]]);
  if (dot(n, toward) < 0) n = mul(n, -1);
  const off = mul(n, (4 / 3) * bulge);
  return new Curve([[a, add(lerp(a, b, 1 / 3), off), add(lerp(a, b, 2 / 3), off), b]]);
}

/** Une curvas consecutivas (el final de una debe coincidir con el inicio de la siguiente). */
export function join(name: string, ...curves: Curve[]): Curve {
  const segs: Seg[] = [];
  let prevEnd: Pt | null = null;
  for (const c of curves) {
    const s = c.segs.map((x) => [...x] as Seg);
    if (prevEnd) {
      const gap = dist(prevEnd, s[0][0]);
      if (gap > 0.05) throw new Error(`${name}: tramos no contiguos (salto de ${gap.toFixed(3)})`);
      s[0][0] = prevEnd;
    }
    segs.push(...s);
    prevEnd = s[s.length - 1][3];
  }
  return new Curve(segs);
}

/** Cierra un contorno verificando que termina donde empieza. */
export function closed(name: string, ...curves: Curve[]): Curve {
  const c = join(name, ...curves);
  const gap = dist(c.start, c.end);
  if (gap > 0.05) throw new Error(`${name}: contorno abierto (salto de ${gap.toFixed(3)})`);
  const segs = c.segs.map((x) => [...x] as Seg);
  segs[segs.length - 1][3] = segs[0][0];
  return new Curve(segs);
}

/** Zona central: `half` va de un punto del eje a otro por la mitad izquierda; se completa espejando. */
export function symmetric(name: string, half: Curve): Curve {
  if (Math.abs(half.start[0] - CX) > 0.05 || Math.abs(half.end[0] - CX) > 0.05) {
    throw new Error(`${name}: la media zona debe empezar y terminar sobre el eje`);
  }
  return closed(name, half, half.mirrored().reversed());
}

// ---------------------------------------------------------------------------
// Serialización y métricas
// ---------------------------------------------------------------------------
const fmt = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? "0" : String(r);
};

export function toPathData(c: Curve): string {
  const parts = [`M${fmt(c.start[0])} ${fmt(c.start[1])}`];
  for (const s of c.segs) {
    parts.push(`C${fmt(s[1][0])} ${fmt(s[1][1])} ${fmt(s[2][0])} ${fmt(s[2][1])} ${fmt(s[3][0])} ${fmt(s[3][1])}`);
  }
  return `${parts.join("")}Z`;
}

export function flatten(c: Curve, perSeg = 14): Pt[] {
  const pts: Pt[] = [];
  for (const s of c.segs) {
    for (let k = 0; k < perSeg; k++) pts.push(evalSeg(s, k / perSeg));
  }
  return pts;
}

function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, add(a, mul(ab, t)));
}

function distToPolygon(p: Pt, poly: Pt[]): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) best = Math.min(best, distToSegment(p, poly[j], poly[i]));
  return best;
}

export function bbox(poly: Pt[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

export function polygonArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return Math.abs(a / 2);
}

/** Punto interior más alejado de los bordes ("polo de inaccesibilidad"): ancla para pines y tooltips. */
export function poleOfInaccessibility(poly: Pt[]): { point: Pt; radius: number } {
  const [x0, y0, x1, y1] = bbox(poly);
  let step = Math.max(x1 - x0, y1 - y0) / 48;
  let best: Pt = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestD = pointInPolygon(best, poly) ? distToPolygon(best, poly) : -1;
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const p: Pt = [x, y];
      if (!pointInPolygon(p, poly)) continue;
      const d = distToPolygon(p, poly);
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
  }
  for (let round = 0; round < 3; round++) {
    const center = best;
    const r = step;
    step /= 4;
    for (let y = center[1] - r; y <= center[1] + r; y += step) {
      for (let x = center[0] - r; x <= center[0] + r; x += step) {
        const p: Pt = [x, y];
        if (!pointInPolygon(p, poly)) continue;
        const d = distToPolygon(p, poly);
        if (d > bestD) {
          bestD = d;
          best = p;
        }
      }
    }
  }
  return { point: best, radius: bestD };
}

// ---------------------------------------------------------------------------
// La figura
// ---------------------------------------------------------------------------
export type BuiltShape = {
  /** id de zona (ver src/lib/body-regions.ts). */
  id: string;
  curve: Curve;
};

export type BuiltView = { shapes: BuiltShape[]; outline: Curve };

/** Punto de la mitad izquierda del observador a distancia `d` del eje. */
const P = (d: number, y: number): Pt => [CX - d, y];
const byY = (p: Pt) => p[1];
const byD = (p: Pt) => CX - p[0];
const along = (origin: Pt, u: Pt) => (p: Pt) => dot(sub(p, origin), u);
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Dirección "hacia abajo y afuera" (mitad izquierda) con `deg` grados respecto de la vertical. */
const downOut = (deg: number): Pt => [-Math.sin(rad(deg)), Math.cos(rad(deg))];

export function buildBodyGeometry(): { front: BuiltView; back: BuiltView } {
  // ----- Cabeza (cráneo → mentón), mitad izquierda ------------------------------------------
  const headPts: Pt[] = [
    P(0, 14),
    P(20.6, 17.2),
    P(31.4, 27),
    P(35.8, 41),
    P(36.4, 55.5), // 4: cejas (corte cráneo / cara)
    P(35.2, 70),
    P(32.2, 84),
    P(27.4, 96),
    P(21, 104.8), // 8: unión con el cuello
    P(11.8, 112.2),
    P(0, 115.2),
  ];
  const HEAD = spline(headPts, { prev: P(-20.6, 17.2), next: P(-11.8, 112.2) });
  const headBrow = HEAD.knot(4);
  const headNeck = HEAD.knot(8);

  // ----- Brazo: cuello → trapecio → deltoides → brazo → mano → cara interna → axila ----------
  const J = P(80, 168); // centro del hombro
  const uA = downOut(9); // eje del brazo
  const E = add(J, mul(uA, 140)); // codo
  const uF = downOut(13); // eje del antebrazo
  const fUpper = along(J, uA);
  const fFore = along(E, uF);

  /** Normal hacia afuera (lejos del eje del cuerpo) para un eje que baja hacia la izquierda. */
  const nOut = (u: Pt): Pt => [-u[1], u[0]];
  const H0 = add(E, mul(uF, 106)); // inicio de la mano
  const uH = downOut(11);
  /** Puntos del contorno externo (w > 0) o interno (w < 0) sobre un eje. */
  const onAxis = (origin: Pt, u: Pt, s: number, w: number): Pt => add(add(origin, mul(u, s)), mul(nOut(u), w));
  const uElbow = downOut(11);

  // [s, ancho externo, ancho interno]
  const upperArm: [number, number, number][] = [
    [40, 18.5, 16],
    [70, 17.6, 16.4],
    [100, 16.3, 15.4],
    [128, 14.8, 14],
  ];
  const foreArm: [number, number, number][] = [
    [12, 15.8, 14.8],
    [35, 16.3, 15.2],
    [65, 14.2, 13],
    [92, 11.2, 10.2],
    [106, 11, 10],
  ];
  // Mano (palma hacia adelante, pulgar del lado externo): [τ, ancho externo]
  const handOuter: [number, number][] = [
    [7, 11.8],
    [17, 13.6],
    [27, 14.3],
    [36, 12.7],
    [44, 12.2],
    [54, 11.7],
    [63, 10.1],
    [69.5, 6.9],
  ];
  const handInner: [number, number][] = [
    [68, 7.1],
    [59, 10.1],
    [47, 11.5],
    [33, 11.9],
    [19, 11.4],
    [7, 10.3],
  ];
  const HAND_LEN = 73;

  const armPts: Pt[] = [
    P(21, 104.8), // 0: unión con la cabeza (= HEAD nudo 8)
    P(19.8, 116),
    P(20.6, 127.4), // 2: base del cuello
    P(25.4, 134.8),
    P(36, 140.6),
    P(50, 145),
    P(64, 149.2),
    P(76, 153.8),
    P(86.2, 160.2),
    P(94.4, 168.8),
    P(100.2, 179.8),
    P(103.2, 192),
    ...upperArm.map(([s, wo]) => onAxis(J, uA, s, wo)),
    add(E, mul(nOut(uElbow), 15)),
    ...foreArm.map(([s, wo]) => onAxis(E, uF, s, wo)),
    ...handOuter.map(([t, w]) => onAxis(H0, uH, t, w)),
    onAxis(H0, uH, HAND_LEN, 0), // punta de los dedos
    ...handInner.map(([t, w]) => onAxis(H0, uH, t, -w)),
    ...foreArm
      .slice()
      .reverse()
      .map(([s, , wi]) => onAxis(E, uF, s, -wi)),
    add(E, mul(nOut(uElbow), -14)),
    ...upperArm
      .slice()
      .reverse()
      .map(([s, , wi]) => onAxis(J, uA, s, -wi)),
    P(68, 200.6),
    P(65, 196.2), // axila
  ];
  const ARM_TIP_INDEX = 12 + upperArm.length + 1 + foreArm.length + handOuter.length;
  const ARM = spline(armPts);
  const armNeckBase = ARM.knot(2);
  const armTip = ARM.knot(ARM_TIP_INDEX);
  const armpit = ARM.end;

  // ----- Costado + pierna + pie + cara interna + entrepierna ---------------------------------
  const sidePts: Pt[] = [
    P(65, 196.2), // 0: axila
    P(63.6, 206),
    P(62.6, 222),
    P(61.6, 240),
    P(59.2, 258),
    P(55.8, 276),
    P(53, 293),
    P(52.4, 306),
    P(53.6, 320),
    P(57, 334),
    P(61.6, 349),
    P(64.8, 364),
    P(66.6, 380),
    P(67, 395),
    P(66.3, 410),
    P(64.8, 428),
    P(62.9, 452),
    P(59.9, 482),
    P(55.8, 510),
    P(51.6, 534),
    P(48.8, 552),
    P(47.7, 570),
    P(48.7, 588),
    P(51.4, 605),
    P(52.9, 621),
    P(52, 640),
    P(48.4, 664),
    P(44.2, 687),
    P(41.1, 705),
    P(40.4, 719),
    P(41.5, 731),
    P(44.6, 742),
    P(47, 752),
    P(47.3, 760.5),
    P(44.2, 766.6),
    P(35.5, 769.2), // 35: planta
    P(25.5, 769.3),
    P(17.8, 767.8),
    P(13.5, 763.2),
    P(12.7, 755),
    P(13.8, 743.5),
    P(15.9, 731),
    P(17, 719),
    P(16.8, 707),
    P(15.2, 690),
    P(11.4, 668),
    P(7.6, 647),
    P(7.4, 627),
    P(9.2, 606),
    P(10.7, 588),
    P(9.6, 571),
    P(8.4, 555),
    P(8.5, 537),
    P(7.8, 515),
    P(6.6, 492),
    P(5, 468),
    P(3.4, 445),
    P(2, 425),
    P(0.8, 411),
    P(0, 403), // 58: entrepierna
  ];
  const SIDE = spline(sidePts, { next: P(-0.8, 411) });
  const sole = SIDE.knot(35);
  const crotch = SIDE.end;
  /** Punto del costado/pierna externa a la altura y. */
  const sideOut = (y: number) => SIDE.locate(byY, y);
  /** Punto de la cara interna de la pierna a la altura y (después de la planta). */
  const sideIn = (y: number) => SIDE.locate(byY, y, sole);

  // ----- Líneas interiores compartidas --------------------------------------------------------
  const neckBaseP = ARM.at(armNeckBase);
  const NB = cubic(neckBaseP, P(16, 135), P(8, 140), P(0, 140)); // base del cuello
  const BROW = cubic(HEAD.at(headBrow), P(26.5, 49.8), P(11.5, 47.4), P(0, 47.4)); // cráneo / cara

  // Hombro (deltoides): borde medial (surco deltopectoral) y borde inferior.
  const capTopLoc = ARM.locate(byD, 66);
  const capTop = ARM.at(capTopLoc);
  const CAP_MEDIAL = cubic(capTop, P(71.6, 163), P(70.8, 183), armpit);
  const capOutLoc = ARM.locate(fUpper, 60);
  const CAP_BOTTOM = arc(ARM.at(capOutLoc), armpit, 3.5, [0, 1]);

  // Cortes del miembro superior (perpendiculares al eje).
  const limbCut = (outer: Loc, inner: Loc, curve: Curve, toward: Pt, k = 0.09) => {
    const a = curve.at(outer);
    const b = curve.at(inner);
    return arc(a, b, dist(a, b) * k, toward);
  };
  const armOut = (f: (p: Pt) => number, v: number) => ARM.locate(f, v);
  const armIn = (f: (p: Pt) => number, v: number) => ARM.locate(f, v, armTip);
  const elbowTopO = armOut(fUpper, 128);
  const elbowTopI = armIn(fUpper, 128);
  const elbowBotO = armOut(fFore, 13);
  const elbowBotI = armIn(fFore, 13);
  const wristTopO = armOut(fFore, 91);
  const wristTopI = armIn(fFore, 91);
  const wristBotO = armOut(fFore, 106);
  const wristBotI = armIn(fFore, 106);
  const CUT_ELBOW_TOP = limbCut(elbowTopO, elbowTopI, ARM, uA);
  const CUT_ELBOW_BOT = limbCut(elbowBotO, elbowBotI, ARM, uF);
  const CUT_WRIST_TOP = limbCut(wristTopO, wristTopI, ARM, uF);
  const CUT_WRIST_BOT = limbCut(wristBotO, wristBotI, ARM, uF);

  const upperLimb = (pre: string): BuiltShape[] => {
    const armpitLoc = ARM.endLoc;
    return [
      {
        id: `shoulder_{side}_${pre}`,
        curve: closed("hombro", ARM.slice(capTopLoc, capOutLoc), CAP_BOTTOM, CAP_MEDIAL.reversed()),
      },
      {
        id: `arm_{side}_${pre}`,
        curve: closed(
          "brazo",
          ARM.slice(capOutLoc, elbowTopO),
          CUT_ELBOW_TOP,
          ARM.slice(elbowTopI, armpitLoc),
          CAP_BOTTOM.reversed(),
        ),
      },
      {
        id: `elbow_{side}_${pre}`,
        curve: closed(
          "codo",
          ARM.slice(elbowTopO, elbowBotO),
          CUT_ELBOW_BOT,
          ARM.slice(elbowBotI, elbowTopI),
          CUT_ELBOW_TOP.reversed(),
        ),
      },
      {
        id: `forearm_{side}_${pre}`,
        curve: closed(
          "antebrazo",
          ARM.slice(elbowBotO, wristTopO),
          CUT_WRIST_TOP,
          ARM.slice(wristTopI, elbowBotI),
          CUT_ELBOW_BOT.reversed(),
        ),
      },
      {
        id: `wrist_{side}_${pre}`,
        curve: closed(
          "muñeca",
          ARM.slice(wristTopO, wristBotO),
          CUT_WRIST_BOT,
          ARM.slice(wristBotI, wristTopI),
          CUT_WRIST_TOP.reversed(),
        ),
      },
      {
        id: `hand_{side}_${pre}`,
        curve: closed("mano", ARM.slice(wristBotO, wristBotI), CUT_WRIST_BOT.reversed()),
      },
    ];
  };

  // Cortes del miembro inferior (horizontales, levemente curvos hacia abajo).
  const legCut = (y: number, yInner = y, k = 0.07) => {
    const o = sideOut(y);
    const i = sideIn(yInner);
    const a = SIDE.at(o);
    const b = SIDE.at(i);
    return { o, i, curve: arc(a, b, dist(a, b) * k, [0, 1]) };
  };

  /** Banda de pierna entre dos cortes. */
  const legBand = (name: string, top: ReturnType<typeof legCut>, bottom: ReturnType<typeof legCut>) =>
    closed(name, SIDE.slice(top.o, bottom.o), bottom.curve, SIDE.slice(bottom.i, top.i), top.curve.reversed());

  // Silueta completa (para sombras / halo).
  const outlineHalf = join("silueta", HEAD.slice(HEAD.startLoc, headNeck), ARM, SIDE);
  const outline = symmetric("silueta", outlineHalf);

  // Cuello (igual en ambas vistas).
  const neck = symmetric(
    "cuello",
    join("cuello", HEAD.slice(HEAD.endLoc, headNeck), ARM.slice(ARM.startLoc, armNeckBase), NB),
  );

  // ===========================================================================================
  // FRENTE
  // ===========================================================================================
  const chestBottomLoc = sideOut(250);
  const CHEST_BOTTOM = cubic(SIDE.at(chestBottomLoc), P(44, 258.6), P(18, 259.6), P(0, 255));
  const navelLoc = sideOut(318);
  const NAVEL = cubic(SIDE.at(navelLoc), P(38, 321.8), P(14, 322), P(0, 322));
  const iliacLoc = sideOut(345);
  const iliacP = SIDE.at(iliacLoc);
  const pelvisCorner = P(23.5, 376);
  const INGUINAL = spline([iliacP, P(38.5, 361.5), pelvisCorner, P(10, 392.5), crotch]);
  const inguinalCorner = INGUINAL.knot(2);
  const PELVIS_TOP = cubic(pelvisCorner, P(15, 378.6), P(6, 379.2), P(0, 379.2));
  const hipBottomO = sideOut(398);
  const hipBottomI = sideIn(424);
  const HIP_BOTTOM = cubic(SIDE.at(hipBottomO), P(48, 409), P(21, 421.5), SIDE.at(hipBottomI));

  const fKneeTop = legCut(540, 538);
  const fKneeBot = legCut(590, 588);
  const fAnkleTop = legCut(698, 698);
  const fAnkleBot = legCut(732, 732, 0.05);

  const frontLeft: BuiltShape[] = [
    {
      id: "chest_{side}",
      curve: closed(
        "pectoral",
        NB.reversed(),
        ARM.slice(armNeckBase, capTopLoc),
        CAP_MEDIAL,
        SIDE.slice(SIDE.startLoc, chestBottomLoc),
        CHEST_BOTTOM,
        line(P(0, 255), NB.end),
      ),
    },
    ...upperLimb("front"),
    {
      id: "hip_{side}_front",
      curve: closed(
        "cadera",
        SIDE.slice(iliacLoc, hipBottomO),
        HIP_BOTTOM,
        SIDE.slice(hipBottomI, SIDE.endLoc),
        INGUINAL.reversed(),
      ),
    },
    {
      id: "thigh_{side}_front",
      curve: closed(
        "muslo",
        SIDE.slice(hipBottomO, fKneeTop.o),
        fKneeTop.curve,
        SIDE.slice(fKneeTop.i, hipBottomI),
        HIP_BOTTOM.reversed(),
      ),
    },
    { id: "knee_{side}_front", curve: legBand("rodilla", fKneeTop, fKneeBot) },
    { id: "leg_{side}_front", curve: legBand("pierna", fKneeBot, fAnkleTop) },
    { id: "ankle_{side}_front", curve: legBand("tobillo", fAnkleTop, fAnkleBot) },
    {
      id: "foot_{side}_front",
      curve: closed("pie", SIDE.slice(fAnkleBot.o, fAnkleBot.i), fAnkleBot.curve.reversed()),
    },
  ];

  const frontCenter: BuiltShape[] = [
    {
      id: "head_front",
      curve: symmetric("cráneo", join("cráneo", HEAD.slice(HEAD.startLoc, headBrow), BROW)),
    },
    {
      id: "face",
      curve: symmetric("cara", join("cara", BROW.reversed(), HEAD.slice(headBrow, HEAD.endLoc))),
    },
    { id: "neck_front", curve: neck },
    {
      id: "abdomen_upper",
      curve: symmetric(
        "abdomen sup",
        join("abdomen sup", CHEST_BOTTOM.reversed(), SIDE.slice(chestBottomLoc, navelLoc), NAVEL),
      ),
    },
    {
      id: "abdomen_lower",
      curve: symmetric(
        "abdomen inf",
        join(
          "abdomen inf",
          NAVEL.reversed(),
          SIDE.slice(navelLoc, iliacLoc),
          INGUINAL.slice(INGUINAL.startLoc, inguinalCorner),
          PELVIS_TOP,
        ),
      ),
    },
    {
      id: "pelvis_front",
      curve: symmetric(
        "pelvis",
        join("pelvis", PELVIS_TOP.reversed(), INGUINAL.slice(inguinalCorner, INGUINAL.endLoc)),
      ),
    },
  ];

  // ===========================================================================================
  // ESPALDA
  // ===========================================================================================
  const spineTopLoc = NB.locate(byD, 7);
  const spineTop = NB.at(spineTopLoc);
  const sacrumCorner = P(23, 354);
  const SPINE_EDGE = line(spineTop, P(8.6, 354));
  const SACRUM_TOP = line(sacrumCorner, P(0, 354));
  const sacrumTopSplit = SACRUM_TOP.locate(byD, 8.6);
  const trapLowLoc = CAP_MEDIAL.locate(byY, 171);
  const trapSpineLoc = SPINE_EDGE.locate(byY, 194);
  const TRAP_LOW = cubic(CAP_MEDIAL.at(trapLowLoc), P(52, 180.5), P(27, 189.5), SPINE_EDGE.at(trapSpineLoc));
  const t12Loc = sideOut(290);
  const T12 = line(SIDE.at(t12Loc), P(0, 290));
  const t12SpineOnEdge = SPINE_EDGE.locate(byY, 290);
  const t12SpineOnCut = T12.locate(byD, byD(SPINE_EDGE.at(t12SpineOnEdge)));
  const bIliacLoc = iliacLoc;
  const ILIAC_BACK = cubic(iliacP, P(48, 346.5), P(33, 350.6), sacrumCorner);
  const SACRUM_SIDE = cubic(sacrumCorner, P(19, 370), P(9.5, 386.5), P(0, 396));
  const CLEFT = line(P(0, 396), crotch);
  const foldO = sideOut(428);
  const GLUTEAL_FOLD = spline([crotch, P(8, 419), P(22, 428.6), P(42, 431.2), SIDE.at(foldO)], {
    prev: P(-4, 395),
  });

  const bKneeTop = legCut(538, 536);
  const bKneeBot = legCut(588, 586);
  const bAnkleTop = legCut(690, 690);
  const bAnkleBot = legCut(733, 733, 0.05);

  const backLeft: BuiltShape[] = [
    {
      id: "trapezius_{side}",
      curve: closed(
        "trapecio",
        NB.slice(spineTopLoc, NB.startLoc),
        ARM.slice(armNeckBase, capTopLoc),
        CAP_MEDIAL.slice(CAP_MEDIAL.startLoc, trapLowLoc),
        TRAP_LOW,
        SPINE_EDGE.slice(trapSpineLoc, SPINE_EDGE.startLoc),
      ),
    },
    {
      id: "scapula_{side}",
      curve: closed(
        "escápula",
        TRAP_LOW.reversed(),
        CAP_MEDIAL.slice(trapLowLoc, CAP_MEDIAL.endLoc),
        SIDE.slice(SIDE.startLoc, t12Loc),
        T12.slice(T12.startLoc, t12SpineOnCut),
        SPINE_EDGE.slice(t12SpineOnEdge, trapSpineLoc),
      ),
    },
    {
      id: "lower_back_{side}",
      curve: closed(
        "lumbar",
        T12.slice(t12SpineOnCut, T12.startLoc),
        SIDE.slice(t12Loc, bIliacLoc),
        ILIAC_BACK,
        SACRUM_TOP.slice(SACRUM_TOP.startLoc, sacrumTopSplit),
        SPINE_EDGE.slice(SPINE_EDGE.endLoc, t12SpineOnEdge),
      ),
    },
    ...upperLimb("back"),
    {
      id: "gluteal_{side}",
      curve: closed(
        "glúteo",
        SIDE.slice(bIliacLoc, foldO),
        GLUTEAL_FOLD.reversed(),
        CLEFT.reversed(),
        SACRUM_SIDE.reversed(),
        ILIAC_BACK.reversed(),
      ),
    },
    {
      id: "hamstring_{side}",
      curve: closed(
        "isquios",
        GLUTEAL_FOLD,
        SIDE.slice(foldO, bKneeTop.o),
        bKneeTop.curve,
        SIDE.slice(bKneeTop.i, SIDE.endLoc),
      ),
    },
    { id: "knee_{side}_back", curve: legBand("poplíteo", bKneeTop, bKneeBot) },
    { id: "calf_{side}", curve: legBand("gemelos", bKneeBot, bAnkleTop) },
    { id: "ankle_{side}_back", curve: legBand("aquiles", bAnkleTop, bAnkleBot) },
    {
      id: "foot_{side}_back",
      curve: closed("talón", SIDE.slice(bAnkleBot.o, bAnkleBot.i), bAnkleBot.curve.reversed()),
    },
  ];

  const backCenter: BuiltShape[] = [
    { id: "head_back", curve: symmetric("occipital", HEAD) },
    { id: "neck_back", curve: neck },
    {
      id: "thoracic_spine",
      curve: symmetric(
        "dorsal",
        join(
          "dorsal",
          NB.slice(NB.endLoc, spineTopLoc),
          SPINE_EDGE.slice(SPINE_EDGE.startLoc, t12SpineOnEdge),
          T12.slice(t12SpineOnCut, T12.endLoc),
        ),
      ),
    },
    {
      id: "lumbar_spine",
      curve: symmetric(
        "columna lumbar",
        join(
          "columna lumbar",
          T12.slice(T12.endLoc, t12SpineOnCut),
          SPINE_EDGE.slice(t12SpineOnEdge, SPINE_EDGE.endLoc),
          SACRUM_TOP.slice(sacrumTopSplit, SACRUM_TOP.endLoc),
        ),
      ),
    },
    {
      id: "sacrum",
      curve: symmetric("sacro", join("sacro", SACRUM_TOP.reversed(), SACRUM_SIDE)),
    },
  ];

  // Mitad izquierda del observador → lado del paciente según la vista.
  const expand = (left: BuiltShape[], leftSide: "right" | "left"): BuiltShape[] => {
    const rightSide = leftSide === "right" ? "left" : "right";
    return left.flatMap((s) => [
      { id: s.id.replace("{side}", leftSide), curve: s.curve },
      { id: s.id.replace("{side}", rightSide), curve: s.curve.mirrored() },
    ]);
  };

  return {
    front: { shapes: [...frontCenter, ...expand(frontLeft, "right")], outline },
    back: { shapes: [...backCenter, ...expand(backLeft, "left")], outline },
  };
}
