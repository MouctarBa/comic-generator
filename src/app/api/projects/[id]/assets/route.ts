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

  // Ensure storage bucket exists
  const { error: bucketErr } = await sb.storage.getBucket("comic");
  if (bucketErr) {
    await sb.storage.createBucket("comic", { public: true });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploaded: Array<{ id: string; url: string; name: string }> = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `refs/${projectId}/${uuid()}.${ext}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: upErr } = await sb.storage.from("comic").upload(path, bytes, {
        contentType: file.type || "image/png",
        upsert: false,
      });

      if (upErr) {
        errors.push(`Upload failed for ${file.name}: ${upErr.message}`);
        continue;
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
        errors.push(`DB insert failed for ${file.name}: ${aErr.message}`);
        continue;
      }

      uploaded.push({ id: asset.id, url: asset.url, name: file.name });
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (uploaded.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
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
