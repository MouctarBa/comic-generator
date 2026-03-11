"use client";

import { useState, useRef } from "react";
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

interface RefFile {
  file: File;
  preview: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [storyPrompt, setStoryPrompt] = useState("");
  const [templateIdx, setTemplateIdx] = useState(0);
  const [refFiles, setRefFiles] = useState<RefFile[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newRefs = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setRefFiles((prev) => [...prev, ...newRefs]);
    // Reset so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeRef(index: number) {
    setRefFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleCreate() {
    if (!storyPrompt.trim()) {
      setError("Please enter a story prompt");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // 1. Create the project
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

      // 2. Upload reference images if any
      if (refFiles.length > 0) {
        const formData = new FormData();
        for (const ref of refFiles) {
          formData.append("files", ref.file);
        }

        const uploadRes = await fetch(`/api/projects/${project.id}/assets`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          // Project created but upload failed — still navigate
          console.error("Failed to upload reference images");
        }
      }

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

        {/* Reference Images */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Reference Images (optional)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Upload character references, style guides, or mood boards to guide the AI.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFilesSelected}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border-2 border-dashed border-gray-600 px-4 py-3 w-full text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300 transition"
          >
            Click to upload images
          </button>

          {/* Previews */}
          {refFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {refFiles.map((ref, i) => (
                <div key={i} className="relative group">
                  <img
                    src={ref.preview}
                    alt={ref.file.name}
                    className="h-24 w-full rounded-lg object-cover border border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeRef(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    x
                  </button>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">
                    {ref.file.name}
                  </p>
                </div>
              ))}
            </div>
          )}
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
