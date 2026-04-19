# Enemy + Patrol AI Plan

Implementation plan for step 5 of `level-design-research.md`: walker enemies spawned from level data that patrol back and forth (or up and down) and deal contact damage to the player.

## Scope

This step introduces the **first non-boss dynamic entity**. Pickups, obstacles, and boss-death win state are out of scope — they're separate steps in the research doc.

The work is split into two phases:
- **Phase 1** — refactor movement into intent + integrator so the existing code can drive arbitrary entities via velocity. No gameplay change. Enemies need this to exist first; otherwise their velocity writes are no-ops.
- **Phase 2** — introduce the patrol AI, walker entity, schema/loader additions, and contact-damage wiring on top of the refactored pipeline.

In scope:
- Movement refactor: split player-input intent from velocity integration, add a generic integrator that runs for all velocity-bearing entities.
- `Flying` tag (gravity opt-out) — needed in phase 1 for projectiles, reused in phase 2 for vertical patrollers.
- `PatrolAI` component + `Direction` type
- `enemy-ai` system (writes to `velocity` based on patrol state)
- `Damage` component (for contact damage; shared later with obstacles)
- Walker enemy creation helper
- `"enemy"` entity type in the level loader + schema
- Contact-damage wiring so walkers hurt the player on overlap
- Tests for the refactored movement pipeline and the AI system

Explicitly **descoped** (see `spec.md`):
- Arbitrary-angle patrol (cardinal directions only for now — `Direction` union)
- Vertical patrol *walkers* — `"up"` / `"down"` variants of `Direction` are reserved and the `Flying` opt-out exists from phase 1, but no walker uses them in this step. Adding a vertical walker is a follow-up.
- Wall-bounce / edge-turnaround refinements (flip direction when `velocity.x` gets zeroed by platform-collision, or probe ahead for ledges)

---

# Phase 1 — Movement Pipeline Refactor

**Goal:** every dynamic entity moves through the same path: an intent system sets `velocity`, a single integrator applies `velocity` to `position` and handles gravity, and platform-collision resolves overlaps. No enemies yet — this phase is a pure refactor that must leave observable player behavior unchanged.

## 1.1 Current state (what's wrong)

- `updateMovement` (`src/systems/movement.ts`) reads `input` and writes directly to `position.x`. It never touches velocity, so horizontal motion bypasses the collision pipeline entirely — the player's `v.x` is always 0.
- `updatePhysics` (`src/systems/physics.ts`) integrates velocity → position **only for the player** (hardcoded `entitiesWith("playerTag", ...)`). Any other entity with velocity is never integrated.
- Net effect: walkers added later would have their velocity set by AI but would never actually move.

## 1.2 Target shape

Three roles, one system each:

1. **Intent** — `updatePlayerInput` (rename of `updateMovement`) writes `velocity.x` from `input`. Later, `updateEnemyAI` writes `velocity.{x,y}` from patrol state.
2. **Integration** — a single `updatePhysics` loops all `entitiesWith("position", "velocity")`: applies gravity to `velocity.y`, applies jump impulse where applicable, then writes `position += velocity * dt`.
3. **Resolution** — `updatePlatformCollision` + `resolveWorldGround` stay as-is.

## 1.3 Changes

### `src/systems/movement.ts` → `src/systems/player-input.ts`

Rename the file and export `updatePlayerInput`. Replace position writes with velocity writes:

```ts
export function updatePlayerInput(playerState: PlayerState): void {
  const [id] = entitiesWith("playerTag", "velocity", "input");
  if (id === undefined) return;

  playerState.isMoving = false;
  let vx = 0;
  if (input[id].left)  { vx -= PLAYER.speed; playerState.facingRight = false; playerState.isMoving = true; }
  if (input[id].right) { vx += PLAYER.speed; playerState.facingRight = true;  playerState.isMoving = true; }
  velocity[id].x = vx;
}
```

