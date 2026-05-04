# Obstacles (Floor Spikes) Plan

Implementation plan for **step 6** of `level-design-research.md`: static, animated environmental hazards loaded from level data that deal damage to the player on contact. Builds on the patterns established in `enemy-plan.md` (component-driven `Damage`, discriminated `LevelEntity` union, layer/mask collision).

## Scope

Introduces the **first non-enemy damage source** and the **first OBSTACLE collision layer**. The first concrete obstacle is the floor-spike asset pack (4 variants, 3–5 keyframes each).

In scope:
- `OBSTACLE` collision layer + mask wiring
- `ObstacleTag` component
- `SPIKE_VARIANTS` registry (sheet path + frame geometry + collider per variant)
- `createSpike` entity helper
- `"obstacle"` entity type in the level schema + loader branch
- Renderer pass for obstacle sprites
- Spikes added to `level-1.json` for manual verification
- Tests: loader spawns obstacle, collision masks isolate spikes from walkers/projectiles, contact damage flows from a non-enemy `damage` source

Explicitly **descoped**:
- Invincibility frames — already a tracked follow-up in `spec.md`. Standing on a spike will deal damage every frame; level authors should treat spikes as instant-death until iframes land.
- Duty-cycle hazards (only-damaging-while-extended). The animation always loops; the collider is always live. A future system can read `sprite.currentFrame` and add/remove `damage` to gate this.
- Spike-on-platform variants — schema omits `y`; spikes always sit on `WORLD.groundY`. A `platformGroundY` override is a trivial future extension.
- Non-spike obstacles (fire pits, falling rocks, etc.).

---

## Asset Pack

The uploaded zip provides four variants as individual keyframe PNGs:

| variant | frame size | frames | source path in zip |
|---|---|---|---|
| `long_metal`  | 78 × 116 | 4 | `keyframes/long_metal/long_metal_spike_0[1-4].png` |
| `small_metal` | 78 × 66  | 3 | `keyframes/small_metal/small_metal_spike_0[1-3].png` |
| `long_wood`   | 64 × 183 | 5 | `keyframes/long_wood/long_wood_spike_0[1-5].png` |
| `small_wood`  | 72 × 133 | 4 | `keyframes/small_wood/small_wood_spike_0[1-4].png` |

The renderer reads one horizontal sprite sheet per `Sprite` (`sx = currentFrame * width`), so the per-frame PNGs need to be combined into one row per variant.

### Decision: pre-composite offline

Use `imagemagick` once per variant:

```sh
mkdir -p public/sprites/spikes
convert keyframes/long_metal/long_metal_spike_*.png  +append public/sprites/spikes/long_metal.png
convert keyframes/small_metal/small_metal_spike_*.png +append public/sprites/spikes/small_metal.png
convert keyframes/long_wood/long_wood_spike_*.png    +append public/sprites/spikes/long_wood.png
convert keyframes/small_wood/small_wood_spike_*.png  +append public/sprites/spikes/small_wood.png
```

Ship four flat sheets in `public/sprites/spikes/`. No code added; reuses `createSprite` + `updateSpriteAnimation` unchanged.

**Alternative considered:** runtime composite via `OffscreenCanvas` (a helper that draws keyframe PNGs into a single image and returns a `Sprite[number]`). Viable but unnecessary at this scale — keyframes won't change frequently and the offline path produces deterministic, cacheable assets.

---

## 1. Collision Layer + Mask

In `src/config.ts`:

```ts
export const COLLISION_LAYER = {
  PLAYER:     1 << 0,
  ENEMY:      1 << 1,
  PROJECTILE: 1 << 2,
  PLATFORM:   1 << 3,
  OBSTACLE:   1 << 4,
} as const;

export const COLLISION_MASK = {
  PLAYER:     COLLISION_LAYER.ENEMY | COLLISION_LAYER.PLATFORM | COLLISION_LAYER.OBSTACLE,
  ENEMY:      COLLISION_LAYER.PLAYER | COLLISION_LAYER.PROJECTILE | COLLISION_LAYER.PLATFORM,
  PROJECTILE: COLLISION_LAYER.ENEMY,
  PLATFORM:   COLLISION_LAYER.PLAYER | COLLISION_LAYER.ENEMY,
  OBSTACLE:   COLLISION_LAYER.PLAYER,
} as const;
```

**Why a dedicated layer rather than reusing `ENEMY`:**
- Projectiles must **not** destroy spikes — `health-damage` despawns any `enemyTag` thing they hit.
- Walkers must **not** be blocked by spikes — they only need to mask `PLAYER | PROJECTILE | PLATFORM`.

Isolating obstacles to a layer that only intersects `PLAYER` keeps the existing systems untouched.

---

## 2. New Component: `ObstacleTag`

