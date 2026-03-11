"use client";

import { use } from "react";
import { useState } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/use-project";
import { usePolling } from "@/hooks/use-polling";
import { StatusBadge } from "@/components/status-badge";

export default function StoryboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data, loading, error, refresh } = useProject(projectId);
  const [generating, setGenerating] = useState(false);

  // Poll while storyboard is being generated
  const isGenerating =
    data?.project.status === "generating_storyboard" ||
    data?.jobs.some(
      (j) => j.type === "storyboard" && (j.status === "queued" || j.status === "running")
    );
  usePolling(refresh, 3000, !!isGenerating);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await fetch(`/api/projects/${projectId}/storyboard`, {
        method: "POST",
      });
      refresh();
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!data) return <p className="text-gray-500">Project not found</p>;

  const { project, storyboard } = data;
  const sb = storyboard as {
    title?: string;
    style?: { genre?: string; art_style?: string; tone?: string };
    characters?: Array<{ id: string; name: string; spec?: string }>;
    pages?: Array<{
      page: number;
      panels: Array<{
        index: number;
        shot: string;
        setting: string;
        action: string;
        dialogue: Array<{ speaker: string; text: string }>;
        must_keep: string[];
      }>;
    }>;
  } | null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex gap-3">
          {!sb && (
            <button
              onClick={handleGenerate}
              disabled={generating || !!isGenerating}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {isGenerating
                ? "Generating storyboard..."
                : generating
                ? "Queuing..."
                : "Generate Storyboard"}
            </button>
          )}
          {sb && (
            <>
              <button
                onClick={handleGenerate}
                disabled={generating || !!isGenerating}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50 transition"
              >
                Regenerate Storyboard
              </button>
              <Link
                href={`/project/${projectId}/generate`}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500 transition"
              >
                Generate Panels
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Story prompt */}
      <div className="mb-6 rounded-lg bg-gray-900 border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Story Prompt</h3>
        <p className="text-sm text-gray-300">{project.story_prompt}</p>
      </div>

      {/* Storyboard */}
      {sb ? (
        <div className="space-y-6">
          {/* Style info */}
          {sb.style && (
            <div className="rounded-lg bg-gray-900 border border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Style</h3>
              <div className="flex gap-4 text-sm text-gray-300">
                {sb.style.genre && <span>Genre: {sb.style.genre}</span>}
                {sb.style.art_style && (
                  <span>Art: {sb.style.art_style}</span>
                )}
                {sb.style.tone && <span>Tone: {sb.style.tone}</span>}
              </div>
            </div>
          )}

          {/* Characters */}
          {sb.characters && sb.characters.length > 0 && (
            <div className="rounded-lg bg-gray-900 border border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Characters
              </h3>
              <div className="space-y-2">
                {sb.characters.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-semibold text-gray-200">
                      {c.name}
                    </span>
                    {c.spec && (
                      <span className="text-gray-400"> — {c.spec}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pages and Panels */}
          {sb.pages?.map((page) => (
            <div key={page.page} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-300">
                Page {page.page}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {page.panels.map((panel) => (
                  <div
                    key={panel.index}
                    className="rounded-lg border border-gray-700 bg-gray-800 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-500">
                        Panel {panel.index + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {panel.shot}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-1">
                      {panel.action}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      {panel.setting}
                    </p>
                    {panel.dialogue.length > 0 && (
                      <div className="space-y-1">
                        {panel.dialogue.map((d, i) => (
                          <div
                            key={i}
                            className="rounded bg-white/5 px-2 py-1 text-xs"
                          >
                            <span className="font-semibold">{d.speaker}:</span>{" "}
                            {d.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {panel.must_keep.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {panel.must_keep.map((mk, i) => (
                          <span
                            key={i}
                            className="rounded bg-blue-900/50 px-1.5 py-0.5 text-[10px] text-blue-300"
                          >
                            {mk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isGenerating && (
          <p className="text-gray-500 text-center py-12">
            No storyboard yet. Click &quot;Generate Storyboard&quot; to get started.
          </p>
        )
      )}

      {isGenerating && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-3 text-gray-400">Generating storyboard...</p>
        </div>
      )}
    </div>
  );
}
