"use client";

const colors: Record<string, string> = {
  draft: "bg-gray-500",
  generating_storyboard: "bg-yellow-500 animate-pulse",
  storyboard_ready: "bg-blue-500",
  generating: "bg-yellow-500 animate-pulse",
  ready: "bg-green-500",
  exported: "bg-purple-500",
  failed: "bg-red-500",
  pending: "bg-gray-400",
  done: "bg-green-500",
  queued: "bg-gray-400",
  running: "bg-yellow-500 animate-pulse",
};

export function StatusBadge({ status }: { status: string }) {
  const color = colors[status] ?? "bg-gray-400";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
