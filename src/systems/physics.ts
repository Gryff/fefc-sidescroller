import { PHYSICS, PLAYER, WORLD } from "../config";
import { entitiesWith } from "../ecs/query";
import { flying, grounded, input, position, velocity } from "../ecs/stores";

export function updatePhysics(dt: number): void {
  // Jump impulse (player-specific, reads grounded from previous frame)
  const [playerEntityId] = entitiesWith("playerTag", "velocity", "input");
  if (
    playerEntityId !== undefined &&
    input[playerEntityId].up &&
    playerEntityId in grounded
  ) {
    velocity[playerEntityId].y = PLAYER.jumpStrength;
    delete grounded[playerEntityId];
  }

  // Gravity + integrate for every entity with position + velocity.
  for (const id of entitiesWith("position", "velocity")) {
    if (!(id in flying)) {
      velocity[id].y += PHYSICS.gravity * dt;
    }
    position[id].x += velocity[id].x * dt;
    position[id].y += velocity[id].y * dt;
  }
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
