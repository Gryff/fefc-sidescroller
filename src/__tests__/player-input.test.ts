import { beforeEach, describe, expect, it } from "vitest";
import { PLAYER } from "../config";
import {
  createEntity,
  input,
  playerTag,
  resetStores,
  velocity,
} from "../ecs/stores";
import { updatePlayerInput } from "../systems/player-input";
import type { PlayerState } from "../types";

function makePlayerState(): PlayerState {
  return {
    facingRight: true,
    isMoving: false,
    isAttacking: false,
    attackTimer: 0,
  };
}

function spawnPlayer(): number {
  const id = createEntity();
  playerTag[id] = true;
  velocity[id] = { x: 0, y: 0 };
  input[id] = { left: false, right: false, up: false };
  return id;
}

describe("updatePlayerInput", () => {
  beforeEach(() => {
    resetStores();
  });

  it("writes positive velocity.x when right is held", () => {
    const id = spawnPlayer();
    input[id].right = true;
    const state = makePlayerState();

    updatePlayerInput(state);

    expect(velocity[id].x).toBe(PLAYER.speed);
    expect(state.facingRight).toBe(true);
    expect(state.isMoving).toBe(true);
  });

  it("writes negative velocity.x when left is held", () => {
    const id = spawnPlayer();
    input[id].left = true;
    const state = makePlayerState();

    updatePlayerInput(state);

    expect(velocity[id].x).toBe(-PLAYER.speed);
    expect(state.facingRight).toBe(false);
    expect(state.isMoving).toBe(true);
  });

  it("writes zero velocity.x when neither key is held", () => {
    const id = spawnPlayer();
    velocity[id].x = 99;
    const state = makePlayerState();

    updatePlayerInput(state);

    expect(velocity[id].x).toBe(0);
    expect(state.isMoving).toBe(false);
  });

  it("cancels out when both keys are held (right wins facing, velocity sums to zero)", () => {
    const id = spawnPlayer();
    input[id].left = true;
    input[id].right = true;
    const state = makePlayerState();

    updatePlayerInput(state);

    expect(velocity[id].x).toBe(0);
  });

  it("no-ops when no player entity exists", () => {
    const state = makePlayerState();
    expect(() => updatePlayerInput(state)).not.toThrow();
  });
});
