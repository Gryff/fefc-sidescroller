import { setWorld, WORLD } from "../config";
import { createAssetPackPlayer, createBoss, createPlatform } from "../ecs/entities";
import type { LevelData } from "./level-schema";

export function validateLevel(data: unknown): asserts data is LevelData {
  if (!data || typeof data !== "object") {
    throw new Error("Level data must be an object");
  }
  const d = data as Record<string, unknown>;
  if (!d.world || typeof d.world !== "object") {
    throw new Error("Level data missing required field: 'world'");
  }
  if (typeof (d.world as Record<string, unknown>).width !== "number") {
    throw new Error("Level data missing required field: 'world.width'");
  }
  if (!d.playerSpawn || typeof d.playerSpawn !== "object") {
    throw new Error("Level data missing required field: 'playerSpawn'");
  }
}

export async function loadLevel(path: string): Promise<LevelData> {
  const res = await fetch(path);
  const data: unknown = await res.json();
  validateLevel(data);
  return data;
}

export async function spawnLevel(data: LevelData): Promise<void> {
  setWorld({ width: data.world.width });

  await createAssetPackPlayer({
    x: data.playerSpawn.x,
    y: WORLD.groundY + data.playerSpawn.y,
  });

  for (const entity of data.entities) {
    const worldY = WORLD.groundY + entity.y;
    switch (entity.type) {
      case "platform":
        createPlatform(entity.x, worldY, entity.width, entity.height);
        break;
      case "boss":
        await createBoss({
          sprite: entity.sprite,
          x: entity.x,
          y: worldY,
          health: entity.health,
          spriteWidth: entity.spriteWidth,
          spriteHeight: entity.spriteHeight,
          frameCount: entity.frameCount,
        });
        break;
      default: {
        const bad = entity as { type: string };
        throw new Error(`Unknown entity type: '${bad.type}'`);
      }
    }
  }
}
