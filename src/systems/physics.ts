import type { EntityId } from "../components/components";
import { PHYSICS, PLAYER, groundLevel } from "../config";
import type { PlayerState } from "../types";
import { input, position } from "../ecs/stores";

export function updatePhysics(
  playerEntityId: EntityId,
  playerState: PlayerState,
  canvasHeight: number,
): void {
  // Jump
  if (input[playerEntityId].up && playerState.isOnGround) {
    playerState.velocityY = PLAYER.jumpStrength;
    playerState.isOnGround = false;
  }

  // Gravity
  playerState.velocityY += PHYSICS.gravity;
  position[playerEntityId].y += playerState.velocityY;

  // Ground collision
  const ground = groundLevel(canvasHeight);
  if (position[playerEntityId].y >= ground) {
    position[playerEntityId].y = ground;
    playerState.velocityY = 0;
    playerState.isOnGround = true;
  }
}
