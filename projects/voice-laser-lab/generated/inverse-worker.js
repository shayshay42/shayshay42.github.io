// src/physics/engine.ts
var DEFAULT_CONFIG = {
  gain: 1.7,
  tension: 0.85,
  damping: 0.015,
  asymmetry: 0.23,
  wallDistance: 2.5
};
var TOY = {
  cylinderRadius: 0.05,
  cylinderLength: 0.2,
  mirrorRadius: 8e-3,
  laserPosition: [0.075, 0, 0.32],
  wallWidth: 2,
  wallHeight: 2
};
var MODE_COUNT = 6;
var FUNDAMENTAL_HZ = 125;
var PRESSURE_ACCELERATION = 1800;
var ROOT_01 = 2.404825557695773;
var ROOT_02 = 5.520078110286311;
var ROOT_11 = 3.8317059702075125;
var ROOT_12 = 7.015586669815619;
var ROOTS = [ROOT_01, ROOT_02, ROOT_11, ROOT_11, ROOT_12, ROOT_12];
var AXES = [0, 0, 1, 2, 1, 2];
var DAMPING_WEIGHTS = [2.8, 2, 1, 1, 1.15, 1.15];
var SPLITS = [0, 0, -0.55, 0.55, -0.3, 0.3];
function besselJ0(x) {
  const factor = -x * x / 4;
  let term = 1;
  let sum = 1;
  for (let k = 1; k < 40; k++) {
    term *= factor / (k * k);
    sum += term;
    if (Math.abs(term) < 1e-16) break;
  }
  return sum;
}
function besselJ1(x) {
  const factor = -x * x / 4;
  let term = x / 2;
  let sum = term;
  for (let k = 1; k < 40; k++) {
    term *= factor / (k * (k + 1));
    sum += term;
    if (Math.abs(term) < 1e-16) break;
  }
  return sum;
}
function besselJ2(x) {
  if (Math.abs(x) < 1e-4) return x * x / 8 - x ** 4 / 96;
  return 2 * besselJ1(x) / x - besselJ0(x);
}
var NORMALIZERS = ROOTS.map((root, i) => AXES[i] === 0 ? Math.abs(besselJ1(root)) : Math.abs(besselJ2(root)) / Math.SQRT2);
var MIRROR_HEIGHT = ROOTS.map((root, i) => {
  const x = root * TOY.mirrorRadius / TOY.cylinderRadius;
  return AXES[i] === 0 ? 2 * besselJ1(x) / (x * NORMALIZERS[i]) : 0;
});
var MIRROR_SLOPE = ROOTS.map((root, i) => {
  const k = root / TOY.cylinderRadius;
  return AXES[i] === 0 ? 0 : 4 * besselJ2(k * TOY.mirrorRadius) / (k * TOY.mirrorRadius ** 2 * NORMALIZERS[i]);
});
function neutralWallX(distance) {
  return -TOY.laserPosition[0] / TOY.laserPosition[2] * distance;
}
var LASER_LENGTH = Math.hypot(...TOY.laserPosition);
var DX = -TOY.laserPosition[0] / LASER_LENGTH;
var DY = -TOY.laserPosition[1] / LASER_LENGTH;
var DZ = -TOY.laserPosition[2] / LASER_LENGTH;
function castLaser(cx, cy, cz, nx, ny, nz, distance, result) {
  result.hit = false;
  result.mirrorHit = false;
  result.x = Number.NaN;
  result.y = Number.NaN;
  const dot2 = DX * nx + DY * ny + DZ * nz;
  if (Math.abs(dot2) < 1e-12) return;
  const t = ((cx - TOY.laserPosition[0]) * nx + (cy - TOY.laserPosition[1]) * ny + (cz - TOY.laserPosition[2]) * nz) / dot2;
  if (t <= 0 || !Number.isFinite(t)) return;
  const hx = TOY.laserPosition[0] + DX * t;
  const hy = TOY.laserPosition[1] + DY * t;
  const hz = TOY.laserPosition[2] + DZ * t;
  if ((hx - cx) ** 2 + (hy - cy) ** 2 + (hz - cz) ** 2 > TOY.mirrorRadius ** 2) return;
  result.mirrorHit = true;
  result.hx = hx;
  result.hy = hy;
  result.hz = hz;
  const rx = DX - 2 * dot2 * nx;
  const ry = DY - 2 * dot2 * ny;
  const rz = DZ - 2 * dot2 * nz;
  if (rz <= 1e-12) return;
  const wallT = (distance - hz) / rz;
  if (wallT <= 0 || !Number.isFinite(wallT)) return;
  const x = hx + wallT * rx;
  const y = hy + wallT * ry;
  if (Math.abs(x - neutralWallX(distance)) > TOY.wallWidth / 2 || Math.abs(y) > TOY.wallHeight / 2) return;
  result.hit = true;
  result.x = x;
  result.y = y;
}
function validateConfig(config) {
  for (const name of Object.keys(DEFAULT_CONFIG)) {
    if (!Number.isFinite(config[name])) throw new RangeError(`${name} must be finite.`);
  }
  if (config.gain < 0 || config.gain > 50) throw new RangeError("Gain must be between 0 and 50.");
  if (config.tension < 0.05 || config.tension > 20) throw new RangeError("Tension must be between 0.05 and 20.");
  if (config.damping < 0 || config.damping > 1) throw new RangeError("Damping must be between 0 and 1.");
  if (config.asymmetry < 0 || config.asymmetry > 1) throw new RangeError("Asymmetry must be between 0 and 1.");
  if (config.wallDistance < 0.1 || config.wallDistance > 100) throw new RangeError("Wall distance must be between 0.1 and 100 metres.");
}
var Simulator = class {
  constructor(config = DEFAULT_CONFIG, sampleRate = 48e3, initialState) {
    this.sampleIndex = 0;
    this.q = new Float64Array(MODE_COUNT);
    this.v = new Float64Array(MODE_COUNT);
    // Per-mode affine recurrence [m00,m01,m10,m11,bq,bv].
    this.coefficients = new Float64Array(MODE_COUNT * 6);
    this.centerZ = 0;
    this.nx = 0;
    this.ny = 0;
    this.nz = 1;
    this.ray = { hit: false, x: NaN, y: NaN, mirrorHit: false, hx: 0, hy: 0, hz: 0 };
    validateConfig(config);
    if (!Number.isFinite(sampleRate) || sampleRate < 8e3 || sampleRate > 384e3) {
      throw new RangeError("Sample rate must be between 8000 and 384000 Hz.");
    }
    this.config = { ...config };
    this.sampleRate = sampleRate;
    this.updateCoefficients();
    this.reset(initialState);
  }
  setConfig(patch) {
    const config = { ...this.config, ...patch };
    validateConfig(config);
    this.config = config;
    this.updateCoefficients();
    this.updateFrame();
  }
  getConfig() {
    return { ...this.config };
  }
  reset(state) {
    if (state) {
      if (!Number.isSafeInteger(state.sampleIndex) || state.sampleIndex < 0 || state.q.length !== MODE_COUNT || state.v.length !== MODE_COUNT || !state.q.every(Number.isFinite) || !state.v.every(Number.isFinite)) {
        throw new RangeError("State needs a nonnegative sample index and six finite q/v entries.");
      }
      this.sampleIndex = state.sampleIndex;
      this.q.set(state.q);
      this.v.set(state.v);
    } else {
      this.sampleIndex = 0;
      this.q.fill(0);
      this.v.fill(0);
    }
    this.updateFrame();
  }
  getState() {
    return { sampleIndex: this.sampleIndex, q: Array.from(this.q), v: Array.from(this.v) };
  }
  getFrame() {
    return {
      sampleIndex: this.sampleIndex,
      x: this.ray.x,
      y: this.ray.y,
      hit: this.ray.hit,
      mirrorCenter: [0, 0, this.centerZ],
      mirrorNormal: [this.nx, this.ny, this.nz],
      mirrorHit: this.ray.mirrorHit ? [this.ray.hx, this.ray.hy, this.ray.hz] : null,
      modes: Array.from(this.q)
    };
  }
  process(pcm) {
    const count = pcm.length;
    const startSample = this.sampleIndex;
    const xy = new Float32Array(count * 2);
    const hits = new Uint8Array(count);
    const q = this.q;
    const v = this.v;
    const c = this.coefficients;
    for (let sample = 0; sample < count; sample++) {
      const input = Number.isFinite(pcm[sample]) ? pcm[sample] : 0;
      for (let mode = 0; mode < MODE_COUNT; mode++) {
        const i = mode * 6;
        const previousQ = q[mode];
        const previousV = v[mode];
        q[mode] = c[i] * previousQ + c[i + 1] * previousV + c[i + 4] * input;
        v[mode] = c[i + 2] * previousQ + c[i + 3] * previousV + c[i + 5] * input;
      }
      this.sampleIndex++;
      this.updateFrame();
      xy[sample * 2] = this.ray.x;
      xy[sample * 2 + 1] = this.ray.y;
      hits[sample] = this.ray.hit ? 1 : 0;
    }
    return { startSample, count, xy, hits, lastFrame: this.getFrame() };
  }
  updateCoefficients() {
    const h = 1 / this.sampleRate;
    for (let mode = 0; mode < MODE_COUNT; mode++) {
      const root = ROOTS[mode];
      const omega = 2 * Math.PI * FUNDAMENTAL_HZ * root / ROOT_01 * Math.sqrt(this.config.tension) * (1 + SPLITS[mode] * this.config.asymmetry);
      const omega2 = omega * omega;
      const a = this.config.damping * DAMPING_WEIGHTS[mode] * omega;
      const discriminant = a * a - omega2;
      let ec;
      let es;
      if (Math.abs(discriminant) < 1e-12 * omega2) {
        ec = Math.exp(-a * h);
        es = h * ec;
      } else if (discriminant < 0) {
        const wd = Math.sqrt(-discriminant);
        const envelope = Math.exp(-a * h);
        ec = envelope * Math.cos(wd * h);
        es = envelope * Math.sin(wd * h) / wd;
      } else {
        const wd = Math.sqrt(discriminant);
        const plus = Math.exp((-a + wd) * h);
        const minus = Math.exp((-a - wd) * h);
        ec = (plus + minus) / 2;
        es = (plus - minus) / (2 * wd);
      }
      const coupling = AXES[mode] === 0 ? 2 * besselJ1(root) / (root * NORMALIZERS[mode]) : this.config.asymmetry * (AXES[mode] === 1 ? 1 : 0.83) * besselJ2(root) / (root * NORMALIZERS[mode]);
      const equilibrium = coupling * PRESSURE_ACCELERATION * this.config.gain / omega2;
      const i = mode * 6;
      this.coefficients[i] = ec + a * es;
      this.coefficients[i + 1] = es;
      this.coefficients[i + 2] = -omega2 * es;
      this.coefficients[i + 3] = ec - a * es;
      this.coefficients[i + 4] = (1 - this.coefficients[i]) * equilibrium;
      this.coefficients[i + 5] = -this.coefficients[i + 2] * equilibrium;
    }
  }
  updateFrame() {
    this.centerZ = this.q[0] * MIRROR_HEIGHT[0] + this.q[1] * MIRROR_HEIGHT[1];
    const slopeX = this.q[2] * MIRROR_SLOPE[2] + this.q[4] * MIRROR_SLOPE[4];
    const slopeY = this.q[3] * MIRROR_SLOPE[3] + this.q[5] * MIRROR_SLOPE[5];
    const length = Math.hypot(slopeX, slopeY, 1);
    this.nx = -slopeX / length;
    this.ny = -slopeY / length;
    this.nz = 1 / length;
    castLaser(0, 0, this.centerZ, this.nx, this.ny, this.nz, this.config.wallDistance, this.ray);
  }
};

