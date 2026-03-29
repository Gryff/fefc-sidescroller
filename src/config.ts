// All game constants in one place for easy tuning

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

export const SCROLL = {
  triggerRightFraction: 2 / 3,
  triggerLeftFraction: 1 / 3,
  maxOffsetFraction: 2 / 3,
} as const;

export const BACKGROUND = {
  sourceWidthDivisor: 3,
} as const;

export function groundLevel(canvasHeight: number): number {
  return canvasHeight - PHYSICS.groundOffset;
}
