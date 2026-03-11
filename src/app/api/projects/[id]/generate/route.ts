import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST /api/projects/:id/generate — Enqueue panel generation (fan-out)
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

  const { error } = await sb.from("jobs").insert({
    project_id: projectId,
    type: "generate_panels",
    payload: {},
    status: "queued",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Panel generation queued" });
}
