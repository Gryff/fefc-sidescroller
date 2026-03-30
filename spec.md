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

### Not Done 🙅‍♂️
- 🚧 Touch/Mobile Controls: Expand touch/joystick support for mobile gameplay.
- 🙅‍♂️ Level Design: Add platforms, obstacles, and interactive elements. Support for multiple backgrounds or level layouts.
- 🙅‍♂️ Player Animation: Add walking/jumping animations (frame-based or sprite sheet).
- 🙅‍♂️ Collision Detection: Implement collisions with platforms, obstacles, and other entities.
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
- **ECS is hardcoded to specific entity IDs**: Systems receive `playerEntityId`/`bossEntityId` explicitly. Adding a second enemy requires changing function signatures. Systems should query entities by component, not by hardcoded ID.

### Low Priority (code quality)
- **`applyJoystickInput` in wrong module**: `input/touch.ts` contains both one-time setup (`setupTouchInput`) and per-frame logic (`applyJoystickInput`). The per-frame function belongs closer to the game loop, not in the setup module.
- **Unsafe DOM casts in `canvas.ts`**: `getElementById` and `getContext("2d")` are cast with `as` and no null check — throws at runtime with no useful error if the element is missing.
- **Magic number `canvas.width / 1.5`** in `ecs/entities.ts:51` — survived the `config.ts` refactor.
- **`BACKGROUND.sourceWidthDivisor`** is an implementation detail, not an intent. Rename to something like `BACKGROUND_STRIP_COUNT`.
- **`spawnProjectile` silently no-ops** if the donut sprite isn't loaded — no error, no feedback to the player.

---

## Inspirations

- Classic 2D platformers (e.g., Mario, Sonic).
- Minimalist, pixel-art style.
