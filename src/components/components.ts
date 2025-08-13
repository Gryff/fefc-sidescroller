export type EntityId = number;

export type Sprite = Record<
  EntityId,
  {
    image: HTMLImageElement;
    width: number;
    height: number;
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

export async function createSprite(imageSrc: string): Promise<Sprite[number]> {
  const image = new Image();
  image.src = imageSrc;
  await image.decode();

  return {
    image,
    width: image.width,
    height: image.height,
  };
}
