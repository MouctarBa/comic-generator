import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST /api/projects — Create a new project
export async function POST(req: Request) {
  const sb = supabaseAdmin();
  const body = await req.json();

  const { title, story_prompt, template_json, user_id } = body;

  if (!story_prompt) {
    return NextResponse.json(
      { error: "story_prompt is required" },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from("projects")
    .insert({
      title: title || "Untitled Comic",
      story_prompt,
      template_json: template_json ?? null,
      user_id: user_id || "anonymous",
      provider_config: { llm: "openai", image: "openai" },
      status: "draft",
    })
    .select("id, title, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// GET /api/projects — List projects (optionally filter by user_id)
export async function GET(req: Request) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  let query = sb
    .from("projects")
    .select("id, title, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
