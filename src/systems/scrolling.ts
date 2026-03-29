import type { EntityId } from "../components/components";
import { PLAYER, SCROLL } from "../config";
import type { ScrollState } from "../types";
import { input, position } from "../ecs/stores";

export function updateScrolling(
  playerEntityId: EntityId,
  scrollState: ScrollState,
  canvas: HTMLCanvasElement,
  backgroundImage: HTMLImageElement,
  prevPlayerX: number,
): void {
  const scrollTriggerX = canvas.width * SCROLL.triggerRightFraction;
  const scrollTriggerLeftX = canvas.width * SCROLL.triggerLeftFraction;
  const maxBackgroundOffset =
    backgroundImage.width * SCROLL.maxOffsetFraction;

  // Scroll right
  if (input[playerEntityId].right) {
    if (
      position[playerEntityId].x >= scrollTriggerX &&
      scrollState.backgroundOffsetX < maxBackgroundOffset
    ) {
      const scrollAmount = position[playerEntityId].x - prevPlayerX;
      scrollState.backgroundOffsetX = Math.min(
        maxBackgroundOffset,
        scrollState.backgroundOffsetX + scrollAmount,
      );
      position[playerEntityId].x = scrollTriggerX;
    }
  }

  // Scroll left
  if (input[playerEntityId].left) {
    if (
      position[playerEntityId].x <= scrollTriggerLeftX &&
      scrollState.backgroundOffsetX > 0
    ) {
      const scrollAmount = prevPlayerX - position[playerEntityId].x;
      scrollState.backgroundOffsetX = Math.max(
        0,
        scrollState.backgroundOffsetX - scrollAmount,
      );
      position[playerEntityId].x = scrollTriggerLeftX;
    }
  }

  // Clamp player within canvas bounds
  position[playerEntityId].x = Math.max(
    PLAYER.halfWidth,
    Math.min(canvas.width - PLAYER.halfWidth, position[playerEntityId].x),
  );
}
