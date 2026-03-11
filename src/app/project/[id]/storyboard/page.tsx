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
      for (const file of files) formData.append("files", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: formData });
      if (res.ok) {
        const uploaded = await res.json();
        setRefs((prev) => [...prev, ...uploaded.map((u: { id: string; url: string; name: string }) => ({ id: u.id, url: u.url, meta: { original_name: u.name } }))]);
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
      const res = await fetch(`/api/projects/${projectId}/storyboard`, { method: "POST" });
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

  if (loading) return <div className="flex justify-center py-20"><div className="spinner h-6 w-6" /></div>;
  if (error) return <div className="rounded-md bg-red-950/50 border border-red-900 px-3 py-2.5 text-sm text-red-400">{error}</div>;
  if (!data) return <p className="text-zinc-500">Project not found</p>;

  const { project, storyboard } = data;
  const sb = storyboard as {
    title?: string;
    style?: { genre?: string; art_style?: string; tone?: string; visual_anchor?: string; palette?: string[] };
    characters?: Array<{ id: string; name: string; spec?: string }>;
    pages?: Array<{
      page: number;
      panels: Array<{
        index: number; shot: string; setting: string; action: string;
        dialogue: Array<{ speaker: string; text: string }>; must_keep: string[]; transition?: string;
      }>;
    }>;
  } | null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{project.title}</h1>
          <div className="mt-1.5"><StatusBadge status={project.status} /></div>
        </div>
        <div className="flex gap-2">
          {!sb && (
            <button onClick={handleGenerate} disabled={generating} className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-50">
              {generating ? "Generating..." : "Generate Storyboard"}
            </button>
          )}
          {sb && (
            <>
              <button onClick={handleGenerate} disabled={generating} className="btn-ghost rounded-md px-4 py-2 text-sm disabled:opacity-50">
                {generating ? "Regenerating..." : "Regenerate"}
              </button>
              <Link href={`/project/${projectId}/generate`} className="btn-success rounded-md px-4 py-2 text-sm">
                Generate Panels
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {genError && (
        <div className="mb-4 rounded-md bg-red-950/50 border border-red-900 px-3 py-2.5 text-sm text-red-400">{genError}</div>
      )}

      {/* Reference Images */}
      <div className="card rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-300">Reference Images</h3>
          <label className="btn-ghost cursor-pointer rounded-md px-3 py-1.5 text-xs">
            {uploading ? "Uploading..." : "Upload"}
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleUploadRefs} disabled={uploading} className="hidden" />
          </label>
        </div>
        {refs.length > 0 ? (
          <div className="grid grid-cols-6 gap-2">
            {refs.map((ref) => (
              <div key={ref.id}>
                <img src={ref.url} alt={(ref.meta?.original_name as string) || "ref"} className="h-16 w-full rounded-md object-cover border border-zinc-800" />
                <p className="text-[10px] text-zinc-600 truncate mt-1">{(ref.meta?.original_name as string) || "ref"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 text-center py-3">No references yet. Upload images to guide the visual style.</p>
        )}
      </div>

      {/* Story prompt */}
      <div className="card rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-1.5">Story Prompt</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{project.story_prompt}</p>
      </div>

      {/* Storyboard */}
      {sb ? (
        <div className="space-y-4">
          {/* Visual Anchor */}
          {sb.style?.visual_anchor && (
            <div className="card rounded-lg p-4 border-blue-900/50">
              <h3 className="text-sm font-medium text-blue-400 mb-1.5">Visual Anchor</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{sb.style.visual_anchor}</p>
            </div>
          )}

          {/* Style + Palette */}
          {sb.style && (
            <div className="card rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Style</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {sb.style.genre && <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-400">Genre: {sb.style.genre}</span>}
                {sb.style.art_style && <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-400">Art: {sb.style.art_style}</span>}
                {sb.style.tone && <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-400">Tone: {sb.style.tone}</span>}
              </div>
              {sb.style.palette && sb.style.palette.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {sb.style.palette.map((color, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2 py-1">
                      <div className="h-3 w-3 rounded-full border border-zinc-700" style={{ background: color }} />
                      <span className="text-[10px] text-zinc-500">{color}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Characters */}
          {sb.characters && sb.characters.length > 0 && (
            <div className="card rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Characters</h3>
              <div className="space-y-2.5">
                {sb.characters.map((c) => (
                  <div key={c.id} className="flex gap-3 items-start">
                    <div className="h-7 w-7 rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-zinc-400">{c.name[0]}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-zinc-200">{c.name}</span>
                      {c.spec && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{c.spec}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pages and Panels */}
          {sb.pages?.map((page) => (
            <div key={page.page} className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Page {page.page}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {page.panels.map((panel) => (
                  <div key={panel.index} className="card rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-zinc-500">#{panel.index + 1}</span>
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{panel.shot}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1 leading-relaxed">{panel.action}</p>
                    <p className="text-xs text-zinc-600 mb-2">{panel.setting}</p>
                    {panel.transition && (
                      <p className="text-[10px] text-amber-500/70 mb-2 italic font-mono">{panel.transition}</p>
                    )}
                    {panel.dialogue.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {panel.dialogue.map((d, i) => (
                          <div key={i} className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-xs">
                            <span className="font-medium text-zinc-300">{d.speaker}:</span>{" "}
                            <span className="text-zinc-400">{d.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {panel.must_keep.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {panel.must_keep.map((mk, i) => (
                          <span key={i} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">{mk}</span>
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
          <div className="card rounded-lg p-10 text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No storyboard yet. Click &quot;Generate Storyboard&quot; to begin.</p>
          </div>
        )
      )}

      {generating && (
        <div className="card rounded-lg p-10 text-center">
          <div className="spinner h-8 w-8 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Generating storyboard...</p>
          <p className="text-xs text-zinc-600 mt-1">This usually takes 10-30 seconds</p>
        </div>
      )}
    </div>
  );
}
