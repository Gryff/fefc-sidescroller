# Entity ID Removal

## Goal

Remove `playerEntityId` / `bossEntityId` from all system function signatures and
from `GameContext`. Systems query for the entities they need internally via tag
components. This is the prerequisite for collision detection (see
`collision-detection.md` Phase 1 + Phase 2).

## Current state

`loadEntities()` returns `{ playerEntityId, bossEntityId, projectileSpriteTemplate }`.
These IDs are stored in `GameContext` and threaded as explicit arguments into
every system and input handler. The full list of call sites carrying entity IDs:

| File | Receives |
|------|----------|
| `game-loop.ts` `update()` | `playerEntityId`, `bossEntityId` via `gameCtx` destructure |
| `systems/movement.ts` `updateMovement()` | `playerEntityId` |
| `systems/physics.ts` `updatePhysics()` | `playerEntityId` |
| `systems/player-animation.ts` `updatePlayerAnimation()` | `playerEntityId` |
| `systems/boss-animation.ts` `updateBossAnimation()` | `bossEntityId` |
| `systems/scrolling.ts` `updateScrolling()` | `playerEntityId` |
| `systems/projectile.ts` `spawnProjectile()` | `playerEntityId` |
| `systems/sprite-animation.ts` `updateSpriteAnimation()` | `entityId` (player) |
| `rendering/renderer.ts` `render()` | `playerEntityId`, `bossEntityId` via `gameCtx` |
| `input/touch.ts` `applyJoystickInput()` | `playerEntityId` |
| `input/keyboard.ts` `setupKeyboardInput()` | `playerEntityId` |
| `main.ts` | assembles `gameCtx` with both IDs; passes them to keyboard/projectile setup |

---

## Step 1 — Tag component types

**File:** `src/components/components.ts`

Add two marker types at the bottom of the file:

```ts
export type PlayerTag = Record<EntityId, true>;
export type EnemyTag = Record<EntityId, true>;
```

These are the simplest possible components — presence in the record is the tag.

---

## Step 2 — Tag stores

**File:** `src/ecs/stores.ts`

Import the new types and add two stores:

```ts
import type {
  EntityId, Input, PlayerTag, EnemyTag, Position, Projectile, Sprite, Velocity,
} from "../components/components";

export const playerTag: PlayerTag = {};
export const enemyTag: EnemyTag = {};
```

---

## Step 3 — Query helper

**File:** `src/ecs/query.ts` (new)

```ts
import type { EntityId } from "../components/components";
import {
  sprite, position, velocity, input, projectile, playerTag, enemyTag,
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
  sprite, position, velocity, input, projectile, playerTag, enemyTag,
};

export function entitiesWith<K extends keyof ComponentStores>(
  ...keys: K[]
): EntityId[] {
  const [first, ...rest] = keys;
  const firstStore = allStores[first] as Record<number, unknown>;
  return Object.keys(firstStore)
    .map(Number)
    .filter((id) => rest.every((k) => id in (allStores[k] as Record<number, unknown>)));
}
```

`entitiesWith` must be kept in sync with stores.ts as new stores are added —
the collision detection phase will extend `ComponentStores` when it adds
`collider` and `collisionEvents` stores.

---

## Step 4 — Attach tags during entity creation

**File:** `src/ecs/entities.ts`

Import `playerTag`, `enemyTag` from `./stores`.

In `createAssetPackPlayer()`, after assigning `velocity[entityId]`:
```ts
playerTag[entityId] = true;
```

In `loadEntities()`, after assigning `velocity[bossEntityId]`:
```ts
enemyTag[bossEntityId] = true;
```

Also update the `EntityIds` interface and return value — `playerEntityId` and
`bossEntityId` no longer need to be returned now that consumers can query:

```ts
export interface EntityIds {
  projectileSpriteTemplate: Sprite[number];
}

export async function loadEntities(canvas: HTMLCanvasElement): Promise<EntityIds> {
  await createAssetPackPlayer(canvas);
  const bossEntityId = createEntity();
  // ... boss setup + enemyTag ...
  return { projectileSpriteTemplate };
}
```

---

## Step 5 — Refactor systems

Each system queries internally. The pattern is the same everywhere: call
`entitiesWith(...)`, take `[0]`, guard on undefined.

### `systems/movement.ts`

