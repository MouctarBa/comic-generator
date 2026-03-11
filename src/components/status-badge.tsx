"use client";

const styles: Record<string, { bg: string; text: string; dot?: boolean }> = {
  draft: { bg: "bg-zinc-800", text: "text-zinc-400" },
  generating_storyboard: { bg: "bg-blue-950", text: "text-blue-400", dot: true },
  storyboard_ready: { bg: "bg-emerald-950", text: "text-emerald-400" },
  generating: { bg: "bg-blue-950", text: "text-blue-400", dot: true },
  ready: { bg: "bg-emerald-950", text: "text-emerald-400" },
  exported: { bg: "bg-violet-950", text: "text-violet-400" },
  failed: { bg: "bg-red-950", text: "text-red-400" },
  pending: { bg: "bg-zinc-800", text: "text-zinc-400" },
  done: { bg: "bg-emerald-950", text: "text-emerald-400" },
  queued: { bg: "bg-zinc-800", text: "text-zinc-400" },
  running: { bg: "bg-blue-950", text: "text-blue-400", dot: true },
};

export function StatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? { bg: "bg-zinc-800", text: "text-zinc-400" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}
    >
      {style.dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status.replace(/_/g, " ")}
    </span>
  );
}
