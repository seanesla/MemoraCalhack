# Security Vulnerability Fix - Migration Guide

**Date**: October 26, 2025
**Severity**: HIGH (IDOR - Insecure Direct Object Reference)
**Status**: Code changes complete, database migration pending

---

## Executive Summary

Fixed a critical authorization vulnerability where authenticated caregivers could access **ANY patient's sensitive health data** by changing the patient ID in API requests. The vulnerability affected 10 API endpoints handling medications, sleep logs, daily activities, behavioral metrics, insights, and privacy consents.

### Impact
- **Before**: Any caregiver could enumerate patient IDs and access medications, sleep logs, activities, etc.
- **After**: Caregivers can only access patients they have explicit permission for via CaregiverPatient relationships

---

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)

**Added CaregiverPatient junction table:**

```prisma
model CaregiverPatient {
  id          String    @id @default(cuid())
  caregiverId String
  patientId   String
  caregiver   Caregiver @relation(fields: [caregiverId], references: [id], onDelete: Cascade)
  patient     Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@unique([caregiverId, patientId])
  @@index([caregiverId])
  @@index([patientId])
  @@map("caregiver_patients")
}
```

**Updated models:**
- `Patient` model: Added `caregivers CaregiverPatient[]` relationship
- `Caregiver` model: Added `patients CaregiverPatient[]` relationship

### 2. Authorization Helper (`lib/auth-helpers.ts`)

Created centralized authorization function `verifyPatientAccess()` that:
- Checks if patient exists
- Handles demo mode (hardcoded demo patient bypass)
- Verifies patient ownership (user is the patient)
- Verifies caregiver has explicit CaregiverPatient relationship

### 3. API Endpoints Updated (10 files)

All patient data endpoints now use `verifyPatientAccess()`:

**GET/POST endpoints:**
- `/api/patients/[id]/medications`
- `/api/patients/[id]/daily-activities`
- `/api/patients/[id]/sleep-logs`
- `/api/patients/[id]/medications/[medId]/doses`

**GET-only endpoints:**
- `/api/patients/[id]/medications/today`
- `/api/patients/[id]/daily-activities/today`
- `/api/patients/[id]/sleep-logs/today`
- `/api/patients/[id]/behavioral-metrics`
- `/api/patients/[id]/insights`
- `/api/patients/[id]/privacy-consents`

### 4. Seed Script (`scripts/seed-demo-data.ts`)

Updated to create caregiver-patient relationships for demo accounts.

### 5. Prisma Client

Generated with new schema types including `CaregiverPatient` model.

---

## Deployment Steps

### Prerequisites
- Database must be accessible
- Backup recommended (this is a schema change)

### Step 1: Run Database Migration

**Option A: Using Prisma Migrate (Recommended)**

```bash
npx prisma migrate dev --name add_caregiver_patient_relationships
```

This will:
- Create SQL migration file
- Apply to Supabase PostgreSQL cloud database
- Update Prisma Client types

**Option B: Using Prisma DB Push (Alternative if migration issues)**

```bash
npx prisma db push
```

⚠️ This bypasses migration history but will sync the schema immediately.

### Step 2: Seed Demo Data Relationships

```bash
npx tsx scripts/seed-demo-data.ts
```

This creates the caregiver-patient relationship for demo accounts.

### Step 3: Deploy Code

**If using Vercel:**
- Push changes to git
- Vercel auto-deploys
- Ensure environment variables are set

**Environment check:**
```bash
# Verify DATABASE_URL points to Supabase
echo $DATABASE_URL
```

### Step 4: Create Caregiver-Patient Relationships

For existing production caregivers/patients, you need to manually create relationships.

**Via Supabase Dashboard:**
1. Go to https://supabase.com
2. Navigate to Table Editor → `caregiver_patients`
3. Click "Insert" → "Insert row"
4. Fill in:
   - `caregiverId`: Get from `caregivers` table
   - `patientId`: Get from `patients` table

**Via SQL:**
```sql
INSERT INTO caregiver_patients (id, "caregiverId", "patientId", "createdAt")
VALUES (
  'cm' || encode(gen_random_bytes(12), 'base64'),  -- Generate cuid
  'caregiver-id-here',
  'patient-id-here',
  NOW()
);
```

