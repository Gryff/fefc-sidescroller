import { PLAYER } from "../config";
import { entitiesWith } from "../ecs/query";
import { position } from "../ecs/stores";
import type { CameraState } from "../types";

const NARROW_VIEWPORT_WIDTH = 768;
const DEAD_ZONE_WIDE = { left: 0.3, right: 0.6 };
const DEAD_ZONE_NARROW = { left: 0.2, right: 0.35 };

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

  const deadZone = canvasWidth < NARROW_VIEWPORT_WIDTH ? DEAD_ZONE_NARROW : DEAD_ZONE_WIDE;
  const playerX = position[playerEntityId].x;
  const deadLeft = camera.x + canvasWidth * deadZone.left;
  const deadRight = camera.x + canvasWidth * deadZone.right;

  if (playerX < deadLeft) {
    camera.x = playerX - canvasWidth * deadZone.left;
  } else if (playerX > deadRight) {
    camera.x = playerX - canvasWidth * deadZone.right;
  }

  // Clamp camera to world bounds
  camera.x = Math.max(0, Math.min(camera.worldWidth - canvasWidth, camera.x));
}
