import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { v4 as uuid } from "uuid";

// POST /api/projects/:id/assets — Upload reference images
export async function POST(
  req: Request,
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

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploaded: Array<{ id: string; url: string; name: string }> = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() || "png";
    const path = `refs/${projectId}/${uuid()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await sb.storage.from("comic").upload(path, bytes, {
      contentType: file.type || "image/png",
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: pub } = sb.storage.from("comic").getPublicUrl(path);

    const { data: asset, error: aErr } = await sb
      .from("assets")
      .insert({
        project_id: projectId,
        type: "reference",
        url: pub.publicUrl,
        meta: { original_name: file.name, size: file.size },
      })
      .select("id, url")
      .single();

    if (aErr) {
      return NextResponse.json({ error: aErr.message }, { status: 500 });
    }

    uploaded.push({ id: asset.id, url: asset.url, name: file.name });
  }

  return NextResponse.json(uploaded, { status: 201 });
}

// GET /api/projects/:id/assets — List reference assets
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("assets")
    .select("id, url, meta, created_at")
    .eq("project_id", projectId)
    .eq("type", "reference")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
