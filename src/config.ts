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

const _world = {
  width: 3200,
  groundY: (typeof window !== "undefined" ? window.innerHeight : 768) - 200,
};

export const WORLD: Readonly<typeof _world> = _world;

export function setWorld(config: { width: number }): void {
  _world.width = config.width;
}

export const BACKGROUND = {
  sourceWidthDivisor: 3,
} as const;

export const COLLISION_LAYER = {
  PLAYER: 1 << 0, // 0b0001
  ENEMY: 1 << 1, // 0b0010
  PROJECTILE: 1 << 2, // 0b0100
  PLATFORM: 1 << 3, // 0b1000
} as const;

export const COLLISION_MASK = {
  PLAYER: COLLISION_LAYER.ENEMY | COLLISION_LAYER.PLATFORM,
  ENEMY: COLLISION_LAYER.PLAYER | COLLISION_LAYER.PROJECTILE | COLLISION_LAYER.PLATFORM,
  PROJECTILE: COLLISION_LAYER.ENEMY,
  PLATFORM: COLLISION_LAYER.PLAYER | COLLISION_LAYER.ENEMY,
} as const;

export const COLLIDER_SIZE = {
  PLAYER: { width: 40, height: 50, offsetX: 0, offsetY: 7 },
  BOSS: { width: 60, height: 100, offsetX: 0, offsetY: 14 },
  PROJECTILE: { width: 32, height: 32, offsetX: 0, offsetY: 0 },
  WALKER: { width: 40, height: 40, offsetX: 0, offsetY: 0 },
} as const;

export const HEALTH = {
  PLAYER: { current: 5, max: 5 },
  BOSS: { current: 10, max: 10 },
} as const;

export const HEALTH_BAR = {
  height: 6,
  marginAboveCollider: 8,
  backgroundColor: "#2a0a0a",
  fillColor: "#3ce03c",
  borderColor: "#000000",
  borderWidth: 1,
} as const;

export const DEBUG_COLLIDERS = false;

