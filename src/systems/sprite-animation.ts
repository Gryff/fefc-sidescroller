import type { EntityId } from "../components/components";
import { sprite } from "../ecs/stores";

export function setAnimation(entityId: EntityId, name: string): void {
  const s = sprite[entityId];
  if (!s?.animations || s.currentAnimation === name) return;
  s.currentAnimation = name;
  s.currentFrame = 0;
  s.animationElapsed = 0;
}

export function updateSpriteAnimation(delta: number): void {
  for (const id in sprite) {
    const s = sprite[id];
    if (!s?.animations || !s.currentAnimation) continue;

    const anim = s.animations[s.currentAnimation];
    s.animationElapsed = (s.animationElapsed ?? 0) + delta;

    if (s.animationElapsed >= anim.frameDuration) {
      s.animationElapsed -= anim.frameDuration;
      const nextFrame = s.currentFrame + 1;
      if (nextFrame >= anim.frameCount) {
        s.currentFrame = anim.loop ? 0 : anim.frameCount - 1;
      } else {
        s.currentFrame = nextFrame;
      }
    }
  }
}
