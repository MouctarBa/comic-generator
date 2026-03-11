"use client";

const styles: Record<string, { bg: string; text: string; glow?: boolean }> = {
  draft: { bg: "bg-slate-500/15", text: "text-slate-400" },
  generating_storyboard: { bg: "bg-indigo-500/15", text: "text-indigo-300", glow: true },
  storyboard_ready: { bg: "bg-cyan-500/15", text: "text-cyan-300" },
  generating: { bg: "bg-indigo-500/15", text: "text-indigo-300", glow: true },
  ready: { bg: "bg-emerald-500/15", text: "text-emerald-300" },
  exported: { bg: "bg-purple-500/15", text: "text-purple-300" },
  failed: { bg: "bg-red-500/15", text: "text-red-300" },
  pending: { bg: "bg-slate-500/15", text: "text-slate-400" },
  done: { bg: "bg-emerald-500/15", text: "text-emerald-300" },
  queued: { bg: "bg-slate-500/15", text: "text-slate-400" },
  running: { bg: "bg-indigo-500/15", text: "text-indigo-300", glow: true },
};

export function StatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? { bg: "bg-slate-500/15", text: "text-slate-400" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide uppercase ${style.bg} ${style.text} ${style.glow ? "animate-pulse-glow border-indigo-500/30" : "border-transparent"}`}
    >
      {style.glow && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status.replace(/_/g, " ")}
    </span>
  );
}
