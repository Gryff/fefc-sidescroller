import { beforeEach, describe, expect, it } from "vitest";
import { COLLISION_LAYER, COLLISION_MASK } from "../config";
import {
  collider,
  createEntity,
  grounded,
  position,
  resetStores,
  solid,
  velocity,
} from "../ecs/stores";
import { updatePlatformCollision } from "../systems/platform-collision";

function spawnDynamic(
  x: number,
  y: number,
  width: number,
  height: number,
  vx = 0,
  vy = 0,
  mask: number = COLLISION_MASK.PLAYER,
): number {
  const id = createEntity();
  position[id] = { x, y };
  velocity[id] = { x: vx, y: vy };
  collider[id] = {
    width,
    height,
    offsetX: 0,
    offsetY: 0,
    layer: COLLISION_LAYER.PLAYER,
    mask,
  };
  return id;
}

function spawnPlatform(
  x: number,
  y: number,
  width: number,
  height: number,
): number {
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
  return id;
}

describe("updatePlatformCollision", () => {
  beforeEach(() => {
    resetStores();
  });

  it("snaps entity to platform top when landing from above", () => {
    spawnPlatform(200, 200, 100, 20); // top at y=190
    const entity = spawnDynamic(200, 180, 40, 40, 0, 5); // bottom at y=200 (overlap 10)

    updatePlatformCollision();

    expect(position[entity].y).toBe(170); // bottom now at y=190
    expect(velocity[entity].y).toBe(0);
    expect(grounded[entity]).toBe(true);
  });

  it("leaves a clear entity untouched", () => {
    spawnPlatform(200, 200, 100, 20);
    const entity = spawnDynamic(200, 100, 40, 40, 0, 5);

    updatePlatformCollision();

    expect(position[entity].x).toBe(200);
    expect(position[entity].y).toBe(100);
    expect(velocity[entity].y).toBe(5);
    expect(grounded[entity]).toBeUndefined();
  });

  it("snaps entity down and cancels upward velocity on head bonk", () => {
    spawnPlatform(200, 100, 100, 20); // bottom at y=110
    const entity = spawnDynamic(200, 120, 40, 40, 0, -5); // top at y=100 (overlap 10)

    updatePlatformCollision();

    expect(position[entity].y).toBe(130); // top now at y=110
    expect(velocity[entity].y).toBe(0);
    expect(grounded[entity]).toBeUndefined();
  });

  it("blocks horizontal motion into platform from the left", () => {
    spawnPlatform(200, 100, 40, 100); // left at x=180
    const entity = spawnDynamic(170, 100, 40, 40, 3, 0); // right at x=190 (overlap 10)

    updatePlatformCollision();

    expect(position[entity].x).toBe(160); // right now at x=180
    expect(velocity[entity].x).toBe(0);
  });

  it("blocks horizontal motion into platform from the right", () => {
    spawnPlatform(200, 100, 40, 100); // right at x=220
    const entity = spawnDynamic(230, 100, 40, 40, -3, 0); // left at x=210 (overlap 10)

    updatePlatformCollision();

    expect(position[entity].x).toBe(240); // left now at x=220
    expect(velocity[entity].x).toBe(0);
  });

  it("resolves corner overlap along the shallower axis", () => {
    // Vertical penetration shallower than horizontal → push up.
    spawnPlatform(200, 200, 100, 100); // left=150, top=150
    const vEntity = spawnDynamic(160, 155, 40, 40, 0, 0);
    // pushUp=25, pushLeft=30

    // Horizontal shallower than vertical → push left.
    const hEntity = spawnDynamic(155, 160, 40, 40, 0, 0);
    // pushLeft=25, pushUp=30

    updatePlatformCollision();

    expect(position[vEntity].y).toBe(130); // moved up by 25
    expect(position[vEntity].x).toBe(160); // x untouched
    expect(position[hEntity].x).toBe(130); // moved left by 25
    expect(position[hEntity].y).toBe(160); // y untouched
  });

  it("ignores entities whose mask excludes PLATFORM", () => {
    spawnPlatform(200, 200, 100, 20);
    const proj = spawnDynamic(
      200,
      180,
      40,
      40,
      0,
      5,
      COLLISION_MASK.PROJECTILE, // no PLATFORM bit
    );

    updatePlatformCollision();

    expect(position[proj].y).toBe(180);
    expect(velocity[proj].y).toBe(5);
    expect(grounded[proj]).toBeUndefined();
  });

  it("lands on the higher of two stacked platforms", () => {
    spawnPlatform(200, 400, 100, 20); // lower, top=390
    spawnPlatform(200, 200, 100, 20); // upper, top=190
    const entity = spawnDynamic(200, 180, 40, 40, 0, 5); // overlapping upper by 10

    updatePlatformCollision();

    expect(position[entity].y).toBe(170); // bottom at upper top
    expect(velocity[entity].y).toBe(0);
    expect(grounded[entity]).toBe(true);
  });

  it("clears grounded when the entity has walked off the platform", () => {
    spawnPlatform(200, 200, 100, 20);
    // Entity off to the side, not overlapping.
    const entity = spawnDynamic(500, 180, 40, 40);
    grounded[entity] = true;

    updatePlatformCollision();

    expect(grounded[entity]).toBeUndefined();
  });

  it("does not move or alter platform entities", () => {
    const platform = spawnPlatform(200, 200, 100, 20);
    const before = { ...position[platform] };
    const colliderBefore = { ...collider[platform] };
    spawnDynamic(200, 180, 40, 40, 0, 5);

    updatePlatformCollision();

    expect(position[platform]).toEqual(before);
    expect(collider[platform]).toEqual(colliderBefore);
    expect(velocity[platform]).toBeUndefined();
  });
});
