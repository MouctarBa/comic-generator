import OpenAI from "openai";
import { ImageProvider, ImageAsset, GeneratePanelArgs } from "./image";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAIImageProvider implements ImageProvider {
  async generatePanel(args: GeneratePanelArgs): Promise<ImageAsset> {
    const res = await client.images.generate({
      model: "gpt-image-1",
      prompt: args.prompt,
      size: args.size ?? "1024x1024",
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned from OpenAI");
    return { base64: b64, mime: "image/png" };
  }
}
