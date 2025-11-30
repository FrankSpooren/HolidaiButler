/**
 * Permissions Routes
 * ==================
 * Admin endpoints for managing permissions and roles
 *
 * Base path: /api/v1/permissions
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const permissionsController = require('../controllers/permissions.controller');
const { verifyToken, requirePermission, requireRole } = require('../middleware/auth');

// ==============================================
// Permission Listing
// ==============================================
/**
 * GET /permissions
 * List all available permissions
 * Access: Admin, Moderator
 */
router.get(
  '/',
  verifyToken,
  requireRole(['admin', 'moderator']),
  permissionsController.listPermissions
);

// ==============================================
// Role Management
// ==============================================
/**
 * GET /permissions/roles
 * List all roles with their permissions
 * Access: Admin, Moderator
 */
router.get(
  '/roles',
  verifyToken,
  requireRole(['admin', 'moderator']),
  permissionsController.listRoles
);

/**
 * GET /permissions/roles/:roleId
 * Get specific role with permissions
 * Access: Admin, Moderator
 */
router.get(
  '/roles/:roleId',
  verifyToken,
  requireRole(['admin', 'moderator']),
  permissionsController.getRole
);

/**
 * POST /permissions/roles/:roleId/permissions
 * Grant permission to role
 * Access: Admin only
 */
router.post(
  '/roles/:roleId/permissions',
  verifyToken,
  requirePermission('user.manage_permissions'),
  permissionsController.grantRolePermission
);

/**
 * DELETE /permissions/roles/:roleId/permissions/:permissionId
 * Remove permission from role
 * Access: Admin only
 */
router.delete(
  '/roles/:roleId/permissions/:permissionId',
  verifyToken,
  requirePermission('user.manage_permissions'),
  permissionsController.revokeRolePermission
);

// ==============================================
// User Permission Management
// ==============================================
/**
 * GET /permissions/users/:userId
 * Get user's complete permission set
 * Access: Admin, Moderator, or the user themselves
 */
router.get(
  '/users/:userId',
  verifyToken,
  requirePermission(['user.read', 'user.manage_permissions'], 'ANY'),
  permissionsController.getUserPermissions
);

/**
 * POST /permissions/users/:userId/permissions
 * Grant specific permission to user
 * Access: Admin only
 */
router.post(
  '/users/:userId/permissions',
  verifyToken,
  requirePermission('user.manage_permissions'),
  permissionsController.grantUserPermission
);

/**
 * DELETE /permissions/users/:userId/permissions/:permissionId
 * Remove user-specific permission override
 * Access: Admin only
 */
router.delete(
  '/users/:userId/permissions/:permissionId',
  verifyToken,
  requirePermission('user.manage_permissions'),
  permissionsController.revokeUserPermission
);

/**
 * PATCH /permissions/users/:userId/role
 * Change user's role
 * Access: Admin only
 */
router.patch(
  '/users/:userId/role',
  verifyToken,
  requirePermission('user.manage_roles'),
  permissionsController.changeUserRole
);

module.exports = router;
