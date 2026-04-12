import { PLAYER } from "../config";
import { entitiesWith } from "../ecs/query";
import { position } from "../ecs/stores";
import type { CameraState } from "../types";

const DEAD_ZONE_LEFT = 0.3;
const DEAD_ZONE_RIGHT = 0.6;

export function updateCamera(
  camera: CameraState,
  canvasWidth: number,
): void {
  const [playerEntityId] = entitiesWith("playerTag", "position");
  if (playerEntityId === undefined) return;

  // Clamp player to world bounds
  position[playerEntityId].x = Math.max(
    PLAYER.halfWidth,
    Math.min(camera.worldWidth - PLAYER.halfWidth, position[playerEntityId].x),
  );

  const playerX = position[playerEntityId].x;
  const deadLeft = camera.x + canvasWidth * DEAD_ZONE_LEFT;
  const deadRight = camera.x + canvasWidth * DEAD_ZONE_RIGHT;

  if (playerX < deadLeft) {
    camera.x = playerX - canvasWidth * DEAD_ZONE_LEFT;
  } else if (playerX > deadRight) {
    camera.x = playerX - canvasWidth * DEAD_ZONE_RIGHT;
  }

  // Clamp camera to world bounds
  camera.x = Math.max(0, Math.min(camera.worldWidth - canvasWidth, camera.x));
}
