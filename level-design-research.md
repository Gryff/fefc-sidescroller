# Level Design System Research

## Current State

The game has a clean ECS architecture, but currently has **no real concept of a "level"**:

- ~~**No world coordinates** — everything is screen-relative. The "scrolling" system fakes it by shifting the background image offset and clamping the player to trigger zones.~~ ✅ World coordinates + camera system implemented.
- ~~**Ground is a flat line** — `canvasHeight - 200`, no platforms or terrain.~~ ✅ Platforms + `platform-collision` system implemented (hardcoded spawns; level-loader still pending).
- ~~**No health/damage** — collisions are detected but have no consequence.~~ ✅ Health + damage system implemented.
- ~~**One hardcoded boss** — placed at `canvas.width / 1.5` in screen coords.~~ ✅ Boss placed at `WORLD.width - 400` in world coords.
- ~~**No world bounds** — the play area is effectively the canvas width.~~ ✅ `WORLD.width` (3200) with camera clamping.

---

## What Needs to Change

There are **three foundational changes** needed before level data can drive the game:

### 1. World Coordinate System + Camera

Right now, entities live in screen space. For a scrolling level, entities need **world positions** and a **camera** transforms world-to-screen at render time. The current `scrolling.ts` system would be replaced by a proper camera that tracks the player. This is the biggest architectural shift.

- Camera has a `worldX` offset (simple 1D follow)
- All rendering subtracts `camera.worldX` from entity positions
- Player, enemies, platforms all exist in world space
- Level `width` defines how far the camera can scroll

### 2. New ECS Components

Several new component stores are needed:

| Component | Purpose |
|---|---|
| ~~`Health`~~ | ~~`{ current: number, max: number }` for player + enemies + boss~~ ✅ Done |
| `Damage` | `{ amount: number, cooldown?: number }` for obstacles/enemies on contact |
| ~~`Solid`~~ | ~~Tag — blocks movement (platforms, walls)~~ ✅ Done |
| `Pickup` | `{ type: 'health' \| 'speed' \| 'damage', amount: number, duration?: number }` |
| `PatrolAI` | `{ originX: number, range: number, speed: number, direction: 1 \| -1 }` |
| `BossTag` | Distinguished from regular enemies — triggers boss behavior |

### 3. New Systems

| System | What it does |
|---|---|
| ~~`platform-collision`~~ | ~~Resolves solid entity overlaps — player lands on platforms, can't walk through walls~~ ✅ Done |
| ~~`health-damage`~~ | ~~Applies damage from contact with enemies/obstacles~~ ✅ Done (no invincibility frames yet) |
| `pickup-collection` | Detects player overlap with pickups, applies effect, removes entity |
| `enemy-ai` | Drives patrol behavior (walk back and forth within range) |
| ~~`camera`~~ | ~~Follows player through the world, replaces current `scrolling.ts`~~ ✅ Done |
| ~~`level-loader`~~ | ~~Reads JSON, spawns all entities into ECS stores~~ ✅ Done (platform + boss types; enemies/obstacles/pickups still pending) |

---

## Proposed Level JSON Format

```json
{
  "name": "Level 1 - The Gauntlet",
  "world": {
    "width": 4800,
    "groundY": 500
  },
  "playerSpawn": { "x": 120, "y": 450 },
  "background": "/background.png",
  "entities": [
    {
      "type": "platform",
      "x": 400, "y": 400,
      "width": 200, "height": 32
    },
    {
      "type": "platform",
      "x": 750, "y": 320,
      "width": 120, "height": 32
    },
    {
      "type": "platform",
      "x": 1100, "y": 360,
      "width": 250, "height": 32
    },

    {
      "type": "obstacle",
      "subtype": "spikes",
      "x": 950, "y": 488,
      "width": 64, "height": 24,
      "damage": 1
    },

    {
      "type": "enemy",
      "subtype": "walker",
      "x": 600, "y": 500,
      "health": 2,
      "damage": 1,
      "patrol": { "range": 100, "speed": 1.5 }
    },
    {
      "type": "enemy",
      "subtype": "walker",
      "x": 1800, "y": 500,
      "health": 2,
      "damage": 1,
      "patrol": { "range": 150, "speed": 2 }
    },

    {
      "type": "pickup",
      "subtype": "health",
      "x": 780, "y": 285,
      "amount": 1
    },
    {
      "type": "pickup",
      "subtype": "speed",
      "x": 1150, "y": 325,
      "amount": 1.5,
      "duration": 5000
    },
    {
      "type": "pickup",
      "subtype": "damage",
      "x": 2400, "y": 460,
      "amount": 2,
      "duration": 8000
    },

    {
      "type": "boss",
      "sprite": "/sprites/blackledge.png",
      "x": 4400, "y": 500,
      "health": 10,
      "damage": 2,
      "spriteWidth": 96,
      "spriteHeight": 128,
      "frameCount": 2
    }
  ]
}
```

### Key Design Decisions

- **Flat entity array** — every entity in the level is one object. No nested sections. Easy to iterate, easy to add new types.
- **`type` discriminator** — the loader switches on `type` to decide which components to attach.
- **World coordinates** — `x`/`y` are in world space, not screen space. `world.groundY` is the baseline.
- **Minimal but extensible** — platforms are just `x, y, width, height`. Enemies have `patrol` config. Pickups have `subtype` + `amount`. Boss has sprite info. Each type carries only the fields it needs.
- **One level = one file** — `public/levels/level-1.json`. Future levels are just more files.

---

## Entity Type Breakdown

### Platforms

