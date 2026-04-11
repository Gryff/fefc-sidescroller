import type { Sprite } from "../components/components";
import { createAnimatedSprite, createSprite } from "../components/components";
import {
  CHARACTER_ANIMATIONS,
  COLLIDER_SIZE,
  COLLISION_LAYER,
  COLLISION_MASK,
  WORLD,
} from "../config";
import {
  collider,
  createEntity,
  enemyTag,
  input,
  playerTag,
  position,
  sprite,
  velocity,
} from "./stores";

export async function loadEntities(): Promise<{
  projectileSpriteTemplate: Sprite[number];
}> {
  await createAssetPackPlayer();
  const bossEntityId = createEntity();

  const projectileSpriteTemplate = await createSprite("/sprites/donut.png", 48, 48, 1);

  sprite[bossEntityId] = await createSprite(
    "/sprites/blackledge.png",
    96,
    128,
    2,
  );
  position[bossEntityId] = {
    x: 2800,
    y: WORLD.groundY,
  };
  velocity[bossEntityId] = { x: 0, y: 0 };
  enemyTag[bossEntityId] = true;
  collider[bossEntityId] = {
    ...COLLIDER_SIZE.BOSS,
    layer: COLLISION_LAYER.ENEMY,
    mask: COLLISION_MASK.ENEMY,
  };

  return { projectileSpriteTemplate };
}

export async function createAssetPackPlayer(): Promise<void> {
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
    x: 120,
    y: WORLD.groundY,
  };
  velocity[entityId] = { x: 0, y: 0 };
  playerTag[entityId] = true;
  collider[entityId] = {
    ...COLLIDER_SIZE.PLAYER,
    layer: COLLISION_LAYER.PLAYER,
    mask: COLLISION_MASK.PLAYER,
  };
}
