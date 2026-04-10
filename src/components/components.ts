export type EntityId = number;

export interface AnimationDef {
  row: number;
  frameCount: number;
  frameDuration: number; // ms per frame
  loop: boolean;
}

export type AnimationMap = Record<string, AnimationDef>;

export type Sprite = Record<
  EntityId,
  {
    image: HTMLImageElement;
    width: number; // width of a single frame
    height: number; // height of a single frame
    frameCount: number; // total frames in the sheet
    currentFrame: number; // which frame to render
    animations?: AnimationMap;
    currentAnimation?: string;
    animationElapsed?: number;
    layers?: HTMLImageElement[];
    flipX?: boolean;
  }
>;

export type Position = Record<
  EntityId,
  {
    x: number;
    y: number;
  }
>;

export type Velocity = Record<
  EntityId,
  {
    x: number;
    y: number;
  }
>;

export type Input = Record<
  EntityId,
  {
    left: boolean;
    right: boolean;
    up: boolean;
  }
>;

export type Projectile = Record<
  EntityId,
  {
    active: boolean;
  }
>;

export type PlayerTag = Record<EntityId, true>;
export type EnemyTag = Record<EntityId, true>;

export type Collider = Record<
  EntityId,
  {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    layer: number;
    mask: number;
  }
>;

export type CollisionEvents = Record<
  EntityId,
  {
    collidingWith: EntityId[];
  }
>;

export async function createSprite(
  imageSrc: string,
  frameWidth: number,
  frameHeight: number,
  frameCount: number,
): Promise<Sprite[number]> {
  const image = new Image();
  image.src = imageSrc;
  await image.decode();

  return {
    image,
    width: frameWidth,
    height: frameHeight,
    frameCount,
    currentFrame: 0,
  };
}

export async function createAnimatedSprite(
  imageSrcs: string[],
  frameWidth: number,
  frameHeight: number,
  animations: AnimationMap,
  initialAnimation: string,
): Promise<Sprite[number]> {
  const images = await Promise.all(
    imageSrcs.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().then(() => img);
    }),
  );

  const [base, ...layerImages] = images;
  const anim = animations[initialAnimation];

  return {
    image: base,
    width: frameWidth,
    height: frameHeight,
    frameCount: anim.frameCount,
    currentFrame: 0,
    animations,
    currentAnimation: initialAnimation,
    animationElapsed: 0,
    layers: layerImages.length > 0 ? layerImages : undefined,
  };
}
