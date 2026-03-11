import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { processJob } from "@/lib/jobs/processors";

export const maxDuration = 60;

// POST /api/projects/:id/storyboard — Generate storyboard (inline)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  // Verify project exists
  const { data: project, error: pErr } = await sb
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (pErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Create job row for tracking
  const { data: job, error: jErr } = await sb
    .from("jobs")
    .insert({
      project_id: projectId,
      type: "storyboard",
      payload: {},
      status: "running",
    })
    .select("*")
    .single();

  if (jErr) {
    return NextResponse.json({ error: jErr.message }, { status: 500 });
  }

  await sb
    .from("projects")
    .update({ status: "generating_storyboard", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  // Process inline instead of waiting for cron
  try {
    await processJob(job);
    await sb
      .from("jobs")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ ok: true, message: "Storyboard generated" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await sb
      .from("jobs")
      .update({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    await sb
      .from("projects")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", projectId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/projects/:id/storyboard — Get storyboard JSON
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("storyboards")
    .select("storyboard_json, created_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "No storyboard found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
