import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { processJob } from "@/lib/jobs/processors";

export const maxDuration = 300;

// POST /api/projects/:id/generate — Fan-out panel generation (inline)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  // Verify project has a storyboard
  const { data: storyboard } = await sb
    .from("storyboards")
    .select("project_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!storyboard) {
    return NextResponse.json(
      { error: "Generate storyboard first" },
      { status: 400 }
    );
  }

  // Create and run fan-out job inline (creates individual panel jobs)
  const { data: fanOutJob, error: jErr } = await sb
    .from("jobs")
    .insert({
      project_id: projectId,
      type: "generate_panels",
      payload: {},
      status: "running",
    })
    .select("*")
    .single();

  if (jErr) {
    return NextResponse.json({ error: jErr.message }, { status: 500 });
  }

  try {
    await processJob(fanOutJob);
    await sb
      .from("jobs")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", fanOutJob.id);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await sb
      .from("jobs")
      .update({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", fanOutJob.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Now process each individual panel job inline (concurrently)
  const { data: panelJobs } = await sb
    .from("jobs")
    .select("*")
    .eq("project_id", projectId)
    .eq("type", "generate_panel")
    .eq("status", "queued")
    .order("created_at", { ascending: true });

  const results: Array<{ id: string; status: string; error?: string }> = [];

  // Process panels concurrently (max 3 at a time to avoid rate limits)
  const queue = [...(panelJobs ?? [])];
  const concurrency = 3;

  async function processOne(job: Record<string, unknown>) {
    try {
      await sb
        .from("jobs")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await processJob(job);
      await sb
        .from("jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      results.push({ id: job.id as string, status: "done" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      await sb
        .from("jobs")
        .update({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
        .eq("id", job.id);
      results.push({ id: job.id as string, status: "failed", error: message });
    }
  }

  // Process in batches
  for (let i = 0; i < queue.length; i += concurrency) {
    const batch = queue.slice(i, i + concurrency);
    await Promise.all(batch.map(processOne));
  }

  return NextResponse.json({ ok: true, results });
}
