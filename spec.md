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

### Not Done 🙅‍♂️
- 🚧 Touch/Mobile Controls: Expand touch/joystick support for mobile gameplay.
- 🙅‍♂️ Level Design: Add platforms, obstacles, and interactive elements. Support for multiple backgrounds or level layouts.
- 🙅‍♂️ Player Animation: Add walking/jumping animations (frame-based or sprite sheet).
- 🙅‍♂️ Collision Detection: Implement collisions with platforms, obstacles, and other entities.
- 🙅‍♂️ Sound Effects & Music: Add audio feedback for actions and background music.
- 🙅‍♂️ Score & Progression: Track player progress, collectibles, or score.
- 🙅‍♂️ Game States: Add menus, pause, restart, and win/lose conditions.
- 🙅‍♂️ Performance Optimization: Optimize rendering and asset management for smooth gameplay.

---

## Design Goals

- Simple, readable codebase for rapid prototyping.
- Responsive controls and smooth scrolling.
- Easy to extend with new features and assets.

---

## Inspirations

- Classic 2D platformers (e.g., Mario, Sonic).
- Minimalist, pixel-art style.
