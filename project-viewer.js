import * as THREE from './assets/vendor/three.module.js';
import { createProjectLogo } from './project-models.js';

// The image is the default; the 3D scene starts only when a card approaches view.
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    observer.unobserve(entry.target);
    try { mountLogo(entry.target); }
    catch (error) { console.warn('Using the project logo preview.', error); }
  });
}, { rootMargin: '160px' });
document.querySelectorAll('.project-logo').forEach(host => observer.observe(host));

function mountLogo(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const model = createProjectLogo(host.dataset.project);
  scene.add(model);
  scene.add(new THREE.HemisphereLight(0xfff9f0, 0x79808a, 1.6));
  const light = new THREE.DirectionalLight(0xfff4e4, 2.8);
  light.position.set(-3, 5, 6);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xe3f2ff, 1.3);
  rim.position.set(4, 1, -2);
  scene.add(rim);

  function createEnvironment() {
    const studio = new THREE.Scene();
    studio.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), new THREE.MeshBasicMaterial({ color: 0xaaaaa4, side: THREE.BackSide })));
    [[-3, 4, 5, 5, 5], [4, 2, 3, 3, 5]].forEach(([x, y, z, width, height]) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    });
    const generator = new THREE.PMREMGenerator(renderer);
    const environment = generator.fromScene(studio, 0.05, 0.1, 20, { size: 128 });
    generator.dispose();
    studio.traverse(part => { part.geometry?.dispose(); part.material?.dispose(); });
    return environment;
  }
  let environment = createEnvironment();
  scene.environment = environment.texture;

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(64, 54, 38, .2)');
  gradient.addColorStop(1, 'rgba(64, 54, 38, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.position.set(0, -1.2, -0.2);
  scene.add(shadow);

  const camera = new THREE.OrthographicCamera(-2.5, 2.5, 1.55, -1.55, 0.1, 30);
  camera.position.set(0, 0, 6);
  const rest = { x: -0.10, y: -0.24 };
  model.rotation.set(rest.x, rest.y, -0.03);
  let target = { ...rest };
  let frame = 0;
  let visible = true;
  let lost = false;
  let assetsReady = !model.userData.ready;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const link = host.closest('.project-link');

  function requestRender() {
    if (!frame && visible && !lost && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (lost || !visible || document.hidden) return;
    const easing = reducedMotion.matches ? 1 : 0.22;
    model.rotation.x += (target.x - model.rotation.x) * easing;
    model.rotation.y += (target.y - model.rotation.y) * easing;
    const moving = Math.abs(target.x - model.rotation.x) + Math.abs(target.y - model.rotation.y) > 0.0005;
    if (!moving) { model.rotation.x = target.x; model.rotation.y = target.y; }
    renderer.render(scene, camera);
    if (moving) requestRender();
  }
  function reset() { target = { ...rest }; requestRender(); }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.left = -1.55 * width / height;
    camera.right = 1.55 * width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }
  link.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType !== 'mouse') return;
    const box = host.getBoundingClientRect();
    const x = THREE.MathUtils.clamp((event.clientX - box.left) / box.width - 0.5, -0.5, 0.5);
    const y = THREE.MathUtils.clamp((event.clientY - box.top) / box.height - 0.5, -0.5, 0.5);
    target = { x: rest.x + y * 0.32, y: rest.y + x * 0.48 };
    requestRender();
  });
  link.addEventListener('pointerleave', reset);
  link.addEventListener('focus', () => {
    if (reducedMotion.matches) return;
    target = { x: rest.x - 0.07, y: rest.y + 0.14 };
    requestRender();
  });
  link.addEventListener('blur', reset);
  reducedMotion.addEventListener('change', reset);
  document.addEventListener('visibilitychange', requestRender);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    canvas.hidden = true;
    host.classList.remove('is-ready');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    environment.dispose();
    environment = createEnvironment();
    scene.environment = environment.texture;
    lost = false;
    canvas.hidden = !assetsReady;
    host.classList.toggle('is-ready', assetsReady);
    requestRender();
  });
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) requestRender(); }).observe(host);
  resize();
  canvas.hidden = !assetsReady;
  host.append(canvas);
  function reveal() {
    assetsReady = true;
    if (lost) return;
    renderer.render(scene, camera);
    canvas.hidden = false;
    host.classList.add('is-ready');
  }
  if (model.userData.ready) {
    model.userData.ready.then(reveal).catch(error => {
      lost = true;
      canvas.hidden = true;
      host.classList.remove('is-ready');
      console.warn('Using the project logo preview.', error);
    });
  } else reveal();
}
