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
    (j) => j.type === "export" && (j.status === "queued" || j.status === "running")
  );
  usePolling(() => { refresh(); fetchExports(); }, 3000, !!isExporting);

  async function handleExport() {
    setExporting(true);
    try {
      await fetch(`/api/projects/${projectId}/export`, { method: "POST" });
      await fetchExports();
      refresh();
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner h-6 w-6" /></div>;
  if (error) return <div className="rounded-md bg-red-950/50 border border-red-900 px-3 py-2.5 text-sm text-red-400">{error}</div>;
  if (!data) return <p className="text-zinc-500">Project not found</p>;

  const { project, panels, assets } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-100">{project.title}</h1>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500 text-lg">Export</span>
          </div>
          <div className="mt-1.5"><StatusBadge status={project.status} /></div>
        </div>
        <div className="flex gap-2">
          <Link href={`/project/${projectId}/generate`} className="btn-ghost rounded-md px-4 py-2 text-sm">
            Back to Panels
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting || !!isExporting}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {exporting ? "Exporting..." : isExporting ? "Exporting..." : "Export Comic"}
          </button>
        </div>
      </div>

      {/* Panel preview */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Panel Preview</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {panels.map((panel) => {
            const imageAsset = assets.find((a) => a.id === panel.image_asset_id);
            return (
              <div key={panel.id} className="card relative aspect-square overflow-hidden rounded-lg group">
                {imageAsset ? (
                  <img src={imageAsset.url} alt={`Panel ${panel.global_index + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-700 text-xs">No image</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2">
                  <span className="text-[10px] text-zinc-300 font-mono">
                    P{panel.page_num} / Panel {panel.global_index + 1}
                  </span>
                </div>
                {panel.dialogue_json.length > 0 && (
                  <div className="absolute top-2 left-2 right-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {panel.dialogue_json.map((d, i) => (
                      <div key={i} className="rounded-md bg-white/90 px-2 py-1 text-[10px] text-gray-900 shadow backdrop-blur-sm">
                        <span className="font-semibold">{d.speaker}:</span> {d.text}
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
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Downloads</h2>
          <div className="space-y-2">
            {exports.map((ex) => (
              <a
                key={ex.id}
                href={ex.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card flex items-center justify-between rounded-lg p-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{ex.type.replace(/_/g, " ")}</span>
                </div>
                <span className="text-xs text-zinc-600 font-mono">
                  {new Date(ex.created_at).toLocaleString()}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {(exporting || isExporting) && (
        <div className="card rounded-lg p-8 text-center mt-4">
          <div className="spinner h-6 w-6 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Generating PDF...</p>
        </div>
      )}
    </div>
  );
}
