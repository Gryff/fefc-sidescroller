import { beforeEach, describe, expect, it } from "vitest";
import { PHYSICS, PLAYER } from "../config";
import {
  createEntity,
  flying,
  grounded,
  input,
  playerTag,
  position,
  resetStores,
  velocity,
} from "../ecs/stores";
import { updatePhysics } from "../systems/physics";

describe("updatePhysics", () => {
  beforeEach(() => {
    resetStores();
  });

  it("integrates horizontal velocity into position", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    velocity[id] = { x: 2, y: 0 };
    flying[id] = true; // isolate from gravity

    updatePhysics(1);

    expect(position[id].x).toBe(2);
  });

  it("applies gravity to velocity.y and integrates into position", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    velocity[id] = { x: 0, y: 0 };

    updatePhysics(1);

    expect(velocity[id].y).toBe(PHYSICS.gravity);
    expect(position[id].y).toBe(PHYSICS.gravity);
  });

  it("scales velocity change and position change by dt", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    velocity[id] = { x: 3, y: 0 };

    updatePhysics(2);

    expect(velocity[id].y).toBe(PHYSICS.gravity * 2);
    expect(position[id].x).toBe(6);
    expect(position[id].y).toBe(PHYSICS.gravity * 2 * 2);
  });

  it("applies jump impulse when player has input.up and is grounded", () => {
    const id = createEntity();
    playerTag[id] = true;
    position[id] = { x: 0, y: 0 };
    velocity[id] = { x: 0, y: 0 };
    input[id] = { left: false, right: false, up: true };
    grounded[id] = true;

    updatePhysics(1);

    // After jump impulse (PLAYER.jumpStrength) and then one gravity tick.
    expect(velocity[id].y).toBe(PLAYER.jumpStrength + PHYSICS.gravity);
    expect(grounded[id]).toBeUndefined();
  });

  it("does not apply jump impulse to non-player velocity-bearing entities", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    velocity[id] = { x: 0, y: 0 };

    updatePhysics(1);

    // Only gravity-driven change, no jump impulse.
    expect(velocity[id].y).toBe(PHYSICS.gravity);
  });

  it("skips gravity for entities tagged flying", () => {
    const id = createEntity();
    position[id] = { x: 0, y: 0 };
    velocity[id] = { x: 0, y: 0 };
    flying[id] = true;

    updatePhysics(1);

    expect(velocity[id].y).toBe(0);
    expect(position[id].y).toBe(0);
  });
});