---

## Breaking Changes

⚠️ **IMPORTANT**: After migration, caregivers will have **NO ACCESS** to any patients until CaregiverPatient relationships are created.

### Affected Behavior

**Before migration:**
- Any caregiver could access any patient

**After migration:**
- Caregivers get 403 Forbidden unless they have explicit access
- Demo mode still works (hardcoded bypass)
- Patients can always access their own data

### Migration Impact

If you have existing caregivers managing patients:
1. They will lose access immediately after migration
2. You must manually create CaregiverPatient records
3. Use Supabase dashboard or run SQL inserts

---

## Testing

### Manual Testing Checklist

**As Patient:**
- [ ] Can access own medications: `GET /api/patients/[own-id]/medications`
- [ ] Can create own activities: `POST /api/patients/[own-id]/daily-activities`

**As Caregiver (with access):**
- [ ] Can access assigned patient data
- [ ] Can create data for assigned patient

**As Caregiver (without access):**
- [ ] Gets 403 when accessing unassigned patient: `GET /api/patients/[other-id]/medications`
- [ ] Error message: "Caregiver does not have access to this patient"

**Demo Mode:**
- [ ] Demo patient button works
- [ ] Demo caregiver button works
- [ ] Demo caregiver can access demo patient data

### API Test Commands

```bash
# Test unauthorized access (should fail with 403)
curl -H "Authorization: Bearer <caregiver-A-token>" \
  https://your-app.vercel.app/api/patients/<patient-B-id>/medications

# Test authorized access (should succeed with 200)
curl -H "Authorization: Bearer <caregiver-A-token>" \
  https://your-app.vercel.app/api/patients/<assigned-patient-id>/medications
```

---

## Rollback Plan

If issues arise:

### Code Rollback
```bash
git revert <commit-hash>
git push
```

### Database Rollback
```bash
# Roll back the migration
npx prisma migrate resolve --rolled-back add_caregiver_patient_relationships

# Drop the table manually if needed (Supabase SQL Editor)
DROP TABLE IF EXISTS caregiver_patients;
```

---

## Future Considerations

### 1. Admin UI for Relationship Management

Consider creating an admin interface where:
- Caregivers can be assigned to patients
- Relationships can be viewed/edited
- Audit log of access grants/revocations

### 2. Invitation System

Implement a flow where:
1. Patient invites caregiver via email
2. Caregiver accepts invitation
3. CaregiverPatient relationship auto-created

### 3. Row-Level Security

Add Supabase RLS policies as defense-in-depth:

```sql
-- Caregivers can only access assigned patients
CREATE POLICY caregiver_patient_access ON patients
  FOR SELECT
  USING (
    auth.uid() = clerkId OR
    EXISTS (
      SELECT 1 FROM caregiver_patients cp
      JOIN caregivers c ON c.id = cp."caregiverId"
      WHERE cp."patientId" = patients.id
      AND c."clerkId" = auth.uid()
    )
  );
```

---

## Files Modified

### Schema
- `prisma/schema.prisma` - Added CaregiverPatient model

### Authorization
- `lib/auth-helpers.ts` - NEW: Authorization logic

### API Endpoints (10 files)
- `app/api/patients/[id]/medications/route.ts`
- `app/api/patients/[id]/medications/today/route.ts`
- `app/api/patients/[id]/medications/[medId]/doses/route.ts`
- `app/api/patients/[id]/daily-activities/route.ts`
- `app/api/patients/[id]/daily-activities/today/route.ts`
- `app/api/patients/[id]/sleep-logs/route.ts`
- `app/api/patients/[id]/sleep-logs/today/route.ts`
- `app/api/patients/[id]/behavioral-metrics/route.ts`
- `app/api/patients/[id]/insights/route.ts`
- `app/api/patients/[id]/privacy-consents/route.ts`

### Scripts
- `scripts/seed-demo-data.ts` - Added relationship seeding

---

## Questions?

Contact: Development team

**Security Report Reference**: See security audit conducted on 2025-10-26
