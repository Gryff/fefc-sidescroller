import { beforeEach, describe, expect, it } from "vitest";
import { createWalker } from "../ecs/entities";
import {
  createEntity,
  patrolAI,
  position,
  resetStores,
  velocity,
} from "../ecs/stores";
import { updateEnemyAI } from "../systems/enemy-ai";

describe("updateEnemyAI", () => {
  beforeEach(() => {
    resetStores();
  });

  it("sets positive velocity.x when direction is 'right'", () => {
    const id = createEntity();
    position[id] = { x: 100, y: 0 };
    velocity[id] = { x: 0, y: 0 };
    patrolAI[id] = {
      originX: 100,
      originY: 0,
      range: 50,
      speed: 2,
      direction: "right",
    };

    updateEnemyAI();

    expect(velocity[id].x).toBe(2);
    expect(velocity[id].y).toBe(0);
  });

  it("sets negative velocity.x when direction is 'left'", () => {
    const id = createEntity();
    position[id] = { x: 100, y: 0 };
    velocity[id] = { x: 0, y: 0 };
    patrolAI[id] = {
      originX: 100,
      originY: 0,
      range: 50,
      speed: 2,
      direction: "left",
    };

    updateEnemyAI();

    expect(velocity[id].x).toBe(-2);
    expect(velocity[id].y).toBe(0);
  });

  it("flips from right to left when exceeding +range", () => {
    const id = createEntity();
    position[id] = { x: 150, y: 0 };
    velocity[id] = { x: 0, y: 0 };
    patrolAI[id] = {
      originX: 100,
      originY: 0,
      range: 50,
      speed: 2,
      direction: "right",
    };

    updateEnemyAI();

    expect(patrolAI[id].direction).toBe("left");
    expect(velocity[id].x).toBeLessThan(0);
  });

  it("flips from left to right when passing -range", () => {
    const id = createEntity();
    position[id] = { x: 50, y: 0 };
    velocity[id] = { x: 0, y: 0 };
    patrolAI[id] = {
      originX: 100,
      originY: 0,
      range: 50,
      speed: 2,
      direction: "left",
    };

    updateEnemyAI();

    expect(patrolAI[id].direction).toBe("right");
    expect(velocity[id].x).toBeGreaterThan(0);
  });

  it("skips entities missing required components without throwing", () => {
    const id = createEntity();
    patrolAI[id] = {
      originX: 0,
      originY: 0,
      range: 50,
      speed: 2,
      direction: "right",
    };
    // No position or velocity.

    expect(() => updateEnemyAI()).not.toThrow();
  });

  it("captures originX at spawn via createWalker", () => {
    createWalker({
      x: 500,
      y: 200,
      health: 2,
      damage: 1,
      range: 100,
      speed: 1,
      direction: "right",
    });

    const ids = Object.keys(patrolAI).map(Number);
    expect(ids).toHaveLength(1);
    const id = ids[0];
    expect(patrolAI[id].originX).toBe(500);
    expect(patrolAI[id].originY).toBe(200);
  });

  it("sets vertical velocity for 'up'/'down' directions (flyer shape)", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 100 };
    velocity[id] = { x: 0, y: 0 };
    patrolAI[id] = {
      originX: 0,
      originY: 100,
      range: 50,
      speed: 3,
      direction: "down",
    };

    updateEnemyAI();

    expect(velocity[id].x).toBe(0);
    expect(velocity[id].y).toBe(3);
  });
});
