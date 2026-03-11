import OpenAI, { toFile } from "openai";
import { ImageProvider, ImageAsset, GeneratePanelArgs } from "./image";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAIImageProvider implements ImageProvider {
  async generatePanel(args: GeneratePanelArgs): Promise<ImageAsset> {
    const refUrls = args.referenceUrls ?? [];

    // If we have reference images, use the edit endpoint so the model
    // can see the character/style references while generating.
    if (refUrls.length > 0) {
      const images: Parameters<typeof client.images.edit>[0]["image"] = [];

      // Download reference images and convert to File objects
      for (const url of refUrls.slice(0, 4)) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const buf = Buffer.from(await resp.arrayBuffer());
          const file = await toFile(buf, "ref.png", { type: "image/png" });
          images.push(file);
        } catch {
          // Skip failed downloads
        }
      }

      if (images.length > 0) {
        const res = await client.images.edit({
          model: "gpt-image-1",
          image: images,
          prompt: args.prompt,
          size: args.size ?? "1024x1024",
        });

        const b64 = res.data?.[0]?.b64_json;
        if (!b64) throw new Error("No image returned from OpenAI");
        return { base64: b64, mime: "image/png" };
      }
    }

    // Fallback: no reference images, use standard generate
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
