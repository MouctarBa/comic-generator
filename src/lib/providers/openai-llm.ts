import OpenAI from "openai";
import { LLMProvider, StoryboardJSON } from "./llm";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAILLMProvider implements LLMProvider {
  async createStoryboard(args: {
    storyPrompt: string;
    templateJson?: Record<string, unknown>;
  }): Promise<StoryboardJSON> {
    const system = `You are a comic storyboard planner. Output ONLY valid JSON (no markdown, no code fences) matching this schema:
{
  "title": string,
  "style": { "genre"?: string, "art_style"?: string, "tone"?: string, "palette"?: string[] },
  "characters": [{ "id": string, "name": string, "spec"?: string }],
  "pages": [
    { "page": number, "panels": [
      { "index": number, "shot": string, "setting": string, "action": string,
        "characters": [string],
        "dialogue": [{"speaker": string, "text": string}],
        "must_keep": [string]
      }
    ]}
  ]
}

Rules:
- Chronological order must follow panel.index increasing from 0
- Prefer 1–3 pages for short stories; keep it concise
- Dialogue should be short and comic-friendly
- Each panel's "shot" should be one of: wide, medium, close-up, extreme-close-up, bird-eye, low-angle
- "must_keep" lists visual elements that must persist (clothing, scars, props, etc.)
- "spec" on characters should describe appearance in detail (hair, clothing, distinguishing features)`;

    const user = JSON.stringify({
      story_prompt: args.storyPrompt,
      template: args.templateJson ?? null,
    });

    const resp = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    });

    const text = resp.choices[0]?.message?.content ?? "{}";
    // Strip markdown code fences if the model wraps them
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as StoryboardJSON;
  }

  async rewritePanel(args: {
    panel: StoryboardJSON["pages"][0]["panels"][0];
    feedback: string;
    storyboard: StoryboardJSON;
  }): Promise<StoryboardJSON["pages"][0]["panels"][0]> {
    const system = `You are a comic storyboard editor. Given a panel and user feedback, output ONLY the revised panel as valid JSON (no markdown, no code fences). Keep the same schema as the input panel.`;

    const user = JSON.stringify({
      panel: args.panel,
      feedback: args.feedback,
      style: args.storyboard.style,
      characters: args.storyboard.characters,
    });

    const resp = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    });

    const text = resp.choices[0]?.message?.content ?? "{}";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(cleaned);
  }
}
