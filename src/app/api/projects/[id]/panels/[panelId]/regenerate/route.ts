import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { processJob } from "@/lib/jobs/processors";

export const maxDuration = 60;

// POST /api/projects/:id/panels/:panelId/regenerate — Regenerate a single panel (inline)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  const { id: projectId, panelId } = await params;
  const sb = supabaseAdmin();

  // Optionally accept updated prompt or feedback
  let body: { prompt?: string; feedback?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine
  }

  // Verify panel exists
  const { data: panel, error: pErr } = await sb
    .from("panels")
    .select("id, prompt, regen_count")
    .eq("id", panelId)
    .eq("project_id", projectId)
    .single();

  if (pErr || !panel) {
    return NextResponse.json({ error: "Panel not found" }, { status: 404 });
  }

  // Update prompt if provided
  if (body.prompt) {
    await sb
      .from("panels")
      .update({ prompt: body.prompt, updated_at: new Date().toISOString() })
      .eq("id", panelId);
  }

  // Increment regen count and reset status
  await sb
    .from("panels")
    .update({
      status: "generating",
      regen_count: (panel.regen_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", panelId);

  // Create and process job inline
  const { data: job, error: jErr } = await sb
    .from("jobs")
    .insert({
      project_id: projectId,
      type: "generate_panel",
      payload: { panel_id: panelId },
      status: "running",
    })
    .select("*")
    .single();

  if (jErr) {
    return NextResponse.json({ error: jErr.message }, { status: 500 });
  }

  try {
    await processJob(job);
    await sb
      .from("jobs")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ ok: true, message: "Panel regenerated" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await sb
      .from("jobs")
      .update({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    await sb
      .from("panels")
      .update({ status: "failed", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", panelId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
