import type { GameAssets } from "./types";

export function loadAssets(): Promise<GameAssets> {
  return new Promise((resolve, reject) => {
    const backgroundImage = new Image();
    backgroundImage.src = "/background.png";

    const joystickImage = new Image();
    joystickImage.src = "/joystick.png";

    backgroundImage.onload = () => {
      resolve({ backgroundImage, joystickImage });
    };

    backgroundImage.onerror = () => {
      reject(new Error("Failed to load background image"));
    };
  });
}
