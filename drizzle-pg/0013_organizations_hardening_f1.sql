-- ORGANIZATIONS HARDENING F1
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM organization_members
    GROUP BY organization_id, user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ORGANIZATIONS_F1_DUPLICATE_MEMBERSHIPS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM verification_records
    WHERE status = 'pending'
    GROUP BY entity_type, entity_id, type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ORGANIZATIONS_F1_DUPLICATE_PENDING_VERIFICATIONS';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS org_member_org_user_unique
  ON organization_members (organization_id, user_id);

CREATE INDEX IF NOT EXISTS org_member_user_active_idx
  ON organization_members (user_id, status, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS verif_one_pending_subject_type
  ON verification_records (entity_type, entity_id, type)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS verif_subject_type_status_idx
  ON verification_records (entity_type, entity_id, type, status);

CREATE INDEX IF NOT EXISTS organizations_directory_idx
  ON organizations (type, status, country_code, city_id);
