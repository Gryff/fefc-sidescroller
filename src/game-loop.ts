import type { GameAssets, GameContext, GameState } from "./types";
import { applyJoystickInput } from "./input/touch";
import { render } from "./rendering/renderer";
import { updateBossAnimation } from "./systems/boss-animation";
import { updateMovement } from "./systems/movement";
import { updatePlayerAnimation } from "./systems/player-animation";
import { updatePhysics } from "./systems/physics";
import { updateProjectiles } from "./systems/projectile";
import { updateScrolling } from "./systems/scrolling";

// Target frame duration for 60fps. dt=1.0 at 60fps, 0.5 at 120fps, 2.0 at 30fps.
const TARGET_FRAME_MS = 1000 / 60;
// Cap delta to prevent a huge jump after the tab is backgrounded.
const MAX_DELTA_MS = 100;

function update(
  delta: number,
  gameCtx: GameContext,
  state: GameState,
  assets: GameAssets,
): void {
  const { canvas, playerEntityId, bossEntityId, isTouchDevice } = gameCtx;
  const dt = delta / TARGET_FRAME_MS;

  updateBossAnimation(bossEntityId, state.boss, delta);
  applyJoystickInput(playerEntityId, state.joystick, isTouchDevice);

  const prevPlayerX = updateMovement(playerEntityId, state.player, dt);
  updatePlayerAnimation(playerEntityId, state.player);
  updatePhysics(playerEntityId, state.player, canvas.height, dt);
  updateScrolling(
    playerEntityId,
    state.scroll,
    canvas,
    assets.backgroundImage,
    prevPlayerX,
  );
  updateProjectiles(canvas, dt);
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

      update(delta, gameCtx, state, assets);
      render(gameCtx, state, assets);

      gameLoop(ts);
    });
  }

  gameLoop();
}
