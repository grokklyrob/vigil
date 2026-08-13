import {
  InstancedMesh,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';

export type GrabState = {
  active: boolean;
  amount: number;
  dir: Vector3;
};

export function createInput(opts: {
  mesh: InstancedMesh;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  reduced: boolean;
  onDisturb: () => void;
  onHold: (down: boolean) => void;
  onAdvance: () => void;
  onBack: () => void;
  onToggleAudio: () => boolean | Promise<boolean>;
  onEscape: () => void;
}) {
  const grab: GrabState = {
    active: false,
    amount: 0,
    dir: new Vector3(1, 0, 0),
  };

  const raycaster = new Raycaster();
  const plane = new Plane();
  const hit = new Vector3();
  const lastHit = new Vector3();
  const tmp = new Vector3();
  const ndc = new Vector2();
  let dragging = false;
  let travel = 0;
  let lastX = 0;
  let lastY = 0;
  let primed = false;
  let touchCount = 0;

  const drone = document.querySelector('#drone') as HTMLButtonElement;
  const advance = document.querySelector('#advance') as HTMLButtonElement;

  function setNdc(e: PointerEvent): void {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }

  function project(e: PointerEvent, out: Vector3): void {
    setNdc(e);
    opts.camera.getWorldDirection(tmp);
    plane.setFromNormalAndCoplanarPoint(tmp, opts.mesh.position);
    raycaster.setFromCamera(ndc, opts.camera);
    raycaster.ray.intersectPlane(plane, out);
  }

  function onDown(e: PointerEvent): void {
    opts.onDisturb();
    if (e.pointerType === 'touch') {
      touchCount += 1;
      opts.onHold(true);
    }
    lastX = e.clientX;
    lastY = e.clientY;
    setNdc(e);
    raycaster.setFromCamera(ndc, opts.camera);
    const hits = raycaster.intersectObject(opts.mesh, false);
    if (hits.length > 0 && !opts.reduced) {
      dragging = true;
      travel = 0;
      grab.active = true;
      project(e, lastHit);
      opts.canvas.setPointerCapture(e.pointerId);
    }
  }

  function onMove(e: PointerEvent): void {
    if (!primed) {
      lastX = e.clientX;
      lastY = e.clientY;
      primed = true;
      return;
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);
    if (e.pointerType === 'touch') {
      if (touchCount > 0) opts.onDisturb();
    } else if (dist > 0.4) {
      opts.onDisturb();
    }
    lastX = e.clientX;
    lastY = e.clientY;
    if (!dragging) return;
    project(e, hit);
    tmp.copy(hit).sub(lastHit);
    const step = tmp.length();
    travel += step;
    if (step > 1e-5) grab.dir.copy(tmp).normalize();
    grab.amount = Math.min(2.4, travel * 1.15 + step * 8);
    grab.active = true;
    lastHit.copy(hit);
  }

  function onUp(e: PointerEvent): void {
    if (e.pointerType === 'touch') {
      touchCount = Math.max(0, touchCount - 1);
      if (touchCount === 0) opts.onHold(false);
    }
    dragging = false;
    grab.active = false;
    if (opts.canvas.hasPointerCapture(e.pointerId)) {
      opts.canvas.releasePointerCapture(e.pointerId);
    }
  }

  function onKey(e: KeyboardEvent): void {
    opts.onDisturb();
    if (e.key === 'Escape') {
      opts.onEscape();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      opts.onBack();
      return;
    }
    const target = e.target as HTMLElement | null;
    const onChrome = target?.closest('button, a') != null;
    if (e.key === 'ArrowRight' || ((e.key === 'Enter' || e.key === ' ') && !onChrome)) {
      e.preventDefault();
      opts.onAdvance();
    }
  }

  opts.canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('wheel', () => opts.onDisturb(), { passive: true });
  window.addEventListener('keydown', onKey);

  drone.addEventListener('click', () => {
    opts.onDisturb();
    void Promise.resolve(opts.onToggleAudio()).then((on) => {
      drone.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  });
  advance.addEventListener('click', () => {
    opts.onDisturb();
    opts.onAdvance();
  });

  function update(dt: number): GrabState {
    if (!dragging) {
      grab.active = false;
      grab.amount = Math.max(0, grab.amount - dt / 0.4);
      travel *= Math.max(0, 1 - dt * 3);
    }
    return grab;
  }

  return { update, grab };
}

export type Input = ReturnType<typeof createInput>;
