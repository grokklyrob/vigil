import {
  Color,
  MathUtils,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { createStillness, prefersReducedMotion } from './stillness'
import { createInput } from './input'
import { createSeraph } from './seraph'
import { createPost } from './post'
import { createDrone } from './audio'
import { createStations } from './stations'

const reduced = prefersReducedMotion()

const canvas = document.querySelector('#c') as HTMLCanvasElement
if (!canvas) throw new Error('canvas missing')

const gl = canvas.getContext('webgl2', {
  alpha: false,
  antialias: true,
  depth: true,
  stencil: false,
  powerPreference: 'high-performance',
})
if (!gl) {
  window.location.replace('/reader/')
  throw new Error('WebGL2 required')
}

const renderer = new WebGLRenderer({
  canvas,
  context: gl,
  antialias: true,
  alpha: false,
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(new Color(0x0d0d14), 1)
renderer.outputColorSpace = SRGBColorSpace

const scene = new Scene()
scene.background = new Color(0x0d0d14)
const camera = new PerspectiveCamera(32, 1, 0.1, 40)
camera.position.set(0, 0.08, 5.35)
camera.lookAt(0, 0, 0)

const seraph = createSeraph(scene)
const post = createPost(renderer, scene, camera)
const stillness = createStillness(reduced)
const stations = createStations()
const audio = createDrone()
const droneBtn = document.querySelector('#drone') as HTMLButtonElement

const input = createInput({
  canvas,
  camera,
  mesh: seraph.mesh,
  reduced,
  onDisturb: () => {
    stillness.disturb()
  },
  onHold: (down) => {
    stillness.hold(down)
  },
  onAdvance: () => {
    stations.forward()
  },
  onBack: () => {
    stations.back()
  },
  onToggleAudio: () => audio.toggle(),
  onEscape: () => {
    audio.mute()
    droneBtn.setAttribute('aria-pressed', 'false')
    const el = document.activeElement
    if (el instanceof HTMLElement) el.blur()
  },
})

function resize(): void {
  const w = Math.max(1, window.innerWidth)
  const h = Math.max(1, window.innerHeight)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  post.resize(w, h)
  const s = Math.min(w, h) / 860
  seraph.mesh.scale.setScalar(MathUtils.clamp(s, 0.52, 1.2))
}

resize()
window.addEventListener('resize', resize)

let last = performance.now()

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const still = stillness.update(dt)
  const grab = input.update(dt)
  document.documentElement.style.setProperty('--still', still.toFixed(4))
  document.documentElement.style.setProperty('--still2', (still * still).toFixed(4))
  const close = stations.isClosing ? still : 0
  document.documentElement.style.setProperty('--close', close.toFixed(4))

  seraph.setTime(now * 0.001)
  seraph.setStillness(reduced ? 1 : still)
  seraph.setGrab(reduced ? 0 : grab.amount)
  post.setBloom(reduced ? 1 : still)
  audio.setStillness(still)
  post.render()
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
