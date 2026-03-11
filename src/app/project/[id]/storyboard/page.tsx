"use client";

import { use } from "react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/use-project";
import { StatusBadge } from "@/components/status-badge";

interface RefAsset {
  id: string;
  url: string;
  meta: Record<string, unknown>;
}

export default function StoryboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data, loading, error, refresh } = useProject(projectId);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [refs, setRefs] = useState<RefAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch reference images
  useEffect(() => {
    fetch(`/api/projects/${projectId}/assets`)
      .then((r) => r.json())
      .then((data) => setRefs(Array.isArray(data) ? data : []))
      .catch(() => setRefs([]));
  }, [projectId]);

  async function handleUploadRefs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const uploaded = await res.json();
        setRefs((prev) => [
          ...prev,
          ...uploaded.map((u: { id: string; url: string; name: string }) => ({
            id: u.id,
            url: u.url,
            meta: { original_name: u.name },
          })),
        ]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/storyboard`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate storyboard");
      }
      refresh();
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : String(e));
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
    style?: { genre?: string; art_style?: string; tone?: string; visual_anchor?: string };
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
        transition?: string;
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
              disabled={generating}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {generating ? "Generating..." : "Generate Storyboard"}
            </button>
          )}
          {sb && (
            <>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50 transition"
              >
                {generating ? "Regenerating..." : "Regenerate Storyboard"}
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

      {/* Error */}
      {genError && (
        <div className="mb-6 rounded bg-red-900/50 border border-red-700 px-4 py-2 text-sm text-red-300">
          {genError}
        </div>
      )}

      {/* Reference Images Section */}
      <div className="mb-6 rounded-lg bg-gray-900 border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Reference Images</h3>
          <label className="cursor-pointer rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600 transition">
            {uploading ? "Uploading..." : "Upload References"}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleUploadRefs}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Upload character sheets, style references, or mood boards. These help maintain a consistent look across all generated panels.
        </p>
        {refs.length > 0 ? (
          <div className="grid grid-cols-6 gap-2">
            {refs.map((ref) => (
              <div key={ref.id} className="relative group">
                <img
                  src={ref.url}
                  alt={(ref.meta?.original_name as string) || "Reference"}
                  className="h-20 w-full rounded object-cover border border-gray-700"
                />
                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                  {(ref.meta?.original_name as string) || "ref"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-3">
            No reference images yet. Upload some to guide the art style.
          </p>
        )}
      </div>

      {/* Story prompt */}
      <div className="mb-6 rounded-lg bg-gray-900 border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Story Prompt</h3>
        <p className="text-sm text-gray-300">{project.story_prompt}</p>
      </div>

      {/* Storyboard */}
      {sb ? (
        <div className="space-y-6">
          {/* Visual Anchor */}
          {sb.style?.visual_anchor && (
            <div className="rounded-lg bg-blue-900/20 border border-blue-800 p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-1">Visual Anchor (applied to every panel)</h3>
              <p className="text-sm text-blue-200">{sb.style.visual_anchor}</p>
            </div>
          )}

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
                    {panel.transition && (
                      <p className="text-[10px] text-yellow-500/80 mb-2 italic">
                        {panel.transition}
                      </p>
                    )}
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
        !generating && (
          <p className="text-gray-500 text-center py-12">
            No storyboard yet. Click &quot;Generate Storyboard&quot; to get started.
          </p>
        )
      )}

      {generating && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-3 text-gray-400">Generating storyboard... this may take 10-30 seconds.</p>
        </div>
      )}
    </div>
  );
}
