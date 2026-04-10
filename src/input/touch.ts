import { FIRE_BUTTON, JOYSTICK } from "../config";
import { entitiesWith } from "../ecs/query";
import { input } from "../ecs/stores";
import type { FireButtonState, JoystickState, PlayerState } from "../types";

export function detectTouchDevice(): boolean {
  return (
    "ontouchstart" in window ||
    (navigator.maxTouchPoints != null && navigator.maxTouchPoints > 0)
  );
}

export function applyJoystickInput(
  joystickState: JoystickState,
  isTouchDevice: boolean,
): void {
  if (!isTouchDevice || !joystickState.active) return;
  const [playerEntityId] = entitiesWith("playerTag", "input");
  if (playerEntityId === undefined) return;
  input[playerEntityId].left = joystickState.dir.left;
  input[playerEntityId].right = joystickState.dir.right;
  input[playerEntityId].up = joystickState.dir.up;
}

export function setupTouchInput(
  canvas: HTMLCanvasElement,
  joystickState: JoystickState,
  fireButtonState: FireButtonState,
  playerState: PlayerState,
  onFire: () => void,
): void {
  canvas.addEventListener("touchstart", (event) => {
    for (const touch of Array.from(event.touches)) {
      const x = touch.clientX;
      const y = touch.clientY;

      if (
        joystickState.touchId === null &&
        x >= JOYSTICK.margin &&
        x <= JOYSTICK.margin + JOYSTICK.size &&
        y >= canvas.height - JOYSTICK.size - JOYSTICK.margin &&
        y <= canvas.height - JOYSTICK.margin
      ) {
        joystickState.touchId = touch.identifier;
        joystickState.active = true;
        joystickState.dir = { left: false, right: false, up: false };
        event.preventDefault();
      }

      if (
        fireButtonState.touchId === null &&
        x >= canvas.width - FIRE_BUTTON.margin - FIRE_BUTTON.size &&
        x <= canvas.width - FIRE_BUTTON.margin &&
        y >= canvas.height - FIRE_BUTTON.size - FIRE_BUTTON.margin &&
        y <= canvas.height - FIRE_BUTTON.margin
      ) {
        fireButtonState.touchId = touch.identifier;
        fireButtonState.active = true;
        playerState.isAttacking = true;
        playerState.attackTimer = 0;
        onFire();
        event.preventDefault();
      }
    }
  });

  canvas.addEventListener("touchmove", (event) => {
    if (!joystickState.active || joystickState.touchId === null) return;
    for (const touch of Array.from(event.touches)) {
      if (touch.identifier === joystickState.touchId) {
        const x = touch.clientX;
        const y = touch.clientY;
        const centerX = JOYSTICK.margin + JOYSTICK.size / 2;
        const centerY = canvas.height - JOYSTICK.margin - JOYSTICK.size / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const threshold = JOYSTICK.size * JOYSTICK.deadzone;
        joystickState.dir.left = dx < -threshold;
        joystickState.dir.right = dx > threshold;
        joystickState.dir.up = dy < -threshold;
        event.preventDefault();
        break;
      }
    }
  });

  function handleTouchEnd(event: TouchEvent) {
    for (const touch of Array.from(event.changedTouches)) {
      if (joystickState.active && touch.identifier === joystickState.touchId) {
        joystickState.touchId = null;
        joystickState.active = false;
        joystickState.dir = { left: false, right: false, up: false };
        event.preventDefault();
      }
      if (fireButtonState.active && touch.identifier === fireButtonState.touchId) {
        fireButtonState.touchId = null;
        fireButtonState.active = false;
        event.preventDefault();
      }
    }
  }

  canvas.addEventListener("touchend", handleTouchEnd);
  canvas.addEventListener("touchcancel", handleTouchEnd);
}
