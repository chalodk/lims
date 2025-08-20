# LIMS Migration Guide

This guide explains how to deploy and run the database migrations for the enhanced LIMS system with normalized tables, SLA handling, sub-samples support, interpretation rules, and report templates.

## Overview

The migration transforms the LIMS system from ARRAY-based requested tests to a fully normalized structure with the following key features:

- **Normalized Test Management**: Replace `requested_tests[]` with proper `sample_tests` and `sample_units` tables
- **SLA Handling**: Add normal/express SLA types with automatic due date calculation
- **Sub-samples Support**: Support for multiple units per sample (e.g., Plant 1..n) with individual results
- **Interpretation Engine**: Automated rule-based interpretation of results with standardized messages
- **Report Templates**: Versioned template system with rendered PDF storage
- **Invitations & Notifications**: Client portal access management with basic notifications

## Prerequisites

- Node.js 20.x
- Supabase project with admin access
- Environment variables configured:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
  CRON_SECRET=your-cron-secret-for-sla-updates
  ```

## Migration Process

### 1. Apply Database Migrations

Run the migrations in **exact order**:

```bash
# Connect to your Supabase database
psql $DATABASE_URL

# Run migrations in sequence
\i migrations/001_catalog.sql
\i migrations/002_samples_rework.sql  
\i migrations/003_results_normalize.sql
\i migrations/004_reports_versioning.sql
\i migrations/005_portal_and_notifications.sql
\i migrations/006_projects.sql
\i migrations/007_views_metrics.sql
\i migrations/008_rls_policies.sql
```

**Alternative**: Run via Supabase Dashboard SQL Editor (copy-paste each file content).

### 2. Verify Database Schema

Check that all new tables were created:

```sql
-- Check catalog tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('test_catalog', 'methods', 'species', 'varieties', 'tissues');

-- Check new sample structure
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('sample_tests', 'sample_units', 'unit_results');

-- Check interpretation system
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('interpretation_rules', 'applied_interpretations');

-- Check reports and notifications
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('report_templates', 'report_assets', 'invitations', 'notifications');
```

### 3. Data Migration and Backfill

Run the data migration script to convert legacy data:

```bash
# Install dependencies
npm install tsx

# Run migration script
npx tsx src/scripts/migrate-legacy-data.ts
```

The migration script will:

1. **Map legacy priority → sla_type**: Convert `priority: 'express'` to `sla_type: 'express'`
2. **Set received_at**: Use `received_date` or fallback to `created_at`  
3. **Calculate due_date**: Apply SLA business rules (4 days express, 9 days normal, excluding weekends)
4. **Migrate requested_tests**: Convert array to normalized `sample_tests` records
5. **Create default units**: Add default sample unit for samples without sub-samples
6. **Update SLA status**: Calculate current SLA status for all samples

### 4. Seed Interpretation Rules

Populate the system with example interpretation rules:

```bash
npx tsx src/scripts/seed-interpretation-rules.ts
```

This creates rules for:
- **Nematology**: Meloidogyne, Heterodera, Pratylenchus thresholds
- **Virology**: PNRSV, ApMV, ACLSV detection rules  
- **Phytopathology**: Fusarium, Botrytis, Pythium severity levels
- **Early Detection**: Pre-symptomatic pathogen detection
- **Crop-specific**: Tailored rules for tomato, potato, etc.

### 5. Update TypeScript Types

The updated database types are in `src/types/database.ts`. If you're using code generation:

```bash
# Generate new types (if using supabase gen)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

## Verification Steps

### 1. Check Data Migration

```bash
# Run verification
npx tsx -e "
import { verifyMigration } from './src/scripts/migrate-legacy-data.ts';
verifyMigration();
"
```

Expected output:
```
📊 Migration verification results:
   Samples missing sla_type: 0
   Samples missing received_at: 0  
   Samples missing due_date: 0
   Total sample_tests: XX
   Total sample_units: XX
✅ All checks passed!
```

### 2. Test API Endpoints

```bash
# Test new sample creation with normalized structure
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/samples" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "uuid-here",
    "code": "TEST-001", 
    "received_date": "2024-01-15",
    "sla_type": "express",
    "species": "Tomate",
    "region": "Valparaíso"
  }'

# Test sample tests assignment
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/samples/SAMPLE_ID/tests" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": 1,
    "method_id": 2
  }'
```

### 3. Test SLA Calculation

```bash
# Test SLA status update
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/api/sla/update" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json"
```

### 4. Test Interpretation Engine

```bash  
# Test rule evaluation
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/api/interpretations/evaluate" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"sample_id": "uuid-here"}'
```

## Automated Tasks Setup

### Daily SLA Updates

Set up a cron job or scheduled function to update SLA statuses daily:

