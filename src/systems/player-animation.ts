import { CHARACTER_ANIMATIONS } from "../config";
import { entitiesWith } from "../ecs/query";
import { sprite } from "../ecs/stores";
import type { PlayerState } from "../types";
import { setAnimation } from "./sprite-animation";

const ATTACK_DURATION =
  CHARACTER_ANIMATIONS.attack.frameCount *
  CHARACTER_ANIMATIONS.attack.frameDuration;

export function updatePlayerAnimation(
  playerState: PlayerState,
  delta: number,
): void {
  const [playerEntityId] = entitiesWith("playerTag", "sprite");
  if (playerEntityId === undefined) return;

  const s = sprite[playerEntityId];

  // Tick attack timer
  if (playerState.isAttacking) {
    playerState.attackTimer += delta;
    if (playerState.attackTimer >= ATTACK_DURATION) {
      playerState.isAttacking = false;
      playerState.attackTimer = 0;
    }
  }

  // For animated sprites, use named animations
  if (s.animations) {
    let animName: string;
    if (playerState.isAttacking) {
      animName = "attack";
    } else if (!playerState.isOnGround && playerState.velocityY < 0) {
      animName = "jump";
    } else if (!playerState.isOnGround && playerState.velocityY >= 0) {
      animName = "fall";
    } else if (playerState.isMoving) {
      animName = "walk";
    } else {
      animName = "idle";
    }

    setAnimation(playerEntityId, animName);
    s.flipX = playerState.facingRight;
    return;
  }

  // Legacy single-row sprites
  if (playerState.isMoving) {
    s.currentFrame = playerState.facingRight ? 2 : 1;
  } else {
    s.currentFrame = 0;
  }
}
