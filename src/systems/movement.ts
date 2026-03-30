import type { EntityId } from "../components/components";
import { PLAYER } from "../config";
import type { PlayerState } from "../types";
import { input, position } from "../ecs/stores";

/** Updates player movement. Returns previous X for scrolling. */
export function updateMovement(
  playerEntityId: EntityId,
  playerState: PlayerState,
  dt: number,
): number {
  const prevPlayerX = position[playerEntityId].x;

  playerState.isMoving = false;

  if (input[playerEntityId].left) {
    position[playerEntityId].x -= PLAYER.speed * dt;
    playerState.facingRight = false;
    playerState.isMoving = true;
  }
  if (input[playerEntityId].right) {
    position[playerEntityId].x += PLAYER.speed * dt;
    playerState.facingRight = true;
    playerState.isMoving = true;
  }

  return prevPlayerX;
}