**Option 1: Cron Job**
```bash
# Add to crontab (runs daily at 6 AM)
0 6 * * * curl -X POST "https://yourdomain.com/api/cron/sla-update" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Option 2: Supabase Edge Function** 
```sql
-- Create a pg_cron job (if available)
SELECT cron.schedule(
  'sla-daily-update',
  '0 6 * * *', 
  'SELECT net.http_post(
    url := ''https://yourdomain.com/api/cron/sla-update'',
    headers := jsonb_build_object(''Authorization'', ''Bearer ' || current_setting('app.cron_secret') || ''')
  );'
);
```

## Rollback Plan

If issues arise, you can rollback by:

### 1. Drop New Tables

**⚠️ WARNING: This will delete all migrated data**

```sql
-- Drop interpretation system
DROP TABLE IF EXISTS applied_interpretations CASCADE;
DROP TABLE IF EXISTS interpretation_rules CASCADE;

-- Drop sample structure 
DROP TABLE IF EXISTS unit_results CASCADE;
DROP TABLE IF EXISTS sample_units CASCADE; 
DROP TABLE IF EXISTS sample_tests CASCADE;

-- Drop reports system
DROP TABLE IF EXISTS report_assets CASCADE;
DROP TABLE IF EXISTS report_templates CASCADE;

-- Drop invitations/notifications
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;

-- Drop catalog tables
DROP TABLE IF EXISTS test_method_map CASCADE;
DROP TABLE IF EXISTS methods CASCADE;
DROP TABLE IF EXISTS test_catalog CASCADE;
DROP TABLE IF EXISTS varieties CASCADE;
DROP TABLE IF EXISTS species CASCADE;
DROP TABLE IF EXISTS tissues CASCADE;
DROP TABLE IF EXISTS units_profile_fields CASCADE;
DROP TABLE IF EXISTS units_profiles CASCADE;
DROP TABLE IF EXISTS analytes CASCADE;

-- Drop projects and policies
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS sla_policies CASCADE;

-- Drop audit and transitions
DROP TABLE IF EXISTS sample_status_transitions CASCADE;
DROP TABLE IF EXISTS sample_files CASCADE;
DROP TABLE IF EXISTS sample_audit_logs CASCADE;
DROP TABLE IF EXISTS action_logs CASCADE;

-- Drop views
DROP MATERIALIZED VIEW IF EXISTS mv_sample_cycle_times;
DROP MATERIALIZED VIEW IF EXISTS mv_lab_load_by_day;
```

### 2. Remove New Columns from Samples

```sql
ALTER TABLE samples 
  DROP COLUMN IF EXISTS received_at,
  DROP COLUMN IF EXISTS sla_type, 
  DROP COLUMN IF EXISTS due_date,
  DROP COLUMN IF EXISTS sla_status,
  DROP COLUMN IF EXISTS region,
  DROP COLUMN IF EXISTS locality,
  DROP COLUMN IF EXISTS sampling_observations,
  DROP COLUMN IF EXISTS reception_observations,
  DROP COLUMN IF EXISTS project_id;
```

### 3. Restore Reports Table

```sql
ALTER TABLE reports
  DROP COLUMN IF EXISTS template_id,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS rendered_pdf_url,
  DROP COLUMN IF EXISTS checksum, 
  DROP COLUMN IF EXISTS supersedes_report_id,
  DROP COLUMN IF EXISTS visibility;
```

## Compatibility

The migration maintains **backward compatibility** for:

- ✅ Existing `samples` table structure (adds columns, doesn't remove)
- ✅ Existing `results` table (normalized results are additive)
- ✅ Existing `reports` table (adds versioning columns)
- ✅ Current API endpoints (enhanced with new functionality)

Breaking changes requiring frontend updates:
- ⚠️ Sample creation now expects `sla_type` instead of `priority`
- ⚠️ Test assignment moved from arrays to separate endpoints
- ⚠️ Results entry now per-unit instead of per-sample

## Monitoring

### Key Metrics to Monitor

1. **SLA Performance**:
   ```sql
   SELECT sla_status, COUNT(*) FROM samples 
   WHERE status != 'completed' GROUP BY sla_status;
   ```

2. **Interpretation Coverage**:
   ```sql  
   SELECT area, COUNT(*) FROM interpretation_rules 
   WHERE active = true GROUP BY area;
   ```

3. **System Usage**:
   ```sql
   SELECT COUNT(*) as total_samples,
          COUNT(DISTINCT client_id) as active_clients,
          AVG(EXTRACT(DAY FROM (completed_at - received_at))) as avg_turnaround
   FROM samples WHERE status = 'completed';
   ```

## Support

For issues during migration:

1. **Check logs**: Monitor application and database logs
2. **Run verification**: Use the verification scripts 
3. **Rollback if needed**: Follow rollback procedures above
4. **Contact support**: Include migration logs and error details

## Next Steps

After successful migration:

1. **Train users** on new sample creation flow
2. **Configure report templates** for your organization  
3. **Set up cron jobs** for automated SLA updates
4. **Customize interpretation rules** for your specific needs
5. **Test client portal** invitation flows
6. **Monitor system performance** and tune as needed

The system is now ready for production use with the enhanced normalized structure! 🎉