Notes:
- No `dt` parameter — intent systems write per-frame-at-60fps velocity; the integrator scales by `dt`.
- Zeroing `vx` when neither key is held preserves the current "instant stop on release" feel. Without this, the player would keep sliding at the last-set speed.
- `PLAYER.speed` stays at its current value (3). Semantics shift from "pixels per frame of position" to "pixels per 60fps-frame of velocity" — numerically identical once integration runs once per frame.

### `src/systems/physics.ts` — generalise the integrator

```ts
export function updatePhysics(dt: number): void {
  // Jump impulse (player-specific, reads grounded from previous frame)
  const [playerId] = entitiesWith("playerTag", "velocity", "input");
  if (playerId !== undefined && input[playerId].up && playerId in grounded) {
    velocity[playerId].y = PLAYER.jumpStrength;
    delete grounded[playerId];
  }

  // Gravity + integrate for every entity with position + velocity
  for (const id of entitiesWith("position", "velocity")) {
    if (!(id in flying)) {
      velocity[id].y += PHYSICS.gravity * dt;
    }
    position[id].x += velocity[id].x * dt;
    position[id].y += velocity[id].y * dt;
  }
}
```

Notes:
- Gravity applies to every velocity-bearing entity *except* those tagged `flying`. Horizontal walkers (phase 2) and the player rely on this; projectiles and future vertical patrollers opt out via `flying`.
- Jump handling stays player-specific. It's a one-shot impulse, not a recurring force, so it doesn't belong in the generic loop.
- `resolveWorldGround` is unchanged — it remains a player-only safety net. Enemies that fall through the floor before colliders are configured would indicate a level-authoring bug, not a physics bug.

### `Flying` tag — `src/components/components.ts` + stores

```ts
export type Flying = Record<EntityId, true>;
```

Wire `flying: Flying = {}` into `src/ecs/stores.ts` and add it to `allStores`. Opt-out semantics: by default everything with `velocity` gets gravity; tag with `flying` to skip it.

### Projectiles — fix double-integration and add `flying`

Without changes, projectiles would (a) be integrated twice per frame (once in `updateProjectiles`, once in the new generic loop) and (b) suddenly inherit gravity. Fix both at the source:

- In `src/systems/projectile.ts::updateProjectiles`, drop the `position += velocity * dt` lines. The generic integrator now handles it. Keep the off-screen culling and pool recycling.
- In `src/systems/projectile.ts::spawnProjectile`, set `flying[projEntityId] = true` after the velocity assignment so the integrator skips gravity for projectiles.
- Make sure `flying` is cleaned up when a projectile is recycled — the pool path overwrites `position`/`velocity` but leaves stale stores. Adding `flying[projEntityId] = true` on every spawn is idempotent, so this is fine; just don't `delete flying[id]` on cull. (Alternative: clear it on cull and re-set on respawn — six of one.)

### `src/game-loop.ts`

Update imports and call site:

```
applyJoystickInput(...)
updatePlayerInput(state.player)      // was updateMovement(state.player, dt)
updatePhysics(dt)                    // now integrates all entities
updatePlatformCollision()
resolveWorldGround()
updateProjectiles(...)
updateCollision()
updateProjectileHits()
updateHealthDamage()
```

No new systems in phase 1. `updateEnemyAI` slots in in phase 2, after `updatePlayerInput` and before `updatePhysics`.

### `createAssetPackPlayer`

No change — already initialises `velocity: { x: 0, y: 0 }`.

### Boss

`createBoss` currently sets `velocity: { x: 0, y: 0 }`. Under the new integrator, gravity would start pulling the boss down. **Decision: remove the `velocity` line from `createBoss` for phase 1.** The boss has no velocity-driven behavior today, so dropping the component costs nothing and avoids any "is the boss standing on a solid?" audit. When boss AI lands, re-add `velocity` and either ground the boss on a platform or tag it `flying`.

## 1.4 Tests

### New: `src/__tests__/physics.test.ts` (or extend existing)

