import { beforeEach, describe, expect, it } from "vitest";
import { updatePickups } from "../systems/pickups";
import {
  collisionEvents,
  createEntity,
  health,
  pickup,
  pickupTag,
  playerTag,
  resetStores,
} from "../ecs/stores";

describe("updatePickups", () => {
  beforeEach(() => {
    resetStores();
  });

  function makePlayer(current = 3, max = 5): number {
    const id = createEntity();
    playerTag[id] = true;
    health[id] = { current, max };
    return id;
  }

  it("adds a coin's value to the score and destroys the coin", () => {
    const playerId = makePlayer();
    const coinId = createEntity();
    pickup[coinId] = { kind: "coin", value: 10 };
    pickupTag[coinId] = true;
    collisionEvents[coinId] = { collidingWith: [playerId] };

    const { scoreDelta } = updatePickups();

    expect(scoreDelta).toBe(10);
    expect(pickup[coinId]).toBeUndefined();
    expect(pickupTag[coinId]).toBeUndefined();
  });

  it("heals the player for a health pickup, capped at max", () => {
    const playerId = makePlayer(3, 5);
    const healthId = createEntity();
    pickup[healthId] = { kind: "health", value: 10 };
    pickupTag[healthId] = true;
    collisionEvents[healthId] = { collidingWith: [playerId] };

    const { scoreDelta } = updatePickups();

    expect(scoreDelta).toBe(0);
    expect(health[playerId].current).toBe(5);
    expect(pickup[healthId]).toBeUndefined();
  });

  it("heals up to the value when below max", () => {
    const playerId = makePlayer(1, 5);
    const healthId = createEntity();
    pickup[healthId] = { kind: "health", value: 2 };
    pickupTag[healthId] = true;
    collisionEvents[healthId] = { collidingWith: [playerId] };

    updatePickups();

    expect(health[playerId].current).toBe(3);
  });

  it("is not collected by a non-player entity", () => {
    const enemyId = createEntity();
    const coinId = createEntity();
    pickup[coinId] = { kind: "coin", value: 10 };
    pickupTag[coinId] = true;
    collisionEvents[coinId] = { collidingWith: [enemyId] };

    const { scoreDelta } = updatePickups();

    expect(scoreDelta).toBe(0);
    expect(pickup[coinId]).toBeDefined();
  });

  it("does nothing when the pickup has no collision events", () => {
    makePlayer();
    const coinId = createEntity();
    pickup[coinId] = { kind: "coin", value: 10 };
    pickupTag[coinId] = true;

    const { scoreDelta } = updatePickups();

    expect(scoreDelta).toBe(0);
    expect(pickup[coinId]).toBeDefined();
  });
});
