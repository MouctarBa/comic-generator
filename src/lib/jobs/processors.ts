import { supabaseAdmin } from "@/lib/supabase/admin";
import { OpenAILLMProvider } from "@/lib/providers/openai-llm";
import { OpenAIImageProvider } from "@/lib/providers/openai-image";
import { StoryboardJSON } from "@/lib/providers/llm";

const llm = new OpenAILLMProvider();
const img = new OpenAIImageProvider();

// ---------------------------------------------------------------------------
// Job dispatcher
// ---------------------------------------------------------------------------
export async function processJob(job: Record<string, unknown>) {
  switch (job.type) {
    case "storyboard":
      return processStoryboard(job);
    case "generate_panels":
      return processGeneratePanels(job);
    case "generate_panel":
      return processGeneratePanel(job);
    case "export":
      return processExport(job);
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

// ---------------------------------------------------------------------------
// Storyboard generation
// ---------------------------------------------------------------------------
async function processStoryboard(job: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const projectId = job.project_id as string;

  const { data: project, error } = await sb
    .from("projects")
    .select("id, story_prompt, template_json")
    .eq("id", projectId)
    .single();
  if (error) throw error;

  const storyboard = await llm.createStoryboard({
    storyPrompt: project.story_prompt,
    templateJson: project.template_json ?? undefined,
  });

  // Upsert storyboard
  const { error: sbErr } = await sb
    .from("storyboards")
    .upsert({
      project_id: projectId,
      storyboard_json: storyboard,
    });
  if (sbErr) throw sbErr;

  // Expand panels into rows
  const rows = expandPanels(storyboard, projectId);

  // Replace existing panels (simple V1 approach)
  await sb.from("panels").delete().eq("project_id", projectId);
  if (rows.length) {
    const { error: insErr } = await sb.from("panels").insert(rows);
    if (insErr) throw insErr;
  }

  await sb
    .from("projects")
    .update({ status: "storyboard_ready", updated_at: new Date().toISOString() })
    .eq("id", projectId);
}

function expandPanels(storyboard: StoryboardJSON, projectId: string) {
  const rows: Record<string, unknown>[] = [];
  for (const page of storyboard.pages) {
    for (const p of page.panels) {
      rows.push({
        project_id: projectId,
        page_num: page.page,
        panel_num: p.index,
        global_index: p.index,
        prompt: buildPanelPrompt(storyboard, p),
        dialogue_json: p.dialogue ?? [],
        must_keep_json: p.must_keep ?? [],
        status: "pending",
      });
    }
  }
  return rows;
}

function buildPanelPrompt(
  storyboard: StoryboardJSON,
  panel: StoryboardJSON["pages"][0]["panels"][0]
) {
  const style = storyboard.style ?? {};

  // Visual anchor is the #1 consistency tool — prepended to EVERY panel
  const visualAnchor = style.visual_anchor || style.art_style || "";

  // Build FULL character descriptions for every character in this panel
  const charDescriptions = (panel.characters ?? [])
    .map((cId) => {
      const char = storyboard.characters?.find((c) => c.id === cId);
      return char ? `  - ${char.name}: ${char.spec ?? "no description"}` : `  - ${cId}`;
    })
    .join("\n");

  const must = (panel.must_keep ?? []).join(", ");

  const palette = style.palette?.length
    ? `Color palette: ${style.palette.join(", ")}.`
    : "";

  return [
    // Style block (identical for every panel = visual consistency)
    `STYLE: ${visualAnchor}`,
    style.genre ? `Genre: ${style.genre}.` : "",
    style.tone ? `Tone: ${style.tone}.` : "",
    palette,
    "",
    // Scene-specific
    `SCENE: Comic book panel illustration.`,
    `Shot type: ${panel.shot}.`,
    `Setting: ${panel.setting}.`,
    `Action: ${panel.action}.`,
    "",
    // Characters with full specs (keeps characters looking the same across panels)
    charDescriptions ? `CHARACTERS IN THIS PANEL:\n${charDescriptions}` : "",
    "",
    // Visual continuity
    must ? `VISUAL CONTINUITY: ${must}.` : "",
    "",
    // Technical requirements
    `Do NOT render any text, speech bubbles, or dialogue in the image.`,
    `High quality, coherent composition, professional comic art, consistent character designs.`,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Fan-out: enqueue one generate_panel job per panel
// ---------------------------------------------------------------------------
async function processGeneratePanels(job: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const projectId = job.project_id as string;

  const { data: panels, error } = await sb
    .from("panels")
    .select("id")
    .eq("project_id", projectId)
    .order("global_index", { ascending: true });

  if (error) throw error;

  const jobs = (panels ?? []).map((p) => ({
    project_id: projectId,
    type: "generate_panel",
    payload: { panel_id: p.id },
    status: "queued",
  }));

  if (jobs.length) {
    const { error: jErr } = await sb.from("jobs").insert(jobs);
    if (jErr) throw jErr;
  }

  await sb
    .from("projects")
    .update({ status: "generating", updated_at: new Date().toISOString() })
    .eq("id", projectId);
}

// ---------------------------------------------------------------------------
// Generate a single panel image
// ---------------------------------------------------------------------------
async function processGeneratePanel(job: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const projectId = job.project_id as string;
  const payload = job.payload as { panel_id: string };
  const panelId = payload.panel_id;

  const { data: panel, error } = await sb
    .from("panels")
    .select("*")
    .eq("id", panelId)
    .single();
  if (error) throw error;

  await sb
    .from("panels")
    .update({ status: "generating", updated_at: new Date().toISOString() })
    .eq("id", panelId);

  const image = await img.generatePanel({
    prompt: panel.prompt,
    size: "1024x1024",
  });

  // Store in Supabase Storage
  const bytes = Buffer.from(image.base64, "base64");
  const path = `panels/${projectId}/${panel.global_index}.png`;

  const up = await sb.storage.from("comic").upload(path, bytes, {
    contentType: image.mime,
    upsert: true,
  });
  if (up.error) throw up.error;

  const { data: pub } = sb.storage.from("comic").getPublicUrl(path);

  // Create asset row
  const { data: asset, error: aErr } = await sb
    .from("assets")
    .insert({
      project_id: projectId,
      type: "panel_image",
      url: pub.publicUrl,
      meta: { panel_id: panelId, global_index: panel.global_index },
    })
    .select("id")
    .single();
  if (aErr) throw aErr;

  await sb
    .from("panels")
    .update({
      status: "done",
      image_asset_id: asset.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", panelId);

  // Check if all panels are done → mark project ready
  const { count } = await sb
    .from("panels")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .neq("status", "done");

  if ((count ?? 0) === 0) {
    await sb
      .from("projects")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", projectId);
  }
}

// ---------------------------------------------------------------------------
// Export — Phase 1: simple JSON manifest (PDF generation can be added later)
// ---------------------------------------------------------------------------
async function processExport(job: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const projectId = job.project_id as string;

  // Gather all panel images in order
  const { data: panels, error } = await sb
    .from("panels")
    .select("*, assets:image_asset_id(url)")
    .eq("project_id", projectId)
    .order("global_index", { ascending: true });

  if (error) throw error;

  const { data: storyboard } = await sb
    .from("storyboards")
    .select("storyboard_json")
    .eq("project_id", projectId)
    .single();

  // Build export manifest
  const manifest = {
    project_id: projectId,
    storyboard: storyboard?.storyboard_json,
    panels: (panels ?? []).map((p) => ({
      global_index: p.global_index,
      page_num: p.page_num,
      panel_num: p.panel_num,
      dialogue: p.dialogue_json,
      image_url: (p.assets as { url: string } | null)?.url ?? null,
    })),
    exported_at: new Date().toISOString(),
  };

  // Store manifest as JSON in storage
  const manifestPath = `exports/${projectId}/manifest.json`;
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2));

  const up = await sb.storage.from("comic").upload(manifestPath, manifestBytes, {
    contentType: "application/json",
    upsert: true,
  });
  if (up.error) throw up.error;

  const { data: pub } = sb.storage.from("comic").getPublicUrl(manifestPath);

  await sb.from("assets").insert({
    project_id: projectId,
    type: "export_manifest",
    url: pub.publicUrl,
    meta: { format: "json" },
  });

  await sb
    .from("projects")
    .update({ status: "exported", updated_at: new Date().toISOString() })
    .eq("id", projectId);
}
