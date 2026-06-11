# Obstacles (Floor Spikes) Plan

Implementation plan for **step 6** of `level-design-research.md`: static environmental hazards loaded from level data that deal damage to the player on contact. Builds on the patterns established in `enemy-plan.md` (component-driven `Damage`, discriminated `LevelEntity` union, layer/mask collision).

> **Revision:** this plan originally assumed an animated spike asset pack (4 variants, 3–5 keyframes each). The actual asset is a single static image, `public/spikes.png`, so the variant registry and animation wiring were dropped. Spike animation (and per-variant art) is a follow-up; the schema and `createSpike` are shaped so it can be added without touching level data.

## Scope

Introduces the **first non-enemy damage source** and the **first OBSTACLE collision layer**. The first concrete obstacle is a single static floor-spike image.

In scope:
- `OBSTACLE` collision layer + mask wiring
- `ObstacleTag` component
- `SPIKES` config (sprite path + frame geometry + scale + collider)
- `createSpike` entity helper
- `"obstacle"` entity type in the level schema + loader branch
- Renderer pass for obstacle sprites
- Spikes added to `level-1.json` for manual verification
- Tests: loader spawns obstacle, collision masks isolate spikes from walkers/projectiles, contact damage flows from a non-enemy `damage` source

Explicitly **descoped**:
- Spike animation — the current asset is one static frame (`frameCount: 1`). When animated sheets land, `createSpike` grows an `animations` block and `updateSpriteAnimation` picks it up for free; nothing else changes.
- Invincibility frames — already a tracked follow-up in `spec.md`. Standing on a spike will deal damage every frame; level authors should treat spikes as instant-death until iframes land.
- Duty-cycle hazards (only-damaging-while-extended). The collider is always live. A future system can read `sprite.currentFrame` and add/remove `damage` to gate this once animation exists.
- Non-spike obstacles (fire pits, falling rocks, etc.).

---

## Asset

`public/spikes.png` — a single 21 × 21 static frame: three spike tips occupying the bottom 11px of the frame, full width. Rendered at `scale: 3` (63 × 63 on screen) so it reads at the same size as the other scaled-up entities. No sprite-sheet compositing needed; `createSprite` with `frameCount: 1` handles it unchanged.

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

## 3. Spike Config

In `src/config.ts`, alongside `COLLIDER_SIZE`:

```ts
export const SPIKES = {
  sprite: "/spikes.png",
  frameWidth: 21,
  frameHeight: 21,
  scale: 3,
  // The art occupies only the bottom 11px of the 21px frame; the collider
  // covers just that region (scaled) so the empty top of the sprite is
  // non-damaging.
  collider: { width: 60, height: 33, offsetX: 0, offsetY: 15 },
} as const;
```

The collider covers only the spike art — positive `offsetY` pushes the hitbox to the bottom of the sprite where the spikes are drawn. Numbers are starting points; tune with `DEBUG_COLLIDERS = true`. When animated variants land, this single const grows back into the per-variant registry the original plan sketched.

---

## 4. `createSpike` — `src/ecs/entities.ts`

```ts
export interface SpikeConfig {
  x: number;        // world x (sprite center)
  groundY: number;  // world y where the sprite bottom should rest
  damage: number;
}

export async function createSpike(config: SpikeConfig): Promise<void> {
  const id = createEntity();

  const spikeSprite = await createSprite(
    SPIKES.sprite, SPIKES.frameWidth, SPIKES.frameHeight, 1,
  );
  spikeSprite.scale = SPIKES.scale;
  sprite[id] = spikeSprite;

  position[id] = {
    x: config.x,
    y: config.groundY - (SPIKES.frameHeight * SPIKES.scale) / 2,
  };
  collider[id] = {
    ...SPIKES.collider,
    layer: COLLISION_LAYER.OBSTACLE,
    mask: COLLISION_MASK.OBSTACLE,
  };
  damage[id] = { amount: config.damage };
  obstacleTag[id] = true;
}
```

No `velocity`, no `health`, no `solid`. Static, indestructible, walk-through-but-painful. The position calculation centers the sprite vertically such that its bottom edge rests at `groundY` (renderer draws sprites centered on `position`, scaled). `frameCount` is hard-coded to 1 — a static frame — until animated sheets exist.

---

## 5. Schema + Loader

### `src/level/level-schema.ts`

Extend the discriminated union:

```ts
export interface ObstacleEntity {
  type: "obstacle";
  subtype: "spikes";
  x: number;
  /** Signed offset from WORLD.groundY. Negative = above ground (e.g. on a platform). */
  y: number;
  damage: number;
}

export type LevelEntity =
  | PlatformEntity
  | BossEntity
  | WalkerEntity
  | ObstacleEntity;
```

`subtype` is kept (mirrors `WalkerEntity`) so future obstacle kinds can be added without another top-level `type`. A `variant` field can be added later when multiple spike sprites exist.

