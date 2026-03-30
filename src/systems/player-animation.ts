import type { EntityId } from "../components/components";
import type { PlayerState } from "../types";
import { sprite } from "../ecs/stores";

export function updatePlayerAnimation(
  playerEntityId: EntityId,
  playerState: PlayerState,
): void {
  if (playerState.isMoving) {
    sprite[playerEntityId].currentFrame = playerState.facingRight ? 2 : 1;
  } else {
    sprite[playerEntityId].currentFrame = 0;
  }
}
