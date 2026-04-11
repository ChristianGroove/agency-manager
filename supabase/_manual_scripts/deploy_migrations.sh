#!/bin/bash
# ============================================================================
# PIXY PRODUCTION DEPLOYMENT SCRIPT - Phase 4.1 Incremental Migrations
# ============================================================================
# This script applies the 5 incremental migrations to production.
# The baseline is NOT applied (production already has all ~200 original migrations).
#
# PREREQUISITES:
#   1. Fresh backup created (pg_dump)
#   2. This script tested locally first
#   3. Supabase CLI linked: npx supabase link --project-ref amwlwmkejdjskukdfwut
#
# USAGE:
#   Set PGPASSWORD env var, then run:
#   ./deploy_migrations.sh
# ============================================================================

set -e  # Exit on error

# === CONFIGURATION ===
DB_HOST="db.amwlwmkejdjskukdfwut.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"
MIGRATION_DIR="supabase/migrations"

# === COLORS ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "============================================"
echo " PIXY Production Migration Deployment"
echo " $(date)"
echo "============================================"
echo ""

# === SAFETY CHECK ===
if [ -z "$PGPASSWORD" ]; then
    echo -e "${RED}ERROR: PGPASSWORD not set. Export it first.${NC}"
    echo "  export PGPASSWORD='your-db-password'"
    exit 1
fi

echo -e "${YELLOW}Testing connection...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Cannot connect to production database.${NC}"
    exit 1
fi
echo -e "${GREEN}Connection OK.${NC}"
echo ""

# === MIGRATIONS (in order) ===
MIGRATIONS=(
    "20260410000000_rls_hardening.sql"
    "20260410000001_performance_tuning.sql"
    "20260410000002_optimize_rpcs.sql"
    "20260410000003_billing_optimization.sql"
    "20260410000004_v_clients_hardening.sql"
)

echo "Migrations to apply:"
for m in "${MIGRATIONS[@]}"; do
    echo "  → $m"
done
echo ""

read -p "Proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""

# === APPLY EACH MIGRATION ===
for m in "${MIGRATIONS[@]}"; do
    echo -e "${YELLOW}Applying: $m${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -v ON_ERROR_STOP=1 \
         -f "$MIGRATION_DIR/$m"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ $m applied successfully.${NC}"
    else
        echo -e "${RED}  ❌ $m FAILED. Stopping deployment.${NC}"
        echo -e "${RED}  The migration uses BEGIN/COMMIT, so partial changes were rolled back.${NC}"
        echo -e "${YELLOW}  Review the error above and fix before retrying.${NC}"
        exit 1
    fi
    echo ""
done

# === VERIFICATION ===
echo "============================================"
echo " Running Verification Checks..."
echo "============================================"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 'pg_trgm' as check_name, CASE WHEN count(*)>0 THEN 'PASS' ELSE 'FAIL' END as result 
  FROM pg_extension WHERE extname='pg_trgm'
UNION ALL
SELECT 'gin_trigram_index', CASE WHEN count(*)>0 THEN 'PASS' ELSE 'FAIL' END 
  FROM pg_indexes WHERE indexname='idx_leads_search_trgm'
UNION ALL
SELECT 'rls_hardened', CASE WHEN count(*)>0 THEN 'PASS' ELSE 'FAIL' END 
  FROM pg_policy WHERE polname='Isolated payment access'
UNION ALL
SELECT 'v_clients_invoker', CASE WHEN array_to_string(reloptions,',') LIKE '%security_invoker=on%' THEN 'PASS' ELSE 'FAIL' END 
  FROM pg_class WHERE relname='v_clients';
"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Push code: git push origin master"
echo "  2. Wait for Vercel deployment"
echo "  3. Smoke test production"
echo "  4. Mark migrations: npx supabase migration repair --status applied 20260410000000 20260410000001 20260410000002 20260410000003 20260410000004"
