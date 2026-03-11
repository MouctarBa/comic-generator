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
      refresh();
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner h-8 w-8" /></div>;
  if (error) return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>;
  if (!data) return <p className="text-slate-500">Project not found</p>;

  const { project, panels, assets } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient">{project.title}</span>
            <span className="text-slate-500 font-normal ml-3 text-lg">Export</span>
          </h1>
          <div className="mt-2"><StatusBadge status={project.status} /></div>
        </div>
        <div className="flex gap-3">
          <Link href={`/project/${projectId}/generate`} className="btn-secondary rounded-xl px-5 py-2.5 text-sm">
            Back to Panels
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting || !!isExporting}
            className="btn-accent rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            {isExporting ? "Exporting..." : exporting ? "Queuing..." : "Export Comic"}
          </button>
        </div>
      </div>

      {/* Panel preview */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Panel Preview</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {panels.map((panel) => {
            const imageAsset = assets.find((a) => a.id === panel.image_asset_id);
            return (
              <div key={panel.id} className="glass relative aspect-square overflow-hidden rounded-xl group hover:glow-sm transition-all duration-300">
                {imageAsset ? (
                  <img src={imageAsset.url} alt={`Panel ${panel.global_index + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-600 text-xs">No image</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <span className="text-[10px] text-slate-300 font-mono">
                    P{panel.page_num} / Panel {panel.global_index + 1}
                  </span>
                </div>
                {panel.dialogue_json.length > 0 && (
                  <div className="absolute top-2 left-2 right-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {panel.dialogue_json.map((d, i) => (
                      <div key={i} className="rounded-lg bg-white/90 px-2 py-1 text-[10px] text-gray-900 shadow-lg backdrop-blur">
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
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Downloads</h2>
          <div className="space-y-3">
            {exports.map((ex) => (
              <a
                key={ex.id}
                href={ex.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass flex items-center justify-between rounded-xl p-4 hover:glow-sm transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/15">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition">{ex.type.replace(/_/g, " ")}</span>
                </div>
                <span className="text-xs text-slate-600 font-mono">
                  {new Date(ex.created_at).toLocaleString()}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {isExporting && (
        <div className="glass rounded-xl p-10 text-center mt-6 glow-sm">
          <div className="spinner h-8 w-8 mx-auto mb-4" />
          <p className="text-sm text-purple-300/60">Preparing export...</p>
        </div>
      )}
    </div>
  );
}
