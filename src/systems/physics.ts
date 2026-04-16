import { PHYSICS, PLAYER, WORLD } from "../config";
import { entitiesWith } from "../ecs/query";
import { grounded, input, position, velocity } from "../ecs/stores";

export function updatePhysics(dt: number): void {
  const [playerEntityId] = entitiesWith(
    "playerTag",
    "position",
    "velocity",
    "input",
  );
  if (playerEntityId === undefined) return;

  // Jump (reads grounded from previous frame)
  if (input[playerEntityId].up && playerEntityId in grounded) {
    velocity[playerEntityId].y = PLAYER.jumpStrength;
    delete grounded[playerEntityId];
  }

  // Gravity + integrate
  velocity[playerEntityId].y += PHYSICS.gravity * dt;
  position[playerEntityId].y += velocity[playerEntityId].y * dt;
}

// Runs after platform-collision so world ground can re-assert grounded for
// entities that cleared their flag during platform resolution.
export function resolveWorldGround(): void {
  const [playerEntityId] = entitiesWith("playerTag", "position", "velocity");
  if (playerEntityId === undefined) return;

  if (position[playerEntityId].y >= WORLD.groundY) {
    position[playerEntityId].y = WORLD.groundY;
    velocity[playerEntityId].y = 0;
    grounded[playerEntityId] = true;
  }
}
