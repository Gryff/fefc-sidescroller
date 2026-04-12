import type { EntityId } from "../components/components";
import { BACKGROUND, DEBUG_COLLIDERS, FIRE_BUTTON, JOYSTICK } from "../config";
import { entitiesWith } from "../ecs/query";
import type { GameAssets, GameContext, GameState } from "../types";
import { collider, position, projectile, sprite } from "../ecs/stores";

function drawSprite(
  ctx: CanvasRenderingContext2D,
  entityId: EntityId,
  cameraX: number,
): void {
  const spriteData = sprite[entityId];
  const pos = position[entityId];
  if (!spriteData || !spriteData.image.complete || !pos) return;

  const sx = spriteData.currentFrame * spriteData.width;
  const sy =
    spriteData.animations && spriteData.currentAnimation
      ? spriteData.animations[spriteData.currentAnimation].row *
        spriteData.height
      : 0;

  const scale = spriteData.scale ?? 1;
  const screenX = pos.x - cameraX;
  const drawWidth = spriteData.width * scale;
  const drawHeight = spriteData.height * scale;
  const dx = screenX - drawWidth / 2;
  const dy = pos.y - drawHeight / 2;
  const { width, height } = spriteData;

  ctx.save();

  // Mirror horizontally around screen X so the sprite stays centred after the flip.
  if (spriteData.flipX) {
    ctx.translate(screenX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-screenX, 0);
  }

  ctx.drawImage(spriteData.image, sx, sy, width, height, dx, dy, drawWidth, drawHeight);

  if (spriteData.layers) {
    for (const layer of spriteData.layers) {
      if (layer.complete) {
        ctx.drawImage(layer, sx, sy, width, height, dx, dy, drawWidth, drawHeight);
      }
    }
  }

  ctx.restore();
}

export function render(
  gameCtx: GameContext,
  state: GameState,
  assets: GameAssets,
): void {
  const { canvas, ctx, isTouchDevice } = gameCtx;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background — parallax driven by camera position
  if (assets.backgroundImage.complete) {
    const sourceWidth = assets.backgroundImage.width / BACKGROUND.sourceWidthDivisor;
    const maxSourceOffset = assets.backgroundImage.width - sourceWidth;
    const maxCameraX = state.camera.worldWidth - canvas.width;
    const backgroundSourceX = maxCameraX > 0
      ? (state.camera.x / maxCameraX) * maxSourceOffset
      : 0;
    ctx.drawImage(
      assets.backgroundImage,
      backgroundSourceX,
      0,
      sourceWidth,
      assets.backgroundImage.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  // Entities
  const cameraX = state.camera.x;
  for (const id of entitiesWith("playerTag", "sprite")) {
    drawSprite(ctx, id, cameraX);
  }
  for (const id of entitiesWith("enemyTag", "sprite")) {
    drawSprite(ctx, id, cameraX);
  }

  // Projectiles
  for (const projId in projectile) {
    if (projectile[projId] && projectile[projId].active) {
      drawSprite(ctx, Number(projId), cameraX);
    }
  }

  // Debug collider wireframes
  if (DEBUG_COLLIDERS) {
    ctx.save();
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    for (const id of entitiesWith("position", "collider")) {
      const pos = position[id];
      const col = collider[id];
      const left = (pos.x - cameraX) + col.offsetX - col.width / 2;
      const top = pos.y + col.offsetY - col.height / 2;
      ctx.strokeRect(left, top, col.width, col.height);
    }
    ctx.restore();
  }

  // Joystick UI
  if (isTouchDevice && assets.joystickImage.complete) {
    ctx.globalAlpha = JOYSTICK.opacity;
    ctx.drawImage(
      assets.joystickImage,
      JOYSTICK.margin,
      canvas.height - JOYSTICK.size - JOYSTICK.margin,
      JOYSTICK.size,
      JOYSTICK.size,
    );
    ctx.globalAlpha = 1.0;
  }

  // Fire button UI
  if (isTouchDevice) {
    const centerX = canvas.width - FIRE_BUTTON.margin - FIRE_BUTTON.size / 2;
    const centerY = canvas.height - FIRE_BUTTON.margin - FIRE_BUTTON.size / 2;
    const radius = FIRE_BUTTON.size / 2;
    ctx.save();
    ctx.globalAlpha = state.fireButton.active
      ? FIRE_BUTTON.opacity * 0.5
      : FIRE_BUTTON.opacity;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4444";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FIRE", centerX, centerY);
    ctx.restore();
  }
}
