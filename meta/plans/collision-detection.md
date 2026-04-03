# Collision Detection

## Context

The game has zero collision detection between entities. The only spatial check is clamping the player's Y to `groundLevel` in `physics.ts`. Projectiles fly through the boss, the player walks through the boss, etc.

## Approach: AABB (Axis-Aligned Bounding Box)

Simplest fit for the game. Sprites are axis-aligned rectangles, entity count is low (<20), no rotation. Naive O(n^2) pair checking is fine at this scale. No need for spatial hashing or quadtrees.

---

## Status

**Phase 1 and Phase 2 are complete.**

- `entitiesWith()` exists in `ecs/query.ts`
- `PlayerTag` / `EnemyTag` types and stores exist
- Tags are attached in `entities.ts`
- All systems query internally; `GameContext` carries no entity IDs
- `playerEntityId` / `bossEntityId` are gone from `GameContext`

**Phase 3 (collision detection itself) is the remaining work.**

---

## ~~Phase 1: Query Infrastructure~~ ✓ Done

### ~~1.1 Entity query helper~~ ✓ Done

`entitiesWith()` lives in `ecs/query.ts`. Signature fix needed (see Known Issues below) — the current `...keys: K[]` variadic form allows zero arguments; should require at least one:

```ts
function entitiesWith<K extends keyof ComponentStores>(
  first: K,
  ...rest: K[]
): EntityId[]
```

### ~~1.2 Tag components~~ ✓ Done

`PlayerTag` and `EnemyTag` are in `components.ts`; stores are in `stores.ts`.

### ~~1.3 Attach tags during entity creation~~ ✓ Done

Both `createAssetPackPlayer()` and the boss creation in `loadEntities()` attach their respective tags.

---

## ~~Phase 2: Refactor Existing Systems~~ ✓ Done

All systems query internally. `GameContext` no longer carries entity IDs.

---

## Phase 3: Collision Detection

### 3.1 Collider component

Add both `layer` (what this entity _is_) and `mask` (what layers this entity _collides against_) to make the interaction matrix data-driven rather than hardcoded in the collision system:

```ts
export type Collider = Record<EntityId, {
  width: number;
  height: number;
  offsetX: number;  // offset from position for hitbox tuning
  offsetY: number;
  layer: number;    // bitmask: what this entity is
  mask: number;     // bitmask: what layers this entity collides with
}>;
```

Collision layers and masks in `config.ts`:

```ts
export const COLLISION_LAYER = {
  PLAYER:     1 << 0,  // 0b001
  ENEMY:      1 << 1,  // 0b010
  PROJECTILE: 1 << 2,  // 0b100
} as const;

// Masks declare what each layer collides against
export const COLLISION_MASK = {
  PLAYER:     COLLISION_LAYER.ENEMY,
  ENEMY:      COLLISION_LAYER.PLAYER | COLLISION_LAYER.PROJECTILE,
  PROJECTILE: COLLISION_LAYER.ENEMY,
} as const;
```

Pair compatibility check in the collision system:

```ts
const compatible =
  (a.layer & b.mask) !== 0 ||
  (b.layer & a.mask) !== 0;
```

This means adding a new interaction (e.g. friendly-fire) is a mask change in config, not a code change in the collision system.

### 3.2 CollisionEvents component

```ts
export type CollisionEvents = Record<EntityId, {
  collidingWith: EntityId[];
}>;
```

Stores per-frame collision results. Cleared at the start of each collision update. Other systems read this to react — keeps the collision system itself as a pure spatial query.

### 3.3 Collision system (`systems/collision.ts`)

Extract the AABB test as a pure, standalone function so it can be unit-tested without any store dependency:

```ts
export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function aabbOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left &&
         a.top  < b.bottom && a.bottom > b.top;
}
```

The system itself:

```ts
function updateCollision(): void {
  // 1. Clear previous frame's events
  // 2. Get all entities with Position + Collider
  // 3. For each pair, check mask/layer compatibility
  // 4. aabbOverlap test
  // 5. Write results into CollisionEvents
}
```

Where bounds are: `position.x + collider.offsetX`, `position.y + collider.offsetY`, `+ width/height`.

### 3.4 Inactive projectile policy

Projectiles are pooled: on deactivation, `projectile[id].active` is set to `false` but the entity's components remain. If a `Collider` component is left attached, `entitiesWith('position', 'collider')` will still return inactive projectiles and they will participate in collision checks.

