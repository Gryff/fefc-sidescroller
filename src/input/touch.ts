import type { EntityId } from "../components/components";
import { JOYSTICK } from "../config";
import type { JoystickState } from "../types";
import { input } from "../ecs/stores";

export function detectTouchDevice(): boolean {
  return (
    "ontouchstart" in window ||
    (navigator.maxTouchPoints != null && navigator.maxTouchPoints > 0)
  );
}

export function applyJoystickInput(
  playerEntityId: EntityId,
  joystickState: JoystickState,
  isTouchDevice: boolean,
): void {
  if (isTouchDevice && joystickState.active) {
    input[playerEntityId].left = joystickState.dir.left;
    input[playerEntityId].right = joystickState.dir.right;
    input[playerEntityId].up = joystickState.dir.up;
  }
}

export function setupTouchInput(
  canvas: HTMLCanvasElement,
  joystickState: JoystickState,
): void {
  canvas.addEventListener("touchstart", (event) => {
    for (const touch of Array.from(event.touches)) {
      const x = touch.clientX;
      const y = touch.clientY;
      if (
        x >= JOYSTICK.margin &&
        x <= JOYSTICK.margin + JOYSTICK.size &&
        y >= canvas.height - JOYSTICK.size - JOYSTICK.margin &&
        y <= canvas.height - JOYSTICK.margin
      ) {
        joystickState.touchId = touch.identifier;
        joystickState.active = true;
        joystickState.dir = { left: false, right: false, up: false };
        event.preventDefault();
        break;
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

  canvas.addEventListener("touchend", (event) => {
    if (!joystickState.active) return;
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === joystickState.touchId) {
        joystickState.touchId = null;
        joystickState.active = false;
        joystickState.dir = { left: false, right: false, up: false };
        event.preventDefault();
        break;
      }
    }
  });
}
