import type { EntityId } from "../components/components";
import { BACKGROUND, JOYSTICK } from "../config";
import type { GameAssets, GameContext, GameState } from "../types";
import { position, projectile, sprite } from "../ecs/stores";

function drawSprite(
  ctx: CanvasRenderingContext2D,
  entityId: EntityId,
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

  const dx = pos.x - spriteData.width / 2;
  const dy = pos.y - spriteData.height / 2;
  const { width, height } = spriteData;

  ctx.save();

  // Mirror horizontally around pos.x. This relies on dx being
  // computed relative to pos.x so the sprite stays centred after the flip.
  if (spriteData.flipX) {
    ctx.translate(pos.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-pos.x, 0);
  }

  ctx.drawImage(spriteData.image, sx, sy, width, height, dx, dy, width, height);

  if (spriteData.layers) {
    for (const layer of spriteData.layers) {
      if (layer.complete) {
        ctx.drawImage(layer, sx, sy, width, height, dx, dy, width, height);
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
  const { canvas, ctx, playerEntityId, bossEntityId, isTouchDevice } = gameCtx;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  if (assets.backgroundImage.complete) {
    const sourceWidth = assets.backgroundImage.width / BACKGROUND.sourceWidthDivisor;
    ctx.drawImage(
      assets.backgroundImage,
      state.scroll.backgroundOffsetX,
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
  drawSprite(ctx, playerEntityId);
  drawSprite(ctx, bossEntityId);

  // Projectiles
  for (const projId in projectile) {
    if (projectile[projId] && projectile[projId].active) {
      drawSprite(ctx, Number(projId));
    }
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
}
