# Plan: World Coordinates + Camera System

## Goal

Convert all entity positions from screen space to world space, and introduce a
camera that transforms world coordinates to screen coordinates at render time.
After this change the game should look and play identically, but the
architecture will support levels wider than the viewport.

---

## Current Screen-Space Assumptions (Audit)

Every file below hard-codes screen-relative logic that must change:

### `src/ecs/entities.ts`
- Player spawns at `canvas.width / 2` (line 69) — screen centre.
- Boss spawns at `canvas.width / 1.5` (line 36) — screen-relative.
- Both use `groundLevel(canvas.height)` which derives ground from screen height.

### `src/systems/scrolling.ts` (entire file)
- Fakes world scrolling by shifting `backgroundOffsetX` and clamping the player
  to trigger zones at 1/3 and 2/3 of canvas width.
- Player position is mutated to stay within screen bounds (lines 26, 37, 51-54).
- **This entire file gets deleted** and replaced by a camera system.

### `src/systems/movement.ts`
- Returns `prevPlayerX` (line 26) solely so `scrolling.ts` can compute scroll
  delta. This return value becomes unnecessary.

### `src/systems/physics.ts`
- Ground level derived from `canvasHeight`: `canvasHeight - 200` (via
  `groundLevel()`). Should use a fixed world-space ground Y.

### `src/systems/projectile.ts`
- Out-of-bounds check (lines 54-59) compares against `canvas.width` and
  `canvas.height`. Should compare against world bounds or a margin around the
  camera viewport.

### `src/rendering/renderer.ts`
- Draws entities at raw `position[id].x, position[id].y` — these are currently
  screen positions. Must subtract camera offset to convert world → screen.
- Background drawn using `state.scroll.backgroundOffsetX`. Should derive from
  camera position instead.
- Debug collider wireframes also use raw position (lines 94-101).

### `src/config.ts`
- `groundLevel(canvasHeight)` ties ground to screen. Replace with a world
  constant or level-data value.
- `SCROLL` config block (trigger fractions, max offset) — deleted.

### `src/types.ts`
- `ScrollState` — replaced by `CameraState`.

### `src/game-loop.ts`
- Calls `updateScrolling(state.scroll, canvas, backgroundImage, prevPlayerX)`.
  Replace with `updateCamera()`.
- Receives `prevPlayerX` from `updateMovement()` — this coupling is removed.

### `src/main.ts`
- Initialises `state.scroll`. Replace with `state.camera`.

### Files that need NO changes
- `src/systems/collision.ts` — coordinate-agnostic, works in world space as-is.
- `src/systems/projectile-hits.ts` — reacts to collision events, no positions.
- `src/systems/boss-animation.ts` — toggles sprite frames, no positions.
- `src/systems/player-animation.ts` — sets animation name, no positions.
- `src/systems/sprite-animation.ts` — advances frame timers, no positions.
- `src/input/keyboard.ts` — sets input flags, no positions.
- `src/input/touch.ts` — touch coords used only for UI hit-testing (joystick,
  fire button), not world positioning. Stays screen-relative.
- `src/rendering/canvas.ts` — creates the canvas element, no positions.
- `src/assets.ts` — loads images, no positions.
- `src/components/components.ts` — type definitions only.
- `src/ecs/stores.ts` — generic stores, no position logic.
- `src/ecs/query.ts` — query function, no position logic.

---

## Design

### CameraState

```ts
export interface CameraState {
  x: number;         // world X of the left edge of the viewport
  worldWidth: number; // total level width in world units
  groundY: number;    // world Y of the ground line
}
```

- Only horizontal scrolling (1D camera). Vertical could be added later but is
  not needed for a flat-ground sidescroller.
- `x` is clamped to `[0, worldWidth - canvas.width]` so the camera never shows
  past the level edges.

### World-to-screen transform

```ts
screenX = worldX - camera.x
screenY = worldY                // no vertical scroll for now
```

Applied only at render time. All systems (physics, collision, movement) operate
in world space.

