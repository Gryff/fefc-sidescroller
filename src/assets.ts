import type { GameAssets } from "./types";

export async function loadAssets(): Promise<GameAssets> {
  const backgroundImage = new Image();
  backgroundImage.src = "/background.png";

  const joystickImage = new Image();
  joystickImage.src = "/joystick.png";

  await Promise.all([backgroundImage.decode(), joystickImage.decode()]);

  return { backgroundImage, joystickImage };
}
