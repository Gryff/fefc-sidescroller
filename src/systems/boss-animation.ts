import { BOSS } from "../config";
import { entitiesWith } from "../ecs/query";
import { sprite } from "../ecs/stores";
import type { BossAnimState } from "../types";

export function updateBossAnimation(bossState: BossAnimState, delta: number): void {
  const [bossEntityId] = entitiesWith("enemyTag", "sprite");
  if (bossEntityId === undefined) return;

  bossState.elapsed += delta;
  if (bossState.elapsed >= BOSS.animInterval) {
    bossState.elapsed -= BOSS.animInterval;
    bossState.frame = bossState.frame === 0 ? 1 : 0;
    sprite[bossEntityId].currentFrame = bossState.frame;
  }
}
