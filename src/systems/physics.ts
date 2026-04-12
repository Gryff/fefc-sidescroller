import { PHYSICS, PLAYER, WORLD } from "../config";
import { entitiesWith } from "../ecs/query";
import { input, position } from "../ecs/stores";
import type { PlayerState } from "../types";

export function updatePhysics(playerState: PlayerState, dt: number): void {
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
  if (position[playerEntityId].y >= WORLD.groundY) {
    position[playerEntityId].y = WORLD.groundY;
    playerState.velocityY = 0;
    playerState.isOnGround = true;
  }
}