// src/inverse/shape-fit.ts
function arcSamples(points, count) {
  const arc = [0];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    arc.push(arc[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const ring = new Float64Array(2 * count);
  let edge = 0;
  for (let i = 0; i < count; i++) {
    const at = arc[arc.length - 1] * i / count;
    while (edge + 1 < points.length && arc[edge + 1] <= at) edge++;
    const a = points[edge], b = points[(edge + 1) % points.length];
    const t = (at - arc[edge]) / (arc[edge + 1] - arc[edge] || 1);
    ring[i * 2] = a.x + t * (b.x - a.x);
    ring[i * 2 + 1] = a.y + t * (b.y - a.y);
  }
  return ring;
}
function extent(ring) {
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    xmin = Math.min(xmin, ring[i]);
    xmax = Math.max(xmax, ring[i]);
    ymin = Math.min(ymin, ring[i + 1]);
    ymax = Math.max(ymax, ring[i + 1]);
  }
  return Math.max(xmax - xmin, ymax - ymin, 1e-10);
}
function distanceGradient(queries, edges, updateQuery, gradient, residual) {
  const n = edges.length / 2;
  const dx = new Float64Array(n), dy = new Float64Array(n), inverseLength = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    dx[i] = edges[2 * j] - edges[2 * i];
    dy[i] = edges[2 * j + 1] - edges[2 * i + 1];
    const length = dx[i] ** 2 + dy[i] ** 2;
    inverseLength[i] = length ? 1 / length : 0;
  }
  let sum = 0;
  for (let k = 0; k < queries.length; k += 2) {
    const x = queries[k], y = queries[k + 1];
    let best = Infinity, edge = 0, t = 0, ex = 0, ey = 0;
    for (let i = 0; i < n; i++) {
      const qx = x - edges[2 * i], qy = y - edges[2 * i + 1];
      const u = Math.min(1, Math.max(0, (qx * dx[i] + qy * dy[i]) * inverseLength[i]));
      const rx = qx - u * dx[i], ry = qy - u * dy[i];
      const d = rx * rx + ry * ry;
      if (d < best) {
        best = d;
        edge = i;
        t = u;
        ex = rx;
        ey = ry;
      }
    }
    sum += best;
    if (residual) {
      residual[k] = ex;
      residual[k + 1] = ey;
    }
    if (updateQuery) {
      gradient[k] += ex;
      gradient[k + 1] += ey;
    } else {
      const next = (edge + 1) % n;
      gradient[2 * edge] -= (1 - t) * ex;
      gradient[2 * edge + 1] -= (1 - t) * ey;
      gradient[2 * next] -= t * ex;
      gradient[2 * next + 1] -= t * ey;
    }
  }
  return sum;
}
function shapeObjective(trace, ring, lineWeight, reportLine = false) {
  const n = trace.length / 2, gradient = new Float64Array(trace.length);
  const useLine = lineWeight > 0 || reportLine;
  const nodeError = useLine ? new Float64Array(trace.length) : void 0;
  const sum = distanceGradient(trace, ring, true, gradient, nodeError) + distanceGradient(ring, trace, false, gradient);
  const rms = Math.sqrt(sum / (2 * n));
  if (!nodeError) return { gradient, rms, lineScore: rms, objective: rms };
  const midpoint = new Float64Array(trace.length), midpointError = new Float64Array(trace.length);
  const lengths = new Float64Array(n), weights = new Float64Array(2 * n), squared = new Float64Array(2 * n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    midpoint[2 * i] = (trace[2 * i] + trace[2 * j]) / 2;
    midpoint[2 * i + 1] = (trace[2 * i + 1] + trace[2 * j + 1]) / 2;
    const length = Math.hypot(trace[2 * i] - trace[2 * j], trace[2 * i + 1] - trace[2 * j + 1]);
    lengths[i] = length;
    total += length;
    weights[i] += length / 6;
    weights[j] += length / 6;
    weights[n + i] = 2 * length / 3;
  }
  if (total < 1e-12) return { gradient, rms, lineScore: rms, objective: rms };
  distanceGradient(midpoint, ring, true, midpointError);
  let arcSq = 0;
  for (let i = 0; i < 2 * n; i++) {
    const residual = i < n ? nodeError : midpointError;
    const j = 2 * (i % n);
    squared[i] = residual[j] ** 2 + residual[j + 1] ** 2;
    arcSq += weights[i] * squared[i] / total;
  }
  const order = Array.from({ length: 2 * n }, (_, i) => i).sort((a, b) => squared[b] - squared[a]);
  const tailMass = 0.05 * total, tailWeights = new Float64Array(2 * n);
  let remaining = tailMass, cutoff = 0, tailSq = 0;
  for (const i of order) {
    const mass = Math.min(weights[i], remaining);
    tailWeights[i] = mass / tailMass;
    tailSq += tailWeights[i] * squared[i];
    remaining -= mass;
    cutoff = squared[i];
    if (remaining <= 0) break;
  }
  const arc = Math.sqrt(arcSq), tail = Math.sqrt(tailSq);
  const lineScore = 0.35 * rms + 0.4 * arc + 0.25 * tail;
  const objective = (1 - lineWeight) * rms + lineWeight * lineScore;
  if (!lineWeight) return { gradient, rms, lineScore, objective };
  const regular = (1 - 0.65 * lineWeight) * objective / Math.max(rms, 1e-12);
  const arcFactor = 0.4 * lineWeight * n * objective / Math.max(arc, 1e-12);
  const tailFactor = 0.25 * lineWeight * n * objective / Math.max(tail, 1e-12);
  for (let j = 0; j < gradient.length; j++) gradient[j] *= regular;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, mid = n + i;
    const vertexWeight = 2 * (arcFactor * weights[i] / total + tailFactor * tailWeights[i]);
    const midpointWeight = arcFactor * weights[mid] / total + tailFactor * tailWeights[mid];
    const edgeSq = (squared[i] + 4 * squared[mid] + squared[j]) / 6;
    const excess = (Math.max(0, squared[i] - cutoff) + 4 * Math.max(0, squared[mid] - cutoff) + Math.max(0, squared[j] - cutoff)) / 6;
    const stretch = lengths[i] > 1e-12 ? (arcFactor * (edgeSq - arcSq) + tailFactor * (excess / 0.05 - (tailSq - cutoff))) / (total * lengths[i]) : 0;
    for (let axis = 0; axis < 2; axis++) {
      const a = 2 * i + axis, b = 2 * j + axis;
      const stretchGradient = stretch * (trace[a] - trace[b]);
      gradient[a] += vertexWeight * nodeError[a] + midpointWeight * midpointError[a] + stretchGradient;
      gradient[b] += midpointWeight * midpointError[a] - stretchGradient;
    }
  }
  return { gradient, rms, lineScore, objective };
}
function align(trace, target) {
  const n = trace.length / 2;
  const steps = new Uint8Array((n + 1) ** 2);
  let last = new Float64Array(n + 1).fill(Infinity), next = new Float64Array(n + 1);
  last[0] = 0;
  for (let t = 1; t <= n; t++) {
    next.fill(Infinity);
    const sample = 2 * (t % n);
    for (let j2 = Math.max(0, 3 * t - 2 * n); j2 <= Math.min(n, 3 * t); j2++) {
      let cost = Infinity, step = 0;
      for (let advance = 0; advance <= Math.min(3, j2); advance++) {
        const total = last[j2 - advance] + 0.1 * ((advance - 1) / n) ** 2;
        if (total < cost) {
          cost = total;
          step = advance;
        }
      }
      const p = 2 * (j2 % n);
      next[j2] = cost + (trace[sample] - target[p]) ** 2 + (trace[sample + 1] - target[p + 1]) ** 2;
      steps[t * (n + 1) + j2] = step;
    }
    [last, next] = [next, last];
  }
  const result = new Float64Array(trace.length);
  let j = n;
  for (let t = n; t > 0; t--) {
    const i = 2 * (t % n), p = 2 * (j % n);
    result[i] = target[p];
    result[i + 1] = target[p + 1];
    j -= steps[t * (n + 1) + j];
  }
  return result;
}
function wallBasis(response, scale, size, n) {
  return Array.from({ length: 2 * response.length }, (_, k) => {
    const harmonic = k >> 1, h = response[harmonic], column = new Float64Array(2 * n);
    for (let j = 0; j < n; j++) {
      const phase = 2 * Math.PI * (harmonic + 1) * j / n + k % 2 * Math.PI / 2;
      const c = Math.cos(phase), s = Math.sin(phase), gain = scale[harmonic] / size;
      column[j * 2] = gain * (h.xRe * c - h.xIm * s);
      column[j * 2 + 1] = gain * (h.yRe * c - h.yIm * s);
    }
    return column;
  });
}
function audioBasis(scale, count) {
  return Array.from({ length: count }, (_, i) => {
    const row = new Float64Array(2 * scale.length);
    for (let k = 0; k < scale.length; k++) {
      const phase = 2 * Math.PI * (k + 1) * i / count;
      row[2 * k] = scale[k] * Math.cos(phase);
      row[2 * k + 1] = -scale[k] * Math.sin(phase);
    }
    return row;
  });
}
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
function limitDrive(coef, rows, norm2, limit) {
  if (!norm2) return;
  for (let pass = 0; pass < 2; pass++) {
    for (const row of rows) {
      const u = dot(coef, row);
      if (Math.abs(u) <= limit) continue;
      const delta = (u - Math.sign(u) * limit) / norm2;
      for (let k = 0; k < coef.length; k++) coef[k] -= delta * row[k];
    }
  }
  let peak = 0;
  for (const row of rows) peak = Math.max(peak, Math.abs(dot(coef, row)));
  if (peak > limit) for (let k = 0; k < coef.length; k++) coef[k] *= limit / peak;
}
function fitPeriodicShape({ target, transfer, tones, period, limit, iterations = 60, orderWeight = 0.045, lineWeight = 0 }) {
  if (!tones.length || transfer.length !== tones.length || target.length < 2 || !Number.isInteger(period) || period < 2 * tones.length + 1 || !(limit > 0 && limit <= 1) || !Number.isInteger(iterations) || iterations < 0 || !Number.isFinite(orderWeight) || orderWeight < 0 || !(lineWeight >= 0 && lineWeight <= 1)) throw new Error("Invalid shape optimizer dimensions or drive limits.");
  const n = Math.min(period, Math.max(96, 6 * tones.length));
  const ring = arcSamples(target, n), size = extent(ring);
  for (let i = 0; i < ring.length; i++) ring[i] /= size;
  const scale = Float64Array.from(transfer, (h) => {
    const gain = Math.hypot(h.xRe, h.xIm, h.yRe, h.yIm);
    return Math.min(limit * 2, size / Math.max(gain, 1e-12));
  });
  const coefficients = Float64Array.from(tones.flatMap((h, i) => [h.re / scale[i], h.im / scale[i]]));
  const basis = wallBasis(transfer, scale, size, n);
  const peakGrid = audioBasis(scale, Math.min(period, Math.max(160, tones.length * 10)));
  const norm2 = dot(scale, scale);
  const render = (v) => {
    const trace2 = new Float64Array(n * 2);
    for (let k = 0; k < v.length; k++) {
      const column = basis[k];
      for (let j = 0; j < trace2.length; j++) trace2[j] += v[k] * column[j];
    }
    return trace2;
  };
  limitDrive(coefficients, peakGrid, norm2, limit);
  const first = new Float64Array(coefficients.length), second = new Float64Array(coefficients.length);
  let best = coefficients.slice(), bestLoss = Infinity;
  let ordered = ring;
  for (let step = 0; step <= iterations; step++) {
    const trace2 = render(coefficients);
    const { gradient, objective } = shapeObjective(trace2, ring, lineWeight);
    const loss = objective * objective;
    if (loss < bestLoss) {
      bestLoss = loss;
      best = coefficients.slice();
    }
    if (step === iterations || bestLoss < 1e-12) break;
    if (step % 10 === 0) ordered = align(trace2, ring);
    for (let i = 0; i < gradient.length; i++) gradient[i] += orderWeight * (trace2[i] - ordered[i]);
    const time = step + 1;
    const learningRate = 0.017 * (0.16 + 0.84 * (1 - step / iterations));
    for (let k = 0; k < coefficients.length; k++) {
      const g = dot(gradient, basis[k]) / n;
      first[k] = 0.9 * first[k] + 0.1 * g;
      second[k] = 0.98 * second[k] + 0.02 * g * g;
      const adjusted = first[k] / (1 - 0.9 ** time) / (Math.sqrt(second[k] / (1 - 0.98 ** time)) + 1e-7);
      coefficients[k] -= learningRate * adjusted;
    }
    limitDrive(coefficients, peakGrid, norm2, limit);
  }
  if (peakGrid.length !== period) {
    const cycle = new Float64Array(period);
    for (let k = 0; k < scale.length; k++) {
      const re = best[2 * k] * scale[k], im = best[2 * k + 1] * scale[k];
      const step = 2 * Math.PI * (k + 1) / period;
      for (let i = 0; i < period; i++) cycle[i] += re * Math.cos(step * i) - im * Math.sin(step * i);
    }
    let peak = 0;
    for (const u of cycle) peak = Math.max(peak, Math.abs(u));
    if (peak > limit) for (let k = 0; k < best.length; k++) best[k] *= limit / peak;
  }
  const trace = render(best);
  const final = shapeObjective(trace, ring, lineWeight, true);
  const matched = align(trace, ring);
  const reference = Array.from({ length: target.length }, (_, i) => {
    const j = i * n / target.length, index = Math.floor(j), next = (index + 1) % n, f = j - index;
    return {
      x: size * ((1 - f) * matched[2 * index] + f * matched[2 * next]),
      y: size * ((1 - f) * matched[2 * index + 1] + f * matched[2 * next + 1])
    };
  });
  return {
    tones: tones.map((_, k) => ({ re: best[2 * k] * scale[k], im: best[2 * k + 1] * scale[k] })),
    score: size * final.rms,
    lineScore: size * final.lineScore,
    reference
  };
}

