fefc-sidescroller/spec.md
# FEFC Sidescroller Spec

## Overview
A simple sidescroller game rendered on an HTML canvas. The player controls a sprite that moves, jumps, and interacts with a scrolling background.

---

## Features

### Done ✅
- ✅ Canvas Rendering: All game visuals are drawn to an HTML canvas, sized to the window.
- ✅ Background Scrolling: The background image scrolls horizontally as the player moves left/right, with trigger zones to keep the player centered.
- ✅ Player Sprite:
  - Multiple sprite images for idle, left, and right movement.
  - Sprite direction updates based on movement.
- ✅ Player Movement:
  - Arrow keys and WASD supported for left/right movement and jumping.
  - Player position is constrained to the canvas bounds.
- ✅ Jumping & Gravity:
  - Player can jump when on the ground.
  - Gravity pulls the player down, with ground collision detection.
- ✅ Asset Loading: Game waits for all images to load before starting.
- ✅ Framerate-independent game loop: Delta time is normalised to 60fps (dt=1.0 at 60fps). All movement, physics, and projectile systems scale by dt so behaviour is consistent at any refresh rate. Delta is capped at 100ms to prevent large position jumps after tab backgrounding.
- ✅ Touch/Mobile Controls: Touch/joystick support for mobile gameplay.
- ✅ Player Animation: Walking/jumping animations (frame-based or sprite sheet).
- ✅ Collision Detection: Collisions with platforms, obstacles, and other entities.

### Not Done 🙅‍♂️
- 🙅‍♂️ Level Design: Add platforms, obstacles, and interactive elements. Support for multiple backgrounds or level layouts.
- 🙅‍♂️ Sound Effects & Music: Add audio feedback for actions and background music.
- 🙅‍♂️ Score & Progression: Track player progress, collectibles, or score.
- 🙅‍♂️ Game States: Add menus, pause, restart, and win/lose conditions.
- 🙅‍♂️ Resize Repositioning: Recompute entity positions on window resize so sprites stay at correct ground level and within canvas bounds.
- 🙅‍♂️ Performance Optimization: Optimize rendering and asset management for smooth gameplay.

---

## Design Goals

- Simple, readable codebase for rapid prototyping.
- Responsive controls and smooth scrolling.
- Easy to extend with new features and assets.

---

## To Fix

### Medium Priority (architecture)
- ~~**ECS is hardcoded to specific entity IDs**~~: ✅ Fixed — systems now use `entitiesWith()` queries by component instead of hardcoded IDs.
- **Global stores limit testability**: ECS stores are module-level singletons. Systems import them directly, making unit tests dependent on shared mutable state. The long-term fix is a `World` class that owns all stores and the entity counter, with systems accepting a `World` argument. Tests construct a fresh `World` per test and `entitiesWith` becomes `world.query(...)`. Short-term: a `resetStores()` utility in `ecs/stores.ts` clears all stores and resets the entity counter for use in `beforeEach`.
- **`validateLevel` validates rather than parses**: it checks a handful of fields then casts via `asserts data is LevelData`, but the runtime checks don't match the type — `playerSpawn.x/y` are unchecked, `entities` is not verified to be an array, individual entity fields are unverified, and unknown `type` values pass through silently to blow up later in `spawnLevel`. A proper parser would construct `LevelData` field-by-field and reject anything malformed at the boundary.
- **Level loader y-coordinates are resolved too late**: `loadLevel` returns `LevelData` where `entity.y` is still a ground-relative JSON offset. The conversion (`WORLD.groundY + entity.y`) happens inside `spawnLevel`, so the `LevelData` type cannot distinguish unresolved offsets from world positions. Every spawn helper must remember to apply the offset manually — a future entity type could easily skip it. The fix is to resolve positions inside the parser and return a `ParsedLevel` type with world-absolute coordinates, keeping the ground-relative convention entirely inside `loadLevel`.

### Low Priority (flexibility)
- **`PatrolAI.direction` is cardinal-only**: the `Direction` union (`"left" | "right" | "up" | "down"`) is readable but locks patrol to 4 directions. If diagonal or arbitrary-angle patrol is ever needed, switch to a unit vector `{ x: number, y: number }` — loses some readability at the JSON boundary but generalises cleanly.
- ~~**Vertical patrollers need to opt out of gravity**~~: ✅ Decided — `Flying` tag (gravity opt-out) added in the enemy-plan phase 1 work. Tagging an entity `flying` causes the integrator to skip the gravity step. Used today by projectiles; available for future vertical patrollers and flyers.

### Low Priority (animation)
- **Sprite animation doesn't catch up after lag spikes**: `updateSpriteAnimation` subtracts one `frameDuration` per tick, so a large delta only advances one frame. The animation temporarily slows down instead of skipping ahead. Cosmetic-only impact.

### Low Priority (code quality)
- **`applyJoystickInput` in wrong module**: `input/touch.ts` contains both one-time setup (`setupTouchInput`) and per-frame logic (`applyJoystickInput`). The per-frame function belongs closer to the game loop, not in the setup module.
- **Unsafe DOM casts in `canvas.ts`**: `getElementById` and `getContext("2d")` are cast with `as` and no null check — throws at runtime with no useful error if the element is missing.
- **`BACKGROUND.sourceWidthDivisor`** is an implementation detail, not an intent. Rename to something like `BACKGROUND_STRIP_COUNT`.
- **`spawnProjectile` silently no-ops** if the donut sprite isn't loaded — no error, no feedback to the player.

---

## Inspirations

- Classic 2D platformers (e.g., Mario, Sonic).
- Minimalist, pixel-art style.
