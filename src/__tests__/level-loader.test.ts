import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COLLISION_LAYER,
  COLLISION_MASK,
  PICKUP_VISUAL,
  SPIKES,
  WORLD,
  setWorld,
} from "../config";
import {
  collider,
  damage,
  enemyTag,
  health,
  obstacleTag,
  patrolAI,
  pickup,
  pickupTag,
  playerTag,
  position,
  resetStores,
  solid,
  velocity,
} from "../ecs/stores";
import { loadLevel, spawnLevel, validateLevel } from "../level/level-loader";
import type { LevelData } from "../level/level-schema";

vi.mock("../components/components", () => ({
  createSprite: vi.fn().mockResolvedValue({
    image: {},
    width: 96,
    height: 128,
    frameCount: 2,
    currentFrame: 0,
  }),
  createAnimatedSprite: vi.fn().mockResolvedValue({
    image: {},
    width: 80,
    height: 64,
    frameCount: 5,
    currentFrame: 0,
    animations: {},
    currentAnimation: "idle",
    animationElapsed: 0,
  }),
}));

const groundY = WORLD.groundY;

function makeFixture(overrides: Partial<LevelData> = {}): LevelData {
  return {
    name: "Test Level",
    world: { width: 5000 },
    playerSpawn: { x: 100, y: 0 },
    entities: [],
    ...overrides,
  };
}

