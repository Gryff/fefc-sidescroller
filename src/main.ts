import { loadAssets } from "./assets";
import { WORLD } from "./config";
import { startGameLoop } from "./game-loop";
import { setupKeyboardInput } from "./input/keyboard";
import { detectTouchDevice, setupTouchInput } from "./input/touch";
import { loadLevel, spawnLevel } from "./level/level-loader";
import { createCanvas } from "./rendering/canvas";
import { spawnProjectile } from "./systems/projectile";
import type { GameContext, GameState } from "./types";
import { createSprite } from "./components/components";

// Bootstrap
const { canvas, ctx } = createCanvas();
const level = await loadLevel("/levels/level-1.json");
await spawnLevel(level);
const projectileSpriteTemplate = await createSprite("/sprites/donut.png", 48, 48, 1);

const isTouchDevice = detectTouchDevice();

const state: GameState = {
  player: {
    facingRight: false,
    isMoving: false,
    isAttacking: false,
    attackTimer: 0,
  },
  boss: { elapsed: 0, frame: 0 },
  camera: { x: 0, worldWidth: WORLD.width },
  joystick: {
    touchId: null,
    active: false,
    dir: { left: false, right: false, up: false },
  },
  fireButton: {
    touchId: null,
    active: false,
  },
  gameRunning: true,
};

const gameCtx: GameContext = {
  canvas,
  ctx,
  projectileSpriteTemplate,
  isTouchDevice,
};

// Input
setupKeyboardInput(state.player, () =>
  spawnProjectile(projectileSpriteTemplate, state.player.facingRight),
);

if (isTouchDevice) {
  setupTouchInput(canvas, state.joystick, state.fireButton, state.player, () =>
    spawnProjectile(projectileSpriteTemplate, state.player.facingRight),
  );
}

// Load assets and start
const assets = await loadAssets();
console.log("All assets loaded");
startGameLoop(gameCtx, state, assets);
