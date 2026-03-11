import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST /api/projects/:id/export — Enqueue export job
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  const { error } = await sb.from("jobs").insert({
    project_id: projectId,
    type: "export",
    payload: {},
    status: "queued",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Export job queued" });
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
