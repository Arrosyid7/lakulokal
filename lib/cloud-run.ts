import "server-only";
import { GoogleAuth } from "google-auth-library";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function startCloudRunJob(orderId: string) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const region = process.env.GOOGLE_CLOUD_REGION;
  const jobName = process.env.CLOUD_RUN_JOB_NAME;
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!projectId || !region || !jobName || !rawCredentials) {
    throw new Error("Konfigurasi Cloud Run belum lengkap.");
  }

  const auth = new GoogleAuth({
    credentials: JSON.parse(rawCredentials) as { client_email: string; private_key: string; project_id?: string },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });
  const client = await auth.getClient();
  const response = await client.request<{ name?: string }>({
    url: `https://run.googleapis.com/v2/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(region)}/jobs/${encodeURIComponent(jobName)}:run`,
    method: "POST",
    data: {
      overrides: {
        containerOverrides: [{
          env: [{ name: "ORDER_ID", value: orderId }]
        }]
      }
    },
    timeout: 15_000
  });
  if (!response.data.name) throw new Error("Cloud Run tidak mengembalikan nama execution.");
  return response.data.name;
}

export async function dispatchPendingJobs(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const maxConcurrent = Number.parseInt(process.env.MAX_CONCURRENT_JOBS || "2", 10);
  if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 20) {
    throw new Error("MAX_CONCURRENT_JOBS harus berada antara 1 dan 20.");
  }

  const dispatched: string[] = [];
  for (let attempt = 0; attempt < maxConcurrent; attempt += 1) {
    const { data: claim, error: claimError } = await admin
      .rpc("claim_next_processing_job", { p_max_concurrent: maxConcurrent })
      .maybeSingle();
    if (claimError) throw new Error("Antrean Cloud Run gagal diklaim.");
    if (!claim) break;

    try {
      const execution = await startCloudRunJob(claim.claimed_order_id);
      const { error: updateError } = await admin.from("processing_jobs")
        .update({ cloud_run_execution: execution, error_message: null })
        .eq("id", claim.claimed_job_id)
        .eq("cloud_run_execution", "DISPATCHING");
      if (updateError) throw new Error("Execution Cloud Run gagal dicatat.");
      dispatched.push(execution);
    } catch (error) {
      await admin.from("processing_jobs")
        .update({ cloud_run_execution: null, error_message: "Cloud Run gagal dimulai." })
        .eq("id", claim.claimed_job_id)
        .eq("cloud_run_execution", "DISPATCHING");
      throw error;
    }
  }
  return dispatched;
}
