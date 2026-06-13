import { entitiesWith } from "../ecs/query";
import {
  collisionEvents,
  destroyEntity,
  health,
  pickup,
  playerTag,
} from "../ecs/stores";

// Player → pickup collection. Mirrors the projectile → enemy block in
// updateHealthDamage: scan entities carrying a pickup that registered a
// collision, and if the player is among them, apply the effect and destroy it.
// Returns the score gained this tick so the game loop can fold it into state.
export function updatePickups(): { scoreDelta: number } {
  let scoreDelta = 0;

  const pickups = entitiesWith("pickup", "collisionEvents");
  for (const pickupId of pickups) {
    const events = collisionEvents[pickupId];
    for (const otherId of events.collidingWith) {
      if (!(otherId in playerTag)) continue;

      const data = pickup[pickupId];
      if (data.kind === "coin") {
        scoreDelta += data.value;
      } else if (data.kind === "health" && otherId in health) {
        const h = health[otherId];
        h.current = Math.min(h.max, h.current + data.value);
      }

      destroyEntity(pickupId);
      break;
    }
  }

  return { scoreDelta };
}
