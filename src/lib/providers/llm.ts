/** Canonical StoryboardJSON contract — the pivot-proof "truth" */
export type StoryboardJSON = {
  title: string;
  style: {
    genre?: string;
    art_style?: string;
    tone?: string;
    palette?: string[];
  };
  characters?: Array<{
    id: string;
    name: string;
    spec?: string;
  }>;
  pages: Array<{
    page: number;
    panels: Array<{
      index: number;
      shot: string;
      setting: string;
      action: string;
      characters?: string[];
      dialogue: Array<{ speaker: string; text: string }>;
      must_keep: string[];
    }>;
  }>;
};

export interface LLMProvider {
  createStoryboard(args: {
    storyPrompt: string;
    templateJson?: Record<string, unknown>;
  }): Promise<StoryboardJSON>;

  rewritePanel(args: {
    panel: StoryboardJSON["pages"][0]["panels"][0];
    feedback: string;
    storyboard: StoryboardJSON;
  }): Promise<StoryboardJSON["pages"][0]["panels"][0]>;
}
