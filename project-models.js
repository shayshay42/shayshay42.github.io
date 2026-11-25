import * as THREE from './assets/vendor/three.module.js';
import { CHROME_TREX, CHROME_CACTUS } from './assets/projects/chrome-runner-mask.js';

// Project logos built as solid objects. Published brand marks guide the
// chameleon and branches; Chromium pixel masks retain their source attribution.
export function createProjectLogo(kind) {
  if (kind === 'readtheroom') return createChameleon();
  if (kind === 'rizome') return createRizome();
  if (kind === 'mol-cgl') return createMolecularLife();
  if (kind === 'voice-laser-lab') return createVoiceLaserLab();
  if (kind === 'stereogram-runner') return createStereogramRunner();
  if (kind === 'cliqity') return createFinch();
  throw new Error(`Unknown project logo: ${kind}`);
}

function enamel(color, roughness = 0.34, metalness = 0.12) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(group, geometry, material, name) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createFinch() {
  const group = new THREE.Group();
  group.name = 'Finch by Cliqity';
  const url = new URL('./assets/projects/finch-wire.json', import.meta.url);
  group.userData.ready = new THREE.BufferGeometryLoader().loadAsync(url.href).then(geometry => {
    geometry.center();
    const wire = addMesh(group, geometry, enamel('#545f70', 0.17, 0.86), 'Finch wire and eye');
    wire.scale.setScalar(0.94);
  });
  return group;
}

function relief(group, shape, material, name, z, depth, bevel = 0.018, curveSegments = 14) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
  });
  const mesh = addMesh(group, geometry, material, name);
  mesh.position.z = z;
  return mesh;
}

// Coordinates follow the source mark; conversion puts the relief in a compact,
// y-up space and lets the hand-drawn bezier contours stay legible here.
function outline(draw, origin = [435, 435], scale = 370) {
  const shape = new THREE.Shape();
  const x = value => (value - origin[0]) / scale;
  const y = value => (origin[1] - value) / scale;
  draw({
    M: (a, b) => shape.moveTo(x(a), y(b)),
    L: (a, b) => shape.lineTo(x(a), y(b)),
    C: (a, b, c, d, e, f) => shape.bezierCurveTo(x(a), y(b), x(c), y(d), x(e), y(f)),
    Q: (a, b, c, d) => shape.quadraticCurveTo(x(a), y(b), x(c), y(d)),
    Z: () => shape.closePath(),
  });
  return shape;
}

