import { NextResponse } from "next/server";
import { claimNextJob } from "@/lib/jobs/claim";
import { processJob } from "@/lib/jobs/processors";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/jobs?secret=... — Vercel Cron polling endpoint
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const processed: Array<{
    id: string;
    type: string;
    status: string;
  }> = [];
  const maxPerRun = 3; // keep low to avoid Vercel timeouts

  for (let i = 0; i < maxPerRun; i++) {
    const job = await claimNextJob();
    if (!job) break;

    try {
      await processJob(job);

      await sb
        .from("jobs")
        .update({
          status: "done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      processed.push({ id: job.id, type: job.type, status: "done" });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : String(e);

      await sb
        .from("jobs")
        .update({
          status: "failed",
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      processed.push({ id: job.id, type: job.type, status: "failed" });
    }
  }

  return NextResponse.json({ ok: true, processed });
}
