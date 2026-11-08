import * as THREE from './assets/vendor/three.module.js';

// Original project logos built as solid enamel objects. Published brand marks
// guide the chameleon and branches; the science projects depict their subjects.
export function createProjectLogo(kind) {
  if (kind === 'readtheroom') return createChameleon();
  if (kind === 'rizome') return createRizome();
  if (kind === 'mol-cgl') return createMolecularLife();
  if (kind === 'voice-laser-lab') return createVoiceLaserLab();
  if (kind === 'stereogram-runner') return createStereogramRunner();
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
  group.name = 'Voice Laser Lab — membrane, mirror and enamel laser trace';
  const paper = enamel('#f4ead7', 0.44, 0.06);
  const paperEdge = enamel('#d5c4a3', 0.4, 0.12);
  const pink = enamel('#df829d', 0.3, 0.08);
  const pinkLip = enamel('#c85c81', 0.29, 0.12);
  const silver = enamel('#d9e2e1', 0.16, 0.78);
  const metal = enamel('#626d69', 0.3, 0.55);
  const wood = enamel('#b98a59', 0.44, 0.08);
  const woodEdge = enamel('#936743', 0.45, 0.08);
  const red = enamel('#b73536', 0.26, 0.18);
  const beam = enamel('#ed5552', 0.23, 0.12);
  beam.emissive.set('#b92828');
  beam.emissiveIntensity = 0.3;
  const teal = enamel('#409c94', 0.3, 0.14);

  const roundedRect = (width, height, radius) => {
    const shape = new THREE.Shape();
    const x = width / 2, y = height / 2;
    shape.moveTo(-x + radius, -y);
    shape.lineTo(x - radius, -y);
    shape.quadraticCurveTo(x, -y, x, -y + radius);
    shape.lineTo(x, y - radius);
    shape.quadraticCurveTo(x, y, x - radius, y);
    shape.lineTo(-x + radius, y);
    shape.quadraticCurveTo(-x, y, -x, y - radius);
    shape.lineTo(-x, -y + radius);
    shape.quadraticCurveTo(-x, -y, -x + radius, -y);
    return shape;
  };
  const block = (parent, name, size, position, material, radius = 0.055) => {
    const mesh = relief(parent, roundedRect(size[0], size[1], radius), material,
      name, position[2] - size[2] / 2, size[2], 0.018, 8);
    mesh.position.x = position[0];
    mesh.position.y = position[1];
    return mesh;
  };
  const rod = (parent, name, start, end, radius, material) => {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const mesh = addMesh(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), 16), material, name);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  };
  const stroke = (parent, name, points, radius, material, closed = false) => {
    const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
    return addMesh(parent, new THREE.TubeGeometry(curve, Math.max(24, points.length), radius, 8, closed), material, name);
  };

  // A long rounded wooden support ties the small apparatus together. The
  // darker front edge gives the rail depth without a texture or image plane.
  block(group, 'Rounded wooden optical rail', [3.35, 0.18, 0.44], [0, -0.78, -0.02], wood);
  block(group, 'Warm wood front edge', [3.28, 0.046, 0.018], [0, -0.827, 0.218], woodEdge, 0.02);
  for (const x of [-1.3, 1.3]) {
    block(group, 'Dark enamel rail foot', [0.3, 0.1, 0.4], [x, -0.915, -0.02], metal, 0.04);
  }

  const drum = new THREE.Group();
  drum.name = 'Open paper cylinder with stretched pink balloon membrane';
  drum.position.set(-0.68, 0.27, 0.04);
  drum.rotation.y = 0.35;
  group.add(drum);

  // A closed wall profile revolved about the tube axis leaves a real open bore
  // at the back. The pink membrane covers the near end of the paper cylinder.
  const wallProfile = [
    [0.43, -0.39], [0.48, -0.39], [0.49, -0.36],
    [0.49, 0.2], [0.47, 0.23], [0.43, 0.23], [0.43, -0.39],
  ].map(([r, z]) => new THREE.Vector2(r, z));
  const shell = addMesh(drum, new THREE.LatheGeometry(wallProfile, 48), paper, 'Hollow cream paper cylinder');
  shell.rotation.x = Math.PI / 2;
  for (const z of [-0.39, 0.23]) {
    const rim = addMesh(drum, new THREE.TorusGeometry(0.462, 0.027, 10, 48), paperEdge, 'Rounded paper tube rim');
    rim.position.z = z;
  }
  const membrane = addMesh(drum, new THREE.SphereGeometry(0.447, 40, 24), pink, 'Soft pink balloon membrane');
  membrane.scale.z = 0.075;
  membrane.position.z = 0.253;
  const retainer = addMesh(drum, new THREE.TorusGeometry(0.458, 0.038, 12, 48), pinkLip, 'Pink membrane retaining lip');
  retainer.position.z = 0.254;

  const mirror = block(drum, 'Small silver mirror on the membrane', [0.23, 0.27, 0.046], [0.035, 0.015, 0.318], silver, 0.04);
  mirror.rotation.z = -0.15;
  const mirrorGlint = rod(drum, 'Short highlight on silver mirror', [-0.025, 0.103, 0.35], [0.095, 0.08, 0.35], 0.008, paper);
  mirrorGlint.castShadow = false;
  block(group, 'Cream drum saddle', [0.53, 0.14, 0.36], [-0.68, -0.29, 0], paperEdge);
  rod(group, 'Metal support below the drum', [-0.68, -0.69, 0], [-0.68, -0.32, 0], 0.075, metal);

  // The screen is a solid rounded tile on its own short support. Its enamel
  // Lissajous path is a raised tube, including at the small self-crossings.
  const screen = new THREE.Group();
  screen.name = 'Cream projection screen with raised Lissajous figure';
  // Face the membrane toward the screen, and keep the screen's front behind
  // the reflection point. Both beams then stay on the visible side of each face.
  screen.position.set(1.035, 0.19, 0.18);
  group.add(screen);
  block(screen, 'Warm screen edge', [1.34, 1.47, 0.14], [0, 0, 0], paperEdge, 0.1);
  block(screen, 'Cream enamel projection surface', [1.25, 1.38, 0.055], [0, 0, 0.092], paper, 0.08);
  const trace = Array.from({ length: 160 }, (_, i) => {
    const t = i / 160 * Math.PI * 2;
    return new THREE.Vector3(0.455 * Math.sin(2 * t), 0.46 * Math.sin(3 * t), 0.15 + 0.008 * Math.cos(t));
  });
  stroke(screen, 'Raised red 2-to-3 Lissajous trace', trace, 0.024, red, true);
  rod(group, 'Projection screen support', [1.035, -0.69, 0.12], [1.035, -0.5, 0.15], 0.065, metal);

  // Connect the beam endpoints to the actual mirror and trace coordinates,
  // keeping the optical path attached when the whole logo tilts in the card.
  group.updateMatrixWorld(true);
  const mirrorPoint = drum.localToWorld(new THREE.Vector3(0.035, 0.015, 0.365));
  const muzzle = new THREE.Vector3(-1.17, -0.23, 0.75);
  const laserDirection = mirrorPoint.clone().sub(muzzle).normalize();
  const laserBack = muzzle.clone().addScaledVector(laserDirection, -0.43);
  rod(group, 'Silver laser barrel', laserBack.toArray(), muzzle.toArray(), 0.105, silver);
  rod(group, 'Dark enamel laser housing', laserBack.toArray(), muzzle.clone().addScaledVector(laserDirection, -0.13).toArray(), 0.12, metal);
  const aperture = muzzle.clone().addScaledVector(laserDirection, 0.006);
  rod(group, 'Red laser aperture', muzzle.toArray(), aperture.toArray(), 0.055, red);
  const mount = laserBack.clone().lerp(muzzle, 0.35);
  rod(group, 'Laser mounting post', [mount.x, -0.69, 0.12], [mount.x, mount.y - 0.085, mount.z], 0.047, metal);
  rod(group, 'Incident red beam from laser to mirror', aperture.toArray(), mirrorPoint.toArray(), 0.017, beam);
  const targetPhase = Math.PI * 3 / 4;
  const target = screen.localToWorld(new THREE.Vector3(
    0.455 * Math.sin(2 * targetPhase), 0.46 * Math.sin(3 * targetPhase),
    0.15 + 0.008 * Math.cos(targetPhase),
  ));
  rod(group, 'Reflected red beam from mirror to screen trace', mirrorPoint.toArray(), target.toArray(), 0.017, beam);
  const spot = addMesh(group, new THREE.SphereGeometry(0.04, 16, 12), beam, 'Red light landing on the Lissajous trace');
  spot.position.copy(target);

  // Three short teal sound arcs provide a compact voice cue beside the tube.
  for (let i = 0; i < 3; i++) {
    const radius = 0.13 + i * 0.075;
    const points = Array.from({ length: 24 }, (_, j) => {
      const angle = -0.9 + j / 23 * 1.8;
      return new THREE.Vector3(-1.71 + Math.cos(angle) * radius, 0.6 + Math.sin(angle) * radius, 0.16);
    });
    stroke(group, 'Teal voice wave entering the tube', points, 0.018, teal);
  }
  return group;
}

