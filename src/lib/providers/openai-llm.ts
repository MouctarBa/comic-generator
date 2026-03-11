import OpenAI from "openai";
import { LLMProvider, StoryboardJSON } from "./llm";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAILLMProvider implements LLMProvider {
  async createStoryboard(args: {
    storyPrompt: string;
    templateJson?: Record<string, unknown>;
  }): Promise<StoryboardJSON> {
    const system = `You are an expert comic book storyboard writer and visual director. Your job is to create a complete, flowing storyboard that reads like a professional comic.

Output ONLY valid JSON (no markdown, no code fences) matching this schema:
{
  "title": string,
  "style": {
    "genre"?: string,
    "art_style": string,
    "tone"?: string,
    "palette"?: string[],
    "visual_anchor": string
  },
  "characters": [{ "id": string, "name": string, "spec": string }],
  "pages": [
    { "page": number, "panels": [
      { "index": number, "shot": string, "setting": string, "action": string,
        "characters": [string],
        "dialogue": [{"speaker": string, "text": string}],
        "must_keep": [string],
        "transition": string
      }
    ]}
  ]
}

CRITICAL RULES FOR NARRATIVE FLOW:
1. The story MUST have a clear beginning, middle, and end — even for short comics.
2. Each panel must logically follow the previous one. No random scene jumps without purpose.
3. Use "transition" to describe how this panel connects to the next (e.g. "meanwhile", "moments later", "cut to", "same scene", "zoom in on").
4. Panel 0 must establish the setting and main character(s). The final panel must resolve or conclude the story.
5. Vary shot types for visual interest: alternate between wide establishing shots, medium action shots, and close-ups for emotion/dialogue.

CRITICAL RULES FOR VISUAL CONSISTENCY:
6. "style.visual_anchor" MUST be a detailed, reusable description of the art style that will be prepended to EVERY panel prompt (e.g. "Manga-style ink drawings with cel shading, bold outlines, halftone dot textures, muted blue-gray palette with red accent highlights").
7. Each character's "spec" MUST be extremely detailed and specific — exact hair color/style, eye color, skin tone, outfit details, distinguishing features, body type. This is the character's visual identity used in every panel.
8. "must_keep" on each panel MUST list every visual element that connects this panel to others — character appearances, props, environmental details, lighting, time of day.
9. Characters must wear the SAME outfit throughout unless the story explicitly changes it.

DIALOGUE AND PACING:
10. Keep dialogue short — max 2 speech bubbles per panel, max 15 words each.
11. Not every panel needs dialogue. Use silent panels for action, atmosphere, and dramatic beats.
12. Chronological order follows panel.index increasing from 0 across all pages.

SHOT TYPES: wide, medium, close-up, extreme-close-up, bird-eye, low-angle, over-the-shoulder, dutch-angle

TRANSITIONS: "same scene", "moments later", "meanwhile", "cut to", "zoom in", "zoom out", "flashback", "smash cut"`;

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
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as StoryboardJSON;
  }

  async rewritePanel(args: {
    panel: StoryboardJSON["pages"][0]["panels"][0];
    feedback: string;
    storyboard: StoryboardJSON;
  }): Promise<StoryboardJSON["pages"][0]["panels"][0]> {
    const system = `You are a comic storyboard editor. Given a panel and user feedback, output ONLY the revised panel as valid JSON (no markdown, no code fences). Keep the same schema as the input panel. Maintain visual consistency with the overall storyboard style and character designs.`;

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
