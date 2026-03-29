import type { EntityId } from "../components/components";
import { PLAYER } from "../config";
import type { PlayerState } from "../types";
import { input, position, sprite } from "../ecs/stores";

/** Updates player movement and sprite frame. Returns previous X for scrolling. */
export function updateMovement(
  playerEntityId: EntityId,
  playerState: PlayerState,
): number {
  const prevPlayerX = position[playerEntityId].x;

  playerState.isMoving = false;

  if (input[playerEntityId].left) {
    position[playerEntityId].x -= PLAYER.speed;
    playerState.facingRight = false;
    playerState.isMoving = true;
  }
  if (input[playerEntityId].right) {
    position[playerEntityId].x += PLAYER.speed;
    playerState.facingRight = true;
    playerState.isMoving = true;
  }

  if (playerState.isMoving) {
    sprite[playerEntityId].currentFrame = playerState.facingRight ? 2 : 1;
  } else {
    sprite[playerEntityId].currentFrame = 0;
  }

  return prevPlayerX;
}
