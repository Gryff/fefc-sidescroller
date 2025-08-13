import {
  createSprite,
  type EntityId,
  type Input,
  type Position,
  type Sprite,
  type Velocity,
} from "./components/components";

// Game Canvas and Context
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
ctx.imageSmoothingEnabled = false;

// Set canvas dimensions to window size
function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Initial canvas resize
resizeCanvas();

// Handle window resize
window.addEventListener("resize", resizeCanvas);

// Game state
let gameRunning = true;
let entityIdCounter: EntityId = 0;

function createEntity(): EntityId {
  return entityIdCounter++;
}

const sprite: Sprite = {};
const position: Position = {};
const velocity: Velocity = {};
const input: Input = {};

const playerEntityId = createEntity();

const groundLevel = () => canvas.height - 200;

async function loadComponents() {
  sprite[playerEntityId] = await createSprite(
    "/sprites/tris-sheet.png",
    96, // frame width
    128, // frame height
    3, // number of frames
  );
  input[playerEntityId] = { left: false, right: false, up: false };
  position[playerEntityId] = {
    x: canvas.width / 2,
    y: groundLevel(),
  };
  // TODO: continue using these
  velocity[playerEntityId] = { x: 0, y: 0 };
}

loadComponents().then(() => {
  // Player movement and physics
  const playerSpeed = 3;
  const gravity = 0.5;
  const jumpStrength = -12;
  let playerVelocityY = 0;
  let playerIsOnGround = true;

  // Background image
  const backgroundImage = new Image();
  backgroundImage.src = "/background.png";

  // Joystick image for mobile/touch devices
  const joystickImage = new Image();
  joystickImage.src = "/joystick.png";
  let joystickLoaded = false;
  joystickImage.onload = () => {
    joystickLoaded = true;
  };

  // Joystick touch state
  let joystickTouchId: number | null = null;
  let joystickActive = false;
  let joystickDir: { left: boolean; right: boolean; up: boolean } = {
    left: false,
    right: false,
    up: false,
  };

  // Player sprite sheet is loaded via createSprite
  let facingRight = false;
  let isMoving = false;

  // Detect touch capability
  const isTouchDevice =
    "ontouchstart" in window ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

  // Background scrolling
  let backgroundOffsetX = 0;
  const scrollTriggerX = () => canvas.width * (2 / 3); // 2/3 across screen
  const scrollTriggerLeftX = () => canvas.width * (1 / 3); // 1/3 across screen for left scrolling
  const maxBackgroundOffset = () => (backgroundImage.width * 2) / 3; // Stop at rightmost end

  // Game initialization
  function init(): void {
    playerVelocityY = 0;
    playerIsOnGround = true;

    console.log("Game initialized");
  }

  // Update game logic
  function update(): void {
    // Handle joystick input (simulate key presses)
    if (isTouchDevice && joystickActive) {
      input[playerEntityId].left = joystickDir.left;
      input[playerEntityId].right = joystickDir.right;
      input[playerEntityId].up = joystickDir.up;
    }

    // Store previous player position for scrolling logic
    const prevPlayerX = position[playerEntityId].x;

    // Reset movement flag
    isMoving = false;

    // Handle player movement
    if (input[playerEntityId].left) {
      position[playerEntityId].x -= playerSpeed;
      facingRight = false;
      isMoving = true;
    }
    if (input[playerEntityId].right) {
      position[playerEntityId].x += playerSpeed;
      facingRight = true;
      isMoving = true;
    }

    // Set sprite frame based on movement state and direction
    if (isMoving) {
      sprite[playerEntityId].currentFrame = facingRight ? 2 : 1;
    } else {
      sprite[playerEntityId].currentFrame = 0;
    }

    // Handle jumping
    if (input[playerEntityId].up && playerIsOnGround) {
      playerVelocityY = jumpStrength;
      playerIsOnGround = false;
    }

    // Apply gravity
    playerVelocityY += gravity;
    position[playerEntityId].y += playerVelocityY;

    // Check for ground collision
    if (position[playerEntityId].y >= groundLevel()) {
      position[playerEntityId].y = groundLevel();
      playerVelocityY = 0;
      playerIsOnGround = true;
    }

    // Handle background scrolling when moving right
    if (input[playerEntityId].right) {
      if (
        position[playerEntityId].x >= scrollTriggerX() &&
        backgroundOffsetX < maxBackgroundOffset()
      ) {
        // Player is at trigger point and background can still scroll
        const scrollAmount = position[playerEntityId].x - prevPlayerX;
        backgroundOffsetX = Math.min(
          maxBackgroundOffset(),
          backgroundOffsetX + scrollAmount,
        );
        position[playerEntityId].x = scrollTriggerX(); // Keep player at trigger position
      }
    }

    // Handle background scrolling when moving left
    if (input[playerEntityId].left) {
      if (
        position[playerEntityId].x <= scrollTriggerLeftX() &&
        backgroundOffsetX > 0
      ) {
        // Player is at left trigger point and background can scroll back
        const scrollAmount = prevPlayerX - position[playerEntityId].x;
        backgroundOffsetX = Math.max(0, backgroundOffsetX - scrollAmount);
        position[playerEntityId].x = scrollTriggerLeftX(); // Keep player at left trigger position
      }
    }

    // Keep player within horizontal canvas bounds
    position[playerEntityId].x = Math.max(
      32,
      Math.min(canvas.width - 32, position[playerEntityId].x),
    );

    // Vertical bounds are handled by gravity and ground collision
  }

  // Render the game
  function render(): void {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background if loaded with scrolling offset
    if (backgroundImage.complete) {
      const sourceWidth = backgroundImage.width / 3;
      ctx.drawImage(
        backgroundImage,
        backgroundOffsetX,
        0,
        sourceWidth,
        backgroundImage.height, // source: with offset
        0,
        0,
        canvas.width,
        canvas.height, // destination: fill canvas
      );
    }

    // Draw player sprite from sprite sheet if loaded
    const playerSpriteData = sprite[playerEntityId];
    if (playerSpriteData && playerSpriteData.image.complete) {
      const frame = playerSpriteData.currentFrame;
      const sx = frame * playerSpriteData.width;
      const sy = 0;
      ctx.drawImage(
        playerSpriteData.image,
        sx,
        sy,
        playerSpriteData.width,
        playerSpriteData.height, // source rect
        position[playerEntityId].x - playerSpriteData.width / 2,
        position[playerEntityId].y - playerSpriteData.height / 2,
        playerSpriteData.width,
        playerSpriteData.height,
      );
    }

    // Draw joystick for touch devices
    if (isTouchDevice && joystickLoaded) {
      const joystickSize = 128; // Size of the joystick image
      const margin = 32; // Margin from the edges
      ctx.globalAlpha = 0.8; // Slight transparency for UI
      ctx.drawImage(
        joystickImage,
        margin,
        canvas.height - joystickSize - margin,
        joystickSize,
        joystickSize,
      );
      ctx.globalAlpha = 1.0; // Reset alpha
    }

    // Other rendering will go here
  }

  // Main game loop
  function gameLoop(): void {
    if (gameRunning) {
      update();
      render();
      requestAnimationFrame(gameLoop);
    }
  }

  // Track loaded assets
  let assetsLoaded = 0;
  const totalAssets = 1; // Only background image needs to be loaded here

  function checkAssetsLoaded(): void {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
      console.log("All assets loaded");
      init();
      gameLoop();
    }
  }

  // Start the game when background image is loaded
  backgroundImage.onload = () => {
    console.log("Background image loaded");
    checkAssetsLoaded();
  };

  // Handle image load errors
  backgroundImage.onerror = () => {
    console.error("Failed to load background image");
    checkAssetsLoaded();
  };

  // Keyboard event listeners
  window.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      input[playerEntityId].left = true;
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      input[playerEntityId].right = true;
    }
    if (event.code === "ArrowUp" || event.code === "KeyW") {
      input[playerEntityId].up = true;
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      input[playerEntityId].left = false;
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      input[playerEntityId].right = false;
    }
    if (event.code === "ArrowUp" || event.code === "KeyW") {
      input[playerEntityId].up = false;
    }
  });

  // Joystick touch controls for mobile
  if (isTouchDevice) {
    const joystickSize = 128;
    const margin = 32;

    canvas.addEventListener("touchstart", (event) => {
      for (const touch of Array.from(event.touches)) {
        const x = touch.clientX;
        const y = touch.clientY;
        // Check if touch is within joystick area
        if (
          x >= margin &&
          x <= margin + joystickSize &&
          y >= canvas.height - joystickSize - margin &&
          y <= canvas.height - margin
        ) {
          joystickTouchId = touch.identifier;
          joystickActive = true;
          joystickDir = { left: false, right: false, up: false };
          event.preventDefault();
          break;
        }
      }
    });

    canvas.addEventListener("touchmove", (event) => {
      if (!joystickActive || joystickTouchId === null) return;
      for (const touch of Array.from(event.touches)) {
        if (touch.identifier === joystickTouchId) {
          const x = touch.clientX;
          const y = touch.clientY;
          const centerX = margin + joystickSize / 2;
          const centerY = canvas.height - margin - joystickSize / 2;
          const dx = x - centerX;
          const dy = y - centerY;
          // Simple direction detection
          joystickDir.left = dx < -joystickSize / 4;
          joystickDir.right = dx > joystickSize / 4;
          joystickDir.up = dy < -joystickSize / 4;
          event.preventDefault();
          break;
        }
      }
    });

    canvas.addEventListener("touchend", (event) => {
      if (!joystickActive) return;
      // If the tracked touch ends, reset joystick
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier === joystickTouchId) {
          joystickTouchId = null;
          joystickActive = false;
          joystickDir = { left: false, right: false, up: false };
          event.preventDefault();
          break;
        }
      }
    });
  }
});
