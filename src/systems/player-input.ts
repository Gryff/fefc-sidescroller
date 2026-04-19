import { PLAYER } from "../config";
import { entitiesWith } from "../ecs/query";
import { input, velocity } from "../ecs/stores";
import type { PlayerState } from "../types";

export function updatePlayerInput(playerState: PlayerState): void {
  const [playerEntityId] = entitiesWith("playerTag", "velocity", "input");
  if (playerEntityId === undefined) return;

  playerState.isMoving = false;
  let vx = 0;
  if (input[playerEntityId].left) {
    vx -= PLAYER.speed;
    playerState.facingRight = false;
    playerState.isMoving = true;
  }
  if (input[playerEntityId].right) {
    vx += PLAYER.speed;
    playerState.facingRight = true;
    playerState.isMoving = true;
  }
  velocity[playerEntityId].x = vx;
}
