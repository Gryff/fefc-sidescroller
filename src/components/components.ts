export type EntityId = number;

export type Sprite = Record<
  EntityId,
  {
    image: HTMLImageElement;
    width: number; // width of a single frame
    height: number; // height of a single frame
    frameCount: number; // total frames in the sheet
    currentFrame: number; // which frame to render
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
