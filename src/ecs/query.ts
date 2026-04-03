import type { EntityId } from "../components/components";
import {
  enemyTag,
  input,
  playerTag,
  position,
  projectile,
  sprite,
  velocity,
} from "./stores";

type ComponentStores = {
  sprite: typeof sprite;
  position: typeof position;
  velocity: typeof velocity;
  input: typeof input;
  projectile: typeof projectile;
  playerTag: typeof playerTag;
  enemyTag: typeof enemyTag;
};

const allStores: ComponentStores = {
  sprite,
  position,
  velocity,
  input,
  projectile,
  playerTag,
  enemyTag,
};

export function entitiesWith<K extends keyof ComponentStores>(
  ...keys: K[]
): EntityId[] {
  const [first, ...rest] = keys;
  const firstStore = allStores[first] as Record<number, unknown>;
  return Object.keys(firstStore)
    .map(Number)
    .filter((id) =>
      rest.every((k) => id in (allStores[k] as Record<number, unknown>)),
    );
}
