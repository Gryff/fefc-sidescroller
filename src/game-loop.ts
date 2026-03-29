import type { GameAssets, GameContext, GameState } from "./types";
import { applyJoystickInput } from "./input/touch";
import { render } from "./rendering/renderer";
import { updateBossAnimation } from "./systems/boss-animation";
import { updateMovement } from "./systems/movement";
import { updatePhysics } from "./systems/physics";
import { updateProjectiles } from "./systems/projectile";
import { updateScrolling } from "./systems/scrolling";

function update(
  delta: number,
  gameCtx: GameContext,
  state: GameState,
  assets: GameAssets,
): void {
  const { canvas, playerEntityId, bossEntityId, isTouchDevice } = gameCtx;

  updateBossAnimation(bossEntityId, state.boss, delta);
  applyJoystickInput(playerEntityId, state.joystick, isTouchDevice);

  const prevPlayerX = updateMovement(playerEntityId, state.player);
  updatePhysics(playerEntityId, state.player, canvas.height);
  updateScrolling(
    playerEntityId,
    state.scroll,
    canvas,
    assets.backgroundImage,
    prevPlayerX,
  );
  updateProjectiles(canvas);
}

export function startGameLoop(
  gameCtx: GameContext,
  state: GameState,
  assets: GameAssets,
): void {
  console.log("Game initialized");

  function gameLoop(lastTimestamp = performance.now()): void {
    if (!state.gameRunning) return;
    const now = performance.now();
    const delta = now - lastTimestamp;

    update(delta, gameCtx, state, assets);
    render(gameCtx, state, assets);

    requestAnimationFrame(() => gameLoop(now));
  }

  gameLoop(performance.now());
}
