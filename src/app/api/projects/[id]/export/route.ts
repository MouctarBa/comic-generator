import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { processJob } from "@/lib/jobs/processors";

export const maxDuration = 60;

// POST /api/projects/:id/export — Run export inline
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  // Create job row for tracking
  const { data: job, error: jErr } = await sb
    .from("jobs")
    .insert({
      project_id: projectId,
      type: "export",
      payload: {},
      status: "running",
    })
    .select("*")
    .single();

  if (jErr) {
    return NextResponse.json({ error: jErr.message }, { status: 500 });
  }

  // Process inline instead of waiting for cron
  try {
    await processJob(job);
    await sb
      .from("jobs")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ ok: true, message: "Export complete" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await sb
      .from("jobs")
      .update({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/projects/:id/export — Get export assets
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .in("type", ["export_pdf", "export_cbz", "export_manifest"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
