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

// Input state
const keys: { [key: string]: boolean } = {};

// Player movement and physics
const playerSpeed = 3;
const gravity = 0.5;
const jumpStrength = -12;
let playerVelocityY = 0;
const groundLevel = () => canvas.height - 200; // Ground level for the player
let playerIsOnGround = true;

// Background image
const backgroundImage = new Image();
backgroundImage.src = "/background.png";

// Player sprites
const playerSprite = new Image();
playerSprite.src = "/sprites/tris.png";
const playerSpriteLeft = new Image();
playerSpriteLeft.src = "/sprites/tris-left.png";
const playerSpriteRight = new Image();
playerSpriteRight.src = "/sprites/tris-right.png";
let facingRight = false;
let isMoving = false;

// Player position
let playerX = 0; // Will be set to center in init()
let playerY = 0; // Will be set to bottom in init()

// Background scrolling
let backgroundOffsetX = 0;
const scrollTriggerX = () => canvas.width * (2 / 3); // 2/3 across screen
const scrollTriggerLeftX = () => canvas.width * (1 / 3); // 1/3 across screen for left scrolling
const maxBackgroundOffset = () => (backgroundImage.width * 2) / 3; // Stop at rightmost end

// Game initialization
function init(): void {
  // Position player at center horizontally, towards bottom vertically
  playerX = canvas.width / 2;
  playerY = groundLevel(); // Place player on ground
  playerVelocityY = 0;
  playerIsOnGround = true;

  console.log("Game initialized");
}

// Update game logic
function update(): void {
  // Store previous player position for scrolling logic
  const prevPlayerX = playerX;

  // Reset movement flag
  isMoving = false;

  // Handle player movement
  if (keys["ArrowLeft"] || keys["KeyA"]) {
    playerX -= playerSpeed;
    facingRight = false;
    isMoving = true;
  }
  if (keys["ArrowRight"] || keys["KeyD"]) {
    playerX += playerSpeed;
    facingRight = true;
    isMoving = true;
  }

  // Handle jumping
  if ((keys["ArrowUp"] || keys["KeyW"]) && playerIsOnGround) {
    playerVelocityY = jumpStrength;
    playerIsOnGround = false;
  }

  // Apply gravity
  playerVelocityY += gravity;
  playerY += playerVelocityY;

  // Check for ground collision
  if (playerY >= groundLevel()) {
    playerY = groundLevel();
    playerVelocityY = 0;
    playerIsOnGround = true;
  }

  // Handle background scrolling when moving right
  if (keys["ArrowRight"] || keys["KeyD"]) {
    if (
      playerX >= scrollTriggerX() &&
      backgroundOffsetX < maxBackgroundOffset()
    ) {
      // Player is at trigger point and background can still scroll
      const scrollAmount = playerX - prevPlayerX;
      backgroundOffsetX = Math.min(
        maxBackgroundOffset(),
        backgroundOffsetX + scrollAmount,
      );
      playerX = scrollTriggerX(); // Keep player at trigger position
    }
  }

  // Handle background scrolling when moving left
  if (keys["ArrowLeft"] || keys["KeyA"]) {
    if (playerX <= scrollTriggerLeftX() && backgroundOffsetX > 0) {
      // Player is at left trigger point and background can scroll back
      const scrollAmount = prevPlayerX - playerX;
      backgroundOffsetX = Math.max(0, backgroundOffsetX - scrollAmount);
      playerX = scrollTriggerLeftX(); // Keep player at left trigger position
    }
  }

  // Keep player within horizontal canvas bounds
  playerX = Math.max(32, Math.min(canvas.width - 32, playerX));

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

  // Draw player sprite if loaded
  if (
    playerSprite.complete &&
    playerSpriteLeft.complete &&
    playerSpriteRight.complete
  ) {
    // Draw sprite centered on player position
    const spriteWidth = 96; // Adjust size as needed
    const spriteHeight = 128; // Adjust size as needed

    // Select the appropriate sprite based on movement state and direction
    let currentSprite = playerSprite; // Default sprite when not moving
    if (isMoving) {
      currentSprite = facingRight ? playerSpriteRight : playerSpriteLeft;
    }

    ctx.drawImage(
      currentSprite,
      playerX - spriteWidth / 2,
      playerY - spriteHeight / 2,
      spriteWidth,
      spriteHeight,
    );
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
const totalAssets = 4; // Background + 3 player sprites

function checkAssetsLoaded(): void {
  assetsLoaded++;
  if (assetsLoaded === totalAssets) {
    console.log("All assets loaded");
    init();
    gameLoop();
  }
}

// Start the game when all assets are loaded
backgroundImage.onload = () => {
  console.log("Background image loaded");
  checkAssetsLoaded();
};

playerSprite.onload = () => {
  console.log("Player default sprite loaded");
  checkAssetsLoaded();
};

playerSpriteLeft.onload = () => {
  console.log("Player left-facing sprite loaded");
  checkAssetsLoaded();
};

playerSpriteRight.onload = () => {
  console.log("Player right-facing sprite loaded");
  checkAssetsLoaded();
};

// Handle image load errors
backgroundImage.onerror = () => {
  console.error("Failed to load background image");
  checkAssetsLoaded();
};

playerSprite.onerror = () => {
  console.error("Failed to load player default sprite");
  checkAssetsLoaded();
};

playerSpriteLeft.onerror = () => {
  console.error("Failed to load player left-facing sprite");
  checkAssetsLoaded();
};

playerSpriteRight.onerror = () => {
  console.error("Failed to load player right-facing sprite");
  checkAssetsLoaded();
};

// Keyboard event listeners
window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});
