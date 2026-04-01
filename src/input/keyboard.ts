import { entitiesWith } from "../ecs/query";
import { input } from "../ecs/stores";
import type { PlayerState } from "../types";

export function setupKeyboardInput(
  playerState: PlayerState,
  onFire: () => void,
): void {
  window.addEventListener("keydown", (event) => {
    const [playerEntityId] = entitiesWith("playerTag", "input");
    if (playerEntityId === undefined) return;
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      input[playerEntityId].left = true;
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      input[playerEntityId].right = true;
    }
    if (event.code === "ArrowUp" || event.code === "KeyW") {
      input[playerEntityId].up = true;
    }
    if (event.code === "Space") {
      playerState.isAttacking = true;
      playerState.attackTimer = 0;
      onFire();
    }
  });

  window.addEventListener("keyup", (event) => {
    const [playerEntityId] = entitiesWith("playerTag", "input");
    if (playerEntityId === undefined) return;
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      input[playerEntityId].left = false;
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      input[playerEntityId].right = false;
    }
    if (event.code === "ArrowUp" || event.code === "KeyW") {
      input[playerEntityId].up = false;
    }
  });
}
