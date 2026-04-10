import { beforeEach, describe, expect, it } from "vitest";
import { entitiesWith } from "../ecs/query";
import { resetStores } from "../ecs/stores";
import { collider, createEntity, position } from "../ecs/stores";

describe("entitiesWith", () => {
  beforeEach(() => {
    resetStores();
  });

  it("returns entities with a single component", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    expect(entitiesWith("position")).toContain(id);
  });

  it("returns entities matching all keys", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    collider[id] = {
      width: 10,
      height: 10,
      offsetX: 0,
      offsetY: 0,
      layer: 1,
      mask: 1,
    };
    expect(entitiesWith("position", "collider")).toContain(id);
  });

  it("excludes entities missing a component", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    expect(entitiesWith("position", "collider")).not.toContain(id);
  });

  it("returns empty array when no entities match", () => {
    expect(entitiesWith("position")).toEqual([]);
  });
});
