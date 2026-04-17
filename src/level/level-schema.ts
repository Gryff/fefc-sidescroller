export interface LevelData {
  name: string;
  world: { width: number };
  playerSpawn: { x: number; y: number };
  entities: LevelEntity[];
}

export type LevelEntity = PlatformEntity | BossEntity;

export interface PlatformEntity {
  type: "platform";
  x: number;
  /** Signed offset from WORLD.groundY. Negative = above ground. */
  y: number;
  width: number;
  height: number;
}

export interface BossEntity {
  type: "boss";
  sprite: string;
  x: number;
  /** Signed offset from WORLD.groundY. Negative = above ground. */
  y: number;
  health: number;
  spriteWidth: number;
  spriteHeight: number;
  frameCount: number;
}
