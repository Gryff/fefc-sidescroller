import { beforeEach, describe, expect, it } from "vitest";
import { updateHealthDamage } from "../systems/health-damage";
import { resetStores } from "../ecs/stores";
import {
  collisionEvents,
  createEntity,
  enemyTag,
  health,
  playerTag,
  projectile,
} from "../ecs/stores";

describe("updateHealthDamage", () => {
  beforeEach(() => {
    resetStores();
  });

  describe("projectile → enemy damage", () => {
    it("decrements enemy health when hit by projectile", () => {
      const enemyId = createEntity();
      enemyTag[enemyId] = true;
      health[enemyId] = { current: 2, max: 2 };

      const projId = createEntity();
      projectile[projId] = { active: true };
      collisionEvents[projId] = { collidingWith: [enemyId] };

      updateHealthDamage();

      expect(health[enemyId].current).toBe(1);
    });

    it("destroys enemy when health reaches 0", () => {
      const enemyId = createEntity();
      enemyTag[enemyId] = true;
      health[enemyId] = { current: 1, max: 1 };

      const projId = createEntity();
      projectile[projId] = { active: true };
      collisionEvents[projId] = { collidingWith: [enemyId] };

      updateHealthDamage();

      expect(health[enemyId]).toBeUndefined();
      expect(enemyTag[enemyId]).toBeUndefined();
    });

    it("does not crash when enemy has no health component", () => {
      const enemyId = createEntity();
      enemyTag[enemyId] = true;

      const projId = createEntity();
      projectile[projId] = { active: true };
      collisionEvents[projId] = { collidingWith: [enemyId] };

      expect(() => updateHealthDamage()).not.toThrow();
    });

    it("does not deal damage from inactive projectile", () => {
      const enemyId = createEntity();
      enemyTag[enemyId] = true;
      health[enemyId] = { current: 2, max: 2 };

      const projId = createEntity();
      projectile[projId] = { active: false };
      collisionEvents[projId] = { collidingWith: [enemyId] };

      updateHealthDamage();

      expect(health[enemyId].current).toBe(2);
    });
  });

  describe("contact → player damage", () => {
    it("decrements player health on enemy contact", () => {
      const playerId = createEntity();
      playerTag[playerId] = true;
      health[playerId] = { current: 3, max: 3 };

      const enemyId = createEntity();
      enemyTag[enemyId] = true;

      collisionEvents[playerId] = { collidingWith: [enemyId] };

      const result = updateHealthDamage();

      expect(health[playerId].current).toBe(2);
      expect(result.playerDied).toBe(false);
    });

    it("returns playerDied true when player health reaches 0", () => {
      const playerId = createEntity();
      playerTag[playerId] = true;
      health[playerId] = { current: 1, max: 3 };

      const enemyId = createEntity();
      enemyTag[enemyId] = true;

      collisionEvents[playerId] = { collidingWith: [enemyId] };

      const result = updateHealthDamage();

      expect(result.playerDied).toBe(true);
    });

    it("does not deal damage from non-enemy collision", () => {
      const playerId = createEntity();
      playerTag[playerId] = true;
      health[playerId] = { current: 3, max: 3 };

      const otherId = createEntity();

      collisionEvents[playerId] = { collidingWith: [otherId] };

      updateHealthDamage();

      expect(health[playerId].current).toBe(3);
    });

    it("does not deal damage when no collision events", () => {
      const playerId = createEntity();
      playerTag[playerId] = true;
      health[playerId] = { current: 3, max: 3 };

      const result = updateHealthDamage();

      expect(health[playerId].current).toBe(3);
      expect(result.playerDied).toBe(false);
    });
  });
});
