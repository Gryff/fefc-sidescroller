import { loadAssets } from "./assets";
import { WORLD } from "./config";
import { loadEntities } from "./ecs/entities";
import { startGameLoop } from "./game-loop";
import { setupKeyboardInput } from "./input/keyboard";
import { detectTouchDevice, setupTouchInput } from "./input/touch";
import { createCanvas } from "./rendering/canvas";
import { spawnProjectile } from "./systems/projectile";
import type { GameContext, GameState } from "./types";

// Bootstrap
const { canvas, ctx } = createCanvas();
const { projectileSpriteTemplate } = await loadEntities();

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
