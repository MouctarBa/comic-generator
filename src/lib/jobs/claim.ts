import { supabaseAdmin } from "@/lib/supabase/admin";

export async function claimNextJob() {
  const sb = supabaseAdmin();

  // Fetch next queued job (oldest first)
  const { data: jobs, error } = await sb
    .from("jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  const job = jobs?.[0];
  if (!job) return null;

  // Attempt to claim it (optimistic lock via status check)
  const { data: updated, error: updErr } = await sb
    .from("jobs")
    .update({
      status: "running",
      attempts: (job.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (updErr) throw updErr;
  if (!updated) return null;

  return updated;
}
