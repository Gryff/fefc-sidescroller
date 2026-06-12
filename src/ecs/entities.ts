import { createAnimatedSprite, createSprite } from "../components/components";
import type { Direction } from "../components/components";
import {
  CHARACTER_ANIMATIONS,
  COLLIDER_SIZE,
  COLLISION_LAYER,
  COLLISION_MASK,
  HEALTH,
  SPIKES,
} from "../config";
import {
  collider,
  createEntity,
  damage,
  enemyTag,
  health,
  input,
  obstacleTag,
  patrolAI,
  playerTag,
  position,
  solid,
  sprite,
  velocity,
} from "./stores";

export interface BossConfig {
  sprite: string;
  x: number;
  y: number;
  health: number;
  damage: number;
  spriteWidth: number;
  spriteHeight: number;
  frameCount: number;
}

export interface WalkerConfig {
  x: number;
  y: number;
  health: number;
  damage: number;
  range: number;
  speed: number;
  direction: Direction;
}

export interface SpikeConfig {
  x: number; // world x (sprite center)
  groundY: number; // world y of the floor line (entity rest position)
  damage: number;
}

// Static, indestructible, walk-through-but-painful. No velocity, no health,
// no solid. A single static frame for now; animation is a follow-up.
export async function createSpike(config: SpikeConfig): Promise<void> {
  const id = createEntity();

  const spikeSprite = await createSprite(
    SPIKES.sprite,
    SPIKES.frameWidth,
    SPIKES.frameHeight,
    1,
  );
  spikeSprite.scale = SPIKES.scale;
  sprite[id] = spikeSprite;

  position[id] = {
    x: config.x,
    y:
      config.groundY +
      SPIKES.floorOffset -
      (SPIKES.frameHeight * SPIKES.scale) / 2,
  };
  collider[id] = {
    ...SPIKES.collider,
    layer: COLLISION_LAYER.OBSTACLE,
    mask: COLLISION_MASK.OBSTACLE,
  };
  damage[id] = { amount: config.damage };
  obstacleTag[id] = true;
}

export function createPlatform(
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

export async function createBoss(config: BossConfig): Promise<void> {
  const id = createEntity();
  sprite[id] = await createSprite(config.sprite, config.spriteWidth, config.spriteHeight, config.frameCount);
  position[id] = { x: config.x, y: config.y };
  enemyTag[id] = true;
  collider[id] = {
    ...COLLIDER_SIZE.BOSS,
    layer: COLLISION_LAYER.ENEMY,
    mask: COLLISION_MASK.ENEMY,
  };
  health[id] = { current: config.health, max: config.health };
  damage[id] = { amount: config.damage };
}

export async function createWalker(config: WalkerConfig): Promise<void> {
  const id = createEntity();

  const walkerSprite = await createAnimatedSprite(
    [
      "/assetpack/Character skin colors/Male Skin2.png",
      "/assetpack/Male Hair/Male Hair3.png",
      "/assetpack/Male Clothing/Purple Shirt v2.png",
      "/assetpack/Male Clothing/Purple Pants.png",
      "/assetpack/Male Clothing/Boots.png",
    ],
    80,
    64,
    CHARACTER_ANIMATIONS,
    "walk",
  );
  walkerSprite.scale = 1.5;
  sprite[id] = walkerSprite;

  position[id] = { x: config.x, y: config.y };
  velocity[id] = { x: 0, y: 0 };
  enemyTag[id] = true;
  collider[id] = {
    ...COLLIDER_SIZE.WALKER,
    layer: COLLISION_LAYER.ENEMY,
    mask: COLLISION_MASK.ENEMY,
  };
  health[id] = { current: config.health, max: config.health };
  damage[id] = { amount: config.damage };
  patrolAI[id] = {
    originX: config.x,
    originY: config.y,
    range: config.range,
    speed: config.speed,
    direction: config.direction,
  };
}

export async function createAssetPackPlayer(spawn: { x: number; y: number }): Promise<void> {
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
  position[entityId] = { x: spawn.x, y: spawn.y };
  velocity[entityId] = { x: 0, y: 0 };
  playerTag[entityId] = true;
  collider[entityId] = {
    ...COLLIDER_SIZE.PLAYER,
    layer: COLLISION_LAYER.PLAYER,
    mask: COLLISION_MASK.PLAYER,
  };
  health[entityId] = { ...HEALTH.PLAYER };
}
