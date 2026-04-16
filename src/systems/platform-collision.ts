import { COLLISION_LAYER } from "../config";
import { entitiesWith } from "../ecs/query";
import {
  collider,
  grounded,
  position,
  solid,
  velocity,
} from "../ecs/stores";

// Resolves overlaps between dynamic entities (position+velocity+collider whose
// mask includes PLATFORM) and solid entities. Pushes dynamic entities out along
// the shallowest overlap axis, zeroing velocity on that axis. Landing on top of
// a solid sets `grounded[id] = true`; an entity that walks off has its grounded
// flag cleared at the top of the system so it naturally falls again.
export function updatePlatformCollision(): void {
  const solidIds = entitiesWith("solid", "position", "collider");
  if (solidIds.length === 0) return;

  const candidates = entitiesWith("position", "velocity", "collider");
  for (const id of candidates) {
    if (id in solid) continue;
    if ((collider[id].mask & COLLISION_LAYER.PLATFORM) === 0) continue;

    delete grounded[id];
    for (const sId of solidIds) {
      resolveOverlap(id, sId);
    }
  }
}

function resolveOverlap(id: number, sId: number): void {
  const p = position[id];
  const v = velocity[id];
  const c = collider[id];
  const sp = position[sId];
  const sc = collider[sId];

  const left = p.x + c.offsetX - c.width / 2;
  const right = p.x + c.offsetX + c.width / 2;
  const top = p.y + c.offsetY - c.height / 2;
  const bottom = p.y + c.offsetY + c.height / 2;

  const sLeft = sp.x + sc.offsetX - sc.width / 2;
  const sRight = sp.x + sc.offsetX + sc.width / 2;
  const sTop = sp.y + sc.offsetY - sc.height / 2;
  const sBottom = sp.y + sc.offsetY + sc.height / 2;

  if (right <= sLeft || left >= sRight || bottom <= sTop || top >= sBottom) {
    return;
  }

  const pushUp = bottom - sTop; // move entity up to rest on top
  const pushDown = sBottom - top; // move entity down to rest under
  const pushLeft = right - sLeft; // move entity left
  const pushRight = sRight - left; // move entity right

  const minX = Math.min(pushLeft, pushRight);
  const minY = Math.min(pushUp, pushDown);

  if (minY <= minX) {
    if (pushUp <= pushDown) {
      p.y -= pushUp;
      if (v.y > 0) v.y = 0;
      grounded[id] = true;
    } else {
      p.y += pushDown;
      if (v.y < 0) v.y = 0;
    }
  } else {
    if (pushLeft <= pushRight) {
      p.x -= pushLeft;
    } else {
      p.x += pushRight;
    }
    v.x = 0;
  }
}
