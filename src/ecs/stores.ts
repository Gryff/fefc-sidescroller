import type {
  EntityId,
  Input,
  Position,
  Projectile,
  Sprite,
  Velocity,
} from "../components/components";

let entityIdCounter: EntityId = 0;

export function createEntity(): EntityId {
  return entityIdCounter++;
}

export const sprite: Sprite = {};
export const position: Position = {};
export const velocity: Velocity = {};
export const input: Input = {};
export const projectile: Projectile = {};
export const projectilePool: EntityId[] = [];
