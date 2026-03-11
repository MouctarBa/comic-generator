import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/projects/:id — Full project bundle
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  const [projectRes, storyboardRes, panelsRes, assetsRes, jobsRes] =
    await Promise.all([
      sb.from("projects").select("*").eq("id", projectId).single(),
      sb
        .from("storyboards")
        .select("storyboard_json")
        .eq("project_id", projectId)
        .maybeSingle(),
      sb
        .from("panels")
        .select("*")
        .eq("project_id", projectId)
        .order("global_index", { ascending: true }),
      sb
        .from("assets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      sb
        .from("jobs")
        .select("id, type, status, created_at, updated_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (projectRes.error) {
    return NextResponse.json(
      { error: projectRes.error.message },
      { status: 404 }
    );
  }

  return NextResponse.json({
    project: projectRes.data,
    storyboard: storyboardRes.data?.storyboard_json ?? null,
    panels: panelsRes.data ?? [],
    assets: assetsRes.data ?? [],
    jobs: jobsRes.data ?? [],
  });
}
