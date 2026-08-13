import {
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type Scene,
} from 'three'

const P = 1.3
const WING_ROLL = (70 * Math.PI) / 180

const VERT = /* glsl */ `
uniform float uTime;
uniform float uStillness;
uniform float uFormRadius;
uniform float uGrabExplode;

attribute vec3 restPosition;
attribute vec3 restNormal;
attribute vec3 restTangent;
attribute vec3 spinAxis;
attribute float aScale;
attribute float aAspect;
attribute float aSector;
attribute float aSeed;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vSector;
varying float vSeed;

mat3 axisAngle(vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float t = 1.0 - c;
  float x = axis.x, y = axis.y, z = axis.z;
  return mat3(
    t * x * x + c,     t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c,     t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c
  );
}

void main() {
  vec3 axis = normalize(spinAxis);
  float speed = mix(0.62, 0.022, uStillness);
  float ang = uTime * speed + aSeed * 6.2831853;
  ang += 0.12 * sin(uTime * 0.073 + aSeed * 9.4);
  mat3 spin = axisAngle(axis, ang);

  vec3 local = spin * vec3(position.x * aScale, position.y * aScale * aAspect, 0.0);

  vec3 N = normalize(restNormal);
  vec3 T = normalize(restTangent);
  vec3 B = normalize(cross(N, T));
  T = normalize(cross(B, N));
  mat3 tbn = mat3(T, B, N);

  float restLen = max(length(restPosition), 0.0001);
  float scatter = mix(1.48, 1.0, uStillness);
  vec3 anchor = restPosition * scatter;
  anchor += N * ((0.22 * uFormRadius) * (1.0 - uStillness) + uGrabExplode);

  vec3 world = anchor + tbn * local;
  vec3 wn = normalize(tbn * spin * vec3(0.0, 0.0, 1.0));

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;

  vWorldPos = world;
  vWorldNormal = wn;
  vViewDir = cameraPosition - world;
  vSector = aSector;
  vSeed = aSeed;
}
`

const FRAG = /* glsl */ `
precision highp float;
precision highp int;

uniform float uTime;
uniform float uStillness;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vSector;
varying float vSeed;


vec3 pal(int i) {
  if (i == 0) return vec3(0.0863, 0.1294, 0.2431);
  if (i == 1) return vec3(0.3255, 0.2039, 0.5137);
  if (i == 2) return vec3(0.9137, 0.2706, 0.3765);
  if (i == 3) return vec3(0.0000, 0.8510, 1.0000);
  if (i == 4) return vec3(1.0000, 0.8275, 0.4118);
  return vec3(0.1608, 0.1020, 0.3294);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);
  float ndotv = abs(dot(N, V));
  float shimmer = pow(ndotv, 2.0);
  float wink = 0.70 + 0.30 * abs(sin(vSeed * 41.0 + uTime * mix(3.7, 0.38, uStillness)));
  shimmer *= wink;

  float racing = mix(1.85, 0.018, uStillness);
  float ang = atan(vWorldPos.x, vWorldPos.z);
  ang += uTime * racing + vSector * 1.0471976;
  float idxf = floor(mod((ang / 6.28318530718) * 6.0, 6.0));
  int idx = int(idxf);
  if (!gl_FrontFacing) idx = (idx + 3) - ((idx + 3) / 6) * 6;

  vec3 base = pal(idx);
  vec3 col = base * shimmer;
  col += base * shimmer * shimmer * 0.4;
  gl_FragColor = vec4(col, 1.0);
}
`

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Pane {
  position: Vector3
  normal: Vector3
  tangent: Vector3
  scale: number
  aspect: number
  spinAxis: Vector3
  sector: number
  partId: number
  seed: number
}

function unitFrom(rng: () => number): Vector3 {
  const z = rng() * 2 - 1
  const a = rng() * Math.PI * 2
  const r = Math.sqrt(Math.max(0, 1 - z * z))
  return new Vector3(r * Math.cos(a), r * Math.sin(a), z)
}

function orthonormal(n: Vector3, twist: number): Vector3 {
  const nn = n.clone().normalize()
  const up = Math.abs(nn.y) > 0.92 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const t = new Vector3().crossVectors(up, nn).normalize()
  t.applyAxisAngle(nn, twist)
  return t
}

