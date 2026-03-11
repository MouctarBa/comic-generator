"use client";

import { useState, useEffect, useCallback } from "react";

export interface Panel {
  id: string;
  project_id: string;
  page_num: number;
  panel_num: number;
  global_index: number;
  prompt: string;
  dialogue_json: Array<{ speaker: string; text: string }>;
  must_keep_json: string[];
  image_asset_id: string | null;
  status: string;
  regen_count: number;
  last_error: string | null;
}

export interface Asset {
  id: string;
  project_id: string;
  type: string;
  url: string;
  meta: Record<string, unknown>;
}

export interface ProjectBundle {
  project: {
    id: string;
    title: string;
    story_prompt: string;
    template_json: Record<string, unknown> | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  storyboard: Record<string, unknown> | null;
  panels: Panel[];
  assets: Asset[];
  jobs: Array<{ id: string; type: string; status: string }>;
}

export function useProject(projectId: string) {
  const [data, setData] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