In `src/components/components.ts`:

```ts
export type ObstacleTag = Record<EntityId, true>;
```

In `src/ecs/stores.ts`:
- Add `obstacleTag: ObstacleTag = {}`.
- Add it to `allStores` (so `resetStores` clears it for free).

`ObstacleTag` is used by the renderer to pick a sprite-draw pass. It is **not** required for damage — `health-damage` is already component-driven on `damage` + `collisionEvents` + `playerTag` and works the moment the spike has a `damage` component and overlaps the player.

---

## 3. Variant Registry

In `src/config.ts`, alongside `COLLIDER_SIZE`:

```ts
export const SPIKE_VARIANTS = {
  long_metal: {
    sheet: "/sprites/spikes/long_metal.png",
    frameWidth: 78, frameHeight: 116, frameCount: 4, frameDuration: 120,
    collider: { width: 60, height: 35, offsetX: 0, offsetY: -40 },
  },
  small_metal: {
    sheet: "/sprites/spikes/small_metal.png",
    frameWidth: 78, frameHeight: 66,  frameCount: 3, frameDuration: 140,
    collider: { width: 60, height: 22, offsetX: 0, offsetY: -16 },
  },
  long_wood: {
    sheet: "/sprites/spikes/long_wood.png",
    frameWidth: 64, frameHeight: 183, frameCount: 5, frameDuration: 110,
    collider: { width: 50, height: 55, offsetX: 0, offsetY: -64 },
  },
  small_wood: {
    sheet: "/sprites/spikes/small_wood.png",
    frameWidth: 72, frameHeight: 133, frameCount: 4, frameDuration: 130,
    collider: { width: 56, height: 40, offsetX: 0, offsetY: -46 },
  },
} as const;
export type SpikeVariant = keyof typeof SPIKE_VARIANTS;
```

The collider covers only the spike tips — negative `offsetY` lifts the hitbox above the sprite center so the lower decorative portion of the sprite is non-damaging. Numbers are starting points; tune with `DEBUG_COLLIDERS = true`.

---

## 4. `createSpike` — `src/ecs/entities.ts`

```ts
export interface SpikeConfig {
  variant: SpikeVariant;
  x: number;        // world x (sprite center)
  groundY: number;  // y where the sprite bottom should rest
  damage: number;
}

export async function createSpike(config: SpikeConfig): Promise<void> {
  const v = SPIKE_VARIANTS[config.variant];
  const id = createEntity();

  const s = await createSprite(v.sheet, v.frameWidth, v.frameHeight, v.frameCount);
  s.animations = {
    pulse: { row: 0, frameCount: v.frameCount, frameDuration: v.frameDuration, loop: true },
  };
  s.currentAnimation = "pulse";
  s.animationElapsed = 0;
  sprite[id] = s;

  position[id] = { x: config.x, y: config.groundY - v.frameHeight / 2 };
  collider[id] = {
    ...v.collider,
    layer: COLLISION_LAYER.OBSTACLE,
    mask: COLLISION_MASK.OBSTACLE,
  };
  damage[id] = { amount: config.damage };
  obstacleTag[id] = true;
}
```

No `velocity`, no `health`, no `solid`. Static, indestructible, walk-through-but-painful. The position calculation centers the sprite vertically such that its bottom edge rests at `groundY` (renderer draws sprites centered on `position`).

---

## 5. Schema + Loader

### `src/level/level-schema.ts`

Extend the discriminated union:

```ts
import type { SpikeVariant } from "../config";

export interface ObstacleEntity {
  type: "obstacle";
  subtype: "spikes";
  variant: SpikeVariant;
  x: number;
  damage: number;
}

export type LevelEntity =
  | PlatformEntity
  | BossEntity
  | WalkerEntity
  | ObstacleEntity;
```

`subtype` is kept (mirrors `WalkerEntity`) so future obstacle kinds can be added without another top-level `type`. `variant` discriminates within the spike subtype.

No `y` field — spikes always sit on `WORLD.groundY`. Adding a `platformGroundY` override later is a one-line change.

### `src/level/level-loader.ts`

Add a `case "obstacle":` branch in `spawnLevel`:

```ts
case "obstacle":
  switch (entity.subtype) {
    case "spikes":
      await createSpike({
        variant: entity.variant,
        x: entity.x,
        groundY: WORLD.groundY,
        damage: entity.damage,
      });
      break;
    default: {
      const bad = entity as { subtype: string };
      throw new Error(`Unknown obstacle subtype: '${bad.subtype}'`);
    }
  }
  break;
```

`validateLevel` is left as-is (already flagged in `spec.md` as "validates rather than parses"). Obstacle fields will pass through unvalidated like the rest until the parser refactor lands.

---

## 6. Renderer — `src/rendering/renderer.ts`

