import type { EntityId } from "../components/components";
import type { PlayerState } from "../types";
import { input } from "../ecs/stores";

export function setupKeyboardInput(
  playerEntityId: EntityId,
  playerState: PlayerState,
  onFire: () => void,
): void {
  window.addEventListener("keydown", (event) => {
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