### Camera follow behaviour

The camera tracks the player horizontally with a dead zone:

```
|---- canvas width --------------------------------------------|
|         |<--- dead zone --->|                                |
|         left edge          right edge                        |
```

- Define dead zone as a fraction of canvas width (e.g. 0.3 to 0.6).
- If the player's world X is left of `camera.x + deadZoneLeft`, shift camera
  left so the player sits at the dead zone left edge.
- If the player's world X is right of `camera.x + deadZoneRight`, shift camera
  right so the player sits at the dead zone right edge.
- Clamp camera to `[0, worldWidth - canvas.width]`.

This replaces the current trigger-zone + background-offset approach and produces
smooth, natural scrolling.

### Temporary world constants (pre-level-loader)

Until the level loader exists, hard-code world dimensions:

```ts
const WORLD = {
  width: 3200,  // roughly 3x a typical viewport — enough to scroll
  groundY: 500, // fixed world Y for the ground
};
```

These will later come from the level JSON `world.width` / `world.groundY`.

### Background parallax from camera

The background scrolls as a fraction of the camera position:

```ts
backgroundSourceX = (camera.x / (worldWidth - canvasWidth)) * maxSourceOffset;
```

This replaces `state.scroll.backgroundOffsetX` and the `SCROLL` / `BACKGROUND`
config constants. The effect is the same parallax, driven by camera position
instead of accumulated scroll delta.

---

## Step-by-step Changes

### Step 1 — Add CameraState, remove ScrollState

**`src/types.ts`**
- Remove `ScrollState`.
- Add `CameraState { x: number; worldWidth: number; groundY: number }`.
- Replace `scroll: ScrollState` with `camera: CameraState` in `GameState`.

**`src/main.ts`**
- Replace `scroll: { backgroundOffsetX: 0 }` with
  `camera: { x: 0, worldWidth: 3200, groundY: 500 }`.

### Step 2 — Add world config, update ground level

**`src/config.ts`**
- Add temporary `WORLD` constants (`width`, `groundY`).
- Remove `SCROLL` block.
- Change `groundLevel()` to no longer take `canvasHeight`. It can read from a
  world constant or be replaced by direct access to `camera.groundY`.
  Simplest: delete `groundLevel()` entirely; callers use `state.camera.groundY`
  or the `WORLD` constant directly.

### Step 3 — Create camera system, delete scrolling system

**`src/systems/camera.ts`** (new file)
```ts
export function updateCamera(
  camera: CameraState,
  canvasWidth: number,
): void {
  // Find player world X
  // Apply dead-zone follow logic
  // Clamp camera.x to [0, worldWidth - canvasWidth]
}
```

**`src/systems/scrolling.ts`** — delete entirely.

### Step 4 — Update entity spawning to use world coordinates

**`src/ecs/entities.ts`**
- Player spawns at a world position (e.g. `x: 120, y: WORLD.groundY`) instead
  of `canvas.width / 2`.
- Boss spawns at a far-right world position (e.g. `x: 2800, y: WORLD.groundY`)
  instead of `canvas.width / 1.5`.
- Remove `canvas` parameter from `loadEntities` and `createAssetPackPlayer`
  (they no longer need screen dimensions).

### Step 5 — Update movement system

**`src/systems/movement.ts`**
- Remove `prevPlayerX` return value (no longer needed by scrolling).
- Return type becomes `void`.
- Movement itself is unchanged — it already moves in whatever coordinate space
  position stores use, which is now world space.

### Step 6 — Update physics system

**`src/systems/physics.ts`**
- Replace `groundLevel(canvasHeight)` with the world ground Y value.
- Change signature: accept `groundY: number` instead of `canvasHeight: number`.

### Step 7 — Update projectile bounds checking

**`src/systems/projectile.ts`**
- Replace `canvas.width` / `canvas.height` bounds with world-relative bounds.
- Option A: despawn when outside `[camera.x - margin, camera.x + canvasWidth + margin]`
  (viewport-relative with margin so projectiles don't pop out of existence on
  screen).
