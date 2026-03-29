import type { EntityId } from "../components/components";
import { PROJECTILE } from "../config";
import {
  createEntity,
  position,
  projectile,
  projectilePool,
  sprite,
  velocity,
} from "../ecs/stores";

export function spawnProjectile(
  playerEntityId: EntityId,
  donutEntityId: EntityId,
  facingRight: boolean,
): void {
  let projEntityId: EntityId;
  if (projectilePool.length > 0) {
    projEntityId = projectilePool.pop()!;
  } else {
    projEntityId = createEntity();
  }

  const donutSpriteData = sprite[donutEntityId];
  if (donutSpriteData && donutSpriteData.image.complete) {
    sprite[projEntityId] = { ...donutSpriteData, currentFrame: 0 };
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

export function updateProjectiles(canvas: HTMLCanvasElement): void {
  for (const projId in projectile) {
    if (projectile[projId] && projectile[projId].active) {
      if (position[projId] && velocity[projId]) {
        position[projId].x += velocity[projId].x;
        position[projId].y += velocity[projId].y;

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
