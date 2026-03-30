import { loadAssets } from "./assets";
import { loadEntities } from "./ecs/entities";
import { startGameLoop } from "./game-loop";
import { setupKeyboardInput } from "./input/keyboard";
import { detectTouchDevice, setupTouchInput } from "./input/touch";
import { createCanvas } from "./rendering/canvas";
import { spawnProjectile } from "./systems/projectile";
import type { GameContext, GameState } from "./types";

// Bootstrap
const { canvas, ctx } = createCanvas();
const { playerEntityId, bossEntityId, projectileSpriteTemplate } =
  await loadEntities(canvas);

const isTouchDevice = detectTouchDevice();

const state: GameState = {
  player: {
    velocityY: 0,
    isOnGround: true,
    facingRight: false,
    isMoving: false,
  },
  boss: { elapsed: 0, frame: 0 },
  scroll: { backgroundOffsetX: 0 },
  joystick: {
    touchId: null,
    active: false,
    dir: { left: false, right: false, up: false },
  },
  gameRunning: true,
};

const gameCtx: GameContext = {
  canvas,
  ctx,
  playerEntityId,
  bossEntityId,
  projectileSpriteTemplate,
  isTouchDevice,
};

// Input
setupKeyboardInput(playerEntityId, () =>
  spawnProjectile(playerEntityId, projectileSpriteTemplate, state.player.facingRight),
);

if (isTouchDevice) {
  setupTouchInput(canvas, state.joystick);
}

// Load assets and start
const assets = await loadAssets();
console.log("All assets loaded");
startGameLoop(gameCtx, state, assets);
