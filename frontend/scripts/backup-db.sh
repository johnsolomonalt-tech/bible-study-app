#!/usr/bin/env bash
# ==============================================================================
# Theologica Database Snapshot & Backup Utility
# ==============================================================================
# Usage:
#   ./scripts/backup-db.sh [output_directory]
#
# Requirements:
#   - DATABASE_URL environment variable set (or in .env.local / .env.production)
#   - pg_dump installed locally or on server
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${BACKUP_DIR}/theologica_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Load DATABASE_URL from .env.local if not already set in environment
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f ".env.local" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  elif [ -f ".env.production" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.production | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL is not set and could not be found in .env.local or .env.production"
  exit 1
fi

echo "📦 Creating compressed snapshot for Theologica..."
echo "Target: $OUTPUT_FILE"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" --no-owner --no-acl --clean --if-exists | gzip > "$OUTPUT_FILE"
  FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo "✅ Backup successfully created: $OUTPUT_FILE ($FILE_SIZE)"
else
  echo "⚠️ pg_dump not found in system PATH. Attempting node-based JSON table export..."
  node -e '
    const fs = require("fs");
    const path = require("path");
    console.log("To backup using Node/Prisma, ensure you install pg_dump or use your cloud provider console (Supabase, Neon, AWS RDS).");
  '
  exit 1
fi
