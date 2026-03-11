"use client";

import { use } from "react";
import { useState } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/use-project";
import { StatusBadge } from "@/components/status-badge";
import { PanelCard } from "@/components/panel-card";

export default function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data, loading, error, refresh } = useProject(projectId);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate panels");
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

  const { project, panels, assets } = data;
  const donePanels = panels.filter((p) => p.status === "done").length;
  const totalPanels = panels.length;
  const progress = totalPanels > 0 ? (donePanels / totalPanels) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{project.title}</h1>
          <div className="flex items-center gap-2.5 mt-1.5">
            <StatusBadge status={project.status} />
            {totalPanels > 0 && (
              <span className="text-xs text-zinc-500 font-mono">
                {donePanels}/{totalPanels} panels
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/project/${projectId}/storyboard`} className="btn-ghost rounded-md px-4 py-2 text-sm">
            Storyboard
          </Link>
          {panels.length > 0 && !generating && (
            <button onClick={handleGenerate} disabled={generating} className="btn-ghost rounded-md px-4 py-2 text-sm disabled:opacity-50">
              Regenerate All
            </button>
          )}
          {panels.length === 0 && (
            <button onClick={handleGenerate} disabled={generating} className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-50">
              {generating ? "Generating..." : "Generate Panels"}
            </button>
          )}
          {project.status === "ready" && (
            <Link href={`/project/${projectId}/export`} className="btn-primary rounded-md px-4 py-2 text-sm">
              Export
            </Link>
          )}
        </div>
      </div>

      {/* Error */}
      {genError && (
        <div className="mb-4 rounded-md bg-red-950/50 border border-red-900 px-3 py-2.5 text-sm text-red-400">{genError}</div>
      )}

      {/* Progress bar */}
      {totalPanels > 0 && (
        <div className="mb-6">
          <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? "#22c55e" : "#3b82f6",
              }}
            />
          </div>
        </div>
      )}

      {/* Panel grid */}
      {panels.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              assets={assets}
              projectId={projectId}
              onRegenerate={refresh}
            />
          ))}
        </div>
      ) : (
        !generating && (
          <div className="card rounded-lg p-10 text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No panels yet. Click &quot;Generate Panels&quot; to create images.</p>
          </div>
        )
      )}

      {generating && (
        <div className="card rounded-lg p-10 text-center mt-4">
          <div className="spinner h-8 w-8 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Generating panels...</p>
          <p className="text-xs text-zinc-600 mt-1">This may take a few minutes for all images</p>
        </div>
      )}
    </div>
  );
}
