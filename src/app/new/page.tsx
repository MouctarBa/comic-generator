"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const TEMPLATES = [
  { label: "Auto (let AI decide)", value: null },
  { label: "3 pages x 6 panels", value: { layout: { pages: 3, panels_per_page: 6 } } },
  { label: "1 page x 4 panels (short)", value: { layout: { pages: 1, panels_per_page: 4 } } },
  { label: "5 pages x 4 panels (longer story)", value: { layout: { pages: 5, panels_per_page: 4 } } },
  { label: "3-Act Structure", value: { narrative: { structure: "3-act", beats: ["setup", "confrontation", "resolution"] } } },
  {
    label: "Hero's Journey",
    value: {
      narrative: {
        structure: "heros-journey",
        beats: ["ordinary world", "call to adventure", "crossing the threshold", "trials", "climax", "return"],
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
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">New Comic</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Describe your story and the AI will handle the rest
        </p>
      </div>

      <div className="card rounded-lg p-6">
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Comic"
              className="input w-full rounded-md px-3 py-2 text-sm"
            />
          </div>

          {/* Story Prompt */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Story Prompt <span className="text-red-400">*</span>
            </label>
            <textarea
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              placeholder="A cyberpunk detective investigates a series of AI-related crimes in Neo Tokyo..."
              rows={5}
              className="input w-full rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              Include characters, setting, plot, and style preferences for best results.
            </p>
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Structure
            </label>
            <select
              value={templateIdx}
              onChange={(e) => setTemplateIdx(Number(e.target.value))}
              className="input w-full rounded-md px-3 py-2 text-sm appearance-none cursor-pointer"
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
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Reference Images
            </label>
            <p className="text-xs text-zinc-600 mb-2">
              Upload character sheets, style guides, or mood boards to guide the visual style.
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
              className="w-full rounded-md border border-dashed border-zinc-700 bg-zinc-900 px-4 py-5 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors flex flex-col items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Click to upload reference images
            </button>

            {refFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {refFiles.map((ref, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={ref.preview}
                      alt={ref.file.name}
                      className="h-20 w-full rounded-md object-cover border border-zinc-800"
                    />
                    <button
                      type="button"
                      onClick={() => removeRef(i)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      x
                    </button>
                    <p className="text-[10px] text-zinc-600 truncate mt-1">
                      {ref.file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-red-950/50 border border-red-900 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary w-full rounded-md px-4 py-2.5 text-sm"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner h-4 w-4" />
                Creating...
              </span>
            ) : (
              "Create Project"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
