# Level Loader Plan

Implementation plan for step 3 of `level-design-research.md`: replace hardcoded platform/boss spawning with JSON-driven level data.

## Scope

The loader owns level initialization going forward: **world config, player spawn, platforms, and boss** — everything that exists today. Enemies, obstacles, and pickups are out of scope (steps 5–7 of the research doc) but the `type` discriminator design leaves room for them.

## 1. JSON Format & Asset Location

- New file: `public/levels/level-1.json`
- Entity array is flat; each object carries a `type` discriminator (`"platform"` | `"boss"`).
- Extensible: adding enemy/obstacle/pickup in later steps is a new `case` in the loader's switch, no restructuring.

### y-coordinate convention

Entity `y` values in JSON are **signed offsets from `WORLD.groundY`**. Negative = above ground.

- `"y": 0` → spawned at `WORLD.groundY` (on the ground)
- `"y": -70` → spawned 70px above the ground

The loader resolves world position as `worldY = WORLD.groundY + entity.y` when spawning each entity. `WORLD.groundY` itself is never stored in the JSON — it is always computed at startup as `window.innerHeight - 200` so the game adapts to different screen heights. `playerSpawn.y` follows the same convention.

This maps cleanly to the existing hardcoded offsets in `spawnHardcodedPlatforms` (e.g. `groundY - 70` becomes `"y": -70`), with no arithmetic needed when authoring levels.

Example (scoped to today):

```json
{
  "name": "Level 1 - The Gauntlet",
  "world": { "width": 3200 },
  "playerSpawn": { "x": 120, "y": 0 },
  "entities": [
    { "type": "platform", "x": 500, "y": -70, "width": 200, "height": 24 },
    { "type": "boss", "sprite": "/sprites/blackledge.png", "x": 2800, "y": 0, "health": 10, "spriteWidth": 96, "spriteHeight": 128, "frameCount": 2 }
  ]
}
```

## 2. `setWorld` Function

`src/config.ts:50-53` currently exports `WORLD` as `as const`. Change to:

- `WORLD` remains exported (read-only from consumers' perspective), backed by a mutable internal object.
- Add `setWorld(config: { width: number })` exported from the same file. Only `width` is set — `groundY` is computed from the window at startup and never overwritten.
- Consumers (`camera.ts`, ground-clamp code) keep reading `WORLD.width` / `WORLD.groundY` unchanged.
- Function interface makes future refactors easier (e.g., emitting events on world change, supporting multiple worlds) without hunting down direct mutations.

## 3. New Files

### `src/level/level-schema.ts`
TypeScript types for the JSON shape:
- `LevelData` — top-level shape (`name`, `world`, `playerSpawn`, `entities`)
- `LevelEntity` — discriminated union on `type`
- `PlatformEntity`, `BossEntity` — per-type shapes
- Entity `y` typed as `number` with a JSDoc note that it is a ground-relative offset

### `src/level/level-loader.ts`
Three exports:
- `validateLevel(data: unknown): asserts data is LevelData` — throws a descriptive error on missing `world`, `world.width`, or `playerSpawn`. Extracted so it can be tested without `fetch`.
- `loadLevel(path: string): Promise<LevelData>` — `fetch` + `json()` + calls `validateLevel`.
- `spawnLevel(data: LevelData): Promise<void>` — calls `setWorld({ width: data.world.width })` **first**, then iterates `entities[]`, switches on `type`, delegates to spawn helpers (resolving `worldY = WORLD.groundY + entity.y` for each). Spawns player at `{ x: data.playerSpawn.x, y: WORLD.groundY + data.playerSpawn.y }`.

`spawnLevel` returns `void`. The projectile sprite template is no longer coupled to level loading (see Section 5).

`createBoss(config: BossEntity)` sets `health = { current: config.health, max: config.health }`.

## 4. Refactor `src/ecs/entities.ts`

- Export `createPlatform` (already a helper).
- Extract `createBoss(config: BossEntity)` from the inline boss block in `loadEntities()`.
- Update `createAssetPackPlayer` to accept a spawn position `{ x: number; y: number }` instead of hardcoding `(120, WORLD.groundY)`.
- Delete `spawnHardcodedPlatforms()`.
- Delete `loadEntities()` — `main.ts` calls `spawnLevel` directly.

## 5. Main.ts Wire-up

### Donut sprite

`createSprite('/sprites/donut.png', 48, 48, 1)` is a game resource, not a level entity. Move it out of the loader and load it directly in `main.ts` alongside other startup wiring. It was inside `loadEntities` for historical reasons; this step cleans that up.

`src/main.ts` changes from:

```ts
const { projectileSpriteTemplate } = await loadEntities();
```

to:

```ts
const level = await loadLevel('/levels/level-1.json');
await spawnLevel(level);
const projectileSpriteTemplate = await createSprite('/sprites/donut.png', 48, 48, 1);
```

`GameContext` and the rest of `main.ts` are otherwise unchanged — `projectileSpriteTemplate` is still passed through to `spawnProjectile` the same way.

## 6. Tests — `src/__tests__/level-loader.test.ts`

Follow the existing vitest pattern (`resetStores` in `beforeEach`, call system directly, assert store state). Pass `LevelData` fixtures directly to `spawnLevel` — no `fetch` in tests.

Cases:
1. **Platforms spawn** — fixture with 2 platforms → `position` / `collider` / `solid` stores contain both; resolved world y = `WORLD.groundY + entity.y`.
2. **Boss spawns with health** — boss entity has `enemyTag`, `health.current === health.max === json.health`, world y resolved correctly.
3. **Player spawns at playerSpawn** — `position[playerId]` is `{ x: data.playerSpawn.x, y: WORLD.groundY + data.playerSpawn.y }`, `playerTag` set.
4. **World width applied** — after `spawnLevel`, `WORLD.width` reflects JSON value (via `setWorld`).
5. **Unknown type errors clearly** — unknown `type` throws with a descriptive message (catches typos early).
6. **Collision layers/masks correct** — platforms use `PLATFORM` layer, boss uses `ENEMY` layer/mask.
7. **`validateLevel` throws on bad input** — call `validateLevel` directly with fixtures missing `world`, `world.width`, and `playerSpawn`; assert each throws a descriptive error.

## 7. Order of Operations

1. Create `public/levels/level-1.json` with current level's data, translating hardcoded `groundY - N` offsets to `"y": -N`.
2. Add `setWorld` to `src/config.ts`; drop `as const` on `WORLD`.
3. Extract and export spawn helpers in `src/ecs/entities.ts`; parameterize player spawn; delete `loadEntities` and `spawnHardcodedPlatforms`.
4. Create `src/level/level-schema.ts` and `src/level/level-loader.ts`.
5. Update `src/main.ts`: replace `loadEntities` with `loadLevel` + `spawnLevel` + inline donut sprite load.
6. Add `src/__tests__/level-loader.test.ts`.
7. Manually verify in browser: level looks identical to the hardcoded version.

## 8. Decisions / Notes

- **Background image** — stays hardcoded in the renderer for now. Adding it to JSON is a small follow-up; keeping this step tight.
- **`groundY` not in JSON** — computed from the window at startup so the game adapts to screen height. Storing a pixel value in JSON would break on different displays.
- **Donut sprite moved to `main.ts`** — it was only inside `loadEntities` because that was the one async startup call. Now that `spawnLevel` is the entry point, there is no reason to bundle a game resource with level data.
- **Async sprite loading** — boss sprite is async (`createSprite` returns a Promise). Loader awaits sequentially; no `Promise.all` needed at 1–2 assets.
- **`setWorld` is called first inside `spawnLevel`** — before any entity is spawned, so all spawn helpers read the correct `WORLD.width`.