1. **Integrates horizontal velocity** — entity with `velocity.x = 2`, `dt = 1` → `position.x` advances by 2.
2. **Integrates vertical velocity + gravity** — entity with `velocity.y = 0` → after one tick, `velocity.y === PHYSICS.gravity * dt` and `position.y` advances accordingly.
3. **Respects dt** — same setup, `dt = 2` → velocity and position changes double.
4. **Player jump impulse** — player with `grounded` set and `input.up = true` → `velocity.y === PLAYER.jumpStrength`, `grounded` cleared.
5. **Non-player entities don't jump** — entity with velocity but no `playerTag` + no `input` is integrated but receives no impulse.

### Update: player-input tests

Rename/relocate any existing `movement.test.ts`. Cover:
1. `input.right` → `velocity.x > 0`, `facingRight = true`.
2. `input.left` → `velocity.x < 0`.
3. Neither held → `velocity.x === 0`.
4. Both held → `velocity.x === 0` (matches current behavior: left first, then right cancels).

### Manual verification

Before moving to phase 2:
- Player moves, jumps, lands, and stops exactly as before.
- Projectiles fly horizontally at the same speed as before (no gravity drop, no 2× speed). The integration was moved into the generic loop and `flying` was added at spawn — confirm both visually.

## 1.5 Order of operations (phase 1)

1. Add tests for the target behavior (some will fail until the refactor lands).
2. Add `Flying` type + `flying` store; wire into `allStores`.
3. Rename `movement.ts` → `player-input.ts`; switch to velocity writes.
4. Generalise `updatePhysics` to loop all entities; skip gravity for `flying`; keep player-jump branch.
5. Drop the redundant `position += velocity * dt` from `updateProjectiles`; tag projectiles `flying` in `spawnProjectile`.
6. Remove `velocity` from `createBoss`.
7. Update `game-loop.ts` imports + call order.
8. Run tests + manual browser verification — player and projectile feel must be unchanged.

---

# Phase 2 — Patrol AI, Walkers, Contact Damage

**Goal:** on top of the refactored pipeline, add the first patrolling enemy type end-to-end.

## 1. New Components

### `Direction` type

In `src/components/components.ts`:

```ts
export type Direction = "left" | "right" | "up" | "down";
```

Used by `PatrolAI` now; reusable for sprite-facing state later.

### `PatrolAI`

```ts
export type PatrolAI = Record<
  EntityId,
  {
    originX: number;    // captured at spawn from entity's world x
    originY: number;    // captured at spawn from entity's world y
    range: number;      // world units travelled in each direction from origin
    speed: number;      // magnitude, always positive
    direction: Direction;
  }
>;
```

- `originX`/`originY` are set once at spawn, not from JSON — level authors specify `x`, `y`, and `range`, and the loader captures the spawn position as origin.
- `speed` is always non-negative; direction supplies the sign via the vector lookup in the AI system.

### `Damage`

```ts
export type Damage = Record<
  EntityId,
  {
    amount: number;
  }
>;
```

Shared with obstacles in a later step. Kept minimal for now — no `cooldown` field; the existing `health-damage` system handles contact damage each tick and invincibility frames are a separate tracked todo.

### Store wiring

In `src/ecs/stores.ts`:
- Add `patrolAI: PatrolAI = {}` and `damage: Damage = {}` exports.
- Add both to `allStores`.
- `resetStores` already iterates `allStores`, so no extra cleanup needed.

## 2. New System — `src/systems/enemy-ai.ts`

```ts
import { entitiesWith } from "../ecs/query";
import { patrolAI, position, velocity } from "../ecs/stores";
import type { Direction } from "../components/components";

const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
};

export function updateEnemyAI(dt: number): void {
  for (const id of entitiesWith("patrolAI", "position", "velocity")) {
    const patrol = patrolAI[id];
    const pos = position[id];
    const vel = velocity[id];

    const dx = pos.x - patrol.originX;
    const dy = pos.y - patrol.originY;

    if (patrol.direction === "right" && dx >=  patrol.range) patrol.direction = "left";
    if (patrol.direction === "left"  && dx <= -patrol.range) patrol.direction = "right";
    if (patrol.direction === "down"  && dy >=  patrol.range) patrol.direction = "up";
    if (patrol.direction === "up"    && dy <= -patrol.range) patrol.direction = "down";

    const v = DIRECTION_VECTORS[patrol.direction];
    vel.x = v.x * patrol.speed;
    vel.y = v.y * patrol.speed;
  }
}
```