describe("spawnLevel", () => {
  beforeEach(() => {
    resetStores();
    setWorld({ width: 3200 });
  });

  it("spawns platforms at correct world positions", async () => {
    const data = makeFixture({
      entities: [
        { type: "platform", x: 500, y: -70, width: 200, height: 24 },
        { type: "platform", x: 900, y: -50, width: 150, height: 32 },
      ],
    });

    await spawnLevel(data);

    const platformIds = Object.keys(solid).map(Number);
    expect(platformIds).toHaveLength(2);

    const positions = platformIds.map((id) => position[id]);
    expect(positions).toContainEqual({ x: 500, y: groundY - 70 });
    expect(positions).toContainEqual({ x: 900, y: groundY - 50 });

    const colliders = platformIds.map((id) => collider[id]);
    expect(colliders).toContainEqual(
      expect.objectContaining({ width: 200, height: 24 }),
    );
    expect(colliders).toContainEqual(
      expect.objectContaining({ width: 150, height: 32 }),
    );
  });

  it("spawns boss with correct health and world position", async () => {
    const data = makeFixture({
      entities: [
        {
          type: "boss",
          sprite: "/sprites/boss.png",
          x: 4000,
          y: -20,
          health: 8,
          damage: 1,
          spriteWidth: 96,
          spriteHeight: 128,
          frameCount: 2,
        },
      ],
    });

    await spawnLevel(data);

    const bossId = Number(Object.keys(enemyTag)[0]);
    expect(health[bossId]).toEqual({ current: 8, max: 8 });
    expect(position[bossId]).toEqual({ x: 4000, y: groundY - 20 });
    expect(damage[bossId]).toEqual({ amount: 1 });
  });

  it("spawns walker enemy with patrol, damage, health, and enemy-layer collider", async () => {
    const data = makeFixture({
      entities: [
        {
          type: "enemy",
          subtype: "walker",
          x: 1200,
          y: 0,
          health: 2,
          damage: 1,
          patrol: { range: 120, speed: 1.5, direction: "right" },
        },
      ],
    });

    await spawnLevel(data);

    const walkerId = Number(Object.keys(enemyTag)[0]);
    expect(position[walkerId]).toEqual({ x: 1200, y: groundY });
    expect(velocity[walkerId]).toEqual({ x: 0, y: 0 });
    expect(health[walkerId]).toEqual({ current: 2, max: 2 });
    expect(damage[walkerId]).toEqual({ amount: 1 });
    expect(patrolAI[walkerId]).toEqual({
      originX: 1200,
      originY: groundY,
      range: 120,
      speed: 1.5,
      direction: "right",
    });
    expect(collider[walkerId].layer).toBe(COLLISION_LAYER.ENEMY);
    expect(collider[walkerId].mask).toBe(COLLISION_MASK.ENEMY);
  });

  it("spawns spikes with obstacle tag, damage, and obstacle-layer collider", async () => {
    const data = makeFixture({
      entities: [
        { type: "obstacle", subtype: "spikes", x: 720, y: 0, damage: 1 },
      ],
    });

    await spawnLevel(data);

    const spikeId = Number(Object.keys(obstacleTag)[0]);
    expect(obstacleTag[spikeId]).toBe(true);
    expect(damage[spikeId]).toEqual({ amount: 1 });
    expect(collider[spikeId].layer).toBe(COLLISION_LAYER.OBSTACLE);
    expect(collider[spikeId].mask).toBe(COLLISION_MASK.OBSTACLE);
    // Sprite bottom rests on the visible floor line (groundY + floorOffset):
    // center is half the scaled height above it.
    expect(position[spikeId]).toEqual({
      x: 720,
      y: groundY + SPIKES.floorOffset - (SPIKES.frameHeight * SPIKES.scale) / 2,
    });
    expect(health[spikeId]).toBeUndefined();
    expect(solid[spikeId]).toBeUndefined();
  });

  it("resolves a negative spike y as an offset above ground (e.g. on a platform)", async () => {
    const data = makeFixture({
      entities: [
        { type: "obstacle", subtype: "spikes", x: 500, y: -82, damage: 1 },
      ],
    });

    await spawnLevel(data);

    const spikeId = Number(Object.keys(obstacleTag)[0]);
    expect(position[spikeId]).toEqual({
      x: 500,
      y:
        groundY -
        82 +
        SPIKES.floorOffset -
        (SPIKES.frameHeight * SPIKES.scale) / 2,
    });
  });

  it("spawns a coin pickup with pickup tag, value, and pickup-layer collider", async () => {
    const data = makeFixture({
      entities: [
        { type: "pickup", subtype: "coin", x: 500, y: -120, value: 10 },
      ],
    });

    await spawnLevel(data);

    const pickupId = Number(Object.keys(pickupTag)[0]);
    expect(pickupTag[pickupId]).toBe(true);
    expect(pickup[pickupId]).toEqual({ kind: "coin", value: 10 });
    expect(collider[pickupId].layer).toBe(COLLISION_LAYER.PICKUP);
    expect(collider[pickupId].mask).toBe(COLLISION_MASK.PICKUP);
    expect(position[pickupId]).toEqual({
      x: 500,
      y:
        groundY -
        120 +
        PICKUP_VISUAL.floorOffset -
        (PICKUP_VISUAL.frameHeight * PICKUP_VISUAL.scale) / 2,
    });
    // Collectibles carry no health and are not solid.
    expect(health[pickupId]).toBeUndefined();
    expect(solid[pickupId]).toBeUndefined();
  });

  it("spawns a health pickup carrying its restore value", async () => {
    const data = makeFixture({
      entities: [
        { type: "pickup", subtype: "health", x: 800, y: 0, value: 2 },
      ],
    });

    await spawnLevel(data);

    const pickupId = Number(Object.keys(pickupTag)[0]);
    expect(pickup[pickupId]).toEqual({ kind: "health", value: 2 });
  });

  it("throws a descriptive error for unknown pickup subtype", async () => {
    const data = makeFixture({
      entities: [
        {
          type: "pickup",
          subtype: "mushroom",
        } as unknown as LevelData["entities"][number],
      ],
    });

    await expect(spawnLevel(data)).rejects.toThrow(
      "Unknown pickup subtype: 'mushroom'",
    );
  });

  it("throws a descriptive error for unknown obstacle subtype", async () => {
    const data = makeFixture({
      entities: [
        {
          type: "obstacle",
          subtype: "firepit",
        } as unknown as LevelData["entities"][number],
      ],
    });

    await expect(spawnLevel(data)).rejects.toThrow(
      "Unknown obstacle subtype: 'firepit'",
    );
  });

  it("throws a descriptive error for unknown enemy subtype", async () => {
    const data = makeFixture({
      entities: [
        {
          type: "enemy",
          subtype: "flyer",
        } as unknown as LevelData["entities"][number],
      ],
    });

    await expect(spawnLevel(data)).rejects.toThrow(
      "Unknown enemy subtype: 'flyer'",
    );
  });

  it("spawns player at resolved world position and sets playerTag", async () => {
    const data = makeFixture({ playerSpawn: { x: 200, y: -10 } });

    await spawnLevel(data);

    const playerId = Number(Object.keys(playerTag)[0]);
    expect(position[playerId]).toEqual({ x: 200, y: groundY - 10 });
    expect(playerTag[playerId]).toBe(true);
  });

  it("applies world width via setWorld before spawning", async () => {
    const data = makeFixture({ world: { width: 7500 } });

    await spawnLevel(data);

    expect(WORLD.width).toBe(7500);
  });

  it("throws a descriptive error for unknown entity type", async () => {
    const data = makeFixture({
      entities: [{ type: "turret" } as unknown as LevelData["entities"][number]],
    });

    await expect(spawnLevel(data)).rejects.toThrow("Unknown entity type: 'turret'");
  });

  it("gives platforms the PLATFORM collision layer and boss the ENEMY layer", async () => {
    const data = makeFixture({
      entities: [
        { type: "platform", x: 100, y: -40, width: 100, height: 20 },
        {
          type: "boss",
          sprite: "/sprites/boss.png",
          x: 3000,
          y: 0,
          health: 5,
          damage: 1,
          spriteWidth: 96,
          spriteHeight: 128,
          frameCount: 2,
        },
      ],
    });

    await spawnLevel(data);

    const platformId = Number(Object.keys(solid)[0]);
    expect(collider[platformId].layer).toBe(COLLISION_LAYER.PLATFORM);
    expect(collider[platformId].mask).toBe(COLLISION_MASK.PLATFORM);

    const bossId = Number(Object.keys(enemyTag)[0]);
    expect(collider[bossId].layer).toBe(COLLISION_LAYER.ENEMY);
    expect(collider[bossId].mask).toBe(COLLISION_MASK.ENEMY);
  });
});