function createChameleon() {
  const group = new THREE.Group();
  group.name = 'Read the Room — chameleon enamel logo';
  const teal = enamel('#17b6b1');
  const edge = enamel('#129d9a', 0.32, 0.2);
  const mint = enamel('#87e3b1');
  const yellow = enamel('#ffdf5b');
  const coral = enamel('#ff9369');
  const lens = enamel('#ffb833', 0.24, 0.16);
  const smile = enamel('#172b28', 0.5, 0);

  const silhouette = outline(p => {
    p.M(397, 130);
    p.C(397, 98, 384, 62, 414, 44);
    p.C(461, 9, 605, 118, 692, 207);
    p.C(713, 158, 742, 147, 769, 156);
    p.C(810, 169, 814, 205, 797, 253);
    p.L(771, 305);
    p.C(789, 329, 810, 357, 802, 382);
    p.C(786, 444, 692, 475, 585, 459);
    p.C(665, 560, 635, 708, 536, 782);
    p.C(437, 861, 267, 822, 164, 712);
    p.C(70, 616, 39, 523, 70, 391);
    p.C(108, 227, 221, 129, 373, 128);
    p.Z();
  });
  relief(group, silhouette, edge, 'Rounded chameleon silhouette and teal edge', -0.12, 0.22, 0.032);

  let patchLevel = 0.108;
  const patch = (name, material, draw, z) => {
    // Give overlapping color fields distinct front planes, avoiding z-fighting.
    const layer = z ?? (patchLevel += 0.005);
    return relief(group, outline(draw), material, name, layer, 0.014, 0.007);
  };

  // Large smooth color fields follow the same continuous outline. Small raised
  // lips make the colored regions read as a friendly enamel object in side view.
  patch('Coral shoulder and outer back', coral, p => {
    p.M(181, 195); p.C(127, 239, 88, 307, 71, 392);
    p.C(46, 507, 67, 598, 144, 681);
    p.C(151, 611, 215, 520, 273, 413);
    p.C(287, 389, 273, 367, 259, 333); p.Z();
  });
  patch('Yellow stripe across the back', yellow, p => {
    p.M(131, 244); p.L(218, 265); p.C(245, 311, 261, 345, 275, 380);
    p.C(285, 401, 270, 428, 236, 469); p.L(74, 366);
    p.C(87, 320, 109, 278, 131, 244); p.Z();
  });
  patch('Mint shoulder', mint, p => {
    p.M(183, 194); p.C(234, 151, 304, 132, 371, 130);
    p.L(382, 216); p.C(373, 286, 386, 374, 416, 435);
    p.C(365, 440, 314, 466, 289, 516);
    p.C(287, 466, 269, 442, 275, 414);
    p.C(297, 385, 216, 269, 183, 194); p.Z();
  });
  patch('Yellow lower body', yellow, p => {
    p.M(181, 713); p.C(234, 760, 330, 817, 437, 815);
    p.C(495, 814, 555, 777, 583, 725);
    p.L(498, 676); p.C(393, 781, 286, 747, 209, 669); p.Z();
  });
  patch('Coral lower body', coral, p => {
    p.M(267, 615); p.C(321, 658, 397, 686, 503, 669);
    p.L(446, 790); p.C(360, 786, 267, 758, 190, 697);
    p.C(213, 657, 234, 622, 267, 615); p.Z();
  });
  patch('Mint stripe below tail', mint, p => {
    p.M(321, 672); p.L(381, 697); p.L(326, 804);
    p.C(310, 800, 293, 794, 280, 786); p.Z();
  });
  patch('Mint tail outer curl', mint, p => {
    p.M(438, 815); p.C(571, 799, 647, 665, 584, 555);
    p.C(554, 578, 522, 613, 500, 644);
    p.C(477, 693, 449, 754, 438, 815); p.Z();
  });

  // The casque is a separate gently rounded coral crown behind the glasses.
  patch('Coral chameleon crown', coral, p => {
    p.M(402, 205); p.C(400, 167, 391, 109, 398, 72);
    p.C(407, 18, 447, 39, 485, 60);
    p.C(559, 101, 637, 160, 688, 210);
    p.L(630, 247); p.L(490, 229);
    p.C(447, 221, 411, 221, 402, 205); p.Z();
  }, 0.128);

  patch('Yellow cheek and rounded snout', yellow, p => {
    p.M(374, 167); p.C(350, 211, 343, 263, 356, 314);
    p.C(363, 361, 386, 403, 416, 436);
    p.C(486, 428, 529, 464, 594, 460);
    p.C(691, 467, 773, 446, 793, 397);
    p.C(819, 363, 774, 319, 747, 278);
    p.L(718, 237); p.C(707, 216, 677, 223, 651, 235);
    p.L(487, 245); p.L(391, 231);
    p.C(379, 229, 377, 197, 374, 167); p.Z();
  }, 0.142);

  // Build the tail as one continuous thick spiral ribbon. Its exposed outside
  // and raised coil keep the defining curl readable even in a small card.
  const tailShape = outline(p => {
    p.M(419, 438);
    p.C(335, 428, 263, 499, 264, 588);
    p.C(264, 662, 318, 719, 391, 720);
    p.C(456, 724, 510, 681, 510, 626);
    p.C(512, 578, 483, 542, 443, 538);
    p.C(405, 532, 369, 557, 368, 593);
    p.C(366, 618, 384, 636, 409, 637);
    p.L(417, 614);
    p.C(403, 614, 398, 604, 403, 592);
    p.C(410, 571, 439, 576, 453, 595);
    p.C(477, 629, 455, 673, 418, 683);
    p.C(356, 699, 307, 651, 306, 591);
    p.C(304, 522, 352, 473, 419, 470);
    p.Z();
  });
  relief(group, tailShape, mint, 'Raised continuous spiral tail', 0.16, 0.026, 0.019);
  patch('Golden half of the tail curl', yellow, p => {
    p.M(420, 470); p.C(498, 464, 552, 507, 581, 554);
    p.L(510, 633); p.C(510, 573, 484, 542, 443, 538);
    p.C(435, 536, 427, 537, 419, 540); p.Z();
  }, 0.165);
  patch('Golden inner tail tip', yellow, p => {
    p.M(419, 580); p.C(441, 575, 457, 596, 460, 615);
    p.C(467, 650, 447, 675, 418, 683); p.L(401, 685);
    p.L(414, 617); p.C(418, 608, 418, 594, 419, 580); p.Z();
  }, 0.196);

  // The two lenses and turquoise frames are rounded solids, raised above the
  // head. Their slight asymmetry preserves the character of the source mark.
  const eye = (cx, cy, rx, ry, z, name) => {
    const shape = new THREE.Shape();
    shape.absellipse((cx - 435) / 370, (435 - cy) / 370, rx / 370, ry / 370, 0, Math.PI * 2, false, 0);
    relief(group, shape, lens, `${name} amber lens`, z, 0.025, 0.013);
    const points = [];
    for (let i = 0; i <= 72; i++) {
      const t = i / 72 * Math.PI * 2;
      points.push(new THREE.Vector3((cx - 435 + Math.cos(t) * rx) / 370, (435 - cy + Math.sin(t) * ry) / 370, z + 0.025));
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    addMesh(group, new THREE.TubeGeometry(curve, 72, 0.025, 8, false), teal, `${name} turquoise round frame`);
  };
  eye(752, 217, 47, 58, 0.19, 'Far');
  const tube = (name, coordinates, material, radius, z) => {
    const points = coordinates.map(([x, y]) => new THREE.Vector3((x - 435) / 370, (435 - y) / 370, z));
    const curve = new THREE.CatmullRomCurve3(points);
    addMesh(group, new THREE.TubeGeometry(curve, 40, radius, 10, false), material, name);
    for (const point of [points[0], points.at(-1)]) {
      const end = addMesh(group, new THREE.SphereGeometry(radius, 12, 8), material, `${name} rounded end`);
      end.position.copy(point);
    }
  };
  tube('Turquoise glasses arm', [[383, 139], [390, 218], [445, 229], [490, 236]], teal, 0.027, 0.22);
  tube('Turquoise glasses bridge', [[634, 230], [672, 216], [704, 212]], teal, 0.027, 0.23);
  eye(568, 253, 76, 80, 0.235, 'Near');
  tube('Friendly curved smile', [[568, 376], [611, 396], [673, 404], [736, 397], [789, 376]], smile, 0.021, 0.195);

  // Center the visual weight rather than its asymmetric snout.
  group.position.set(0, 0, 0);
  return group;
}

function createRizome() {
  const group = new THREE.Group();
  group.name = 'Rizome — branching ivory enamel medallion';
  const sand = enamel('#d5b68c', 0.47, 0.1);
  const rim = enamel('#b99262', 0.34, 0.3);
  const ivory = enamel('#fffaf0', 0.34, 0.1);
  const disc = new THREE.Shape();
  disc.absarc(0, 0, 1.005, 0, Math.PI * 2, false);
  relief(group, disc, rim, 'Rounded warm-gold medallion edge', -0.125, 0.2, 0.035, 64);
  const face = new THREE.Shape();
  face.absarc(0, 0, 0.991, 0, Math.PI * 2, false);
  relief(group, face, sand, 'Tan enamel face', 0.087, 0.019, 0.018, 64);

  const ring = (radius, thickness, name) => {
    const mesh = addMesh(group, new THREE.TorusGeometry(radius, thickness, 10, 100), ivory, name);
    mesh.position.z = 0.142;
  };
  ring(0.908, 0.027, 'Ivory circular boundary');
  ring(0.205, 0.043, 'Ivory central opening');

  // Branches reproduce the actual asymmetric radial/root motif. Every curved
  // stroke is a small round raised tube; endpoints are softly capped.
  const branch = (name, points, radius = 0.016) => {
    const vectors = points.map(([x, y]) => new THREE.Vector3((x - 256) / 210, (256 - y) / 210, 0.14));
    const curve = new THREE.CatmullRomCurve3(vectors);
    addMesh(group, new THREE.TubeGeometry(curve, 28, radius, 8, false), ivory, name);
    for (const position of [vectors[0], vectors.at(-1)]) {
      const cap = addMesh(group, new THREE.SphereGeometry(radius, 10, 8), ivory, `${name} rounded tip`);
      cap.position.copy(position);
    }
  };
  branch('North root', [[257, 212], [258, 165], [258, 132], [259, 96]], 0.018);
  branch('Northwest fork', [[257, 151], [242, 139], [225, 122]], 0.014);
  branch('Northeast fork', [[258, 168], [286, 140], [300, 112]], 0.015);
  branch('Upper right root', [[291, 219], [316, 190], [329, 166], [335, 128]], 0.016);
  branch('Upper right fork', [[321, 184], [344, 170], [362, 148]], 0.016);
  branch('West crown root', [[227, 218], [201, 192], [188, 160], [177, 125]], 0.017);
  branch('West crown fork', [[202, 194], [173, 181], [149, 161]], 0.016);
  branch('Western root', [[208, 263], [162, 262], [133, 251], [108, 239]], 0.017);
  branch('West fork up', [[185, 262], [174, 244], [163, 231]], 0.015);
  branch('West fork down', [[158, 263], [138, 278], [110, 289]], 0.016);
  branch('Southwest root', [[219, 284], [188, 314], [177, 342], [158, 367]], 0.016);
  branch('Southwest fork', [[189, 313], [155, 319], [128, 332]], 0.016);
  branch('Southern root', [[252, 302], [249, 339], [238, 374], [232, 405]], 0.018);
  branch('Southern fork', [[250, 336], [272, 365], [290, 401]], 0.016);
  branch('Southeast root', [[289, 292], [311, 321], [320, 354], [336, 386]], 0.016);
  branch('Southeast fork', [[311, 321], [342, 341], [373, 351]], 0.016);
  branch('Eastern root', [[305, 263], [335, 263], [369, 279], [405, 290]], 0.018);
  branch('East upper fork', [[333, 263], [364, 247], [406, 238]], 0.017);
  branch('East crown fork', [[348, 256], [365, 221], [390, 197]], 0.016);

  for (const [x, y] of [[134, 205], [354, 310], [206, 367]]) {
    const dot = addMesh(group, new THREE.SphereGeometry(0.044, 20, 12), ivory, 'Ivory orbit dot');
    dot.scale.z = 0.55;
    dot.position.set((x - 256) / 210, (256 - y) / 210, 0.138);
  }
  return group;
}

function createMolecularLife() {
  const group = new THREE.Group();
  group.name = 'Molecular Game of Life — molecule becoming an enamel glider';
  const carbon = enamel('#344a43', 0.28, 0.18);
  const oxygen = enamel('#ba3735', 0.24, 0.18);
  const hydrogen = enamel('#fff8e8', 0.3, 0.1);
  const bond = enamel('#a7aea3', 0.3, 0.48);
  const paper = enamel('#f0e7d6', 0.42, 0.1);
  const empty = enamel('#e0d6c3', 0.48, 0.08);
  const live = enamel('#b83735', 0.28, 0.14);

  const atom = (point, radius, material, name) => {
    const mesh = addMesh(group, new THREE.SphereGeometry(radius, 32, 24), material, name);
    mesh.position.copy(point);
    return mesh;
  };
  const connect = (a, b, radius = 0.068) => {
    const direction = b.clone().sub(a);
    const mesh = addMesh(group, new THREE.CylinderGeometry(radius, radius, direction.length(), 20), bond, 'Rounded molecular bond');
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  };

  // A small ball-and-stick ring with an oxygen branch reads clearly at card
  // size. The changing depth makes the molecule a solid object from every tilt.
  const center = new THREE.Vector3(-0.93, 0.05, 0.07);
  const ring = Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 6 + i * Math.PI / 3;
    return new THREE.Vector3(center.x + 0.54 * Math.cos(angle), center.y + 0.54 * Math.sin(angle), center.z + (i % 2 ? -0.05 : 0.1));
  });
  ring.forEach((point, i) => connect(point, ring[(i + 1) % ring.length]));
  ring.forEach((point, i) => {
    atom(point, 0.2, carbon, 'Green enamel carbon atom');
    // Keep the right side open so the change from atoms to cells has room.
    if (i === 0 || i === 5) return;
    const direction = point.clone().sub(center).normalize();
    const tip = point.clone().addScaledVector(direction, i === 1 ? 0.43 : 0.36);
    connect(point, tip, 0.052);
    atom(tip, i === 1 ? 0.19 : 0.125, i === 1 ? oxygen : hydrogen,
      i === 1 ? 'Red enamel oxygen atom' : 'Cream enamel hydrogen atom');
  });

  const roundedSquare = (width, radius) => {
    const shape = new THREE.Shape();
    const h = width / 2;
    shape.moveTo(-h + radius, -h);
    shape.lineTo(h - radius, -h);
    shape.quadraticCurveTo(h, -h, h, -h + radius);
    shape.lineTo(h, h - radius);
    shape.quadraticCurveTo(h, h, h - radius, h);
    shape.lineTo(-h + radius, h);
    shape.quadraticCurveTo(-h, h, -h, h - radius);
    shape.lineTo(-h, -h + radius);
    shape.quadraticCurveTo(-h, -h, -h + radius, -h);
    shape.closePath();
    return shape;
  };

  const board = new THREE.Group();
  board.name = 'Five raised cells forming a Conway glider';
  board.position.set(1.03, -0.05, 0.02);
  board.rotation.set(0.07, 0.08, 0.045);
  group.add(board);
  relief(board, roundedSquare(1.48, 0.14), paper, 'Rounded cream enamel grid plate', -0.1, 0.11, 0.025);
  const glider = new Set(['0,1', '1,2', '2,0', '2,1', '2,2']);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const alive = glider.has(`${row},${column}`);
      const cell = relief(board, roundedSquare(0.375, 0.045), alive ? live : empty,
        alive ? 'Raised red live cell' : 'Recessed empty grid cell', alive ? 0.035 : 0.016, alive ? 0.125 : 0.015, alive ? 0.024 : 0.008);
      cell.position.x = (column - 1) * 0.43;
      cell.position.y = (1 - row) * 0.43;
    }
  }

  // The intermediate sphere and rounded cube link the two visual languages.
  atom(new THREE.Vector3(-0.11, 0.12, 0.16), 0.10, oxygen, 'Atom transitioning into a live cell');
  const transition = relief(group, roundedSquare(0.16, 0.035), live, 'Small enamel cell between molecule and grid', 0.065, 0.13, 0.012);
  transition.position.set(0.14, 0.12, 0.065);
  transition.rotation.z = -0.12;
  return group;
}

