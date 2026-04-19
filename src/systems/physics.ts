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
// entities that cleared their flag during platform resolution. Applies to
// every non-flying velocity-bearing entity so walkers (and anything else
// subject to gravity) rest on the world floor, not just the player.
export function resolveWorldGround(): void {
  for (const id of entitiesWith("position", "velocity")) {
    if (id in flying) continue;
    if (position[id].y >= WORLD.groundY) {
      position[id].y = WORLD.groundY;
      velocity[id].y = 0;
      grounded[id] = true;
    }
  }
}
