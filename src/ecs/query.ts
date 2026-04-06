import type { EntityId } from "../components/components";
import {
  collider,
  collisionEvents,
  enemyTag,
  input,
  playerTag,
  position,
  projectile,
  sprite,
  velocity,
} from "./stores";

export type ComponentStores = {
  sprite: typeof sprite;
  position: typeof position;
  velocity: typeof velocity;
  input: typeof input;
  projectile: typeof projectile;
  playerTag: typeof playerTag;
  enemyTag: typeof enemyTag;
  collider: typeof collider;
  collisionEvents: typeof collisionEvents;
};

const allStores: ComponentStores = {
  sprite,
  position,
  velocity,
  input,
  projectile,
  playerTag,
  enemyTag,
  collider,
  collisionEvents,
};

export function entitiesWith<K extends keyof ComponentStores>(
  first: K,
  ...rest: K[]
): EntityId[] {
  const firstStore = allStores[first] as Record<number, unknown>;
  return Object.keys(firstStore)
    .map(Number)
    .filter((id) =>
      rest.every((k) => id in (allStores[k] as Record<number, unknown>)),
    );
}
