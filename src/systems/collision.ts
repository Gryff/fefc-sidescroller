import { entitiesWith } from "../ecs/query";
import { collider, collisionEvents, position } from "../ecs/stores";

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function aabbOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

export function updateCollision(): void {
  // Clear previous frame's events
  for (const id in collisionEvents) {
    delete collisionEvents[id];
  }

  const entities = entitiesWith("position", "collider");
  const len = entities.length;

  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      const idA = entities[i];
      const idB = entities[j];
      const cA = collider[idA];
      const cB = collider[idB];

      // Check layer/mask compatibility
      const compatible =
        (cA.layer & cB.mask) !== 0 || (cB.layer & cA.mask) !== 0;
      if (!compatible) continue;

      const pA = position[idA];
      const pB = position[idB];

      const rectA: Rect = {
        left: pA.x + cA.offsetX - cA.width / 2,
        right: pA.x + cA.offsetX + cA.width / 2,
        top: pA.y + cA.offsetY - cA.height / 2,
        bottom: pA.y + cA.offsetY + cA.height / 2,
      };

      const rectB: Rect = {
        left: pB.x + cB.offsetX - cB.width / 2,
        right: pB.x + cB.offsetX + cB.width / 2,
        top: pB.y + cB.offsetY - cB.height / 2,
        bottom: pB.y + cB.offsetY + cB.height / 2,
      };

      if (aabbOverlap(rectA, rectB)) {
        if (!collisionEvents[idA]) {
          collisionEvents[idA] = { collidingWith: [] };
        }
        collisionEvents[idA].collidingWith.push(idB);

        if (!collisionEvents[idB]) {
          collisionEvents[idB] = { collidingWith: [] };
        }
        collisionEvents[idB].collidingWith.push(idA);
      }
    }
  }
}
