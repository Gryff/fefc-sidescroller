import { entitiesWith } from "../ecs/query";
import {
  collisionEvents,
  destroyEntity,
  enemyTag,
  health,
  projectile,
} from "../ecs/stores";

export function updateHealthDamage(): { playerDied: boolean } {
  // Projectile → enemy damage
  const projectiles = entitiesWith("projectile", "collisionEvents");
  for (const projId of projectiles) {
    if (!projectile[projId].active) continue;

    const events = collisionEvents[projId];
    for (const otherId of events.collidingWith) {
      if (!(otherId in enemyTag)) continue;
      if (!(otherId in health)) continue;

      health[otherId].current -= 1;
      if (health[otherId].current <= 0) {
        destroyEntity(otherId);
      }
    }
  }

  // Contact → player damage
  let playerDied = false;
  const players = entitiesWith("playerTag", "collisionEvents");
  for (const playerId of players) {
    const events = collisionEvents[playerId];
    for (const otherId of events.collidingWith) {
      if (!(otherId in enemyTag)) continue;

      health[playerId].current -= 1;
      if (health[playerId].current <= 0) {
        playerDied = true;
      }
    }
  }

  return { playerDied };
}