Rectangular solids the player can stand on and collide with. Rendered as colored rectangles initially (no sprite needed). Collision resolution pushes the player out of overlap and sets `isOnGround = true` when landing from above.

- Components: `Position`, `Collider` (with `Solid` tag), `Sprite` (optional — colored rect fallback)
- No velocity, no AI — completely static

### Obstacles

Environmental hazards that deal damage on contact. Static, like spikes on the ground or a fire pit. Different from enemies — they can't be killed.

- Components: `Position`, `Collider`, `Damage`
- Subtype determines sprite/rendering
- Collision with player triggers damage + invincibility frames

### Enemies (walkers)

Simple patrol enemies. Walk back and forth on a platform or the ground. Take damage from projectiles. Deal contact damage to the player.

- Components: `Position`, `Velocity`, `Collider`, `Sprite`, `EnemyTag`, `Health`, `Damage`, `PatrolAI`
- AI: move in `direction` at `speed`, reverse when `range` from `originX` is exceeded
- Die when health reaches 0 (remove entity or play death animation)
- Reuse the existing collision layer/mask system

### Pickups

Collectible items that the player walks over. Three subtypes:

| Subtype | Effect |
|---|---|
| `health` | Restores `amount` HP to player |
| `speed` | Multiplies player speed by `amount` for `duration` ms |
| `damage` | Multiplies projectile damage by `amount` for `duration` ms |

- Components: `Position`, `Collider`, `Pickup`
- On overlap with player: apply effect, destroy entity
- Rendered as simple sprites or colored circles initially

### Boss

Special enemy at the end of the level. Has more health, deals more damage. The existing `blackledge` sprite and boss animation system slot right in. The key change is giving it actual health that depletes when hit by projectiles.

- Components: same as enemy + `BossTag`
- Existing `boss-animation.ts` and `projectile-hits.ts` stay mostly the same
- Add health bar rendering above the boss

---

## Collision Layer Expansion

Current layers need expanding for the new entity types:

```
PLAYER:     0b000001   mask: ENEMY | OBSTACLE | PICKUP | PLATFORM
ENEMY:      0b000010   mask: PLAYER | PROJECTILE | PLATFORM
PROJECTILE: 0b000100   mask: ENEMY
OBSTACLE:   0b001000   mask: PLAYER
PICKUP:     0b010000   mask: PLAYER
PLATFORM:   0b100000   mask: PLAYER | ENEMY
```

Platform collision is special — it needs to **resolve** overlaps (push entities out), not just detect them. This means the collision system needs a response phase, not just event recording.

---

## Implementation Order

Build in layers, each one testable independently:

1. ~~**World coords + camera** — Replace scrolling system, make rendering camera-aware. Game looks the same but is now world-coordinate based.~~ ✅ Done
2. ~~**Platforms** — Add `Solid` component, `PLATFORM` collision layer, and a `platform-collision` system that resolves overlaps directionally. Spawn a handful of hardcoded platforms in world space so the system can be developed and tested without a level loader. Player can now jump between platforms.~~ ✅ Done
3. ~~**Level loader** — Read JSON, spawn platform entities from data. Replaces hardcoded platforms.~~ ✅ Done (platforms + boss loaded from `public/levels/level-1.json`)
4. ~~**Health + damage system** — Add health to player and boss. Existing projectile hits now reduce boss HP. Contact damage from boss hurts player. HUD shows health.~~ ✅ Done
5. **Enemies** — Walker enemies with patrol AI, spawned from level data. Take damage from projectiles, deal contact damage.
6. **Obstacles** — Static hazards loaded from level data that deal damage.
7. **Pickups** — Health and power-up items scattered through the level.
8. **Level completion** — Boss death triggers win state.

---

## Testing the Platform System

✅ Implemented in `src/__tests__/platform-collision.test.ts` — all 10 cases below are covered.

Platform collision is the first system with a **resolution phase**, so it warrants thorough unit tests. Use the existing vitest pattern (see `src/__tests__/collision.test.ts`): reset stores, create entities, invoke the system directly, assert on store state.

### `platform-collision.test.ts` cases

1. **Land from above** — falling entity overlapping platform top snaps to platform top, `velocity.y` zeros, `isOnGround = true`.
2. **No-op when clear** — entity resting above platform with no overlap is not moved.
3. **Bonk from below** — rising entity overlapping platform bottom snaps down, upward `velocity.y` is cancelled.
4. **Block from left** — entity moving right into platform side snaps to platform's left edge, `velocity.x` zeros.
5. **Block from right** — mirror of #4.
6. **Shallowest-axis resolution** — corner overlap resolves along the axis with smaller penetration (standard MTV behavior).
7. **Mask filtering** — entities not masked against `PLATFORM` (e.g. projectiles) pass through; no resolution applied.
8. **Multiple platforms** — entity falling through a gap between stacked platforms lands on the higher one.
9. **`isOnGround` clears** — entity walked off a platform edge is no longer grounded next tick.
10. **Platforms are static** — platform position/velocity unchanged after resolution.

### Out of scope for these tests

- Rendering (colored rectangles) — visual, covered manually.
- Level JSON loading — belongs to the level-loader step.
- Config bitmask assertions — tautological; mask behavior is exercised end-to-end by cases #1 and #7.

---

## What Stays the Same

The core architecture is solid for this. These things don't need to change:

- **ECS pattern** — sparse stores + systems + queries. New components/systems slot right in.
- **Sprite/animation system** — works for any entity already.
- **Input system** — untouched.
- **Projectile system** — pool + spawn + hit detection. Now reduces enemy HP via `health-damage` system.
- **Game loop structure** — just more systems added to the `update()` call.
