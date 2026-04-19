import type { EntityId, Sprite } from "../components/components";
import { COLLIDER_SIZE, COLLISION_LAYER, COLLISION_MASK, PROJECTILE } from "../config";
import { entitiesWith } from "../ecs/query";
import {
  collider,
  createEntity,
  flying,
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
    flying[projEntityId] = true;
    projectile[projEntityId] = { active: true };
    collider[projEntityId] = {
      ...COLLIDER_SIZE.PROJECTILE,
      layer: COLLISION_LAYER.PROJECTILE,
      mask: COLLISION_MASK.PROJECTILE,
    };
  }
}

export function updateProjectiles(
  cameraX: number,
  canvasWidth: number,
): void {
  const margin = 200;
  for (const projId in projectile) {
    if (projectile[projId] && projectile[projId].active) {
      if (position[projId] && velocity[projId]) {
        if (
          position[projId].x < cameraX - margin ||
          position[projId].x > cameraX + canvasWidth + margin ||
          position[projId].y < -margin ||
          position[projId].y > 1000
        ) {
          delete collider[Number(projId)];
          projectile[projId].active = false;
          projectilePool.push(Number(projId));
        }
      }
    }
  }
}
