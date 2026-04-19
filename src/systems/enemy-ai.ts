import type { Direction } from "../components/components";
import { entitiesWith } from "../ecs/query";
import { patrolAI, position, velocity } from "../ecs/stores";

const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

export function updateEnemyAI(): void {
  for (const id of entitiesWith("patrolAI", "position", "velocity")) {
    const patrol = patrolAI[id];
    const pos = position[id];
    const vel = velocity[id];

    const dx = pos.x - patrol.originX;
    const dy = pos.y - patrol.originY;

    if (patrol.direction === "right" && dx >= patrol.range) patrol.direction = "left";
    if (patrol.direction === "left" && dx <= -patrol.range) patrol.direction = "right";
    if (patrol.direction === "down" && dy >= patrol.range) patrol.direction = "up";
    if (patrol.direction === "up" && dy <= -patrol.range) patrol.direction = "down";

    const v = DIRECTION_VECTORS[patrol.direction];
    vel.x = v.x * patrol.speed;
    vel.y = v.y * patrol.speed;
  }
}