function createVoiceLaserLab() {
  const group = new THREE.Group();
  group.name = 'Voice Laser Lab — a laser drawing sound on an enamel board';
  const cream = enamel('#f6efe0', 0.44, 0.04);
  const edge = enamel('#d9c9ac', 0.45, 0.08);
  const metal = enamel('#5e6966', 0.38, 0.3);
  const silver = enamel('#d1dad6', 0.27, 0.55);
  const red = enamel('#c33c3e', 0.3, 0.1);
  const coral = enamel('#ce6c7a', 0.36, 0.06);
  const mouthDark = enamel('#6d3542', 0.55, 0);
  const teal = enamel('#3c8882', 0.37, 0.08);
  const beam = new THREE.MeshBasicMaterial({ color: '#e8554e', toneMapped: false });

  const roundedRect = (width, height, radius) => {
    const shape = new THREE.Shape();
    const x = width / 2, y = height / 2;
    shape.moveTo(-x + radius, -y);
    shape.lineTo(x - radius, -y); shape.quadraticCurveTo(x, -y, x, -y + radius);
    shape.lineTo(x, y - radius); shape.quadraticCurveTo(x, y, x - radius, y);
    shape.lineTo(-x + radius, y); shape.quadraticCurveTo(-x, y, -x, y - radius);
    shape.lineTo(-x, -y + radius); shape.quadraticCurveTo(-x, -y, -x + radius, -y);
    return shape;
  };
  const block = (parent, name, width, height, depth, z, material, radius = 0.07) =>
    relief(parent, roundedRect(width, height, radius), material, name, z, depth, 0.016, 10);
  const rod = (parent, name, a, b, radius, material) => {
    const direction = b.clone().sub(a);
    const mesh = addMesh(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), 18), material, name);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  };
  const curve = (parent, name, points, radius, material, closed = false) =>
    addMesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, 'centripetal'),
      Math.max(32, points.length), radius, 8, closed), material, name);

  const board = new THREE.Group();
  board.name = 'Cream board with a red oscilloscope trace';
  board.position.set(0.65, 0.08, -0.06);
  group.add(board);
  block(board, 'Slim warm edge of the board', 2.2, 1.78, 0.12, -0.06, edge, 0.11);
  block(board, 'Plain cream enamel board face', 2.1, 1.68, 0.045, 0.065, cream, 0.085);
  const pointOnTrace = t => new THREE.Vector3(0.78 * Math.sin(2 * t), 0.59 * Math.sin(3 * t),
    0.155 + 0.005 * Math.cos(t));
  const trace = Array.from({ length: 192 }, (_, i) => pointOnTrace(i / 192 * Math.PI * 2));
  curve(board, 'Raised red 2-to-3 Lissajous trace', trace, 0.027, red, true);

  // The light travels directly from the short laser pointer to the red trace.
  group.updateMatrixWorld(true);
  const target = board.localToWorld(pointOnTrace(3 * Math.PI / 4));
  const aperture = new THREE.Vector3(-0.94, -0.48, 0.57);
  const direction = target.clone().sub(aperture).normalize();
  const rear = aperture.clone().addScaledVector(direction, -0.49);
  rod(group, 'Compact graphite laser pointer', rear, aperture, 0.105, metal);
  rod(group, 'Silver laser collar', aperture.clone().addScaledVector(direction, -0.10), aperture, 0.108, silver);
  rod(group, 'Red laser aperture', aperture, aperture.clone().addScaledVector(direction, 0.012), 0.055, red);
  const ray = rod(group, 'Single red laser beam to the board', aperture, target, 0.014, beam);
  const spot = addMesh(group, new THREE.SphereGeometry(0.038, 16, 12), beam, 'Light spot on the red trace');
  spot.position.copy(target);
  group.userData.beam = { start: aperture.toArray(), end: target.toArray(), mesh: ray.uuid };

  // A small group of voice symbols stays clear of the beam and drawing area.
  const lips = new THREE.Group();
  lips.name = 'Tiny mouth icon';
  lips.position.set(-1.48, 0.46, 0.1);
  lips.rotation.z = 0.08;
  group.add(lips);
  const lipShape = new THREE.Shape();
  lipShape.moveTo(-0.28, 0);
  lipShape.bezierCurveTo(-0.19, 0.07, -0.1, 0.16, 0, 0.075);
  lipShape.bezierCurveTo(0.1, 0.16, 0.19, 0.07, 0.28, 0);
  lipShape.bezierCurveTo(0.16, -0.15, -0.16, -0.15, -0.28, 0);
  lipShape.closePath();
  relief(lips, lipShape, coral, 'Soft coral lips', 0, 0.07, 0.01, 16);
  const slit = new THREE.Shape();
  slit.moveTo(-0.235, 0.002);
  slit.quadraticCurveTo(0, -0.015, 0.235, 0.002);
  slit.quadraticCurveTo(0, -0.077, -0.235, 0.002);
  relief(lips, slit, mouthDark, 'Small opening between the lips', 0.075, 0.008, 0.002, 12);

  const note = new THREE.Group();
  note.name = 'Tiny music note icon';
  note.position.set(-1.02, 0.84, 0.14);
  note.rotation.z = -0.12;
  group.add(note);
  const head = addMesh(note, new THREE.SphereGeometry(0.09, 20, 12), teal, 'Oval music note head');
  head.scale.set(1.28, 0.8, 0.5);
  head.position.set(-0.035, -0.13, 0.035);
  head.rotation.z = 0.22;
  rod(note, 'Music note stem', new THREE.Vector3(0.06, -0.13, 0.035),
    new THREE.Vector3(0.06, 0.27, 0.035), 0.021, teal);
  const flag = new THREE.Shape();
  flag.moveTo(0.055, 0.28);
  flag.bezierCurveTo(0.12, 0.24, 0.27, 0.19, 0.15, 0.045);
  flag.bezierCurveTo(0.2, 0.16, 0.1, 0.18, 0.055, 0.17);
  flag.closePath();
  relief(note, flag, teal, 'Curved eighth-note flag', 0.005, 0.055, 0.006, 12);

  const megaphone = new THREE.Group();
  megaphone.name = 'Tiny megaphone icon';
  megaphone.position.set(-0.83, 0.34, 0.15);
  megaphone.rotation.z = 0.13;
  group.add(megaphone);
  const horn = new THREE.Shape();
  horn.moveTo(-0.22, -0.065); horn.lineTo(-0.22, 0.065);
  horn.lineTo(0.14, 0.19); horn.lineTo(0.14, -0.19); horn.closePath();
  relief(megaphone, horn, teal, 'Flared teal megaphone', 0, 0.075, 0.01, 8);
  const handle = new THREE.Shape();
  handle.moveTo(-0.13, -0.05); handle.lineTo(-0.05, -0.05);
  handle.lineTo(-0.08, -0.26); handle.lineTo(-0.16, -0.26); handle.closePath();
  relief(megaphone, handle, metal, 'Short megaphone handle', 0.005, 0.055, 0.008, 8);
  rod(megaphone, 'Cream megaphone rim', new THREE.Vector3(0.15, -0.185, 0.05),
    new THREE.Vector3(0.15, 0.185, 0.05), 0.025, cream);
  for (const radius of [0.12, 0.19]) {
    const points = Array.from({length: 18}, (_, i) => {
      const angle = -0.72 + i / 17 * 1.44;
      return new THREE.Vector3(0.18 + radius * Math.cos(angle), radius * Math.sin(angle), 0.045);
    });
    curve(megaphone, 'Small megaphone sound arc', points, 0.009, teal);
  }
  return group;
}

