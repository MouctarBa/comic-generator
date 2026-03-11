"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TEMPLATES = [
  { label: "Auto (let AI decide)", value: null },
  {
    label: "3 pages x 6 panels",
    value: { layout: { pages: 3, panels_per_page: 6 } },
  },
  {
    label: "1 page x 4 panels (short)",
    value: { layout: { pages: 1, panels_per_page: 4 } },
  },
  {
    label: "5 pages x 4 panels (longer story)",
    value: { layout: { pages: 5, panels_per_page: 4 } },
  },
  {
    label: "3-Act Structure",
    value: { narrative: { structure: "3-act", beats: ["setup", "confrontation", "resolution"] } },
  },
  {
    label: "Hero's Journey",
    value: {
      narrative: {
        structure: "heros-journey",
        beats: [
          "ordinary world",
          "call to adventure",
          "crossing the threshold",
          "trials",
          "climax",
          "return",
        ],
      },
    },
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [storyPrompt, setStoryPrompt] = useState("");
  const [templateIdx, setTemplateIdx] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!storyPrompt.trim()) {
      setError("Please enter a story prompt");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled Comic",
          story_prompt: storyPrompt.trim(),
          template_json: TEMPLATES[templateIdx].value,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      const project = await res.json();
      router.push(`/project/${project.id}/storyboard`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Comic</h1>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Comic"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Story Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Story Prompt *
          </label>
          <textarea
            value={storyPrompt}
            onChange={(e) => setStoryPrompt(e.target.value)}
            placeholder="A cyberpunk detective investigates a series of AI-related crimes in Neo Tokyo. The story follows detective Ava as she uncovers a conspiracy that threatens the boundary between human and machine consciousness..."
            rows={6}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Describe your comic story. Include characters, setting, plot, and
            any style preferences.
          </p>
        </div>

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Template / Structure
          </label>
          <select
            value={templateIdx}
            onChange={(e) => setTemplateIdx(Number(e.target.value))}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TEMPLATES.map((t, i) => (
              <option key={i} value={i}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded bg-red-900/50 border border-red-700 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition"
        >
          {creating ? "Creating..." : "Create Project"}
        </button>
      </div>
    </div>
  );
}
