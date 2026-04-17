# Level Loader Plan

Implementation plan for step 3 of `level-design-research.md`: replace hardcoded platform/boss spawning with JSON-driven level data.

## Scope

The loader owns level initialization going forward: **world config, player spawn, platforms, and boss** — everything that exists today. Enemies, obstacles, and pickups are out of scope (steps 5–7 of the research doc) but the `type` discriminator design leaves room for them.

## 1. JSON Format & Asset Location

- New file: `public/levels/level-1.json`
- Matches the format in `level-design-research.md` lines 56–140, trimmed to currently-implemented entity types.
- Entity array is flat; each object carries a `type` discriminator (`"platform"` | `"boss"`).
- Extensible: adding enemy/obstacle/pickup in later steps is a new `case` in the loader's switch, no restructuring.

Example (scoped to today):

```json
{
  "name": "Level 1 - The Gauntlet",
  "world": { "width": 3200, "groundY": 500 },
  "playerSpawn": { "x": 120, "y": 500 },
  "entities": [
    { "type": "platform", "x": 500, "y": 430, "width": 200, "height": 24 },
    { "type": "boss", "sprite": "/sprites/blackledge.png", "x": 2800, "y": 500, "health": 10, "spriteWidth": 96, "spriteHeight": 128, "frameCount": 2 }
  ]
}
```

## 2. `setWorld` Function

`src/config.ts:50-53` currently exports `WORLD` as `as const`. Change to:

- `WORLD` remains exported (read-only from consumers' perspective), backed by a mutable internal object.
- Add `setWorld(config: { width: number; groundY: number })` exported from the same file.
- Consumers (`camera.ts`, ground-clamp code) keep reading `WORLD.width` / `WORLD.groundY` unchanged.
- Function interface makes future refactors easier (e.g., emitting events on world change, supporting multiple worlds) without hunting down direct mutations.

## 3. New Files

### `src/level/level-schema.ts`
TypeScript types for the JSON shape:
- `LevelData` — top-level shape (`name`, `world`, `playerSpawn`, `entities`)
- `LevelEntity` — discriminated union on `type`
- `PlatformEntity`, `BossEntity` — per-type shapes

### `src/level/level-loader.ts`
Two exports:
- `loadLevel(path: string): Promise<LevelData>` — `fetch` + `json()` + light validation (throw on missing `world` / `playerSpawn`).
- `spawnLevel(data: LevelData): Promise<{ projectileSpriteTemplate }>` — iterates `entities[]`, switches on `type`, delegates to spawn helpers. Calls `setWorld(data.world)`. Spawns player at `playerSpawn`. Returns the projectile sprite template that `main.ts` currently needs.

## 4. Refactor `src/ecs/entities.ts`

- Extract `createPlatform` (already a helper, export it).
- Extract `createBoss(config)` from the inline boss block in `loadEntities()`.
- Update `createAssetPackPlayer` to accept a spawn position parameter instead of hardcoding `(120, WORLD.groundY)`.
- Delete `spawnHardcodedPlatforms()`.
- Delete or thin out `loadEntities()` — `main.ts` calls `spawnLevel` directly.

## 5. Main.ts Wire-up

`src/main.ts:13` changes from:

```ts
const { projectileSpriteTemplate } = await loadEntities();
```

to:

```ts
const level = await loadLevel('/levels/level-1.json');
const { projectileSpriteTemplate } = await spawnLevel(level);
```

## 6. Tests — `src/__tests__/level-loader.test.ts`

Follow the existing vitest pattern (`resetStores` in `beforeEach`, call system directly, assert store state). Pass `LevelData` fixtures directly to `spawnLevel` — no `fetch` in tests.

Cases:
1. **Platforms spawn** — fixture with 2 platforms → `position` / `collider` / `solid` stores contain both with correct x/y/width/height.
2. **Boss spawns with health** — boss entity has `enemyTag`, `health.current === health.max === json.health`, correct world position.
3. **Player spawns at playerSpawn** — `position[playerId]` matches JSON coords, `playerTag` set.
4. **World config applied** — after `spawnLevel`, `WORLD.width` and `WORLD.groundY` reflect JSON values (via `setWorld`).
5. **Unknown type errors clearly** — unknown `type` throws with a descriptive message (catches typos early).
6. **Collision layers/masks correct** — platforms use `PLATFORM` layer, boss uses `ENEMY` layer/mask.

## 7. Order of Operations

1. Create `public/levels/level-1.json` with current level's data.
2. Add `setWorld` to `src/config.ts`; drop the `as const`.
3. Extract spawn helpers in `src/ecs/entities.ts`, parameterize player spawn.
4. Create `src/level/level-schema.ts` and `src/level/level-loader.ts`.
5. Update `src/main.ts` to use `loadLevel` + `spawnLevel`.
6. Add `src/__tests__/level-loader.test.ts`.
7. Manually verify in browser: level looks identical to the hardcoded version.

## 8. Decisions / Notes

- **Background image** — stays hardcoded in the renderer for now. Adding it to JSON is a small follow-up; keeping this step tight.
- **Projectile sprite template** — keeps living inside the loader's return value (where `loadEntities` had it), so `main.ts` only changes once.
- **Async sprite loading** — boss sprite is async (`createSprite` returns a Promise). Loader awaits sequentially; no `Promise.all` needed at 1–2 assets.