// src/inverse/geometry-seeds.ts
var GRID_SIZE = 64;
var MAX_HARMONICS = 16;
var TAU = 2 * Math.PI;
function harmonicTable(wave) {
  return Array.from(
    { length: MAX_HARMONICS },
    (_, k) => Float64Array.from({ length: GRID_SIZE }, (_2, j) => wave(TAU * (k + 1) * j / GRID_SIZE))
  );
}
var cosine = harmonicTable(Math.cos);
var sine = harmonicTable(Math.sin);
function nearest(p, ring) {
  let edge = 0;
  let fraction = 0;
  let x = ring[0].x, y = ring[0].y;
  let distance2 = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a2 = ring[i], b2 = ring[(i + 1) % ring.length];
    const dx = b2.x - a2.x, dy = b2.y - a2.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a2.x) * dx + (p.y - a2.y) * dy) / len2)) : 0;
    const qx = a2.x + t * dx, qy = a2.y + t * dy;
    const d = (p.x - qx) ** 2 + (p.y - qy) ** 2;
    if (d >= distance2) continue;
    distance2 = d;
    edge = i;
    fraction = t;
    x = qx;
    y = qy;
  }
  const a = ring[edge], b = ring[(edge + 1) % ring.length];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = length ? (b.y - a.y) / length : 0;
  const ny = length ? (a.x - b.x) / length : 0;
  return { edge, fraction, x, y, nx, ny, distance2 };
}
function wallBasis2(h) {
  const columns = 2 * h.length;
  const rows = () => Array.from({ length: GRID_SIZE }, () => new Float64Array(columns));
  const x = rows(), y = rows();
  for (let k = 0; k < h.length; k++) {
    const { xRe, xIm, yRe, yIm } = h[k];
    for (let j = 0; j < GRID_SIZE; j++) {
      const c = cosine[k][j], s = sine[k][j];
      const re = 2 * k, im = re + 1;
      x[j][re] = xRe * c - xIm * s;
      x[j][im] = -xRe * s - xIm * c;
      y[j][re] = yRe * c - yIm * s;
      y[j][im] = -yRe * s - yIm * c;
    }
  }
  return { x, y, columns };
}
var NormalEquations = class {
  constructor(columns) {
    this.matrix = Array.from({ length: columns }, () => new Float64Array(columns));
    this.rhs = new Float64Array(columns);
    this.normal = new Float64Array(columns);
    this.tangent = new Float64Array(columns);
  }
  add(x, y, point, nx, ny, tangentWeight) {
    const normalTarget = nx * point.x + ny * point.y;
    const tangentTarget = (ny * point.x - nx * point.y) * tangentWeight;
    for (let i = 0; i < x.length; i++) {
      const a = nx * x[i] + ny * y[i], b = ny * x[i] - nx * y[i];
      this.normal[i] = a;
      this.tangent[i] = b;
      this.rhs[i] += a * normalTarget + b * tangentTarget;
      const row = this.matrix[i], bw = b * tangentWeight;
      for (let j = 0; j <= i; j++) row[j] += a * this.normal[j] + bw * this.tangent[j];
    }
  }
  solve(ridge) {
    const a = this.matrix, u = this.rhs;
    for (let i = 0; i < u.length; i++) {
      a[i][i] += ridge;
      for (let j = 0; j <= i; j++) {
        let sum = a[i][j];
        for (let k = 0; k < j; k++) sum -= a[i][k] * a[j][k];
        a[i][j] = i === j ? Math.sqrt(Math.max(1e-20, sum)) : sum / a[j][j];
      }
      for (let j = 0; j < i; j++) u[i] -= a[i][j] * u[j];
      u[i] /= a[i][i];
    }
    for (let i = u.length - 1; i >= 0; i--) {
      for (let j = i + 1; j < u.length; j++) u[i] -= a[j][i] * u[j];
      u[i] /= a[i][i];
    }
    return u;
  }
};
function score(points, path, size) {
  let sum = 0, outside = 0;
  const tolerance = 0.04 * size;
  for (let j = 0; j < GRID_SIZE; j++) {
    const a = nearest(path[j], points).distance2;
    const b = nearest(points[j], path).distance2;
    sum += a + b;
    outside += Number(a > tolerance ** 2) + Number(b > tolerance ** 2);
  }
  return Math.sqrt(sum / (2 * GRID_SIZE)) + 0.15 * tolerance * outside / GRID_SIZE;
}
function fit(path, basis, peak, size, ridge, tangentWeight, previous) {
  const equations = new NormalEquations(basis.columns);
  const x = new Float64Array(basis.columns), y = new Float64Array(basis.columns);
  for (let j = 0; j < GRID_SIZE; j++) {
    if (!previous) {
      const a = path[(j + GRID_SIZE - 1) % GRID_SIZE], b = path[(j + 1) % GRID_SIZE];
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      equations.add(basis.x[j], basis.y[j], path[j], (b.y - a.y) / length, (a.x - b.x) / length, tangentWeight);
      continue;
    }
    const target = nearest(previous.points[j], path);
    equations.add(basis.x[j], basis.y[j], target, target.nx, target.ny, tangentWeight);
    const match = nearest(path[j], previous.points);
    const left = match.edge, right = (left + 1) % GRID_SIZE, w = match.fraction;
    for (let i = 0; i < basis.columns; i++) {
      x[i] = basis.x[left][i] + w * (basis.x[right][i] - basis.x[left][i]);
      y[i] = basis.y[left][i] + w * (basis.y[right][i] - basis.y[left][i]);
    }
    equations.add(x, y, path[j], match.nx, match.ny, tangentWeight);
  }
  const controls = equations.solve(ridge * GRID_SIZE * (previous ? 2 : 1));
  let amplitude = 0;
  for (let j = 0; j < GRID_SIZE; j++) {
    let u = 0;
    for (let k = 0; k < controls.length / 2; k++) {
      u += controls[2 * k] * cosine[k][j] - controls[2 * k + 1] * sine[k][j];
    }
    amplitude = Math.max(amplitude, Math.abs(u));
  }
  if (amplitude > peak) {
    for (let i = 0; i < controls.length; i++) controls[i] *= peak / amplitude;
  }
  const points = basis.x.map((row, j) => {
    let x2 = 0, y2 = 0;
    for (let k = 0; k < controls.length; k++) {
      x2 += row[k] * controls[k];
      y2 += basis.y[j][k] * controls[k];
    }
    return { x: x2, y: y2 };
  });
  return { controls, points, score: score(points, path, size) };
}
function geometrySeeds(uniform, periods, rate, response, peak) {
  const path = Array.from({ length: GRID_SIZE }, (_, j) => {
    const phase = uniform.length * j / GRID_SIZE, i = Math.floor(phase);
    const a = uniform[i], b = uniform[(i + 1) % uniform.length];
    const w = phase - i;
    return { x: a.x + w * (b.x - a.x), y: a.y + w * (b.y - a.y) };
  });
  const extent2 = (key) => Math.max(...path.map((p) => p[key])) - Math.min(...path.map((p) => p[key]));
  const size = Math.max(extent2("x"), extent2("y"));
  const penalty = Math.max(1e-14, (size / peak) ** 2);
  const pool = [];
  const ordered = [...new Set(periods)].sort((a, b) => a - b);
  let last = 0;
  for (const period of ordered) {
    if (period < last * 1.022) continue;
    last = period;
    const count = Math.min(MAX_HARMONICS, Math.floor((period - 1) / 2));
    const transfer = Array.from({ length: count }, (_, k) => response(rate * (k + 1) / period));
    if (!transfer.some((h) => Math.hypot(h.xRe, h.xIm, h.yRe, h.yIm) > 1e-12)) continue;
    const basis = wallBasis2(transfer);
    let best;
    for (const tangent of [2e-3, 0.04, 0.16]) {
      for (const ridge of [8e-3, 0.5]) {
        const attempt = fit(path, basis, peak, size, penalty * ridge, tangent);
        if (!best || attempt.score < best.score) best = attempt;
      }
    }
    pool.push({ period, basis, solution: best });
  }
  pool.sort((a, b) => a.solution.score - b.solution.score);
  const finalists = [];
  for (const row of pool) {
    if (finalists.some((other) => Math.abs(other.period / row.period - 1) < 0.023)) continue;
    finalists.push(row);
    if (finalists.length === 18) break;
  }
  for (const row of finalists) {
    for (let iteration = 0; iteration < 28; iteration++) {
      const updated = fit(path, row.basis, peak, size, penalty * 0.065, 0.15, row.solution);
      if (updated.score >= row.solution.score - size * 1e-6) break;
      row.solution = updated;
    }
  }
  finalists.sort((a, b) => a.solution.score - b.solution.score);
  return finalists.slice(0, 3).map(({ period, solution }) => ({
    period,
    target: uniform,
    score: solution.score,
    tones: Array.from({ length: solution.controls.length / 2 }, (_, k) => ({
      re: solution.controls[2 * k],
      im: solution.controls[2 * k + 1]
    }))
  }));
}

