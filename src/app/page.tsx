"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Comics</h1>

      {loading ? (
        <p className="text-gray-500">Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">No projects yet</p>
          <Link
            href="/new"
            className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-500 transition"
          >
            Create Your First Comic
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}/storyboard`}
              className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-600 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold truncate">{p.title}</h2>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-gray-500">
                {new Date(p.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
