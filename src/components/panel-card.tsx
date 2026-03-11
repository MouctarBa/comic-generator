"use client";

import { useState } from "react";
import { StatusBadge } from "./status-badge";
import type { Panel, Asset } from "@/hooks/use-project";

interface PanelCardProps {
  panel: Panel;
  assets: Asset[];
  projectId: string;
  onRegenerate?: () => void;
}

export function PanelCard({
  panel,
  assets,
  projectId,
  onRegenerate,
}: PanelCardProps) {
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState(panel.prompt);
  const [regenerating, setRegenerating] = useState(false);

  const imageAsset = assets.find((a) => a.id === panel.image_asset_id);

  async function handleRegenerate(newPrompt?: string) {
    setRegenerating(true);
    try {
      await fetch(
        `/api/projects/${projectId}/panels/${panel.id}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPrompt ? { prompt: newPrompt } : {}),
        }
      );
      setEditingPrompt(false);
      onRegenerate?.();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="card rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-zinc-500">
          Panel {panel.global_index + 1}
        </span>
        <StatusBadge status={panel.status} />
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-900 border border-zinc-800">
        {imageAsset ? (
          <img
            src={imageAsset.url}
            alt={`Panel ${panel.global_index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {panel.status === "generating" ? (
              <div className="flex flex-col items-center gap-2">
                <div className="spinner h-6 w-6" />
                <span className="text-xs text-zinc-600">Generating...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-zinc-700">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span className="text-xs text-zinc-700">No image yet</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogue */}
      {panel.dialogue_json.length > 0 && (
        <div className="space-y-1">
          {panel.dialogue_json.map((d, i) => (
            <div
              key={i}
              className="rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400"
            >
              <span className="font-medium text-zinc-300">{d.speaker}:</span>{" "}
              {d.text}
            </div>
          ))}
        </div>
      )}

      {/* Prompt editing */}
      {editingPrompt ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="input w-full rounded-md p-2.5 text-xs"
            rows={4}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleRegenerate(promptText)}
              disabled={regenerating}
              className="btn-primary rounded-md px-3 py-1.5 text-xs"
            >
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
            <button
              onClick={() => setEditingPrompt(false)}
              className="btn-ghost rounded-md px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => handleRegenerate()}
            disabled={regenerating || panel.status === "generating"}
            className="btn-ghost rounded-md px-3 py-1.5 text-xs flex-1 disabled:opacity-50"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
          <button
            onClick={() => setEditingPrompt(true)}
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Edit Prompt
          </button>
        </div>
      )}

      {panel.regen_count > 0 && (
        <span className="text-[10px] text-zinc-600 font-mono">
          {panel.regen_count}x regenerated
        </span>
      )}
    </div>
  );
}
