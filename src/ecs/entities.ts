import type { EntityId, Sprite } from "../components/components";
import { createSprite } from "../components/components";
import { groundLevel } from "../config";
import {
  createEntity,
  input,
  position,
  sprite,
  velocity,
} from "./stores";

export interface EntityIds {
  playerEntityId: EntityId;
  bossEntityId: EntityId;
  projectileSpriteTemplate: Sprite[number];
}

export async function loadEntities(
  canvas: HTMLCanvasElement,
): Promise<EntityIds> {
  const playerEntityId = createEntity();
  const bossEntityId = createEntity();

  sprite[playerEntityId] = await createSprite(
    "/sprites/tris-sheet.png",
    96,
    128,
    3,
  );
  input[playerEntityId] = { left: false, right: false, up: false };
  position[playerEntityId] = {
    x: canvas.width / 2,
    y: groundLevel(canvas.height),
  };
  velocity[playerEntityId] = { x: 0, y: 0 };

  const projectileSpriteTemplate = await createSprite("/sprites/donut.png", 48, 48, 1);

  sprite[bossEntityId] = await createSprite(
    "/sprites/blackledge.png",
    96,
    128,
    2,
  );
  position[bossEntityId] = {
    x: canvas.width / 1.5,
    y: groundLevel(canvas.height),
  };
  velocity[bossEntityId] = { x: 0, y: 0 };

  return { playerEntityId, bossEntityId, projectileSpriteTemplate };
}
