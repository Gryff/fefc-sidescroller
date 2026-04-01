import { PHYSICS, PLAYER, groundLevel } from "../config";
import { entitiesWith } from "../ecs/query";
import { input, position } from "../ecs/stores";
import type { PlayerState } from "../types";

export function updatePhysics(
  playerState: PlayerState,
  canvasHeight: number,
  dt: number,
): void {
  const [playerEntityId] = entitiesWith("playerTag", "position", "input");
  if (playerEntityId === undefined) return;

  // Jump
  if (input[playerEntityId].up && playerState.isOnGround) {
    playerState.velocityY = PLAYER.jumpStrength;
    playerState.isOnGround = false;
  }

  // Gravity
  playerState.velocityY += PHYSICS.gravity * dt;
  position[playerEntityId].y += playerState.velocityY * dt;

  // Ground collision
  const ground = groundLevel(canvasHeight);
  if (position[playerEntityId].y >= ground) {
    position[playerEntityId].y = ground;
    playerState.velocityY = 0;
    playerState.isOnGround = true;
  }
}
