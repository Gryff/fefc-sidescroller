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
- In `setupTouchInput`, **remove the `break`** from the `touchstart` loop so all touches in a single event are checked — without this, simultaneous joystick + fire button touches (two fingers landing at the same time) would leave the fire button undetected
- After iterating all touches, if a touch lands within the fire button bounds (bottom-right), set `playerState.isAttacking = true`, `playerState.attackTimer = 0`, then call `onFire()` — calling only `onFire()` is not enough because `isAttacking` is set in the keyboard handler directly, not inside the callback (see `keyboard.ts:22-24`)
- Use a **separate `touchId`** so the joystick and fire button can be used simultaneously (multi-touch) — this is critical, otherwise you can't move and shoot at the same time
- No `touchmove` needed for the fire button (it's a discrete tap, not analog)
- Handle both `touchend` **and `touchcancel`** to reset the fire button state — OS gestures (iOS swipe-up, Android back swipe) fire `touchcancel` rather than `touchend`, which would otherwise leave the button stuck active

### 3. Types (`src/types.ts`)

Add a `FireButtonState` or extend `JoystickState`:
- Track `touchId` and `active` for the fire button independently

### 4. Main setup (`src/main.ts`)

Pass the `onFire` callback and `playerState` to `setupTouchInput`:
- Currently `setupTouchInput(canvas, joystickState)` — needs to also accept the fire callback (same one passed to keyboard input)

### 5. Renderer (`src/rendering/renderer.ts`)

Draw the fire button procedurally using canvas arc + label (no new image asset needed):
- Render when `isTouchDevice` is true
- Positioned at `canvas.width - FIRE_BUTTON.margin - FIRE_BUTTON.size`
- Use `state.fireButton.active` (from `GameState`) to reduce opacity when the button is pressed, providing tactile visual feedback — the renderer already receives `state: GameState` so this flows through without any signature change

### 6. Asset

No new asset needed — the fire button is drawn procedurally in the renderer (see §5). `src/assets.ts` and the `GameAssets` type do not need to change.

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
