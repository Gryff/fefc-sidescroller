# Collision Detection + Entity Query Refactor

## Context

The game has zero collision detection between entities. The only spatial check is clamping the player's Y to `groundLevel` in `physics.ts`. Projectiles fly through the boss, the player walks through the boss, etc.

Additionally, the ECS has a hardcoded entity ID problem (flagged in spec.md): systems receive `playerEntityId`/`bossEntityId` as explicit parameters. This must be fixed first — collision detection depends on being able to query entities by component.

## Approach: AABB (Axis-Aligned Bounding Box)

Simplest fit for the game. Sprites are axis-aligned rectangles, entity count is low (<20), no rotation. Naive O(n^2) pair checking is fine at this scale. No need for spatial hashing or quadtrees.

---

## Phase 1: Query Infrastructure

### 1.1 Entity query helper

Add an `entitiesWith()` function to `ecs/stores.ts` (or a new `ecs/query.ts`):

```ts
function entitiesWith<K extends keyof ComponentStores>(
  ...keys: K[]
): EntityId[]
```

Returns all EntityIds present in every specified component store. This replaces hardcoded ID passing throughout the codebase.

### 1.2 Tag components

Add marker components to distinguish entity roles without hardcoded IDs:

- `PlayerTag` — `Record<EntityId, true>`
- `EnemyTag` — `Record<EntityId, true>`

Add to `components.ts` as types, add stores to `stores.ts`.

### 1.3 Attach tags during entity creation

In `ecs/entities.ts`:
- `createAssetPackPlayer()` attaches `PlayerTag`
- `loadEntities()` boss creation attaches `EnemyTag`

### Files touched
- `src/components/components.ts` — new tag types
- `src/ecs/stores.ts` — new tag stores
- `src/ecs/query.ts` (new) — `entitiesWith()` helper
- `src/ecs/entities.ts` — attach tags on creation

---

## Phase 2: Refactor Existing Systems

Remove hardcoded entity ID params. Each system queries for what it needs internally.

### 2.1 Systems to refactor

| System | Currently receives | After refactor |
|--------|-------------------|----------------|
| `updateMovement` | `playerEntityId, canvas, playerState` | Queries `entitiesWith('playerTag', 'position', 'input')` |
| `updatePhysics` | `playerEntityId, playerState, canvasHeight` | Queries `entitiesWith('playerTag', 'position')` |
| `updatePlayerAnimation` | `playerEntityId, playerState` | Queries `entitiesWith('playerTag', 'sprite')` |
| `updateBossAnimation` | `bossEntityId, bossState` | Queries `entitiesWith('enemyTag', 'sprite')` |
| `updateScrolling` | `playerEntityId, canvas, scrollState, bgImage` | Queries `entitiesWith('playerTag', 'position')` |
| `spawnProjectile` | `playerEntityId, template, facingRight` | Queries `entitiesWith('playerTag', 'position')` |
| `renderer` | `gameCtx (carries entity IDs)` | Queries as needed |

### 2.2 Clean up GameContext

Remove `playerEntityId` and `bossEntityId` from `GameContext` in `types.ts`. Systems no longer need them passed in.

### 2.3 Clean up PlayerState

`PlayerState` holds physics state (`velocityY`, `isOnGround`) that arguably belongs in components (Velocity already has `y`). However, this refactor is optional and can be deferred — the immediate goal is removing hardcoded entity IDs from system signatures, not restructuring all state.

### Files touched
- `src/systems/movement.ts`
- `src/systems/physics.ts`
- `src/systems/player-animation.ts`
- `src/systems/boss-animation.ts`
- `src/systems/scrolling.ts`
- `src/systems/projectile.ts`
- `src/rendering/renderer.ts`
- `src/types.ts` — trim GameContext
- `src/game-loop.ts` — update system call sites

---

## Phase 3: Collision Detection

### 3.1 Collider component

```ts
export type Collider = Record<EntityId, {
  width: number;
  height: number;
  offsetX: number;  // offset from position for hitbox tuning
  offsetY: number;
  layer: number;    // bitmask for collision filtering
}>;
```

Collision layers (bitmask):
```ts
const COLLISION_LAYER = {
  PLAYER:     1 << 0,  // 0b001
  ENEMY:      1 << 1,  // 0b010
  PROJECTILE: 1 << 2,  // 0b100
} as const;
```

Collision matrix (which layers interact):
- PROJECTILE <-> ENEMY (donuts hit boss)
- PLAYER <-> ENEMY (player takes damage from boss)
- PLAYER !<-> PROJECTILE (player's own projectiles don't hit them)

### 3.2 CollisionEvents component

```ts
export type CollisionEvents = Record<EntityId, {
  collidingWith: EntityId[];
}>;
```

Stores per-frame collision results. Cleared at the start of each collision update. Other systems read this to react — keeps the collision system itself as a pure spatial query.

### 3.3 Collision system (`systems/collision.ts`)

```ts
function updateCollision(): void {
  // 1. Clear previous frame's events
  // 2. Get all entities with Position + Collider
  // 3. For each pair, check layer compatibility
  // 4. AABB overlap test
  // 5. Write results into CollisionEvents
}
```

AABB test:
```
overlap = A.left < B.right && A.right > B.left &&
          A.top  < B.bottom && A.bottom > B.top
```

Where bounds are derived from Position + Collider offset + Collider size.

### 3.4 Attach colliders to entities

In `ecs/entities.ts`, during creation:
- Player gets `Collider` with `layer: PLAYER`, sized to sprite hitbox
- Boss gets `Collider` with `layer: ENEMY`
- Projectiles get `Collider` with `layer: PROJECTILE` on spawn

Collider sizes go in `config.ts` alongside existing sprite dimensions.

### 3.5 Reaction systems

**`updateProjectileHits`** — reads CollisionEvents for entities with `Projectile` component. If a projectile is colliding with an enemy: deactivate projectile, return to pool, apply damage/effect to enemy.

**`updatePlayerDamage`** (future) — reads CollisionEvents for entities with `PlayerTag`. If colliding with an enemy: trigger knockback, damage, invincibility frames, etc.

### Files touched
- `src/components/components.ts` — Collider, CollisionEvents types
- `src/ecs/stores.ts` — collider, collisionEvents stores
- `src/systems/collision.ts` (new) — updateCollision
- `src/systems/projectile-hits.ts` (new) — updateProjectileHits
- `src/ecs/entities.ts` — attach colliders
- `src/config.ts` — collider sizes, collision layers
- `src/game-loop.ts` — add collision + reaction systems to loop

---

## System Execution Order (after all phases)

```
joystickInput -> movement -> physics -> collision -> projectileHits -> playerDamage
  -> playerAnimation -> bossAnimation -> spriteAnimation -> scrolling -> render
```

Collision runs after movement/physics (positions are final for the frame), before animation/render (reactions can influence visuals).

---

## Notes

- **No broad-phase needed** at current entity counts. If the game later has dozens of enemies or bullets, add spatial hashing then.
- **PlayerState cleanup** (moving velocityY/isOnGround into components) is a natural follow-up but not required for collision to work.
- **Debug rendering** — drawing collider outlines is valuable during development. Can be a simple flag that draws wireframe rects over entities with Collider components.
