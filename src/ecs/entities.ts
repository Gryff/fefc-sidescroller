import type { EntityId, Sprite } from "../components/components";
import { createAnimatedSprite, createSprite } from "../components/components";
import { CHARACTER_ANIMATIONS, groundLevel } from "../config";
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
  const playerEntityId = await createAssetPackPlayer(canvas);
  const bossEntityId = createEntity();

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

export async function createAssetPackPlayer(
  canvas: HTMLCanvasElement,
): Promise<EntityId> {
  const entityId = createEntity();

  sprite[entityId] = await createAnimatedSprite(
    [
      "/assetpack/Character skin colors/Male Skin1.png",
      "/assetpack/Male Hair/Male Hair1.png",
      "/assetpack/Male Clothing/Blue Shirt v2.png",
      "/assetpack/Male Clothing/Blue Pants.png",
    ],
    80,
    64,
    CHARACTER_ANIMATIONS,
    "idle",
  );
  input[entityId] = { left: false, right: false, up: false };
  position[entityId] = {
    x: canvas.width / 2,
    y: groundLevel(canvas.height),
  };
  velocity[entityId] = { x: 0, y: 0 };

  return entityId;
}
