# Mobile Projectile Firing Plan

## Current State

- **Desktop**: Space bar fires a projectile (a donut) via `keyboard.ts:21-24` which calls `spawnProjectile()`
- **Mobile**: Only a virtual joystick exists (bottom-left corner) for movement/jumping. There is **no fire button** — mobile players cannot shoot at all.

## Recommended Approach: Fire Button (bottom-right)

Add a **tap-to-fire button** in the bottom-right corner of the canvas, mirroring the joystick placement on the left. This is the most natural pattern for mobile side-scrollers (virtual joystick left, action buttons right — like a gamepad).

## What needs to change

### 1. Config (`src/config.ts`)

Add a `FIRE_BUTTON` constant:
- `size: 96` (slightly smaller than joystick's 128, since it's a single button)
- `margin: 32` (same as joystick)
- `opacity: 0.8` (same as joystick)

### 2. Touch input (`src/input/touch.ts`)

Add fire button touch handling:
- In `setupTouchInput`, add a second touch zone check in `touchstart`: if the touch lands within the fire button bounds (bottom-right), call the `onFire` callback
- Use a **separate `touchId`** so the joystick and fire button can be used simultaneously (multi-touch) — this is critical, otherwise you can't move and shoot at the same time
- No `touchmove` needed for the fire button (it's a discrete tap, not analog)
- Handle `touchend` to reset the fire button state

### 3. Types (`src/types.ts`)

Add a `FireButtonState` or extend `JoystickState`:
- Track `touchId` and `active` for the fire button independently

### 4. Main setup (`src/main.ts`)

Pass the `onFire` callback and `playerState` to `setupTouchInput`:
- Currently `setupTouchInput(canvas, joystickState)` — needs to also accept the fire callback (same one passed to keyboard input)

### 5. Renderer (`src/rendering/renderer.ts`)

Draw the fire button:
- Render a fire button image at bottom-right when `isTouchDevice` is true
- Positioned at `canvas.width - FIRE_BUTTON.margin - FIRE_BUTTON.size`

### 6. Asset (`public/` + `src/assets.ts`)

Add a fire button image:
- Either create a simple PNG (a circle with a donut/crosshair icon) or draw it procedurally with canvas (filled circle + icon) to avoid needing an artist
- Procedural drawing (canvas arc + text/icon) is simpler to start with and avoids asset dependencies

## Key Design Decisions

| Decision | Recommendation | Why |
|----------|---------------|-----|
| Button position | Bottom-right | Standard gamepad layout (d-pad left, buttons right) |
| Multi-touch | Yes, separate touchId tracking | Players need to move and shoot simultaneously |
| Visual feedback | Reduce opacity or scale when pressed | Provides tactile feedback on tap |
| Fire rate limiting | Not needed now (desktop doesn't have it either) | Keep parity; add cooldown later if needed |
| Rendering | Procedural canvas drawing | No new image asset needed; a filled circle with the donut sprite or a simple "FIRE" label |

## Files to modify

1. `src/config.ts` — add `FIRE_BUTTON` constants
2. `src/types.ts` — add `FireButtonState` interface, add to `GameState`
3. `src/input/touch.ts` — add fire button touch detection in `setupTouchInput`, accept `onFire` callback
4. `src/main.ts` — pass `onFire`/`playerState` to `setupTouchInput`
5. `src/rendering/renderer.ts` — draw the fire button on mobile

No changes needed to the projectile system itself, collision, physics, or game loop — those already work. The fire button just needs to call the same `spawnProjectile()` + set `playerState.isAttacking` that the spacebar does.
