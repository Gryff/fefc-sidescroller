import type { AnimationMap } from "./components/components";

// All game constants in one place for easy tuning.
// Speed/velocity/gravity values are expressed in units-per-frame at 60fps.
// The game loop normalises delta time (dt=1.0 at 60fps) before passing it to
// each system, so these values translate correctly at any refresh rate.

export const CHARACTER_ANIMATIONS: AnimationMap = {
  idle: { row: 0, frameCount: 5, frameDuration: 150, loop: true },
  walk: { row: 1, frameCount: 8, frameDuration: 100, loop: true },
  run: { row: 2, frameCount: 8, frameDuration: 80, loop: true },
  jump: { row: 3, frameCount: 4, frameDuration: 120, loop: false },
  fall: { row: 4, frameCount: 4, frameDuration: 120, loop: false },
  attack: { row: 5, frameCount: 6, frameDuration: 100, loop: false },
  death: { row: 6, frameCount: 10, frameDuration: 120, loop: false },
};

export const PLAYER = {
  speed: 3,
  jumpStrength: -12,
  halfWidth: 32,
} as const;

export const PHYSICS = {
  gravity: 0.5,
  groundOffset: 200,
} as const;

export const BOSS = {
  animInterval: 500,
} as const;

export const PROJECTILE = {
  speed: 8,
} as const;

export const JOYSTICK = {
  size: 128,
  margin: 32,
  opacity: 0.8,
  deadzone: 0.25,
} as const;

export const FIRE_BUTTON = {
  size: 96,
  margin: 32,
  opacity: 0.8,
} as const;

export const SCROLL = {
  triggerRightFraction: 2 / 3,
  triggerLeftFraction: 1 / 3,
  maxOffsetFraction: 2 / 3,
} as const;

export const BACKGROUND = {
  sourceWidthDivisor: 3,
} as const;

export const COLLISION_LAYER = {
  PLAYER: 1 << 0, // 0b001
  ENEMY: 1 << 1, // 0b010
  PROJECTILE: 1 << 2, // 0b100
} as const;

export const COLLISION_MASK = {
  PLAYER: COLLISION_LAYER.ENEMY,
  ENEMY: COLLISION_LAYER.PLAYER | COLLISION_LAYER.PROJECTILE,
  PROJECTILE: COLLISION_LAYER.ENEMY,
} as const;

export const COLLIDER_SIZE = {
  PLAYER: { width: 40, height: 50, offsetX: 0, offsetY: 7 },
  BOSS: { width: 60, height: 100, offsetX: 0, offsetY: 14 },
  PROJECTILE: { width: 32, height: 32, offsetX: 0, offsetY: 0 },
} as const;

export const DEBUG_COLLIDERS = false;

export function groundLevel(canvasHeight: number): number {
  return canvasHeight - PHYSICS.groundOffset;
}
