import { supabaseAdmin } from "@/lib/supabase/admin";
import { OpenAILLMProvider } from "@/lib/providers/openai-llm";
import { OpenAIImageProvider } from "@/lib/providers/openai-image";
import { StoryboardJSON } from "@/lib/providers/llm";
import { PDFDocument } from "pdf-lib";

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
    // Dialogue — render as speech bubbles in the image
    panel.dialogue?.length
      ? `DIALOGUE (render as comic speech bubbles in the image):\n${panel.dialogue.map((d) => `  ${d.speaker}: "${d.text}"`).join("\n")}`
      : "",
    "",
    // Technical requirements
    `High quality, coherent composition, professional comic art, consistent character designs.`,
    panel.dialogue?.length
      ? `Include comic-style speech bubbles with the dialogue text. Make text legible.`
      : "",
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

  // Fetch reference image URLs for this project
  const { data: refAssets } = await sb
    .from("assets")
    .select("url")
    .eq("project_id", projectId)
    .eq("type", "reference");

  const referenceUrls = (refAssets ?? []).map((a) => a.url);

  const image = await img.generatePanel({
    prompt: panel.prompt,
    size: "1024x1024",
    referenceUrls,
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
// Export — Generate a comic PDF with panel images laid out in a grid
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
  if (!panels?.length) throw new Error("No panels to export");

  const { data: project } = await sb
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .single();

  // Download ALL images in parallel upfront (the slow part)
  const imageBuffers = await Promise.all(
    panels.map(async (p) => {
      const url = (p.assets as { url: string } | null)?.url;
      if (!url) return null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) return null;
        return Buffer.from(await resp.arrayBuffer());
      } catch {
        return null;
      }
    })
  );

  // Group panels by page_num
  const pageGroups = new Map<number, Array<{ panel: (typeof panels)[0]; buf: Buffer | null }>>();
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    const pageNum = p.page_num ?? 1;
    if (!pageGroups.has(pageNum)) pageGroups.set(pageNum, []);
    pageGroups.get(pageNum)!.push({ panel: p, buf: imageBuffers[i] });
  }

  // Create PDF — US Letter size (612 x 792 points)
  const pdfDoc = await PDFDocument.create();
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 24;
  const GAP = 12;
  const USABLE_W = PAGE_W - MARGIN * 2;
  const USABLE_H = PAGE_H - MARGIN * 2;

  // Process each comic page
  const sortedPages = [...pageGroups.entries()].sort((a, b) => a[0] - b[0]);

  for (const [, pagePanels] of sortedPages) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const count = pagePanels.length;

    // Determine grid layout based on panel count
    let cols: number, rows: number;
    if (count <= 1) { cols = 1; rows = 1; }
    else if (count <= 2) { cols = 2; rows = 1; }
    else if (count <= 4) { cols = 2; rows = 2; }
    else if (count <= 6) { cols = 2; rows = 3; }
    else if (count <= 9) { cols = 3; rows = 3; }
    else { cols = 3; rows = Math.ceil(count / 3); }

    const cellW = (USABLE_W - GAP * (cols - 1)) / cols;
    const cellH = (USABLE_H - GAP * (rows - 1)) / rows;

    for (let i = 0; i < pagePanels.length; i++) {
      const { buf } = pagePanels[i];
      if (!buf) continue;

      // Embed image — try PNG then JPEG
      let img;
      try {
        img = await pdfDoc.embedPng(buf);
      } catch {
        try {
          img = await pdfDoc.embedJpg(buf);
        } catch {
          continue;
        }
      }

      const col = i % cols;
      const row = Math.floor(i / cols);

      // PDF coordinates: origin is bottom-left
      const x = MARGIN + col * (cellW + GAP);
      const y = PAGE_H - MARGIN - (row + 1) * cellH - row * GAP;

      // Scale image to fit cell while preserving aspect ratio
      const imgAspect = img.width / img.height;
      const cellAspect = cellW / cellH;
      let drawW = cellW;
      let drawH = cellH;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > cellAspect) {
        drawH = cellW / imgAspect;
        offsetY = (cellH - drawH) / 2;
      } else {
        drawW = cellH * imgAspect;
        offsetX = (cellW - drawW) / 2;
      }

      page.drawImage(img, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawW,
        height: drawH,
      });
    }
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const pdfPath = `exports/${projectId}/comic.pdf`;

  const up = await sb.storage.from("comic").upload(pdfPath, Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) throw up.error;

  const { data: pub } = sb.storage.from("comic").getPublicUrl(pdfPath);

  await sb.from("assets").insert({
    project_id: projectId,
    type: "export_pdf",
    url: pub.publicUrl,
    meta: { format: "pdf", title: project?.title ?? "Comic", panel_count: panels.length },
  });

  await sb
    .from("projects")
    .update({ status: "exported", updated_at: new Date().toISOString() })
    .eq("id", projectId);
}