function inMandorla(x: number, y: number, a: number, b: number): boolean {
  return Math.pow(Math.abs(x / a), P) + Math.pow(Math.abs(y / b), P) <= 1
}

function mandorlaNormal(x: number, y: number, a: number, b: number): Vector3 {
  const sx = x === 0 ? 1 : Math.sign(x)
  const sy = y === 0 ? 1 : Math.sign(y)
  const gx = (P / a) * Math.pow(Math.abs(x / a), P - 1) * sx
  const gy = (P / b) * Math.pow(Math.abs(y / b), P - 1) * sy
  return new Vector3(gx * 0.32, gy * 0.32, 1).normalize()
}

function addPane(
  panes: Pane[],
  rng: () => number,
  pos: Vector3,
  n: Vector3,
  scale: number,
  aspect: number,
  partId: number,
): void {
  const twist = rng() * Math.PI * 2
  const tangent = orthonormal(n, twist)
  const ang = Math.atan2(pos.x, pos.z)
  const sector = Math.floor((((ang + Math.PI) / (Math.PI * 2)) * 6) % 6)
  panes.push({
    position: pos,
    normal: n.clone().normalize(),
    tangent,
    scale,
    aspect,
    spinAxis: unitFrom(rng),
    sector,
    partId,
    seed: rng(),
  })
}

function buildBody(panes: Pane[], rng: () => number, count: number): void {
  const a = 0.42
  const b = 1.12
  let n = 0
  let attempts = 0
  while (n < count && attempts < count * 50) {
    attempts += 1
    let x = (rng() * 2 - 1) * a
    let y = (rng() * 2 - 1) * b
    const dens = Math.pow(rng(), 0.52)
    x *= dens
    y *= dens
    if (!inMandorla(x, y, a, b)) continue
    const z = (rng() - 0.5) * 0.16
    const pos = new Vector3(x, y, z)
    const normal = mandorlaNormal(x, y, a, b)
    normal.x += (rng() - 0.5) * 0.12
    normal.y += (rng() - 0.5) * 0.12
    normal.z += (rng() - 0.5) * 0.08
    normal.normalize()
    const dist = Math.hypot(x / a, y / b)
    const scale = 0.038 + (1 - dist) * 0.055 + rng() * 0.02
    const aspect = 0.38 + rng() * 1.05
    addPane(panes, rng, pos, normal, scale, aspect, 0)
    n += 1
  }
}

function addWing(
  panes: Pane[],
  rng: () => number,
  sign: number,
  root: Vector3,
  tip: Vector3,
  count: number,
  partId: number,
): void {
  const along = tip.clone().sub(root)
  const length = along.length()
  along.normalize()
  let ref = new Vector3(0, 1, 0)
  if (Math.abs(along.dot(ref)) > 0.9) ref = new Vector3(0, 0, 1)
  const binormal = new Vector3().crossVectors(along, ref).normalize()
  const chord = binormal.clone().applyAxisAngle(along, sign * WING_ROLL)
  const normal = new Vector3().crossVectors(along, chord).normalize()
  if (normal.z < 0) {
    normal.negate()
    chord.negate()
  }

  for (let i = 0; i < count; i++) {
    const t = Math.pow(rng(), 2.15)
    const halfW = (0.52 * (1 - t) + 0.06) * (0.75 + 0.5 * rng())
    const s = (rng() * 2 - 1) * halfW
    const pos = root
      .clone()
      .addScaledVector(along, length * t + (rng() - 0.5) * 0.04)
      .addScaledVector(chord, s)
    pos.z += (rng() - 0.5) * 0.05
    const nrm = normal.clone()
    nrm.x += (rng() - 0.5) * 0.18
    nrm.y += (rng() - 0.5) * 0.18
    nrm.z += (rng() - 0.5) * 0.12
    nrm.normalize()
    const scale = 0.032 + (1 - t) * 0.07 + rng() * 0.018
    const aspect = 0.32 + rng() * 1.2
    addPane(panes, rng, pos, nrm, scale, aspect, partId)
  }
}

