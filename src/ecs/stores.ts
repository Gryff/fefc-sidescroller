import type {
  Collider,
  CollisionEvents,
  Damage,
  EnemyTag,
  EntityId,
  Flying,
  Grounded,
  Health,
  Input,
  PatrolAI,
  PlayerTag,
  Position,
  Projectile,
  Solid,
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
export const playerTag: PlayerTag = {};
export const enemyTag: EnemyTag = {};
export const collider: Collider = {};
export const collisionEvents: CollisionEvents = {};
export const health: Health = {};
export const solid: Solid = {};
export const grounded: Grounded = {};
export const flying: Flying = {};
export const patrolAI: PatrolAI = {};
export const damage: Damage = {};

export const allStores = {
  sprite,
  position,
  velocity,
  input,
  projectile,
  playerTag,
  enemyTag,
  collider,
  collisionEvents,
  health,
  solid,
  grounded,
  flying,
  patrolAI,
  damage,
};

export function resetStores(): void {
  entityIdCounter = 0;
  for (const store of Object.values(allStores)) {
    for (const key in store) {
      delete (store as Record<string, unknown>)[key];
    }
  }
  projectilePool.length = 0;
}

export function destroyEntity(id: EntityId): void {
  for (const store of Object.values(allStores)) {
    delete (store as Record<string, unknown>)[id];
  }
}
