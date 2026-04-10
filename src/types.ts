import type { Sprite } from "./components/components";

export interface PlayerState {
  velocityY: number;
  isOnGround: boolean;
  facingRight: boolean;
  isMoving: boolean;
  isAttacking: boolean;
  attackTimer: number;
}

export interface BossAnimState {
  elapsed: number;
  frame: number;
}

export interface ScrollState {
  backgroundOffsetX: number;
}

export interface JoystickState {
  touchId: number | null;
  active: boolean;
  dir: { left: boolean; right: boolean; up: boolean };
}

export interface FireButtonState {
  touchId: number | null;
  active: boolean;
}

export interface GameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  projectileSpriteTemplate: Sprite[number];
  isTouchDevice: boolean;
}

export interface GameState {
  player: PlayerState;
  boss: BossAnimState;
  scroll: ScrollState;
  joystick: JoystickState;
  fireButton: FireButtonState;
  gameRunning: boolean;
}

export interface GameAssets {
  backgroundImage: HTMLImageElement;
  joystickImage: HTMLImageElement;
}
