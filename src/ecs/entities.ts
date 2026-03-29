import type { EntityId } from "../components/components";
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
  donutEntityId: EntityId;
}

export async function loadEntities(
  canvas: HTMLCanvasElement,
): Promise<EntityIds> {
  const playerEntityId = createEntity();
  const bossEntityId = createEntity();
  const donutEntityId = createEntity();

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

  sprite[donutEntityId] = await createSprite("/sprites/donut.png", 48, 48, 1);
  position[donutEntityId] = {
    x: canvas.width / 2 + 150,
    y: groundLevel(canvas.height),
  };
  velocity[donutEntityId] = { x: 0, y: 0 };

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

  return { playerEntityId, bossEntityId, donutEntityId };
}
