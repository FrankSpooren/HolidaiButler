-- =====================================================
-- Hotfix for User Roles Migration
-- =====================================================
-- Purpose: Fix the role migration issue
-- Date: 2025-11-03
-- Issue: Original migration assumed 'role' VARCHAR column exists
-- =====================================================

USE pxoziy_db1;

-- =====================================================
-- Option 1: If 'role' column exists as VARCHAR
-- =====================================================
-- Uncomment this section if Users table has 'role' VARCHAR column:
/*
UPDATE Users u
JOIN Roles r ON LOWER(u.role) = LOWER(r.name)
SET u.role_id = r.id
WHERE u.role_id IS NULL AND u.role IS NOT NULL;
*/

-- =====================================================
-- Option 2: Set default role for all users without role_id
-- =====================================================
-- This sets all users without a role_id to 'user' role (safest default)
UPDATE Users
SET role_id = (SELECT id FROM Roles WHERE name = 'user')
WHERE role_id IS NULL;

-- =====================================================
-- Verification: Check if all users have a role_id
-- =====================================================
SELECT
  'User roles migration complete' AS status,
  COUNT(*) as total_users,
  COUNT(role_id) as users_with_role,
  COUNT(*) - COUNT(role_id) as users_without_role
FROM Users;

-- =====================================================
-- Show role distribution
-- =====================================================
SELECT
  r.name as role_name,
  r.level,
  COUNT(u.id) as user_count
FROM Roles r
LEFT JOIN Users u ON u.role_id = r.id
GROUP BY r.id, r.name, r.level
ORDER BY r.level DESC;

-- =====================================================
