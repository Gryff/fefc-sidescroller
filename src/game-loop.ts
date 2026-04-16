import type { GameAssets, GameContext, GameState } from "./types";
import { applyJoystickInput } from "./input/touch";
import { render } from "./rendering/renderer";
import { updateBossAnimation } from "./systems/boss-animation";
import { updateCollision } from "./systems/collision";
import { updateMovement } from "./systems/movement";
import { updatePlatformCollision } from "./systems/platform-collision";
import { updatePlayerAnimation } from "./systems/player-animation";
import { resolveWorldGround, updatePhysics } from "./systems/physics";
import { updateProjectileHits } from "./systems/projectile-hits";
import { updateSpriteAnimation } from "./systems/sprite-animation";
import { updateProjectiles } from "./systems/projectile";
import { updateHealthDamage } from "./systems/health-damage";
import { updateCamera } from "./systems/camera";

// Target frame duration for 60fps. dt=1.0 at 60fps, 0.5 at 120fps, 2.0 at 30fps.
const TARGET_FRAME_MS = 1000 / 60;
// Cap delta to prevent a huge jump after the tab is backgrounded.
const MAX_DELTA_MS = 100;

function update(
  delta: number,
  gameCtx: GameContext,
  state: GameState,
): void {
  const { canvas, isTouchDevice } = gameCtx;
  const dt = delta / TARGET_FRAME_MS;

  // Input
  applyJoystickInput(state.joystick, isTouchDevice);

  // Movement & physics
  updateMovement(state.player, dt);
  updatePhysics(dt);
  updatePlatformCollision();
  resolveWorldGround();
  updateProjectiles(state.camera.x, canvas.width, dt);

  // Collision detection & reactions
  updateCollision();
  updateProjectileHits();
  const { playerDied } = updateHealthDamage();
  if (playerDied) {
    state.gameRunning = false;
  }

  // Animation
  updatePlayerAnimation(state.player, delta);
  updateBossAnimation(state.boss, delta);
  // Note: updateSpriteAnimation takes raw delta (ms), not normalised dt,
  // because AnimationDef.frameDuration is specified in milliseconds.
  updateSpriteAnimation(delta);

  // Camera
  updateCamera(state.camera, canvas.width);
}

export function startGameLoop(
  gameCtx: GameContext,
  state: GameState,
  assets: GameAssets,
): void {
  console.log("Game initialized");

  function gameLoop(lastTimestamp?: number): void {
    requestAnimationFrame((ts) => {
      if (!state.gameRunning) return;
      const delta =
        lastTimestamp != null ? Math.min(ts - lastTimestamp, MAX_DELTA_MS) : 0;

      update(delta, gameCtx, state);
      render(gameCtx, state, assets);

      gameLoop(ts);
    });
  }

  gameLoop();
}
