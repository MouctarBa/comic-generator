export interface ImageAsset {
  base64: string;
  mime: string;
}

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export interface ImageProvider {
  generatePanel(args: {
    prompt: string;
    size?: ImageSize;
  }): Promise<ImageAsset>;

  editPanel?(args: {
    image: ImageAsset;
    instruction: string;
  }): Promise<ImageAsset>;

  variations?(args: {
    image: ImageAsset;
    n: number;
  }): Promise<ImageAsset[]>;
}
