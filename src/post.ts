import { Camera, Scene, Vector2, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export function createPost(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0, 0.4, 0.18);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function setBloom(stillness: number): void {
    bloom.strength = Math.max(0, stillness) * 0.82;
    bloom.radius = 0.32 + stillness * 0.48;
    bloom.threshold = 0.2;
  }

  function resize(width: number, height: number): void {
    composer.setSize(width, height);
  }

  function render(): void {
    composer.render();
  }

  return { setBloom, resize, render };
}

export type Post = ReturnType<typeof createPost>;