`y` follows the same ground-relative convention as `WalkerEntity` / `BossEntity` / `PlatformEntity`: `0` rests the sprite bottom on `WORLD.groundY`; a negative value lifts the spike onto a platform. The loader resolves it to a world Y the same way it does for everything else (`WORLD.groundY + entity.y`).

### `src/level/level-loader.ts`

Add a `case "obstacle":` branch in `spawnLevel`:

```ts
case "obstacle":
  switch (entity.subtype) {
    case "spikes":
      await createSpike({
        x: entity.x,
        groundY: worldY,
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

Spikes are static. No new system, no new tick. With a single frame and no `animations` map, `updateSpriteAnimation` skips them; when animated sheets land, the same system picks them up for free.

---

## 9. Level JSON

Drop a few spikes into `public/levels/level-1.json` between existing platforms for manual testing:

```json
{ "type": "obstacle", "subtype": "spikes", "x": 720,  "y": 0, "damage": 1 },
{ "type": "obstacle", "subtype": "spikes", "x": 1450, "y": 0, "damage": 1 },
{ "type": "obstacle", "subtype": "spikes", "x": 2200, "y": 0, "damage": 1 }
```

Position them on the ground between platforms (`y: 0`) so they're easy to walk into and equally easy to jump over. Authors who want a spike on top of a platform pass a negative `y` matching the platform's `y` (e.g. `y: -82` to crown a `y: -70` / `height: 24` platform).

---

## 10. Tests

### `src/__tests__/level-loader.test.ts` — extend

Add a case for an obstacle fixture: spawn → `obstacleTag`, `damage`, `collider` (with `layer === COLLISION_LAYER.OBSTACLE` and `mask === COLLISION_MASK.OBSTACLE`), `position` (y = `WORLD.groundY + entity.y − (frameHeight × scale)/2`) all populated. Cover both `y: 0` (ground) and a negative `y` (e.g. spike on top of a platform) to lock in the offset resolution. Mock `createSprite` like the existing boss test does.

### `src/__tests__/health-damage.test.ts` — extend

Add a case where a non-enemy entity tagged only `damage` + `OBSTACLE` collider overlaps the player — `health.current` should drop by `damage.amount`. Proves the contact-damage path is fully component-driven and not gated on `enemyTag`.

### `src/__tests__/collision.test.ts` — extend

Two cases:
1. Projectile (`mask = ENEMY`) vs OBSTACLE entity → no `collisionEvents` recorded (mask filtered).
2. Walker (`mask = PLAYER | PROJECTILE | PLATFORM`) vs OBSTACLE entity → no `collisionEvents` recorded.

No dedicated obstacle-system test — there is no obstacle system.

---

## 11. Order of Operations

1. Add `OBSTACLE` to `COLLISION_LAYER` / `COLLISION_MASK`; expand `PLAYER` mask.
2. Add `ObstacleTag` to `components.ts`; wire `obstacleTag` into `stores.ts` + `allStores`.
3. Add the `SPIKES` config to `config.ts`.
4. Add `createSpike` to `entities.ts`.
5. Add `ObstacleEntity` to `level-schema.ts`; add `"obstacle"` branch to `spawnLevel`.
6. Add the obstacle render pass to `renderer.ts`.
7. Add spikes to `public/levels/level-1.json`.
8. Tests — loader extension, collision-mask isolation, and a contact-damage assertion for an obstacle dealer.
9. Manual verification with `DEBUG_COLLIDERS = true`: spikes render, block nothing, hurt the player on contact, ignore projectiles, ignore walkers. Tune `SPIKES.collider` / `SPIKES.scale` until the hitbox matches the visible tips.

---

## 12. Decisions / Notes

- **Dedicated `OBSTACLE` layer over `ENEMY` reuse** — keeps spikes immune to projectiles and transparent to walkers without special-casing in `health-damage` or the collision system.
- **No `health`, no `solid`** — spikes are walk-through and indestructible. They damage on overlap, that's it.
- **Ground-relative `y`** — `ObstacleEntity.y` follows the same signed-offset-from-`WORLD.groundY` convention as platforms / walkers / boss. `y: 0` is the floor-spike default; negative values place a spike on top of a platform without any new schema field. Keeps the entity union uniform and avoids a special case in the loader's `worldY` resolution.
- **Static frame for now** — the original plan's animated variants were dropped because the shipped asset is one static PNG. Animation is purely additive later: composite the keyframe sheets, grow `SPIKES` into a variant registry, and give the sprite an `animations` map in `createSpike`. Schema and level data only change if a `variant` field is wanted.
- **Always-damaging** — no duty cycle. A retracting/rising hazard (damages only when extended) is a follow-up that needs animation first, plus a small system reading `sprite[id].currentFrame` and adding/removing `damage[id]`.
- **iframes still missing** — instant-death on stand is a known issue tracked in `spec.md`, not unique to spikes. Damage values stay at 1 until iframes land.