function createStereogramRunner() {
  const group = new THREE.Group();
  group.name = 'Stereogram Runner — T-Rex rising from an enamel pin field';
  const cream = enamel('#f0eadb', 0.39, 0.1);
  const rim = enamel('#d4cbb7', 0.4, 0.13);
  const silhouetteGreen = enamel('#365740', 0.36, 0.12);
  const pinGreen = enamel('#4c7055', 0.32, 0.14);
  const fieldMaterials = [
    enamel('#dbd5c4', 0.39, 0.1),
    enamel('#91a69a', 0.39, 0.1),
    enamel('#b98e80', 0.39, 0.1),
    enamel('#bcb18a', 0.39, 0.1),
  ];
  const roundedPanel = (width, height, radius) => {
    const shape = new THREE.Shape(), x = width / 2, y = height / 2;
    shape.moveTo(-x + radius, -y);
    shape.lineTo(x - radius, -y); shape.quadraticCurveTo(x, -y, x, -y + radius);
    shape.lineTo(x, y - radius); shape.quadraticCurveTo(x, y, x - radius, y);
    shape.lineTo(-x + radius, y); shape.quadraticCurveTo(-x, y, -x, y - radius);
    shape.lineTo(-x, -y + radius); shape.quadraticCurveTo(-x, -y, -x + radius, -y);
    return shape;
  };

  // The slight separation between two solid panels makes the depth visible in
  // the resting three-quarter view, without an extra scene or a display stand.
  const rear = relief(group, roundedPanel(3.1, 1.9, 0.12), rim,
    'Offset cream rear depth layer', -0.24, 0.07, 0.025, 12);
  rear.position.set(-0.075, 0.055, -0.24);
  relief(group, roundedPanel(3.1, 1.9, 0.12), cream,
    'Slim beveled cream pin-art panel', -0.1, 0.13, 0.03, 12);

  // An original continuous running profile: a long balancing tail, raised
  // tapered head, an open jaw notch, short arms, and two bent hind legs.
  const rex = new THREE.Shape();
  rex.moveTo(-1.25, 0.025);
  rex.bezierCurveTo(-0.96, 0.07, -0.72, 0.21, -0.48, 0.3);
  rex.bezierCurveTo(-0.24, 0.39, -0.02, 0.37, 0.13, 0.54);
  rex.quadraticCurveTo(0.18, 0.68, 0.36, 0.7);
  rex.quadraticCurveTo(0.7, 0.75, 1.07, 0.63);
  rex.quadraticCurveTo(1.19, 0.6, 1.19, 0.51);
  rex.lineTo(1.19, 0.405);
  rex.lineTo(0.7, 0.395);
  rex.quadraticCurveTo(0.65, 0.36, 0.7, 0.335);
  rex.lineTo(1.12, 0.3);
  rex.lineTo(1.075, 0.23);
  rex.quadraticCurveTo(0.81, 0.19, 0.56, 0.225);
  rex.quadraticCurveTo(0.43, 0.235, 0.32, 0.175);
  rex.lineTo(0.48, 0.015);
  rex.lineTo(0.625, 0.055);
  rex.lineTo(0.665, -0.035);
  rex.lineTo(0.48, -0.095);
  rex.lineTo(0.3, 0.035);
  rex.quadraticCurveTo(0.24, -0.08, 0.075, -0.19);
  rex.lineTo(0.285, -0.39);
  rex.lineTo(0.15, -0.58);
  rex.lineTo(0.41, -0.615);
  rex.lineTo(0.44, -0.7);
  rex.lineTo(0.055, -0.7);
  rex.lineTo(0.005, -0.605);
  rex.lineTo(0.105, -0.425);
  rex.lineTo(-0.175, -0.305);
  rex.lineTo(-0.285, -0.405);
  rex.lineTo(-0.54, -0.565);
  rex.lineTo(-0.42, -0.6);
  rex.lineTo(-0.445, -0.68);
  rex.lineTo(-0.72, -0.65);
  rex.lineTo(-0.695, -0.535);
  rex.lineTo(-0.48, -0.335);
  rex.lineTo(-0.545, -0.12);
  rex.bezierCurveTo(-0.79, -0.055, -1.05, -0.015, -1.25, 0.025);
  rex.closePath();
  relief(group, rex, silhouetteGreen, 'Continuous dark forest T-Rex depth silhouette',
    0.075, 0.06, 0.008, 18);

  // Classify the same repeated dot field against the silhouette, raising its
  // green pins. This is a tactile stereogram motif, not a calibrated illusion.
  const contour = rex.getPoints(24);
  const inside = (x, y) => {
    let contained = false;
    for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
      const a = contour[i], b = contour[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) {
        contained = !contained;
      }
    }
    return contained;
  };
  const pins = fieldMaterials.map(() => []);
  const raised = [];
  for (let row = 0; row < 24; row++) {
    for (let column = 0; column < 43; column++) {
      const x = (column - 21) * 0.065;
      const y = (row - 11.5) * 0.065;
      if (inside(x, y)) {
        raised.push({ x, y, height: 0.12, base: 0.135 });
      } else {
        // A quiet six-column repeat gives the field horizontal correspondence.
        const motif = (row * 5 + column % 6 * 3) % 17;
        const color = motif === 1 ? 1 : motif === 8 ? 2 : motif === 13 ? 3 : 0;
        pins[color].push({ x, y, height: 0.034, base: 0.064 });
      }
    }
  }
  const profile = [
    [0, -0.5], [0.73, -0.5], [0.94, -0.42], [1, -0.25],
    [1, 0.25], [0.94, 0.42], [0.73, 0.5], [0, 0.5],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const pinGeometry = new THREE.LatheGeometry(profile, 12);
  const pinRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const addPins = (positions, material, name, radius = 0.022) => {
    const instances = new THREE.InstancedMesh(pinGeometry, material, positions.length);
    instances.name = name;
    instances.castShadow = true;
    instances.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    positions.forEach(({ x, y, height, base }, i) => {
      matrix.compose(new THREE.Vector3(x, y, base + height / 2), pinRotation,
        new THREE.Vector3(radius, height, radius));
      instances.setMatrixAt(i, matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    group.add(instances);
  };
  pins.forEach((positions, i) => addPins(positions, fieldMaterials[i], 'Low repeated stereogram enamel pins'));
  addPins(raised, pinGreen, 'Raised forest-green pins forming the running T-Rex');
  addPins([
    { x: -0.13, y: 0.862, height: 0.024, base: 0.055 },
    { x: 0.13, y: 0.862, height: 0.024, base: 0.055 },
  ], silhouetteGreen, 'Two subtle parallel-view alignment dots', 0.017);
  // Keep a restrained three-quarter pose beneath the shared viewer tilt, so
  // the frame thickness and raised pins remain visible before interaction.
  const presentation = new THREE.Matrix4().makeRotationY(-Math.PI / 15);
  group.children.forEach(part => part.applyMatrix4(presentation));
  return group;
}