function buildPanes(rng: () => number): Pane[] {
  const panes: Pane[] = []
  buildBody(panes, rng, 500)
  addWing(panes, rng, 1, new Vector3(0.16, 0.62, 0.02), new Vector3(0.72, 1.58, 0.38), 220, 1)
  addWing(panes, rng, -1, new Vector3(-0.16, 0.62, 0.02), new Vector3(-0.72, 1.58, 0.38), 220, 1)
  addWing(panes, rng, 1, new Vector3(0.22, 0.18, 0.0), new Vector3(2.05, 0.52, -0.18), 340, 2)
  addWing(panes, rng, -1, new Vector3(-0.22, 0.18, 0.0), new Vector3(-2.05, 0.52, -0.18), 340, 2)
  addWing(panes, rng, 1, new Vector3(0.18, -0.48, 0.02), new Vector3(0.88, -1.48, 0.28), 220, 3)
  addWing(panes, rng, -1, new Vector3(-0.18, -0.48, 0.02), new Vector3(-0.88, -1.48, 0.28), 220, 3)
  return panes
}

export function createSeraph(scene: Scene) {
  const rng = mulberry32(0x5649474c)
  const panes = buildPanes(rng)
  const count = panes.length

  let formRadius = 0
  for (const p of panes) formRadius = Math.max(formRadius, p.position.length())

  const restPosition = new Float32Array(count * 3)
  const restNormal = new Float32Array(count * 3)
  const restTangent = new Float32Array(count * 3)
  const spinAxis = new Float32Array(count * 3)
  const aScale = new Float32Array(count)
  const aAspect = new Float32Array(count)
  const aSector = new Float32Array(count)
  const aSeed = new Float32Array(count)
  const aPart = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const p = panes[i]!
    restPosition[i * 3] = p.position.x
    restPosition[i * 3 + 1] = p.position.y
    restPosition[i * 3 + 2] = p.position.z
    restNormal[i * 3] = p.normal.x
    restNormal[i * 3 + 1] = p.normal.y
    restNormal[i * 3 + 2] = p.normal.z
    restTangent[i * 3] = p.tangent.x
    restTangent[i * 3 + 1] = p.tangent.y
    restTangent[i * 3 + 2] = p.tangent.z
    spinAxis[i * 3] = p.spinAxis.x
    spinAxis[i * 3 + 1] = p.spinAxis.y
    spinAxis[i * 3 + 2] = p.spinAxis.z
    aScale[i] = p.scale
    aAspect[i] = p.aspect
    aSector[i] = p.sector
    aSeed[i] = p.seed
    aPart[i] = p.partId
  }

  const geometry = new PlaneGeometry(1, 1)
  geometry.setAttribute('restPosition', new InstancedBufferAttribute(restPosition, 3))
  geometry.setAttribute('restNormal', new InstancedBufferAttribute(restNormal, 3))
  geometry.setAttribute('restTangent', new InstancedBufferAttribute(restTangent, 3))
  geometry.setAttribute('spinAxis', new InstancedBufferAttribute(spinAxis, 3))
  geometry.setAttribute('aScale', new InstancedBufferAttribute(aScale, 1))
  geometry.setAttribute('aAspect', new InstancedBufferAttribute(aAspect, 1))
  geometry.setAttribute('aSector', new InstancedBufferAttribute(aSector, 1))
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(aSeed, 1))
  geometry.setAttribute('aPart', new InstancedBufferAttribute(aPart, 1))

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStillness: { value: 0 },
      uFormRadius: { value: formRadius },
      uGrabExplode: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: DoubleSide,
    transparent: false,
    depthWrite: true,
  })

  const mesh = new InstancedMesh(geometry, material, count)
  mesh.frustumCulled = false
  // Identity per-instance matrices: placement lives entirely in the vertex shader.
  const dummy = new Object3D()
  dummy.matrix.identity()
  for (let i = 0; i < count; i++) {
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  scene.add(mesh)

  function setTime(t: number): void {
    material.uniforms.uTime!.value = t
  }
  function setStillness(s: number): void {
    material.uniforms.uStillness!.value = s
  }
  function setGrab(g: number): void {
    material.uniforms.uGrabExplode!.value = g
  }

  return { mesh, paneCount: count, formRadius, setTime, setStillness, setGrab }
}

export type Seraph = ReturnType<typeof createSeraph>
