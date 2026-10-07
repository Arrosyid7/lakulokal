param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[a-z][a-z0-9-]{4,28}[a-z0-9]$")]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$WorkerServiceAccount,

  [Parameter(Mandatory = $true)]
  [ValidatePattern("^https://")]
  [string]$SupabaseUrl,

  [string]$Region = "asia-southeast2",
  [string]$ArtifactRepository = "lakulokal",
  [string]$JobName = "lakulokal-video-worker",
  [string]$SupabaseSecretName = "lakulokal-supabase-service-role",
  [string]$StorageBucket = "lakulokal-results"
)

$ErrorActionPreference = "Stop"

function Invoke-Gcloud {
  param([string[]]$Arguments)
  & gcloud @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "gcloud $($Arguments[0]) gagal dengan exit code $LASTEXITCODE."
  }
}

$workerDirectory = $PSScriptRoot
$imageTag = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$image = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepository/video-worker:$imageTag"

try {
  Invoke-Gcloud @(
    "artifacts", "repositories", "describe", $ArtifactRepository,
    "--location=$Region", "--project=$ProjectId", "--format=value(name)"
  )
} catch {
  Write-Host "Membuat Artifact Registry repository '$ArtifactRepository' di $Region."
  Invoke-Gcloud @(
    "artifacts", "repositories", "create", $ArtifactRepository,
    "--repository-format=docker", "--location=$Region", "--project=$ProjectId",
    "--description=LakuLokal Cloud Run worker images", "--quiet"
  )
}

Invoke-Gcloud @(
  "builds", "submit", $workerDirectory,
  "--project=$ProjectId", "--region=$Region", "--tag=$image"
)

Invoke-Gcloud @(
  "run", "jobs", "deploy", $JobName,
  "--project=$ProjectId", "--region=$Region", "--image=$image",
  "--service-account=$WorkerServiceAccount",
  "--set-env-vars=SUPABASE_URL=$SupabaseUrl,STORAGE_BUCKET=$StorageBucket,MAX_VIDEO_DURATION=7200,MAX_CLIPS_PER_ORDER=20",
  "--set-secrets=SUPABASE_SERVICE_ROLE_KEY=${SupabaseSecretName}:latest",
  "--tasks=1", "--parallelism=1", "--max-retries=0",
  "--task-timeout=28800s", "--cpu=2", "--memory=4Gi", "--quiet"
)

Write-Host "Cloud Run Job '$JobName' berhasil di-deploy dengan image $image."
Write-Host "Pastikan service account worker dapat membaca secret '$SupabaseSecretName'."
