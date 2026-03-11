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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100">Projects</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your AI-generated comic books
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner h-6 w-6" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="card rounded-lg p-10 text-center max-w-sm">
            <div className="mx-auto mb-4 h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-zinc-200 mb-1">
              No comics yet
            </h2>
            <p className="text-sm text-zinc-500 mb-5">
              Create your first AI-powered comic book.
            </p>
            <Link
              href="/new"
              className="btn-primary inline-block rounded-md px-5 py-2 text-sm"
            >
              Create Comic
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}/storyboard`}
              className="card rounded-lg p-4 group"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-sm font-medium text-zinc-200 truncate pr-3 group-hover:text-white transition-colors">
                  {p.title}
                </h2>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-zinc-600">
                {new Date(p.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
