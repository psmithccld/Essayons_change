-- Insert default roles into production database
-- Run this in pgAdmin to fix user creation

INSERT INTO roles (name, description, permissions, is_active) VALUES
(
  'Admin',
  'Administrator with full system access',
  '{"canManageProjects": true, "canManageTasks": true, "canManageUsers": true, "canManageStakeholders": true, "canManageComms": true, "canManageRAID": true, "canManageSurveys": true, "canViewReports": true, "canManageArtifacts": true, "canUseGPT": true, "canManageSettings": true}'::jsonb,
  true
),
(
  'Manager',
  'Project manager with team oversight',
  '{"canManageProjects": true, "canManageTasks": true, "canManageUsers": false, "canManageStakeholders": true, "canManageComms": true, "canManageRAID": true, "canManageSurveys": true, "canViewReports": true, "canManageArtifacts": true, "canUseGPT": true, "canManageSettings": false}'::jsonb,
  true
),
(
  'User',
  'Standard user with basic access',
  '{"canManageProjects": false, "canManageTasks": true, "canManageUsers": false, "canManageStakeholders": false, "canManageComms": false, "canManageRAID": false, "canManageSurveys": false, "canViewReports": true, "canManageArtifacts": false, "canUseGPT": true, "canManageSettings": false}'::jsonb,
  true
)
ON CONFLICT (name) DO NOTHING;
