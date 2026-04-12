import type { EntityId } from "../components/components";
import { allStores } from "./stores";

export type ComponentStores = typeof allStores;

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