```ts
// Before
export function updateMovement(
  playerEntityId: EntityId,
  playerState: PlayerState,
  dt: number,
): number

// After
export function updateMovement(playerState: PlayerState, dt: number): number {
  const [playerEntityId] = entitiesWith('playerTag', 'position', 'input');
  if (playerEntityId === undefined) return 0;
  // ... rest unchanged ...
}
```

### `systems/physics.ts`

```ts
// Before
export function updatePhysics(playerEntityId, playerState, canvasHeight, dt)

// After
export function updatePhysics(playerState: PlayerState, canvasHeight: number, dt: number): void {
  const [playerEntityId] = entitiesWith('playerTag', 'position');
  if (playerEntityId === undefined) return;
  // ... rest unchanged ...
}
```

### `systems/player-animation.ts`

```ts
// Before
export function updatePlayerAnimation(playerEntityId, playerState, delta)

// After
export function updatePlayerAnimation(playerState: PlayerState, delta: number): void {
  const [playerEntityId] = entitiesWith('playerTag', 'sprite');
  if (playerEntityId === undefined) return;
  // ... rest unchanged ...
}
```

### `systems/boss-animation.ts`

```ts
// Before
export function updateBossAnimation(bossEntityId, bossState, delta)

// After
export function updateBossAnimation(bossState: BossAnimState, delta: number): void {
  const [bossEntityId] = entitiesWith('enemyTag', 'sprite');
  if (bossEntityId === undefined) return;
  // ... rest unchanged ...
}
```

### `systems/scrolling.ts`

```ts
// Before
export function updateScrolling(playerEntityId, scrollState, canvas, backgroundImage, prevPlayerX)

// After
export function updateScrolling(
  scrollState: ScrollState,
  canvas: HTMLCanvasElement,
  backgroundImage: HTMLImageElement,
  prevPlayerX: number,
): void {
  const [playerEntityId] = entitiesWith('playerTag', 'position');
  if (playerEntityId === undefined) return;
  // ... rest unchanged ...
}
```

### `systems/projectile.ts` — `spawnProjectile`

```ts
// Before
export function spawnProjectile(playerEntityId, template, facingRight)

// After
export function spawnProjectile(template: Sprite[number], facingRight: boolean): void {
  const [playerEntityId] = entitiesWith('playerTag', 'position');
  if (playerEntityId === undefined) return;
  // ... rest unchanged ...
}
```

`updateProjectiles` has no entity ID param — no change needed.

### `systems/sprite-animation.ts` — `updateSpriteAnimation`

This system currently takes a specific `entityId` and is called only for the
player. Change it to iterate all animated sprites:

```ts
// Before
export function updateSpriteAnimation(entityId: EntityId, delta: number): void

// After
export function updateSpriteAnimation(delta: number): void {
  for (const id in sprite) {
    const entityId = Number(id);
    const s = sprite[entityId];
    if (!s?.animations || !s.currentAnimation) continue;
    // ... per-entity animation tick (same logic, scoped to s) ...
  }
}
```

`setAnimation(entityId, name)` keeps its signature — it's an internal helper
called by `updatePlayerAnimation` and `updateBossAnimation` with their
internally-resolved IDs.

### `rendering/renderer.ts` — `render`

Replace the hardcoded `drawSprite(ctx, playerEntityId)` and
`drawSprite(ctx, bossEntityId)` calls with a tag-based query:

```ts
// After
export function render(gameCtx: GameContext, state: GameState, assets: GameAssets): void {
  const { canvas, ctx, isTouchDevice } = gameCtx;  // no more entity IDs
  // ...
  for (const id of entitiesWith('playerTag', 'sprite')) {
    drawSprite(ctx, id);
  }
  for (const id of entitiesWith('enemyTag', 'sprite')) {
    drawSprite(ctx, id);
  }
  // projectile loop unchanged
}
```

### `input/touch.ts` — `applyJoystickInput`

```ts
// Before
export function applyJoystickInput(playerEntityId, joystickState, isTouchDevice)

// After
export function applyJoystickInput(joystickState: JoystickState, isTouchDevice: boolean): void {
  if (!isTouchDevice || !joystickState.active) return;
  const [playerEntityId] = entitiesWith('playerTag', 'input');
  if (playerEntityId === undefined) return;
  // ... rest unchanged ...
}
```

