import type { EntityId, Sprite } from "../components/components";
import { PROJECTILE } from "../config";
import { entitiesWith } from "../ecs/query";
import {
  createEntity,
  position,
  projectile,
  projectilePool,
  sprite,
  velocity,
} from "../ecs/stores";

export function spawnProjectile(
  template: Sprite[number],
  facingRight: boolean,
): void {
  const [playerEntityId] = entitiesWith("playerTag", "position");
  if (playerEntityId === undefined) return;

  let projEntityId: EntityId;
  if (projectilePool.length > 0) {
    projEntityId = projectilePool.pop()!;
  } else {
    projEntityId = createEntity();
  }

  if (template.image.complete) {
    sprite[projEntityId] = { ...template, currentFrame: 0 };
    position[projEntityId] = {
      x: position[playerEntityId].x,
      y: position[playerEntityId].y,
    };
    velocity[projEntityId] = {
      x: facingRight ? PROJECTILE.speed : -PROJECTILE.speed,
      y: 0,
    };
    projectile[projEntityId] = { active: true };
  }
}

export function updateProjectiles(canvas: HTMLCanvasElement, dt: number): void {
  for (const projId in projectile) {
    if (projectile[projId] && projectile[projId].active) {
      if (position[projId] && velocity[projId]) {
        position[projId].x += velocity[projId].x * dt;
        position[projId].y += velocity[projId].y * dt;

        if (
          position[projId].x < 0 ||
          position[projId].x > canvas.width ||
          position[projId].y < 0 ||
          position[projId].y > canvas.height
        ) {
          projectile[projId].active = false;
          projectilePool.push(Number(projId));
        }
      }
    }
  }
}