describe("validateLevel", () => {
  it("throws when data is not an object", () => {
    expect(() => validateLevel(null)).toThrow("Level data must be an object");
    expect(() => validateLevel("string")).toThrow("Level data must be an object");
  });

  it("throws when world is missing", () => {
    expect(() => validateLevel({ playerSpawn: { x: 0, y: 0 } })).toThrow(
      "Level data missing required field: 'world'",
    );
  });

  it("throws when world.width is missing", () => {
    expect(() => validateLevel({ world: {}, playerSpawn: { x: 0, y: 0 } })).toThrow(
      "Level data missing required field: 'world.width'",
    );
  });

  it("throws when playerSpawn is missing", () => {
    expect(() => validateLevel({ world: { width: 3200 } })).toThrow(
      "Level data missing required field: 'playerSpawn'",
    );
  });

  it("does not throw for valid data", () => {
    expect(() =>
      validateLevel({
        name: "Test",
        world: { width: 3200 },
        playerSpawn: { x: 0, y: 0 },
        entities: [],
      }),
    ).not.toThrow();
  });
});

describe("loadLevel", () => {
  it("fetches, parses, and validates the level file", async () => {
    const mockData: LevelData = {
      name: "Fetched Level",
      world: { width: 4000 },
      playerSpawn: { x: 50, y: 0 },
      entities: [],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockData),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await loadLevel("/levels/test.json");
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith("/levels/test.json");
  });
});