Add an obstacle pass mirroring the enemy pass, before the health-bar pass:

```ts
for (const id of entitiesWith("obstacleTag", "sprite")) {
  drawSprite(ctx, id, cameraX);
}
```

No other renderer changes. Sprite scaling and `DEBUG_COLLIDERS` work for free.

---

## 7. Health-Damage — No Change

The system already iterates `damage` + `collisionEvents` and applies the dealer's damage to any colliding `playerTag` + `health` target. Spikes get a `damage` component and an `OBSTACLE`-layer collider; the existing system handles the rest.

**Caveat (already in `spec.md`):** with no invincibility frames, standing on a spike deals 1 damage per frame (~60/sec). Keep `damage: 1` in level data; treat the iframes follow-up as the proper fix. Not in scope here.

---

## 8. Game Loop — No Change

Spikes are static. No new system, no new tick. `updateSpriteAnimation` already loops over every entity in `sprite`, so the spike "pulse" animates for free.

---

## 9. Level JSON

Drop a few spikes into `public/levels/level-1.json` between existing platforms for manual testing:

```json
{ "type": "obstacle", "subtype": "spikes", "variant": "small_metal", "x": 720,  "damage": 1 },
{ "type": "obstacle", "subtype": "spikes", "variant": "long_wood",   "x": 1450, "damage": 1 },
{ "type": "obstacle", "subtype": "spikes", "variant": "small_wood",  "x": 2200, "damage": 1 }
```

Position them on the ground between platforms so they're easy to walk into and equally easy to jump over.

---

## 10. Tests

### `src/__tests__/level-loader.test.ts` — extend

Add a case for an obstacle fixture: spawn → `obstacleTag`, `damage`, `collider` (with `layer === COLLISION_LAYER.OBSTACLE` and `mask === COLLISION_MASK.OBSTACLE`), `position` (y = `groundY − frameHeight/2` for the chosen variant) all populated. Mock `createSprite` like the existing boss test does.

### `src/__tests__/health-damage.test.ts` — extend

Add a case where a non-enemy entity tagged only `damage` + `OBSTACLE` collider overlaps the player — `health.current` should drop by `damage.amount`. Proves the contact-damage path is fully component-driven and not gated on `enemyTag`.

### `src/__tests__/collision.test.ts` — extend

Two cases:
1. Projectile (`mask = ENEMY`) vs OBSTACLE entity → no `collisionEvents` recorded (mask filtered).
2. Walker (`mask = PLAYER | PROJECTILE | PLATFORM`) vs OBSTACLE entity → no `collisionEvents` recorded.

No dedicated obstacle-system test — there is no obstacle system.

---

## 11. Order of Operations

1. Pre-composite the four spike sheets via `imagemagick` into `public/sprites/spikes/`.
2. Add `OBSTACLE` to `COLLISION_LAYER` / `COLLISION_MASK`; expand `PLAYER` mask.
3. Add `ObstacleTag` to `components.ts`; wire `obstacleTag` into `stores.ts` + `allStores`.
4. Add `SPIKE_VARIANTS` registry + `SpikeVariant` export to `config.ts`.
5. Add `createSpike` to `entities.ts`.
6. Add `ObstacleEntity` to `level-schema.ts`; add `"obstacle"` branch to `spawnLevel`.
7. Add the obstacle render pass to `renderer.ts`.
8. Add spikes to `public/levels/level-1.json`.
9. Tests — loader extension, collision-mask isolation, and a contact-damage assertion for an obstacle dealer.
10. Manual verification with `DEBUG_COLLIDERS = true`: spikes animate, block nothing, hurt the player on contact, ignore projectiles, ignore walkers. Tune the per-variant collider geometry until the hitboxes match the visible tips.

---

## 12. Decisions / Notes

- **Dedicated `OBSTACLE` layer over `ENEMY` reuse** — keeps spikes immune to projectiles and transparent to walkers without special-casing in `health-damage` or the collision system.
- **No `health`, no `solid`** — spikes are walk-through and indestructible. They damage on overlap, that's it.
- **Ground-locked spawn** — schema omits `y` to match the "floor spikes" framing. A `platformGroundY` override slots in cleanly when the first elevated spike is needed.
- **Always-damaging animation** — visual loop only; no duty cycle. A retracting/rising hazard (damages only when extended) is a follow-up that just needs a small system reading `sprite[id].currentFrame` and adding/removing `damage[id]`.
- **iframes still missing** — instant-death on stand is a known issue tracked in `spec.md`, not unique to spikes. Damage values stay at 1 until iframes land.
- **Asset pipeline** — offline composite (one `imagemagick` line per variant) keeps the renderer and animation system untouched. Runtime composite was considered and rejected as unnecessary tooling complexity at this scale.
