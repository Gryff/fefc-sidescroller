import { PLAYER } from "../config";
import { entitiesWith } from "../ecs/query";
import { input, position } from "../ecs/stores";
import type { PlayerState } from "../types";

/** Updates player movement. Returns previous X for scrolling. */
export function updateMovement(playerState: PlayerState, dt: number): number {
  const [playerEntityId] = entitiesWith("playerTag", "position", "input");
  if (playerEntityId === undefined) return 0;

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
