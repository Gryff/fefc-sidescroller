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

  const frame = spriteData.currentFrame;
  const sx = frame * spriteData.width;
  ctx.drawImage(
    spriteData.image,
    sx,
    0,
    spriteData.width,
    spriteData.height,
    pos.x - spriteData.width / 2,
    pos.y - spriteData.height / 2,
    spriteData.width,
    spriteData.height,
  );
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