**Policy: remove and restore the collider component alongside deactivation.**

In `spawnProjectile`: add `collider[projEntityId] = { ..., layer: COLLISION_LAYER.PROJECTILE, mask: COLLISION_MASK.PROJECTILE }`.

In `updateProjectiles` (the out-of-bounds deactivation path) and in `updateProjectileHits` (the hit deactivation path): `delete collider[projEntityId]` before returning to pool.

This keeps `entitiesWith('collider')` as the clean source of truth for active collision participants.

### 3.5 Attach colliders to entities

In `ecs/entities.ts`, during creation:
- Player gets `Collider` with `layer: COLLISION_LAYER.PLAYER`, `mask: COLLISION_MASK.PLAYER`, sized to sprite hitbox
- Boss gets `Collider` with `layer: COLLISION_LAYER.ENEMY`, `mask: COLLISION_MASK.ENEMY`
- Projectiles: collider attached on spawn, removed on deactivation (see 3.4)

Collider sizes go in `config.ts` alongside existing sprite dimensions.

### 3.6 Debug collider rendering

Hitbox tuning requires visual feedback. This is a first-class deliverable of Phase 3, not an afterthought.

Add a `DEBUG_COLLIDERS` flag to `config.ts`. When true, the renderer draws wireframe rects over each entity that has a `Collider` component, offset and sized correctly. Remove before shipping.

### 3.7 Reaction systems

**`updateProjectileHits`** — reads CollisionEvents for entities with `Projectile` component. If a projectile is colliding with an enemy: delete its collider, deactivate, return to pool, apply damage/effect to enemy.

**`updatePlayerDamage`** (future) — reads CollisionEvents for entities with `PlayerTag`. If colliding with an enemy: trigger knockback, damage, invincibility frames, etc.

### Files touched
- `src/components/components.ts` — Collider (with mask), CollisionEvents types
- `src/ecs/stores.ts` — collider, collisionEvents stores
- `src/ecs/query.ts` — fix zero-arg footgun (see Known Issues)
- `src/systems/collision.ts` (new) — aabbOverlap (exported pure fn), updateCollision
- `src/systems/projectile-hits.ts` (new) — updateProjectileHits
- `src/systems/projectile.ts` — attach collider on spawn, delete on deactivation
- `src/ecs/entities.ts` — attach colliders to player and boss
- `src/config.ts` — COLLISION_LAYER, COLLISION_MASK, collider sizes, DEBUG_COLLIDERS flag
- `src/game-loop.ts` — add collision + reaction systems to loop; fix execution order (see below)

---

## System Execution Order (after Phase 3)

```
joystickInput -> movement -> physics -> collision -> projectileHits -> playerDamage
  -> playerAnimation -> bossAnimation -> spriteAnimation -> scrolling -> render
```

Collision runs after movement/physics (positions are final for the frame), before animation/render (reactions can influence visuals).

Note: the current loop runs `updatePlayerAnimation` between `updateMovement` and `updatePhysics`. This means animation state lags a frame behind physics. The order above fixes this as a side-effect of adding collision.

---

## Testing

`aabbOverlap` is a pure function with no store dependency — it must have unit tests covering the overlap/no-overlap boundary cases.

The global store pattern (module-level `const position: Position = {}`) causes test state to bleed between test files unless stores are cleared. Add a `resetStores()` function to `ecs/stores.ts` that clears all stores and resets the entity ID counter. Call it in `beforeEach` for any test that touches stores.

Minimum test coverage for Phase 3:
- `aabbOverlap` — all four non-overlap directions, exact-edge (touching but not overlapping), and clear overlap
- `entitiesWith` — basic query, multi-key intersection, empty result
- `updateCollision` — a player/boss pair that overlaps should produce CollisionEvents; a player/projectile pair should not (mask filtering)

---

## Known Issues in Existing Code

**`entitiesWith()` zero-arg footgun** (`ecs/query.ts`): the current variadic signature `...keys: K[]` accepts zero arguments. Called with no args, `first` is `undefined` and `allStores[undefined]` throws at runtime. Fix the signature to require at least one key:

```ts
function entitiesWith<K extends keyof ComponentStores>(
  first: K,
  ...rest: K[]
): EntityId[]
```

---

## Notes

- **No broad-phase needed** at current entity counts. If the game later has dozens of enemies or bullets, add spatial hashing then.
- **PlayerState cleanup** (moving velocityY/isOnGround into components) is a natural follow-up but not required for collision to work.
