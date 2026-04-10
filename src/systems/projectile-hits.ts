import { entitiesWith } from "../ecs/query";
import {
  collider,
  collisionEvents,
  enemyTag,
  projectile,
  projectilePool,
} from "../ecs/stores";

export function updateProjectileHits(): void {
  const projectiles = entitiesWith("projectile", "collisionEvents");

  for (const projId of projectiles) {
    if (!projectile[projId].active) continue;

    const events = collisionEvents[projId];
    for (const otherId of events.collidingWith) {
      if (!(otherId in enemyTag)) continue;

      // Deactivate projectile: remove collider, mark inactive, return to pool
      delete collider[projId];
      projectile[projId].active = false;
      projectilePool.push(projId);
      break;
    }
  }
}
