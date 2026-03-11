"use client";

import { use } from "react";
import { useState } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/use-project";
import { usePolling } from "@/hooks/use-polling";
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

  // Poll while panels are being generated
  const isGenerating =
    data?.project.status === "generating" ||
    data?.panels.some(
      (p) => p.status === "pending" || p.status === "generating"
    );
  usePolling(refresh, 4000, !!isGenerating);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await fetch(`/api/projects/${projectId}/generate`, { method: "POST" });
      refresh();
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!data) return <p className="text-gray-500">Project not found</p>;

  const { project, panels, assets } = data;
  const donePanels = panels.filter((p) => p.status === "done").length;
  const totalPanels = panels.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={project.status} />
            {totalPanels > 0 && (
              <span className="text-sm text-gray-400">
                {donePanels}/{totalPanels} panels done
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/project/${projectId}/storyboard`}
            className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 transition"
          >
            Back to Storyboard
          </Link>
          {panels.length > 0 && !isGenerating && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {generating ? "Queuing..." : "Regenerate All"}
            </button>
          )}
          {panels.length === 0 && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50 transition"
            >
              {generating ? "Queuing..." : "Generate Panels"}
            </button>
          )}
          {project.status === "ready" && (
            <Link
              href={`/project/${projectId}/export`}
              className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-500 transition"
            >
              Export
            </Link>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalPanels > 0 && (
        <div className="mb-6">
          <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: `${(donePanels / totalPanels) * 100}%`,
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
        <p className="text-gray-500 text-center py-12">
          No panels yet. Click &quot;Generate Panels&quot; to start image
          generation.
        </p>
      )}

      {isGenerating && (
        <div className="mt-6 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-400">
            Generating panels... this page auto-refreshes.
          </p>
        </div>
      )}
    </div>
  );
}