**Notes:**
- No `dt` parameter — per the phase-1 convention, intent systems write per-60fps-frame velocity; the integrator in `updatePhysics` scales by `dt`. `updateEnemyAI` doesn't need `dt` at all.
- Writes `velocity`, not `position`, so the phase-1 integrator moves the walker and `platform-collision` resolves overlaps.
- Flip conditions check *before* setting velocity so the enemy never over-commits past `range`.
- `v.y * patrol.speed` is always 0 for horizontal walkers in this step. The vertical branch is functional — a future flyer entity can use `direction: "up" | "down"` provided it's tagged `flying` (added in phase 1) so gravity doesn't overwrite `vel.y`. No walker uses vertical patrol in this step.
- **Wall-stall caveat:** `platform-collision` zeros `velocity.x` when a walker is pushed out of a wall, but `updateEnemyAI` rewrites the same direction next frame, so a walker mashed against a wall will sit there spinning. Until edge-turnaround lands, level authors must position walkers so their patrol range fits between walls (also called out in §10).

## 3. Contact Damage Wiring

Walkers need to hurt the player on overlap. The existing `health-damage` system currently handles contact damage with a hardcoded `enemyTag` check (any entity tagged `enemyTag` colliding with the player deals 1 damage). Replace this with a component-driven path:

- Iterate entities with both `damage` and `collisionEvents`.
- For each `collidingWith` target that has `health` + `playerTag`, reduce `health.current` by `damage.amount`.

**Drop the `enemyTag` check entirely** — damage now flows from the `damage` component, not a tag. This means any enemy without a `damage` component silently stops hurting the player, so the boss must get one (see section 5). Walkers get it via `createWalker`. Future damage sources (obstacles, hazards) just attach `damage` and don't need to be enemies.

No invincibility frames yet — already in `spec.md` as a follow-up.

## 4. Walker Entity Helper — `src/ecs/entities.ts`

Add `createWalker(config)`:

```ts
export interface WalkerConfig {
  x: number;
  y: number;
  health: number;
  damage: number;
  range: number;
  speed: number;
  direction: Direction;
}
```

Components attached:
- `position`, `velocity` (initial `{ x: 0, y: 0 }`)
- `collider` — uses `ENEMY` layer, mask includes `PLAYER | PROJECTILE | PLATFORM`
- `enemyTag`
- `health` with `{ current: config.health, max: config.health }`
- `damage` with `{ amount: config.damage }`
- `patrolAI` with `{ originX: config.x, originY: config.y, range, speed, direction }`
- Placeholder visual: a colored rect, not a sprite. Keeps `createWalker` synchronous (no image loading), unlike `createBoss`. The renderer needs a fallback path for entities that have `position`+`collider` but no `sprite` — pick a fixed debug color and draw a rect at the collider bounds. Dedicated walker sprite art is a follow-up.

## 5. Level Schema + Loader

### `src/level/level-schema.ts`

Add `WalkerEntity` to the discriminated union:

```ts
interface WalkerEntity {
  type: "enemy";
  subtype: "walker";
  x: number;
  y: number;
  health: number;
  damage: number;
  patrol: {
    range: number;
    speed: number;
    direction: Direction;
  };
}
```

`subtype` is kept from the research doc so future enemy kinds (flyer, turret) can be added without another top-level `type`.

### `src/level/level-loader.ts`

Add a `case "enemy":` branch in `spawnLevel`'s switch. Dispatch on `subtype`:

```ts
case "enemy":
  switch (entity.subtype) {
    case "walker":
      createWalker({
        x: entity.x,
        y: worldY,
        health: entity.health,
        damage: entity.damage,
        range: entity.patrol.range,
        speed: entity.patrol.speed,
        direction: entity.patrol.direction,
      });
      break;
    default: {
      const bad = entity as { subtype: string };
      throw new Error(`Unknown enemy subtype: '${bad.subtype}'`);
    }
  }
  break;
```

