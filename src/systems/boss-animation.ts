import type { EntityId } from "../components/components";
import { BOSS } from "../config";
import type { BossAnimState } from "../types";
import { sprite } from "../ecs/stores";

export function updateBossAnimation(
  bossEntityId: EntityId,
  bossState: BossAnimState,
  delta: number,
): void {
  bossState.elapsed += delta;
  if (bossState.elapsed >= BOSS.animInterval) {
    bossState.elapsed -= BOSS.animInterval;
    bossState.frame = bossState.frame === 0 ? 1 : 0;
    sprite[bossEntityId].currentFrame = bossState.frame;
  }
}
