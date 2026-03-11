"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/use-project";
import { usePolling } from "@/hooks/use-polling";
import { StatusBadge } from "@/components/status-badge";

interface ExportAsset {
  id: string;
  type: string;
  url: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export default function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data, loading, error, refresh } = useProject(projectId);
  const [exports, setExports] = useState<ExportAsset[]>([]);
  const [exporting, setExporting] = useState(false);

  // Fetch exports
  const fetchExports = async () => {
    const res = await fetch(`/api/projects/${projectId}/export`);
    if (res.ok) {
      const data = await res.json();
      setExports(data);
    }
  };

  useEffect(() => {
    fetchExports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const isExporting = data?.jobs.some(
    (j) =>
      j.type === "export" && (j.status === "queued" || j.status === "running")
  );
  usePolling(
    () => {
      refresh();
      fetchExports();
    },
    3000,
    !!isExporting
  );

  async function handleExport() {
    setExporting(true);
    try {
      await fetch(`/api/projects/${projectId}/export`, { method: "POST" });
      refresh();
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!data) return <p className="text-gray-500">Project not found</p>;

  const { project, panels, assets } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.title} — Export</h1>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex gap-3">
          <Link
            href={`/project/${projectId}/generate`}
            className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 transition"
          >
            Back to Panels
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting || !!isExporting}
            className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-500 disabled:opacity-50 transition"
          >
            {isExporting
              ? "Exporting..."
              : exporting
              ? "Queuing..."
              : "Export Comic"}
          </button>
        </div>
      </div>

      {/* Panel preview (reading order) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Panel Preview (Reading Order)</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {panels.map((panel) => {
            const imageAsset = assets.find(
              (a) => a.id === panel.image_asset_id
            );
            return (
              <div
                key={panel.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-gray-700 bg-gray-800"
              >
                {imageAsset ? (
                  <img
                    src={imageAsset.url}
                    alt={`Panel ${panel.global_index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600 text-xs">
                    No image
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <span className="text-[10px] text-gray-300">
                    P{panel.page_num} — Panel {panel.global_index + 1}
                  </span>
                </div>
                {/* Dialogue overlay */}
                {panel.dialogue_json.length > 0 && (
                  <div className="absolute top-1 left-1 right-1 space-y-0.5">
                    {panel.dialogue_json.map((d, i) => (
                      <div
                        key={i}
                        className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-gray-900 shadow"
                      >
                        <span className="font-bold">{d.speaker}:</span> {d.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Export downloads */}
      {exports.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Downloads</h2>
          <div className="space-y-2">
            {exports.map((ex) => (
              <a
                key={ex.id}
                href={ex.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3 hover:border-gray-500 transition"
              >
                <span className="text-sm">{ex.type.replace(/_/g, " ")}</span>
                <span className="text-xs text-gray-500">
                  {new Date(ex.created_at).toLocaleString()}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {isExporting && (
        <div className="mt-6 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-400">Preparing export...</p>
        </div>
      )}
    </div>
  );
}