// src/inverse/outline-error.ts
function nearestSquared(p, curve, fallback) {
  let best = Infinity;
  for (let i = 0; i < curve.length; i++) {
    const a = curve[i], b = curve[(i + 1) % curve.length];
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
    let dx = p.x - a.x, dy = p.y - a.y;
    if (Number.isFinite(b.x) && Number.isFinite(b.y)) {
      const vx = b.x - a.x, vy = b.y - a.y, length2 = vx * vx + vy * vy;
      const t = length2 ? Math.min(1, Math.max(0, (dx * vx + dy * vy) / length2)) : 0;
      dx -= t * vx;
      dy -= t * vy;
    }
    best = Math.min(best, dx * dx + dy * dy);
  }
  return Number.isFinite(best) ? best : fallback;
}
function outlineError(trace, target, metrics) {
  const lengths = new Float64Array(trace.length);
  let perimeter = 0;
  for (let i = 0; i < trace.length; i++) {
    const a = trace[i], b = trace[(i + 1) % trace.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (Number.isFinite(length)) {
      lengths[i] = length;
      perimeter += length;
    }
  }
  const uncovered = metrics.tolerance * (1 - metrics.coverage);
  if (perimeter === 0) return metrics.rmsDistance + uncovered;
  const count = 256;
  const squared = new Float64Array(count);
  let segment = 0, start = 0, total = 0;
  const point = { x: 0, y: 0 };
  for (let j = 0; j < count; j++) {
    const distance = (j + 0.5) * perimeter / count;
    while (segment < lengths.length - 1 && start + lengths[segment] <= distance) {
      start += lengths[segment++];
    }
    const a = trace[segment], b = trace[(segment + 1) % trace.length];
    const t = (distance - start) / lengths[segment];
    point.x = a.x + t * (b.x - a.x);
    point.y = a.y + t * (b.y - a.y);
    squared[j] = nearestSquared(point, target, metrics.rmsDistance ** 2);
    total += squared[j];
  }
  squared.sort();
  const tailCount = Math.ceil(0.05 * count);
  let tail = 0;
  for (let j = count - tailCount; j < count; j++) tail += squared[j];
  return 0.35 * metrics.rmsDistance + 0.4 * Math.sqrt(total / count) + 0.25 * Math.sqrt(tail / tailCount) + uncovered;
}

// src/inverse/solver.ts
var GRID = 96;
var HARMONICS = 16;
var TAU2 = 2 * Math.PI;
var LIMIT_PATH_POINTS = 1e5;
function linearizedModes(config, rate) {
  const engine = new Simulator(config, rate);
  const rest = engine.getState();
  engine.process([1]);
  const b = engine.getState();
  return rest.q.map((_, j) => {
    const state = { q: [...rest.q], v: [...rest.v], sampleIndex: 0 };
    const epsilon = 1e-7;
    state.q[j] = -epsilon;
    engine.reset(state);
    const minus = engine.getFrame();
    state.q[j] = epsilon;
    engine.reset(state);
    const plus = engine.getFrame();
    const cx = (plus.x - minus.x) / (2 * epsilon);
    const cy = (plus.y - minus.y) / (2 * epsilon);
    engine.process([0]);
    const column = engine.getState();
    const a00 = column.q[j] / epsilon;
    const a10 = column.v[j] / epsilon;
    state.q[j] = 0;
    state.v[j] = 1;
    engine.reset(state);
    engine.process([0]);
    const second = engine.getState();
    return { cx, cy, a00, a01: second.q[j], a10, a11: second.v[j], bq: b.q[j], bv: b.v[j] };
  });
}
function modelResponse(config, rate) {
  const modes = linearizedModes(config, rate).map((m) => ({
    cx: m.cx,
    cy: m.cy,
    tr: m.a00 + m.a11,
    det: m.a00 * m.a11 - m.a10 * m.a01,
    b0: m.bq,
    b1: m.a01 * m.bv - m.a11 * m.bq
  }));
  return (frequency) => {
    const theta = -TAU2 * frequency / rate;
    const c = Math.cos(theta), s = Math.sin(theta);
    const c2 = Math.cos(theta * 2), s2 = Math.sin(theta * 2);
    let xRe = 0, xIm = 0, yRe = 0, yIm = 0;
    for (const m of modes) {
      const dr = 1 - m.tr * c + m.det * c2;
      const di = -m.tr * s + m.det * s2;
      const norm = dr * dr + di * di;
      if (norm < 1e-24) continue;
      const nr = m.b0 + m.b1 * c, ni = m.b1 * s;
      const re = (nr * dr + ni * di) / norm, im = (ni * dr - nr * di) / norm;
      xRe += m.cx * re;
      xIm += m.cx * im;
      yRe += m.cy * re;
      yIm += m.cy * im;
    }
    return { frequency, xRe, xIm, yRe, yIm };
  };
}
function measuredResponse(rows) {
  if (rows.length > 8192) throw new RangeError("Calibration supports up to 8192 frequency rows.");
  const sorted = [...rows].sort((a, b) => a.frequency - b.frequency);
  if (!sorted.length || sorted.some((r, i) => ![r.frequency, r.xRe, r.xIm, r.yRe, r.yIm].every(Number.isFinite) || r.frequency <= 0 || i > 0 && r.frequency === sorted[i - 1].frequency)) {
    throw new RangeError("Calibration requires distinct positive frequencies and finite complex responses.");
  }
  if (sorted.every((r) => !(r.xRe || r.xIm || r.yRe || r.yIm))) throw new RangeError("The measured response is zero. Check the optical tracking and the playback level.");
  return (frequency) => {
    const zero = { frequency, xRe: 0, xIm: 0, yRe: 0, yIm: 0 };
    if (frequency < sorted[0].frequency || frequency > sorted[sorted.length - 1].frequency) return zero;
    let lo = 0, hi = sorted.length - 1;
    while (hi - lo > 1) {
      const mid = lo + hi >>> 1;
      if (sorted[mid].frequency <= frequency) lo = mid;
      else hi = mid;
    }
    const a = sorted[lo], b = sorted[hi];
    const t = hi === lo ? 0 : (frequency - a.frequency) / (b.frequency - a.frequency);
    return {
      frequency,
      xRe: a.xRe + (b.xRe - a.xRe) * t,
      xIm: a.xIm + (b.xIm - a.xIm) * t,
      yRe: a.yRe + (b.yRe - a.yRe) * t,
      yIm: a.yIm + (b.yIm - a.yIm) * t
    };
  };
}
function resample(path, count, byLength = false) {
  const ends = [0];
  for (let i = 0; i < path.length; i++) {
    const a = path[i], b = path[(i + 1) % path.length];
    ends.push(ends[i] + (byLength ? Math.hypot(b.x - a.x, b.y - a.y) : 1));
  }
  const total = ends[path.length];
  let index = 0;
  return Array.from({ length: count }, (_, i) => {
    const position = total * i / count;
    while (index + 1 < path.length && ends[index + 1] <= position) index++;
    const a = path[index], b = path[(index + 1) % path.length];
    const t = (position - ends[index]) / (ends[index + 1] - ends[index] || 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}
function gridBasis(count, length) {
  return Array.from({ length: count }, (_, h) => ({
    cos: Float64Array.from({ length }, (_2, j) => Math.cos(TAU2 * (h + 1) * j / length)),
    sin: Float64Array.from({ length }, (_2, j) => Math.sin(TAU2 * (h + 1) * j / length))
  }));
}
var BASIS = gridBasis(HARMONICS, GRID);
function spectrum(path) {
  const x = [], y = [];
  for (const { cos, sin } of BASIS) {
    let xr = 0, xi = 0, yr = 0, yi = 0;
    for (let j = 0; j < GRID; j++) {
      xr += path[j].x * cos[j];
      xi -= path[j].x * sin[j];
      yr += path[j].y * cos[j];
      yi -= path[j].y * sin[j];
    }
    x.push({ re: 2 * xr / GRID, im: 2 * xi / GRID });
    y.push({ re: 2 * yr / GRID, im: 2 * yi / GRID });
  }
  return { x, y };
}
function inverseTones(h, target, ridge = 1e-8) {
  return h.map(({ xRe, xIm, yRe, yIm }, k) => {
    const power = xRe * xRe + xIm * xIm + yRe * yRe + yIm * yIm;
    const x = target.x[k], y = target.y[k];
    return {
      re: (xRe * x.re + xIm * x.im + yRe * y.re + yIm * y.im) / (power + ridge),
      im: (xRe * x.im - xIm * x.re + yRe * y.im - yIm * y.re) / (power + ridge)
    };
  });
}
function synthesize(tones, basis) {
  const samples = new Float32Array(basis[0].cos.length);
  for (let k = 0; k < tones.length; k++) {
    const { re, im } = tones[k], { cos, sin } = basis[k];
    for (let j = 0; j < samples.length; j++) samples[j] += re * cos[j] - im * sin[j];
  }
  return samples;
}
function bounded(tones, basis, limit) {
  const values = synthesize(tones, basis);
  let peak = 0;
  for (const value of values) peak = Math.max(peak, Math.abs(value));
  const scale = peak > limit ? limit / peak : 1;
  return tones.map(({ re, im }) => ({ re: re * scale, im: im * scale }));
}
function initialTones(transfer, target, limit) {
  let ridge = 1e-8;
  let tones = inverseTones(transfer, target, ridge);
  const peak = (candidate) => {
    let maximum = 0;
    for (const value of synthesize(candidate, BASIS)) maximum = Math.max(maximum, Math.abs(value));
    return maximum;
  };
  if (peak(tones) <= limit) return tones;
  do {
    ridge *= 4;
    tones = inverseTones(transfer, target, ridge);
  } while (peak(tones) > limit && ridge < 1e6);
  let low = ridge / 4, high = ridge;
  for (let i = 0; i < 4; i++) {
    const mid = Math.sqrt(low * high);
    const trial = inverseTones(transfer, target, mid);
    if (peak(trial) <= limit) {
      high = mid;
      tones = trial;
    } else low = mid;
  }
  return bounded(tones, BASIS, limit);
}
function predicted(tones, h, basis) {
  function axis(isX) {
    return synthesize(tones.map(({ re, im }, k) => {
      const hr = isX ? h[k].xRe : h[k].yRe, hi = isX ? h[k].xIm : h[k].yIm;
      return { re: hr * re - hi * im, im: hr * im + hi * re };
    }), basis);
  }
  const x = axis(true), y = axis(false);
  return Array.from(x, (value, i) => ({ x: value, y: y[i] }));
}
function dist2(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}
function trackCost(output, target, size) {
  let error = 0;
  for (let i = 0; i < output.length; i++) {
    error += Number.isFinite(output[i].x) ? dist2(output[i], target[i]) : size * size;
  }
  return error / output.length;
}
function retime(output, target, size) {
  const n = GRID;
  const last = new Int8Array((n + 1) * (n + 1));
  let row = new Float64Array(n + 1).fill(Infinity);
  row[0] = 0;
  const speedPenalty = (size / n) ** 2 * 0.2;
  for (let t = 1; t <= n; t++) {
    const next = new Float64Array(n + 1).fill(Infinity);
    const p = output[t % n];
    for (let j2 = Math.max(0, 2 * t - n); j2 <= Math.min(n, 2 * t); j2++) {
      let step = 0, best = row[j2] + speedPenalty;
      if (j2 > 0 && row[j2 - 1] < best) {
        step = 1;
        best = row[j2 - 1];
      }
      if (j2 > 1 && row[j2 - 2] + speedPenalty < best) {
        step = 2;
        best = row[j2 - 2] + speedPenalty;
      }
      next[j2] = best + (Number.isFinite(p.x) ? dist2(p, target[j2 % n]) : size * size);
      last[t * (n + 1) + j2] = step;
    }
    row = next;
  }
  const timed = [...target];
  let j = n;
  for (let t = n; t > 0; t--) {
    timed[t % n] = target[j % n];
    j -= last[t * (n + 1) + j];
  }
  return timed;
}
function shapeMetrics(trace, target, size) {
  const tolerance = Math.max(1e-6, 0.04 * size);
  let coverage = 0, offStroke = 0, misses = 0, targetError = 0, drawnError = 0;
  for (const p of target) {
    const d = nearestSquared(p, trace, size * size);
    if (d <= tolerance ** 2) coverage++;
    targetError += d;
  }
  for (const p of trace) {
    const hit = Number.isFinite(p.x);
    if (!hit) misses++;
    const d = hit ? nearestSquared(p, target, size * size) : size * size;
    if (!hit || d > tolerance ** 2) offStroke++;
    drawnError += d;
  }
  return {
    coverage: coverage / target.length,
    offStroke: offStroke / trace.length,
    missFraction: misses / trace.length,
    rmsDistance: Math.sqrt((targetError / target.length + drawnError / trace.length) / 2),
    tolerance
  };
}
function periodsFor(options, rate) {
  if (options.periodSamples !== void 0) {
    if (!Number.isInteger(options.periodSamples) || options.periodSamples < 8 || options.periodSamples > rate) {
      throw new RangeError("A period must contain 8 samples to one second of audio.");
    }
    return [options.periodSamples];
  }
  const measured = options.response;
  const lower = measured ? Math.max(4, Math.min(...measured.map((h) => h.frequency)) / HARMONICS) : Math.max(8, 25 * Math.sqrt(options.config.tension));
  const upper = measured ? Math.min(rate / 8, Math.max(...measured.map((h) => h.frequency))) : Math.min(rate / 8, 460 * Math.sqrt(options.config.tension));
  const periods = /* @__PURE__ */ new Set();
  for (let f = lower; f <= upper; f *= 1.014) periods.add(Math.round(rate / f));
  for (const row of measured ?? []) {
    for (let h = 1; h <= 4; h++) {
      const n = Math.round(h * rate / row.frequency);
      if (n >= 8 && n <= rate / lower) periods.add(n);
    }
  }
  if (!periods.size) throw new RangeError("No usable audio frequencies in the calibration.");
  return [...periods];
}
function periodTransition(config, rate, length) {
  const simulator = new Simulator(config, rate);
  const rest = simulator.getState();
  const zeros = new Float32Array(length);
  function column(axis) {
    const state = { ...rest, [axis]: rest[axis].map(() => 1) };
    simulator.reset(state);
    simulator.process(zeros);
    return simulator.getState();
  }
  const q = column("q"), v = column("v");
  return rest.q.map((_, i) => ({ a: 1 - q.q[i], b: -v.q[i], c: -q.v[i], d: 1 - v.v[i] }));
}
function periodicState(transition, forced) {
  const q = [], v = [];
  for (let i = 0; i < transition.length; i++) {
    const { a, b, c, d } = transition[i];
    const det = a * d - b * c;
    q.push((d * forced.q[i] - b * forced.v[i]) / det);
    v.push((a * forced.v[i] - c * forced.q[i]) / det);
  }
  return { q, v };
}
function orbitError(state, periodic) {
  let difference = 0, power = 0;
  for (let i = 0; i < state.q.length; i++) {
    difference += (state.q[i] - periodic.q[i]) ** 2 + ((state.v[i] - periodic.v[i]) / 1e3) ** 2;
    power += periodic.q[i] ** 2 + (periodic.v[i] / 1e3) ** 2;
  }
  return Math.sqrt(difference / Math.max(1e-30, power));
}
function distinctPeriods(ranked, count) {
  const selected = [];
  for (const candidate of ranked) {
    if (selected.some((s) => Math.abs(s.period / candidate.period - 1) < 0.035)) continue;
    selected.push(candidate);
    if (selected.length === count) break;
  }
  return selected;
}
function geometricCandidates(pool, seeds, uniform, periods, rate, response, limit) {
  const ranked = [...pool].sort((a, b) => a.shapeError - b.shapeError);
  const bands = /* @__PURE__ */ new Map();
  for (const candidate of ranked) {
    const band = Math.floor(Math.log(candidate.period) / Math.log(1.1));
    if (!bands.has(band)) bands.set(band, candidate);
  }
  const matches = geometrySeeds(uniform, periods, rate, response, limit).map((seed) => ({
    ...seed,
    transfer: seed.tones.map((_, i) => response(rate * (i + 1) / seed.period))
  }));
  const starts = [.../* @__PURE__ */ new Set([...seeds, ...distinctPeriods(ranked, 5), ...bands.values(), ...matches])];
  function refine(candidate, iterations, harmonics = candidate.tones.length, orderWeight = 0.045, lineWeight = 0) {
    const count = Math.min(harmonics, Math.floor((candidate.period - 1) / 2));
    const tones = Array.from({ length: count }, (_, i) => candidate.tones[i] ?? { re: 0, im: 0 });
    const transfer = tones.map((_, i) => candidate.transfer[i] ?? response(rate * (i + 1) / candidate.period));
    const fit2 = fitPeriodicShape({ target: candidate.target, transfer, tones, period: candidate.period, limit, iterations, orderWeight, lineWeight });
    return { ...candidate, transfer, tones: fit2.tones, reference: fit2.reference, shapeError: fit2.score, lineScore: fit2.lineScore };
  }
  const coarse = starts.map((seed) => refine(seed, 35)).sort((a, b) => a.shapeError - b.shapeError);
  const fine = distinctPeriods(coarse, 7).map((seed) => refine(seed, 120)).sort((a, b) => a.shapeError - b.shapeError);
  const extended = fine.slice(0, 3).map((seed) => refine(seed, 155, 32, 2e-3)).sort((a, b) => a.shapeError - b.shapeError);
  const finalists = [...fine, ...extended];
  if (periods.length > 1) {
    const seed = extended[0];
    const nearby = new Set([0.98, 0.9925, 1.0075, 1.02].map((factor) => Math.round(seed.period * factor)));
    for (const period of nearby) {
      if (period === seed.period || period < 2 * seed.tones.length + 1 || period > rate) continue;
      const transfer = seed.tones.map((_, k) => response(rate * (k + 1) / period));
      const tones = seed.tones.map((u, k) => {
        const a = seed.transfer[k], b = transfer[k];
        const power = b.xRe ** 2 + b.xIm ** 2 + b.yRe ** 2 + b.yIm ** 2 + 1e-10;
        const re = (b.xRe * a.xRe + b.xIm * a.xIm + b.yRe * a.yRe + b.yIm * a.yIm) / power;
        const im = (b.xRe * a.xIm - b.xIm * a.xRe + b.yRe * a.yIm - b.yIm * a.yRe) / power;
        return { re: re * u.re - im * u.im, im: re * u.im + im * u.re };
      });
      finalists.push(refine({ ...seed, period, tones, transfer }, 85, tones.length, 2e-3));
    }
  }
  const byLine = [...finalists].sort((a, b) => a.lineScore - b.lineScore);
  const lineFits = distinctPeriods(byLine, 3).map((seed) => refine(seed, 130, 32, 5e-3, 0.85));
  const aligned = finalists.sort((a, b) => a.shapeError - b.shapeError).map((seed) => ({ ...seed, target: seed.reference }));
  return [...distinctPeriods(aligned, 4), ...lineFits.map((seed) => ({ ...seed, target: seed.reference }))];
}
function solveInverse(options) {
  const rate = options.sampleRate ?? 48e3, limit = options.maxAmplitude ?? 0.8;
  validateConfig(options.config);
  if (!options.response && options.config.gain === 0) throw new RangeError("Increase the input gain so that audio can move the mirror.");
  if (!options.response && options.config.damping === 0) throw new RangeError("Set positive damping to let a repeated waveform settle from rest.");
  if (!Number.isInteger(rate) || rate < 8e3 || rate > 384e3) throw new RangeError("Choose an audio sample rate from 8 to 384 kHz.");
  if (!Number.isFinite(limit) || limit <= 0 || limit > 1) throw new RangeError("Maximum PCM amplitude must be in (0, 1].");
  if (!Array.isArray(options.path) || options.path.length < 2 || options.path.length > LIMIT_PATH_POINTS || options.path.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    throw new RangeError("A path needs 2 to 100,000 finite wall-coordinate points.");
  }
  const path = options.path.slice();
  if (path.length > 2 && dist2(path[0], path[path.length - 1]) === 0) path.pop();
  const uniform = resample(path, GRID, true);
  const width = Math.max(...uniform.map((p) => p.x)) - Math.min(...uniform.map((p) => p.x));
  const height = Math.max(...uniform.map((p) => p.y)) - Math.min(...uniform.map((p) => p.y));
  const size = Math.max(width, height);
  if (!(size > 1e-8)) throw new RangeError("The drawn path needs a visible extent.");
  const response = options.response ? measuredResponse(options.response) : modelResponse(options.config, rate);
  const periods = periodsFor(options, rate);
  const roundedLimit = new Float32Array([limit]);
  if (roundedLimit[0] > limit) new Uint32Array(roundedLimit.buffer)[0]--;
  const pcmLimit = roundedLimit[0];
  const original = resample(path, GRID);
  const targets = options.preserveTiming ? [original] : [uniform, [uniform[0], ...uniform.slice(1).reverse()], original];
  const pool = [];
  const fitShape = !options.preserveTiming && options.search !== "quick";
  const coarseTarget = uniform.filter((_, i) => i % 2 === 0);
  for (const target of targets) {
    const spec = spectrum(target);
    for (const period of periods) {
      const count = Math.min(HARMONICS, Math.floor((period - 1) / 2));
      const transfer = Array.from({ length: count }, (_, k) => response(rate * (k + 1) / period));
      if (!transfer.some((h) => h.xRe || h.xIm || h.yRe || h.yIm)) continue;
      const tones = initialTones(transfer, spec, limit);
      const output = predicted(tones, transfer, BASIS);
      const score2 = trackCost(output, target, size);
      const shapeError = fitShape ? shapeMetrics(output.filter((_, i) => i % 2 === 0), coarseTarget, size).rmsDistance : void 0;
      pool.push({ period, target, transfer, tones, score: score2, shapeError });
    }
  }
  if (!pool.length) throw new RangeError("No calibrated response at the harmonics of the selected period.");
  pool.sort((a, b) => a.score - b.score);
  const seeds = distinctPeriods(pool, 4);
  if (fitShape) {
    seeds.push(...geometricCandidates(pool, seeds, uniform, periods, rate, response, limit));
  }
  let best;
  let bestScore = Infinity;
  for (const seed of seeds) {
    const period = seed.period, basis = gridBasis(seed.tones.length, period);
    const initialCycles = Math.max(3, Math.ceil(0.65 * rate / period));
    const transition = options.response ? null : periodTransition(options.config, rate, period);
    let tones = seed.tones, target = seed.target;
    let previous = Infinity;
    for (let iteration = 0; iteration < 4; iteration++) {
      tones = bounded(tones, basis, limit);
      const cycle = synthesize(tones, basis);
      for (let j = 0; j < period; j++) cycle[j] = Math.max(-pcmLimit, Math.min(pcmLimit, cycle[j]));
      let cycles = initialCycles;
      let closureError = null;
      let trace;
      if (options.response) {
        const actual = tones.map((_, k) => {
          let re = 0, im = 0;
          for (let j = 0; j < period; j++) {
            re += cycle[j] * basis[k].cos[j];
            im -= cycle[j] * basis[k].sin[j];
          }
          return { re: 2 * re / period, im: 2 * im / period };
        });
        trace = predicted(actual, seed.transfer, basis);
      } else {
        const engine = new Simulator(options.config, rate);
        let block = engine.process(cycle);
        const equilibrium = periodicState(transition, engine.getState());
        let consumed = 1;
        for (; ; ) {
          while (consumed < cycles - 1) {
            const batch = Math.min(cycles - consumed - 1, Math.max(1, Math.floor(8192 / period)));
            const samples = new Float32Array(batch * period);
            for (let j = 0; j < batch; j++) samples.set(cycle, j * period);
            engine.process(samples);
            consumed += batch;
          }
          block = engine.process(cycle);
          consumed++;
          closureError = orbitError(engine.getState(), equilibrium);
          if (closureError <= 5e-3 || cycles * period >= 6 * rate) break;
          cycles = Math.min(cycles * 2, Math.ceil(6 * rate / period));
        }
        if (closureError > 5e-3) break;
        const neutral = neutralWallX(options.config.wallDistance);
        trace = Array.from(block.hits, (hit, j) => hit ? { x: block.xy[j * 2] - neutral, y: block.xy[j * 2 + 1] } : { x: NaN, y: NaN });
      }
      const metrics = shapeMetrics(trace, uniform, size);
      const output = resample(trace, GRID);
      const spatialError = outlineError(trace, uniform, metrics);
      const score2 = (fitShape ? spatialError : metrics.rmsDistance) + 0.04 * Math.sqrt(trackCost(output, target, size)) + size * metrics.missFraction;
      if (score2 < bestScore) {
        bestScore = score2;
        const pcm = new Float32Array(cycles * period);
        for (let c = 0; c < cycles; c++) pcm.set(cycle, c * period);
        best = {
          pcm,
          warmupSamples: pcm.length - period,
          closureError,
          periodSamples: period,
          sampleRate: rate,
          frequency: rate / period,
          trace,
          reference: resample(target, period),
          metrics,
          outlineError: spatialError,
          model: options.response ? "measured" : "simulator"
        };
      }
      if (iteration > 0 && score2 >= previous) break;
      previous = score2;
      if (!options.preserveTiming) target = retime(output, seed.target, size);
      const error = output.map((p, j) => Number.isFinite(p.x) ? { x: target[j].x - p.x, y: target[j].y - p.y } : { x: 0, y: 0 });
      const correction = initialTones(seed.transfer.slice(0, HARMONICS), spectrum(error), 0.4 * limit);
      const scale = metrics.missFraction > 0.02 ? 0.65 : 1;
      tones = tones.map((u, k) => ({ re: scale * u.re + 0.75 * (correction[k]?.re ?? 0), im: scale * u.im + 0.75 * (correction[k]?.im ?? 0) }));
    }
  }
  if (!best) throw new Error("The membrane did not settle within six seconds. Increase damping and try again.");
  return best;
}

// src/inverse/tuning.ts
function screenScore(result) {
  const m = result.metrics;
  return m.rmsDistance + 0.5 * m.tolerance * (1 - m.coverage + m.offStroke);
}
function closeEnough(result) {
  const m = result.metrics;
  return m.coverage === 1 && m.offStroke === 0 && m.missFraction === 0 && result.outlineError <= 0.25 * m.tolerance;
}
function tryCandidate(options) {
  try {
    return solveInverse(options);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("did not settle")) throw error;
  }
}
function solveWithTuning(options) {
  const starting = options.config;
  const baseline = { result: solveInverse(options), config: { ...starting } };
  if (options.response || closeEnough(baseline.result)) return baseline;
  const rate = options.sampleRate ?? 48e3;
  const screenRate = options.periodSamples === void 0 ? Math.min(rate, 12e3) : rate;
  const screened = [];
  const visited = /* @__PURE__ */ new Set();
  function screen(tension2, asymmetry, damping) {
    const config = { ...starting, tension: tension2, asymmetry, damping };
    const key = [tension2, asymmetry, damping].join(",");
    if (visited.has(key)) return;
    visited.add(key);
    const result = tryCandidate({ ...options, config, sampleRate: screenRate, search: "quick" });
    if (result) screened.push({ config, score: screenScore(result) });
  }
  const tension = Math.max(0.25, Math.min(4, Math.round(starting.tension * 20) / 20));
  const startingSplit = Math.max(0, Math.min(0.5, Math.round(starting.asymmetry * 100) / 100));
  const startingDamping = Math.max(5e-3, Math.min(0.15, Math.round(starting.damping * 200) / 200));
  screen(tension, startingSplit, startingDamping);
  for (const asymmetry of [0.12, 0.3, 0.5]) {
    for (const damping of [5e-3, 0.025, 0.075, 0.15]) screen(tension, asymmetry, damping);
  }
  screened.sort((a, b) => a.score - b.score);
  for (const { config } of screened.slice(0, 2)) {
    for (const value of [0.25, 0.65, 1.35, 2.5, 4]) screen(value, config.asymmetry, config.damping);
  }
  screened.sort((a, b) => a.score - b.score);
  const leader = screened[0]?.config;
  if (leader) {
    for (const delta of [-0.1, 0.1]) {
      const split = Math.max(0, Math.min(0.5, Math.round((leader.asymmetry + delta) * 100) / 100));
      for (const factor of [Math.SQRT1_2, Math.SQRT2]) {
        const rawStep = Math.round(leader.damping * (factor - 1) * 200);
        const step = rawStep || Math.sign(factor - 1);
        const damping = Math.max(1, Math.min(30, Math.round(leader.damping * 200) + step)) / 200;
        screen(leader.tension, split, damping);
      }
    }
  }
  screened.sort((a, b) => a.score - b.score);
  let best = baseline;
  for (const { config } of screened.slice(0, 2)) {
    if (config.tension === starting.tension && config.damping === starting.damping && config.asymmetry === starting.asymmetry) continue;
    const result = tryCandidate({ ...options, config });
    if (result && result.outlineError < best.result.outlineError) best = { result, config };
  }
  return best;
}

// src/inverse/worker.ts
self.onmessage = ({ data }) => {
  try {
    const { result, config } = data.tune ? solveWithTuning(data) : { result: solveInverse(data), config: data.config };
    self.postMessage({
      type: "done",
      pcm: result.pcm,
      sampleRate: result.sampleRate,
      trace: result.trace,
      coverage: result.metrics.coverage,
      offTarget: result.metrics.offStroke,
      tolerance: result.metrics.tolerance,
      rmsDistance: result.metrics.rmsDistance,
      config,
      periodHz: result.frequency
    }, { transfer: [result.pcm.buffer] });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Could not fit the drawing." });
  }
};