### `input/keyboard.ts` — `setupKeyboardInput`

```ts
// Before
export function setupKeyboardInput(playerEntityId, playerState, onFire)

// After
export function setupKeyboardInput(playerState: PlayerState, onFire: () => void): void {
  window.addEventListener("keydown", (event) => {
    const [playerEntityId] = entitiesWith('playerTag', 'input');
    if (playerEntityId === undefined) return;
    // ... key handling unchanged ...
  });
  // keyup listener: same pattern
}
```

The query inside the event listener is intentional — it resolves at event time
rather than at setup time, which is fine given entity creation always precedes
input registration.

---

## Step 6 — Remove entity IDs from GameContext

**File:** `src/types.ts`

```ts
export interface GameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  projectileSpriteTemplate: Sprite[number];  // kept — no natural "template store" yet
  isTouchDevice: boolean;
}
```

`playerEntityId` and `bossEntityId` removed.

---

## Step 7 — Update game-loop.ts

**File:** `src/game-loop.ts`

Remove entity ID destructuring and update every system call to drop the entity
ID argument:

```ts
function update(delta, gameCtx, state, assets): void {
  const { canvas, isTouchDevice } = gameCtx;  // no entity IDs
  const dt = delta / TARGET_FRAME_MS;

  updateBossAnimation(state.boss, delta);
  applyJoystickInput(state.joystick, isTouchDevice);

  const prevPlayerX = updateMovement(state.player, dt);
  updatePlayerAnimation(state.player, delta);
  updateSpriteAnimation(delta);
  updatePhysics(state.player, canvas.height, dt);
  updateScrolling(state.scroll, canvas, assets.backgroundImage, prevPlayerX);
  updateProjectiles(canvas, dt);
}
```

---

## Step 8 — Update main.ts

**File:** `src/main.ts`

- Destructure only `projectileSpriteTemplate` from `loadEntities()`.
- Drop `playerEntityId` / `bossEntityId` from `gameCtx` construction.
- Update `setupKeyboardInput` and `spawnProjectile` calls to drop entity ID args.

```ts
const { projectileSpriteTemplate } = await loadEntities(canvas);

const gameCtx: GameContext = {
  canvas,
  ctx,
  projectileSpriteTemplate,
  isTouchDevice,
};

setupKeyboardInput(state.player, () =>
  spawnProjectile(projectileSpriteTemplate, state.player.facingRight),
);
```

---

## File change summary

| File | Change |
|------|--------|
| `src/components/components.ts` | Add `PlayerTag`, `EnemyTag` types |
| `src/ecs/stores.ts` | Add `playerTag`, `enemyTag` stores |
| `src/ecs/query.ts` | New — `entitiesWith()` helper |
| `src/ecs/entities.ts` | Attach tags on creation; slim `EntityIds` return |
| `src/systems/movement.ts` | Drop `playerEntityId` param; query internally |
| `src/systems/physics.ts` | Drop `playerEntityId` param; query internally |
| `src/systems/player-animation.ts` | Drop `playerEntityId` param; query internally |
| `src/systems/boss-animation.ts` | Drop `bossEntityId` param; query internally |
| `src/systems/scrolling.ts` | Drop `playerEntityId` param; query internally |
| `src/systems/projectile.ts` | Drop `playerEntityId` from `spawnProjectile`; query internally |
| `src/systems/sprite-animation.ts` | Drop `entityId` param; iterate all animated sprites |
| `src/rendering/renderer.ts` | Use tag queries instead of hardcoded `drawSprite` calls |
| `src/input/touch.ts` | Drop `playerEntityId` from `applyJoystickInput`; query internally |
| `src/input/keyboard.ts` | Drop `playerEntityId` from `setupKeyboardInput`; query in handler |
| `src/types.ts` | Remove `playerEntityId`, `bossEntityId` from `GameContext` |
| `src/game-loop.ts` | Update all system call sites |
| `src/main.ts` | Update bootstrap: destructuring, `gameCtx`, input setup |

## What this unlocks

Once complete, collision detection (Phase 3 in `collision-detection.md`) can
proceed: the `entitiesWith()` helper is already in place, and all systems use it.
Adding `collider` and `collisionEvents` stores and extending `ComponentStores` in
`query.ts` is all that's needed for the collision system to plug in.
