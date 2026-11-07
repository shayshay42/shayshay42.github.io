// src/physics/engine.ts
var DEFAULT_CONFIG = {
  gain: 1,
  tension: 1,
  damping: 0.03,
  asymmetry: 0.12,
  wallDistance: 2
};
var MODEL_VERSION = "membrane-six-mode-v1";
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
  const dot = DX * nx + DY * ny + DZ * nz;
  if (Math.abs(dot) < 1e-12) return;
  const t = ((cx - TOY.laserPosition[0]) * nx + (cy - TOY.laserPosition[1]) * ny + (cz - TOY.laserPosition[2]) * nz) / dot;
  if (t <= 0 || !Number.isFinite(t)) return;
  const hx = TOY.laserPosition[0] + DX * t;
  const hy = TOY.laserPosition[1] + DY * t;
  const hz = TOY.laserPosition[2] + DZ * t;
  if ((hx - cx) ** 2 + (hy - cy) ** 2 + (hz - cz) ** 2 > TOY.mirrorRadius ** 2) return;
  result.mirrorHit = true;
  result.hx = hx;
  result.hy = hy;
  result.hz = hz;
  const rx = DX - 2 * dot * nx;
  const ry = DY - 2 * dot * ny;
  const rz = DZ - 2 * dot * nz;
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
  constructor(config = DEFAULT_CONFIG, sampleRate2 = 48e3, initialState) {
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
    if (!Number.isFinite(sampleRate2) || sampleRate2 < 8e3 || sampleRate2 > 384e3) {
      throw new RangeError("Sample rate must be between 8000 and 384000 Hz.");
    }
    this.config = { ...config };
    this.sampleRate = sampleRate2;
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

// src/session/wav.ts
function validateSampleRate(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 4294967295 / 4) {
    throw new Error("Audio sample rate must be a positive integer.");
  }
}

// src/session/replay.ts
var CONFIG_KEYS = Object.keys(DEFAULT_CONFIG);
function validateSessionMetadata(value) {
  if (!isRecord(value)) throw new Error("Session metadata must be an object.");
  if (value.modelVersion !== MODEL_VERSION) {
    throw new Error(`Unsupported model version ${String(value.modelVersion)}. This app uses ${MODEL_VERSION}.`);
  }
  validateSampleRate(value.sampleRate);
  if (value.sampleRate < 8e3 || value.sampleRate > 384e3) {
    throw new Error("Session sample rate must be between 8000 and 384000 Hz.");
  }
  if (!Number.isSafeInteger(value.sampleCount) || value.sampleCount < 0) {
    throw new Error("Session sample count must be a non-negative integer.");
  }
  validateConfig2(value.initialConfig, false);
  let config = value.initialConfig;
  validateConfig(config);
  if (!isRecord(value.initialState) || !Number.isSafeInteger(value.initialState.sampleIndex) || value.initialState.sampleIndex < 0) {
    throw new Error("Session starting state has an invalid sample index.");
  }
  for (const field of ["q", "v"]) {
    const items = value.initialState[field];
    if (!Array.isArray(items) || items.length !== 6 || !items.every(Number.isFinite)) {
      throw new Error(`Session starting state must contain six finite ${field} values.`);
    }
  }
  const start = value.initialState.sampleIndex;
  const end = start + value.sampleCount;
  if (!Number.isSafeInteger(end)) throw new Error("Session sample range is too large.");
  if (!Array.isArray(value.parameterEvents)) throw new Error("Session parameter events must be an array.");
  let previous = start;
  for (const event of value.parameterEvents) {
    if (!isRecord(event) || !Number.isSafeInteger(event.sampleIndex) || event.sampleIndex < previous || event.sampleIndex > end) {
      throw new Error("Session parameter events must be ordered sample boundaries within the recording.");
    }
    validateConfig2(event.patch, true);
    config = { ...config, ...event.patch };
    validateConfig(config);
    previous = event.sampleIndex;
  }
}
function validateSession(session) {
  validateSessionMetadata(session.metadata);
  if (!(session.pcm instanceof Float32Array) || session.pcm.length !== session.metadata.sampleCount) {
    throw new Error("Session PCM length does not match its sample count.");
  }
  for (let i = 0; i < session.pcm.length; i++) {
    if (!Number.isFinite(session.pcm[i])) throw new Error(`Session audio sample ${i} is not finite.`);
  }
}
var SessionReplayer = class {
  constructor(session) {
    this.offset = 0;
    this.eventIndex = 0;
    validateSession(session);
    this.session = session;
    this.currentConfig = { ...session.metadata.initialConfig };
    this.simulator = new Simulator(this.currentConfig, session.metadata.sampleRate, session.metadata.initialState);
    this.applyEvents();
  }
  get position() {
    return this.offset;
  }
  get done() {
    return this.offset === this.session.pcm.length;
  }
  get config() {
    return { ...this.currentConfig };
  }
  processNext(maxFrames = 4096) {
    if (!Number.isSafeInteger(maxFrames) || maxFrames < 1) throw new Error("Replay block size must be a positive integer.");
    if (this.done) return null;
    const count = Math.min(maxFrames, this.session.pcm.length - this.offset);
    const startSample = this.session.metadata.initialState.sampleIndex + this.offset;
    const xy = new Float32Array(count * 2);
    const hits = new Uint8Array(count);
    let written = 0;
    while (written < count) {
      this.applyEvents();
      const nextEvent = this.session.metadata.parameterEvents[this.eventIndex];
      const now = this.session.metadata.initialState.sampleIndex + this.offset;
      const segmentLength = Math.min(count - written, nextEvent ? nextEvent.sampleIndex - now : Infinity);
      const block = this.simulator.process(this.session.pcm.subarray(this.offset, this.offset + segmentLength));
      xy.set(block.xy, written * 2);
      hits.set(block.hits, written);
      this.offset += segmentLength;
      written += segmentLength;
      this.applyEvents();
    }
    return { startSample, count, xy, hits, lastFrame: this.simulator.getFrame() };
  }
  applyEvents() {
    const events = this.session.metadata.parameterEvents;
    const absoluteIndex = this.session.metadata.initialState.sampleIndex + this.offset;
    while (this.eventIndex < events.length && events[this.eventIndex].sampleIndex === absoluteIndex) {
      const { patch } = events[this.eventIndex++];
      this.currentConfig = { ...this.currentConfig, ...patch };
      this.simulator.setConfig(patch);
    }
  }
};
function createSessionReplayer(session) {
  return new SessionReplayer(session);
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateConfig2(value, partial) {
  if (!isRecord(value)) throw new Error("Session parameters must be an object.");
  if (!partial && CONFIG_KEYS.some((key) => !(key in value))) throw new Error("Session parameters are incomplete.");
  for (const [key, item] of Object.entries(value)) {
    if (!CONFIG_KEYS.includes(key) || typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`Invalid session parameter: ${key}.`);
    }
  }
}

