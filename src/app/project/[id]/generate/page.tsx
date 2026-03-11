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

  if (loading) return <div className="flex justify-center py-20"><div className="spinner h-8 w-8" /></div>;
  if (error) return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>;
  if (!data) return <p className="text-slate-500">Project not found</p>;

  const { project, panels, assets } = data;
  const donePanels = panels.filter((p) => p.status === "done").length;
  const totalPanels = panels.length;
  const progress = totalPanels > 0 ? (donePanels / totalPanels) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient">{project.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={project.status} />
            {totalPanels > 0 && (
              <span className="text-xs text-slate-500 font-mono">
                {donePanels}/{totalPanels} panels
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/project/${projectId}/storyboard`} className="btn-secondary rounded-xl px-5 py-2.5 text-sm">
            Storyboard
          </Link>
          {panels.length > 0 && !generating && (
            <button onClick={handleGenerate} disabled={generating} className="btn-secondary rounded-xl px-5 py-2.5 text-sm disabled:opacity-50">
              Regenerate All
            </button>
          )}
          {panels.length === 0 && (
            <button onClick={handleGenerate} disabled={generating} className="btn-accent rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50">
              {generating ? "Generating..." : "Generate Panels"}
            </button>
          )}
          {project.status === "ready" && (
            <Link href={`/project/${projectId}/export`} className="btn-accent rounded-xl px-5 py-2.5 text-sm font-medium" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              Export
            </Link>
          )}
        </div>
      </div>

      {/* Error */}
      {genError && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{genError}</div>
      )}

      {/* Progress bar */}
      {totalPanels > 0 && (
        <div className="mb-8">
          <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? "linear-gradient(90deg, #059669, #10b981)"
                  : "linear-gradient(90deg, #6366f1, #a855f7)",
                boxShadow: progress === 100
                  ? "0 0 10px rgba(16, 185, 129, 0.4)"
                  : "0 0 10px rgba(99, 102, 241, 0.4)",
              }}
            />
          </div>
        </div>
      )}

      {/* Panel grid */}
      {panels.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="glass rounded-xl p-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/15">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <p className="text-slate-500">No panels yet. Click &quot;Generate Panels&quot; to create images.</p>
          </div>
        )
      )}

      {generating && (
        <div className="glass rounded-xl p-12 text-center mt-6 glow-sm">
          <div className="spinner h-10 w-10 mx-auto mb-4" />
          <p className="text-sm text-indigo-300/60">Generating panels...</p>
          <p className="text-xs text-slate-600 mt-1">This may take a few minutes for all images</p>
        </div>
      )}
    </div>
  );
}
