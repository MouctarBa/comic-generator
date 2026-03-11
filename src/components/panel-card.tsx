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
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-gray-400">
          Panel {panel.global_index + 1}
        </span>
        <StatusBadge status={panel.status} />
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded bg-gray-900">
        {imageAsset ? (
          <img
            src={imageAsset.url}
            alt={`Panel ${panel.global_index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600 text-sm">
            {panel.status === "generating" ? "Generating..." : "No image yet"}
          </div>
        )}
      </div>

      {/* Dialogue overlay */}
      {panel.dialogue_json.length > 0 && (
        <div className="space-y-1">
          {panel.dialogue_json.map((d, i) => (
            <div
              key={i}
              className="rounded bg-white/10 px-2 py-1 text-xs text-gray-200"
            >
              <span className="font-semibold">{d.speaker}:</span> {d.text}
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
            className="w-full rounded bg-gray-900 p-2 text-xs text-gray-300 border border-gray-600"
            rows={4}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleRegenerate(promptText)}
              disabled={regenerating}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {regenerating ? "Queuing..." : "Regenerate with new prompt"}
            </button>
            <button
              onClick={() => setEditingPrompt(false)}
              className="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-500"
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
            className="rounded bg-orange-600 px-3 py-1 text-xs text-white hover:bg-orange-500 disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            onClick={() => setEditingPrompt(true)}
            className="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-500"
          >
            Edit Prompt
          </button>
        </div>
      )}

      {panel.regen_count > 0 && (
        <span className="text-[10px] text-gray-500">
          Regenerated {panel.regen_count}x
        </span>
      )}
    </div>
  );
}