function createStereogramRunner() {
  const group = new THREE.Group();
  group.name = 'Stereogram Runner — Chromium pixel runner in front of a stereogram';
  const layers = new THREE.Group();
  layers.rotation.set(0.22, -0.22, 0);
  group.add(layers);
  const paper = enamel('#f5f2e9', 0.68, 0.03);
  const edge = enamel('#d5d4c9', 0.65, 0.06);
  const graphite = enamel('#515452', 0.68, 0.02);
  const ivory = enamel('#fffffa', 0.65, 0);
  const ground = enamel('#777972', 0.7, 0);

  const board = addMesh(layers, new THREE.BoxGeometry(3.26, 2.06, 0.09), edge,
    'Thin stereogram backing');
  board.position.set(0.32, 0.17, -0.62);
  const mat = addMesh(layers, new THREE.BoxGeometry(3.22, 2.02, 0.035), paper,
    'Ivory border around the stereogram print');
  mat.position.set(0.32, 0.17, -0.56);

  // This image encodes binocular correspondences for the same dinosaur mask.
  // The source image remains viewable flat, independently of this tilted card.
  let texture;
  group.userData.ready = new Promise((resolve, reject) => {
    texture = new THREE.TextureLoader().load(
      new URL('./assets/projects/stereogram-texture.png', import.meta.url).href,
      resolve, undefined, reject,
    );
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const print = addMesh(layers, new THREE.PlaneGeometry(3.08, 1.925),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    'Real parallel-view stereogram with a hidden pixel dinosaur');
  print.position.set(0.32, 0.17, -0.54);

  const pixelBox = new THREE.BoxGeometry(1, 1, 1);
  function pixelRuns(parent, rows, unit, depth, material, name, z) {
    const runs = [];
    for (let y = 0; y < rows.length; y++) {
      for (const match of rows[y].matchAll(/#+/g)) {
        runs.push({ x: match.index, y, length: match[0].length });
      }
    }
    const mesh = new THREE.InstancedMesh(pixelBox, material, runs.length);
    mesh.name = name;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    runs.forEach(({x, y, length}, i) => {
      matrix.compose(
        new THREE.Vector3((x + length / 2 - rows[0].length / 2) * unit,
          (rows.length / 2 - y - 0.5) * unit, z),
        rotation, new THREE.Vector3(length * unit, unit, depth),
      );
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
    return mesh;
  }
  function border(rows) {
    const output = Array.from({length: rows.length + 2}, () => Array(rows[0].length + 2).fill('.'));
    rows.forEach((row, y) => [...row].forEach((pixel, x) => {
      if (pixel !== '#') return;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        output[y + dy + 1][x + dx + 1] = '#';
      }
    }));
    return output.map(row => row.join(''));
  }
  function sprite(rows, unit, x, y, name) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, 0.62);
    pixelRuns(object, border(rows), unit, 0.065, ivory, `${name} ivory edge`, -0.105);
    pixelRuns(object, rows, unit, 0.15, graphite, `${name} exact pixel silhouette`, 0);
    layers.add(object);
    return object;
  }
  const rex = sprite(CHROME_TREX, 0.038, -0.75, -0.08, 'Chrome runner T-Rex');
  // Preserve the sprite's small square eye as ivory rather than a view through it.
  const eye = addMesh(rex, new THREE.BoxGeometry(0.076, 0.076, 0.15), ivory, 'Square dinosaur eye');
  eye.position.set((27 - 22) * 0.038, (23.5 - 6) * 0.038, 0);
  sprite(CHROME_CACTUS, 0.028, 0.62, -0.47, 'Chrome runner cactus');

  const horizon = addMesh(layers, new THREE.BoxGeometry(2.95, 0.018, 0.08), ground,
    'Pixel runner ground line');
  horizon.position.set(-0.18, -0.94, 0.62);
  [[-1.43, 0.13], [-1.06, 0.07], [-0.47, 0.1], [0.16, 0.08], [0.9, 0.12]].forEach(([x, width], i) => {
    const dash = addMesh(layers, new THREE.BoxGeometry(width, 0.018, 0.055), ground,
      'Small pixel ground dash');
    dash.position.set(x, -1.015 - (i % 2) * 0.04, 0.62);
  });
  return group;
}
