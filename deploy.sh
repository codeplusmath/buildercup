#!/bin/bash
set -e

echo "=========================================================="
echo "☕ Deploying The Café Companion to Google Cloud Run"
echo "   Google Builder Pop-Up Hackathon"
echo "=========================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "⚠️ 'gcloud' CLI is not found in PATH."
  echo "You can test the application locally by opening http://localhost:8080"
  echo "Or install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "project-8fe4355e-02a7-492c-be0")
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  PROJECT_ID="project-8fe4355e-02a7-492c-be0"
fi
gcloud config set project "$PROJECT_ID" 2>/dev/null || true

echo "📦 Project ID: $PROJECT_ID"
echo "🚀 Building container and deploying to Cloud Run (region: us-central1)..."

gcloud run deploy cafe-companion \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="PORT=8080"

echo "✅ Deployment complete! Check the service URL above to open your live web app."
