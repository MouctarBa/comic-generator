import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST /api/projects/:id/storyboard — Enqueue storyboard generation job
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

  const { error } = await sb.from("jobs").insert({
    project_id: projectId,
    type: "storyboard",
    payload: {},
    status: "queued",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sb
    .from("projects")
    .update({ status: "generating_storyboard", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return NextResponse.json({ ok: true, message: "Storyboard job queued" });
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
