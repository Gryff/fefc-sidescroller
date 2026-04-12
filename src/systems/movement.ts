import { PLAYER } from "../config";
import { entitiesWith } from "../ecs/query";
import { input, position } from "../ecs/stores";
import type { PlayerState } from "../types";

export function updateMovement(playerState: PlayerState, dt: number): void {
  const [playerEntityId] = entitiesWith("playerTag", "position", "input");
  if (playerEntityId === undefined) return;

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
}
