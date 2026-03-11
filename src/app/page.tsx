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
      {/* Hero section */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient">Your Comics</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          AI-powered comic creation from story to panels
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner h-8 w-8" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="glass rounded-2xl p-12 text-center max-w-md glow-md">
            <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-200 mb-2">
              No comics yet
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Create your first AI-powered comic book in minutes.
            </p>
            <Link
              href="/new"
              className="btn-accent inline-block rounded-xl px-8 py-3 font-medium"
            >
              Create Your First Comic
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}/storyboard`}
              className="glass rounded-xl p-5 group hover:glow-sm transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-slate-200 truncate pr-3 group-hover:text-white transition">
                  {p.title}
                </h2>
                <StatusBadge status={p.status} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-mono">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600 group-hover:text-indigo-400 transition">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
