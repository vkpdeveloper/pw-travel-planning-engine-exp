#!/usr/bin/env bash
set -euo pipefail

# Load env vars from .env
if [ ! -f "$(dirname "$0")/.env" ]; then
  echo "Error: .env file not found" >&2
  exit 1
fi
set -a; source "$(dirname "$0")/.env"; set +a

PROJECT=medzimi
REGION=asia-south1
SERVICE=pw-travel-planning-engine-exp
IMAGE="$REGION-docker.pkg.dev/$PROJECT/cloud-run-source-deploy/warm-up:latest"

echo "==> Building image via Cloud Build..."
gcloud builds submit \
  --project="$PROJECT" \
  --region="$REGION" \
  --config="$(dirname "$0")/cloudbuild.yaml" \
  --substitutions \
    "_GOOGLE_GENERATIVE_API_KEY=${GOOGLE_GENERATIVE_API_KEY},_GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY},_FLIGHTS_API_KEY=${FLIGHTS_API_KEY}" \
  "$(dirname "$0")"

echo "==> Deploying to Cloud Run..."
gcloud run deploy "$SERVICE" \
  --project="$PROJECT" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --port 3000 \
  --set-env-vars "GOOGLE_GENERATIVE_API_KEY=${GOOGLE_GENERATIVE_API_KEY},GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY},FLIGHTS_API_KEY=${FLIGHTS_API_KEY},NODE_ENV=production" \
  --allow-unauthenticated

echo "==> Done."
gcloud run services describe "$SERVICE" \
  --project="$PROJECT" \
  --region "$REGION" \
  --format="value(status.url)"
