import { beforeEach, describe, expect, it } from "vitest";
import { aabbOverlap, updateCollision } from "../systems/collision";
import type { Rect } from "../systems/collision";
import { resetStores } from "../ecs/stores";
import {
  collider,
  collisionEvents,
  createEntity,
  position,
} from "../ecs/stores";
import { COLLISION_LAYER, COLLISION_MASK } from "../config";

describe("aabbOverlap", () => {
  const baseRect: Rect = { left: 0, right: 10, top: 0, bottom: 10 };

  it("detects clear overlap", () => {
    const other: Rect = { left: 5, right: 15, top: 5, bottom: 15 };
    expect(aabbOverlap(baseRect, other)).toBe(true);
  });

  it("returns false when b is to the right", () => {
    const other: Rect = { left: 10, right: 20, top: 0, bottom: 10 };
    expect(aabbOverlap(baseRect, other)).toBe(false);
  });

  it("returns false when b is to the left", () => {
    const other: Rect = { left: -10, right: 0, top: 0, bottom: 10 };
    expect(aabbOverlap(baseRect, other)).toBe(false);
  });

  it("returns false when b is above", () => {
    const other: Rect = { left: 0, right: 10, top: -10, bottom: 0 };
    expect(aabbOverlap(baseRect, other)).toBe(false);
  });

  it("returns false when b is below", () => {
    const other: Rect = { left: 0, right: 10, top: 10, bottom: 20 };
    expect(aabbOverlap(baseRect, other)).toBe(false);
  });

  it("returns false for exact edge touch (not overlapping)", () => {
    const other: Rect = { left: 10, right: 20, top: 0, bottom: 10 };
    expect(aabbOverlap(baseRect, other)).toBe(false);
  });

  it("detects overlap when one rect contains the other", () => {
    const inner: Rect = { left: 2, right: 8, top: 2, bottom: 8 };
    expect(aabbOverlap(baseRect, inner)).toBe(true);
  });
});

describe("updateCollision", () => {
  beforeEach(() => {
    resetStores();
  });

  it("detects collision between player and enemy", () => {
    const player = createEntity();
    position[player] = { x: 100, y: 100 };
    collider[player] = {
      width: 40,
      height: 50,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.PLAYER,
      mask: COLLISION_MASK.PLAYER,
    };

    const enemy = createEntity();
    position[enemy] = { x: 110, y: 100 };
    collider[enemy] = {
      width: 60,
      height: 100,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.ENEMY,
      mask: COLLISION_MASK.ENEMY,
    };

    updateCollision();

    expect(collisionEvents[player]).toBeDefined();
    expect(collisionEvents[player].collidingWith).toContain(enemy);
    expect(collisionEvents[enemy]).toBeDefined();
    expect(collisionEvents[enemy].collidingWith).toContain(player);
  });

  it("does not detect collision between player and projectile (mask filtering)", () => {
    const player = createEntity();
    position[player] = { x: 100, y: 100 };
    collider[player] = {
      width: 40,
      height: 50,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.PLAYER,
      mask: COLLISION_MASK.PLAYER,
    };

    const proj = createEntity();
    position[proj] = { x: 100, y: 100 };
    collider[proj] = {
      width: 32,
      height: 32,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.PROJECTILE,
      mask: COLLISION_MASK.PROJECTILE,
    };

    updateCollision();

    expect(collisionEvents[player]).toBeUndefined();
    expect(collisionEvents[proj]).toBeUndefined();
  });

  it("detects collision between projectile and enemy", () => {
    const proj = createEntity();
    position[proj] = { x: 200, y: 200 };
    collider[proj] = {
      width: 32,
      height: 32,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.PROJECTILE,
      mask: COLLISION_MASK.PROJECTILE,
    };

    const enemy = createEntity();
    position[enemy] = { x: 210, y: 200 };
    collider[enemy] = {
      width: 60,
      height: 100,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.ENEMY,
      mask: COLLISION_MASK.ENEMY,
    };

    updateCollision();

    expect(collisionEvents[proj]).toBeDefined();
    expect(collisionEvents[proj].collidingWith).toContain(enemy);
  });

  it("does not report collision when entities are far apart", () => {
    const a = createEntity();
    position[a] = { x: 0, y: 0 };
    collider[a] = {
      width: 10,
      height: 10,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.PLAYER,
      mask: COLLISION_MASK.PLAYER,
    };

    const b = createEntity();
    position[b] = { x: 500, y: 500 };
    collider[b] = {
      width: 10,
      height: 10,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.ENEMY,
      mask: COLLISION_MASK.ENEMY,
    };

    updateCollision();

    expect(collisionEvents[a]).toBeUndefined();
    expect(collisionEvents[b]).toBeUndefined();
  });

  it("clears previous frame events", () => {
    const a = createEntity();
    position[a] = { x: 100, y: 100 };
    collider[a] = {
      width: 40,
      height: 40,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.PLAYER,
      mask: COLLISION_MASK.PLAYER,
    };

    const b = createEntity();
    position[b] = { x: 100, y: 100 };
    collider[b] = {
      width: 40,
      height: 40,
      offsetX: 0,
      offsetY: 0,
      layer: COLLISION_LAYER.ENEMY,
      mask: COLLISION_MASK.ENEMY,
    };

    updateCollision();
    expect(collisionEvents[a]).toBeDefined();

    // Move b far away so no collision
    position[b].x = 9999;
    updateCollision();
    expect(collisionEvents[a]).toBeUndefined();
  });
});