- Option B: despawn when outside `[0, worldWidth]` (simpler, projectiles live
  until they leave the world).
- **Go with Option A** — prevents projectiles from flying across the entire
  level off-screen and wasting collision checks.
- Change signature: accept `camera: CameraState` and `canvasWidth: number`
  instead of `canvas: HTMLCanvasElement`.

### Step 8 — Update renderer for camera offset

**`src/rendering/renderer.ts`**

Three changes:

1. **Background** — derive source X from `camera.x` position using the parallax
   formula. Remove reference to `state.scroll.backgroundOffsetX`.

2. **Entity drawing** — `drawSprite()` receives a `cameraX` parameter. Subtract
   it from `pos.x` when computing `dx`:
   ```ts
   const dx = (pos.x - cameraX) - spriteData.width / 2;
   ```
   The `flipX` mirror must also flip around the screen-space position, not the
   world position.

3. **Debug colliders** — same offset: subtract `cameraX` from `pos.x`.

UI elements (joystick, fire button) are unaffected — they draw at fixed screen
positions.

### Step 9 — Update game loop

**`src/game-loop.ts`**
- Remove `import { updateScrolling }`.
- Add `import { updateCamera }`.
- Remove `const prevPlayerX = ` from `updateMovement()` call (now returns void).
- Replace `updateScrolling(state.scroll, canvas, assets.backgroundImage, prevPlayerX)`
  with `updateCamera(state.camera, canvas.width)`.

### Step 10 — Player clamping to world bounds

The old scrolling system clamped the player to `[PLAYER.halfWidth, canvas.width - PLAYER.halfWidth]`. Now clamp to world bounds:

```ts
position[playerId].x = Math.max(
  PLAYER.halfWidth,
  Math.min(camera.worldWidth - PLAYER.halfWidth, position[playerId].x),
);
```

This lives in the camera system (before the follow logic, so the camera
tracks the clamped position).

---

## Verification

After all changes, the game should:

1. **Look the same on initial load** — player visible, boss visible to the
   right, background scrolling works.
2. **Scroll smoothly** — walking right moves the camera, background parallax
   matches the old behaviour.
3. **Stop at world edges** — player can't walk past `x: 0` or `x: worldWidth`.
   Camera stops at both edges.
4. **Projectiles work** — fire in both directions, despawn when off-screen.
5. **Collisions work** — projectile-enemy collision still functions (both
   entities are in the same world space).
6. **Touch controls work** — joystick and fire button unaffected (screen-space
   UI).
7. **Resize works** — camera re-clamps to valid range when window resizes.

### Test commands

```bash
npm run build   # TypeScript compiles with no errors
npm run test    # Existing collision + query tests still pass
```

Manual: open in browser, walk left/right, verify scrolling, fire projectiles,
confirm boss is reachable at the far right of the world.

---

## Files Changed Summary

| File | Action |
|---|---|
| `src/types.ts` | Remove `ScrollState`, add `CameraState`, update `GameState` |
| `src/config.ts` | Add `WORLD` constants, remove `SCROLL`, update/remove `groundLevel()` |
| `src/main.ts` | Replace `scroll` init with `camera` init |
| `src/systems/camera.ts` | **New file** — camera follow + clamp logic |
| `src/systems/scrolling.ts` | **Deleted** |
| `src/systems/movement.ts` | Remove `prevPlayerX` return, return `void` |
| `src/systems/physics.ts` | Use world `groundY` instead of `canvasHeight` |
| `src/systems/projectile.ts` | Bounds check against camera viewport, not canvas |
| `src/rendering/renderer.ts` | Subtract `camera.x` from entity draw positions, derive background from camera |
| `src/game-loop.ts` | Replace `updateScrolling` with `updateCamera`, remove `prevPlayerX` coupling |
| `src/ecs/entities.ts` | Spawn at world coordinates, remove `canvas` parameter |