Also update `createBoss` to attach a `damage` component so the same contact-damage system handles it. Add a `damage: number` field to `BossEntity` in the schema and thread it through the loader. Existing `level-1.json` boss entries need the field added (pick a value consistent with current "1 per contact" behavior).

### `validateLevel`

Out of scope to rewrite (already flagged in `spec.md` as "validates rather than parses"). Leave the function as-is; the walker entity fields will silently pass through unvalidated like the others until the parser refactor lands.

## 6. Game Loop Order

Insert `updateEnemyAI()` (no args) between `updatePlayerInput` and `updatePhysics`, so both intent systems run before the single integration step:

```
applyJoystickInput
updatePlayerInput(state.player)
updateEnemyAI()
updatePhysics(dt)          // integrates all velocity-bearing entities
updatePlatformCollision()
resolveWorldGround()
updateProjectiles(...)
updateCollision()
updateProjectileHits()
updateHealthDamage()
```

## 7. Level JSON Update

Add one or two walkers to `public/levels/level-1.json` — e.g. patrolling between platforms around `x: 1200` and `x: 1800`. Keeps the walker visible in normal play for manual testing.

## 8. Tests — `src/__tests__/enemy-ai.test.ts`

Use the existing vitest pattern: `resetStores` in `beforeEach`, create entities via stores directly, call `updateEnemyAI()`, assert.

Cases:
1. **Moves right** — walker with `direction: "right"`, speed 2 → `velocity.x === 2`, `velocity.y === 0`.
2. **Moves left** — mirror of #1.
3. **Flips at right boundary** — position `originX + range`, direction `"right"` → after tick, direction is `"left"` and velocity.x is negative.
4. **Flips at left boundary** — mirror of #3.
5. **Velocity is dt-independent** — intent system writes velocity-per-frame; `updateEnemyAI` takes no `dt`. Integration scaling is covered by the phase-1 physics tests, not here.
6. **No-op without required components** — entity missing `velocity` is skipped (no throw).
7. **Origin captured at spawn** — construct via `createWalker` at `x=500`, verify `patrolAI.originX === 500` regardless of where position drifts later.

### Loader test addition

Extend `src/__tests__/level-loader.test.ts`:
- Walker fixture spawns → `patrolAI`, `damage`, `health`, `enemyTag`, `collider` stores all populated with correct values; world y resolved.

### Not tested here
- Contact damage (covered by extending `health-damage.test.ts` — one case: entity with `damage` + collision with player reduces `health.current`).
- Vertical patrol behavior — only the shape is prepared; no walker uses `up`/`down` in this step.

## 9. Order of Operations (phase 2)

Prerequisite: phase 1 merged and verified (player feel unchanged, physics integrator running for all velocity-bearing entities).

1. Add `Direction`, `PatrolAI`, `Damage` types to `components.ts`; wire stores in `stores.ts`.
2. Write `enemy-ai.ts` system + tests.
3. Add `createWalker` in `entities.ts`; extend `BossEntity` schema with `damage`, attach `damage` to `createBoss`, update `level-1.json` boss entry.
4. Extend `health-damage` system to iterate any `damage`+`collisionEvents` entity hitting a player; update `health-damage.test.ts`.
5. Add `WalkerEntity` to schema; add `"enemy"` case to loader; extend loader tests.
6. Insert `updateEnemyAI()` into the game loop between `updatePlayerInput` and `updatePhysics`.
7. Add walkers to `level-1.json`; manually verify in browser — walkers patrol, hurt the player on contact, take projectile damage, die at 0 HP.

## 10. Decisions / Notes

- **No wall-bounce yet** — the test level should position walkers so their patrol range fits between walls/platforms. Edge-case refinements live in the research doc's future-work list.
- **Walker sprite** — deferred. Colored rect is sufficient for gameplay verification; art pass can land as its own change.
- **Why `Direction` as string union, not `±1`** — readability at the JSON boundary and extensibility to vertical. Trade-off and fallback (unit vector) already logged in `spec.md`.
- **Contact-damage refactor** — promoting boss-specific damage into a component-driven path is included now because adding a *second* contact-damage source without the refactor would mean two branches to maintain.
