import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST /api/projects/:id/panels/:panelId/regenerate — Regenerate a single panel
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
      status: "pending",
      regen_count: (panel.regen_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", panelId);

  // Enqueue generation job
  const { error } = await sb.from("jobs").insert({
    project_id: projectId,
    type: "generate_panel",
    payload: { panel_id: panelId },
    status: "queued",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Panel regeneration queued" });
}