// src/audio/processor.ts
var LaserProcessor = class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sim = new Simulator(DEFAULT_CONFIG, sampleRate);
    this.config = { ...DEFAULT_CONFIG };
    this.mode = "idle";
    this.playing = false;
    this.audible = true;
    this.loop = true;
    this.demo = "two-tone";
    this.frequency = 220;
    this.pcm = new Float32Array(0);
    this.position = 0;
    this.replay = null;
    this.recording = null;
    this.recordCount = 0;
    this.blocks = [];
    this.inputBlocks = [];
    this.queued = 0;
    this.port.onmessage = ({ data: message }) => {
      try {
        switch (message.type) {
          case "config": {
            if (this.mode === "replay") break;
            this.sim.setConfig(message.patch);
            this.config = { ...this.config, ...message.patch };
            this.recording?.parameterEvents.push({ sampleIndex: this.sim.getState().sampleIndex, patch: { ...message.patch } });
            this.port.postMessage({ type: "configured", frame: this.sim.getFrame() });
            break;
          }
          case "source": {
            this.finishRecording();
            this.flush();
            this.mode = message.mode;
            this.position = 0;
            this.pcm = message.pcm ?? new Float32Array(0);
            this.demo = message.demo ?? "two-tone";
            this.frequency = message.frequency ?? 220;
            this.sim = new Simulator(this.config, sampleRate);
            this.replay = null;
            this.playing = true;
            this.port.postMessage({ type: "started", mode: this.mode, frame: this.sim.getFrame() });
            break;
          }
          case "replay": {
            this.finishRecording();
            this.flush();
            const session = message.session;
            if (session.metadata.sampleRate !== sampleRate) throw new Error("Replay sample rate differs from the audio device. Export the session for exact headless replay.");
            this.replay = createSessionReplayer(session);
            this.sim = this.replay.simulator;
            this.pcm = session.pcm;
            this.mode = "replay";
            this.position = 0;
            this.playing = true;
            this.port.postMessage({ type: "started", mode: this.mode, frame: this.sim.getFrame() });
            break;
          }
          case "pause":
            this.playing = false;
            this.flush();
            break;
          case "resume":
            if (this.mode !== "idle") this.playing = true;
            break;
          case "monitor":
            this.audible = message.value;
            break;
          case "loop":
            this.loop = message.value;
            break;
          case "record-start": {
            if (!this.playing || this.mode === "replay" || this.recording) break;
            this.flush();
            this.recordCount = 0;
            this.recording = {
              modelVersion: MODEL_VERSION,
              sampleRate,
              initialConfig: { ...this.config },
              initialState: this.sim.getState(),
              parameterEvents: [],
              sampleCount: 0
            };
            this.port.postMessage({ type: "record-started" });
            break;
          }
          case "record-stop":
            this.finishRecording();
            break;
          case "stop": {
            this.finishRecording();
            this.flush();
            this.playing = false;
            this.mode = "idle";
            this.replay = null;
            this.sim = new Simulator(this.config, sampleRate);
            this.port.postMessage({ type: "stopped", frame: this.sim.getFrame() });
            break;
          }
        }
      } catch (error) {
        this.playing = false;
        this.port.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
      }
    };
  }
  finishRecording() {
    if (!this.recording) return;
    this.flush();
    this.recording.sampleCount = this.recordCount;
    this.port.postMessage({ type: "record-finished", metadata: this.recording });
    this.recording = null;
  }
  flush() {
    if (!this.queued) return;
    const xy = new Float32Array(this.queued * 2);
    const hits = new Uint8Array(this.queued);
    let offset = 0;
    for (const block2 of this.blocks) {
      xy.set(block2.xy, offset * 2);
      hits.set(block2.hits, offset);
      offset += block2.count;
    }
    const input = new Float32Array(this.queued);
    offset = 0;
    for (const chunk of this.inputBlocks) {
      input.set(chunk, offset);
      offset += chunk.length;
    }
    let energy = 0;
    for (const sample of input) energy += sample * sample;
    const wave = new Float32Array(96);
    for (let i = 0; i < wave.length; i++) wave[i] = input[Math.floor(i * input.length / wave.length)];
    const block = {
      startSample: this.blocks[0].startSample,
      count: this.queued,
      xy,
      hits,
      lastFrame: this.blocks[this.blocks.length - 1].lastFrame
    };
    const recorded = this.recording ? input : void 0;
    this.port.postMessage({
      type: "trace",
      block,
      recorded,
      wave,
      rms: Math.sqrt(energy / input.length),
      position: this.position / sampleRate,
      duration: this.pcm.length / sampleRate,
      config: this.mode === "replay" ? this.replay?.config : this.config
    }, [xy.buffer, hits.buffer, wave.buffer, ...recorded ? [recorded.buffer] : []]);
    this.blocks = [];
    this.inputBlocks = [];
    this.queued = 0;
  }
  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return true;
    output.fill(0);
    if (!this.playing) return true;
    try {
      const input = new Float32Array(output.length);
      let count = input.length;
      let block = null;
      if (this.mode === "replay" && this.replay) {
        const start = this.replay.position;
        block = this.replay.processNext(input.length);
        count = block?.count ?? 0;
        input.set(this.pcm.subarray(start, start + count));
        this.position = start + count;
      } else {
        for (let i = 0; i < input.length; i++) {
          if (this.mode === "mic") {
            const channels = inputs[0] ?? [];
            let sum = 0;
            for (const channel of channels) sum += channel[i] ?? 0;
            input[i] = channels.length ? sum / channels.length : 0;
          } else if (this.mode === "file") {
            if (this.position >= this.pcm.length) {
              if (this.loop && this.pcm.length) this.position = 0;
              else {
                count = i;
                break;
              }
            }
            input[i] = this.pcm[this.position] ?? 0;
          } else if (this.mode === "demo") {
            const t = this.position / sampleRate;
            if (this.demo === "sine") input[i] = 0.22 * Math.sin(2 * Math.PI * this.frequency * t);
            else if (this.demo === "two-tone") input[i] = 0.2 * Math.sin(2 * Math.PI * this.frequency * t) + 0.2 * Math.sin(2 * Math.PI * this.frequency * 1.5 * t);
            else {
              const s = t % 8;
              input[i] = 0.2 * Math.sin(2 * Math.PI * (80 * s + 0.5 * 65 * s * s));
            }
          }
          this.position++;
        }
        if (count) block = this.sim.process(input.subarray(0, count));
      }
      if (block && count) {
        const actual = input.slice(0, count);
        this.blocks.push(block);
        this.inputBlocks.push(actual);
        this.queued += count;
        if (this.recording) this.recordCount += count;
        if (this.audible && this.mode !== "mic") {
          for (let i = 0; i < count; i++) output[i] = Math.max(-1, Math.min(1, input[i])) * 0.5;
        }
        if (this.queued >= 1024) this.flush();
        if (this.recording && this.recordCount >= sampleRate * 60) this.finishRecording();
      }
      if (count < input.length || this.mode === "replay" && this.replay?.done) {
        this.finishRecording();
        this.flush();
        this.playing = false;
        this.port.postMessage({ type: "ended" });
      }
      return true;
    } catch (error) {
      this.playing = false;
      this.port.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
      return true;
    }
  }
};
registerProcessor("voice-laser", LaserProcessor);
