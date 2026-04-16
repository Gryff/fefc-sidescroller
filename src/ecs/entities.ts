import type { Sprite } from "../components/components";
import { createAnimatedSprite, createSprite } from "../components/components";
import {
  CHARACTER_ANIMATIONS,
  COLLIDER_SIZE,
  COLLISION_LAYER,
  COLLISION_MASK,
  HEALTH,
  WORLD,
} from "../config";
import {
  collider,
  createEntity,
  enemyTag,
  health,
  input,
  playerTag,
  position,
  solid,
  sprite,
  velocity,
} from "./stores";

export async function loadEntities(): Promise<{
  projectileSpriteTemplate: Sprite[number];
}> {
  await createAssetPackPlayer();
  spawnHardcodedPlatforms();
  const bossEntityId = createEntity();

  const projectileSpriteTemplate = await createSprite("/sprites/donut.png", 48, 48, 1);

  sprite[bossEntityId] = await createSprite(
    "/sprites/blackledge.png",
    96,
    128,
    2,
  );
  position[bossEntityId] = {
    x: WORLD.width - 400,
    y: WORLD.groundY,
  };
  velocity[bossEntityId] = { x: 0, y: 0 };
  enemyTag[bossEntityId] = true;
  collider[bossEntityId] = {
    ...COLLIDER_SIZE.BOSS,
    layer: COLLISION_LAYER.ENEMY,
    mask: COLLISION_MASK.ENEMY,
  };
  health[bossEntityId] = { ...HEALTH.BOSS };

  return { projectileSpriteTemplate };
}

function createPlatform(
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const id = createEntity();
  position[id] = { x, y };
  collider[id] = {
    width,
    height,
    offsetX: 0,
    offsetY: 0,
    layer: COLLISION_LAYER.PLATFORM,
    mask: COLLISION_MASK.PLATFORM,
  };
  solid[id] = true;
}

function spawnHardcodedPlatforms(): void {
  const groundY = WORLD.groundY;
  createPlatform(500, groundY - 70, 200, 24);
  createPlatform(850, groundY - 85, 160, 24);
  createPlatform(1200, groundY - 60, 220, 24);
  createPlatform(1600, groundY - 80, 140, 24);
  createPlatform(2000, groundY - 70, 200, 24);
  createPlatform(2450, groundY - 85, 180, 24);
}

export async function createAssetPackPlayer(): Promise<void> {
  const entityId = createEntity();

  const playerSprite = await createAnimatedSprite(
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
  playerSprite.scale = 2;
  sprite[entityId] = playerSprite;
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
  health[entityId] = { ...HEALTH.PLAYER };
}
