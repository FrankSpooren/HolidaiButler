/**
 * Permissions Controller
 * ======================
 * Manages permissions, roles, and permission assignments
 * Enterprise-grade RBAC administration
 *
 * Features:
 * - List all permissions
 * - List all roles with their permissions
 * - Grant/revoke permissions to roles
 * - Grant/revoke permissions to specific users
 * - Get user's complete permission set
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');
const { getUserPermissions } = require('../middleware/auth');

/**
 * GET /permissions
 * List all available permissions in the system
 *
 * Query params:
 * - resource: Filter by resource type (optional)
 * - action: Filter by action type (optional)
 */
exports.listPermissions = async (req, res, next) => {
  try {
    const { resource, action } = req.query;

    let sql = `
      SELECT
        id,
        name,
        description,
        resource,
        action,
        created_at
      FROM Permissions
      WHERE 1=1
    `;
    const params = [];

    if (resource) {
      sql += ' AND resource = ?';
      params.push(resource);
    }

    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }

    sql += ' ORDER BY resource, action';

    const permissions = await query(sql, params);

    res.json({
      success: true,
      data: permissions,
      meta: {
        total: permissions.length,
        filtered: !!resource || !!action
      }
    });
  } catch (error) {
    logger.error('List permissions error:', error);
    next(error);
  }
};

/**
 * GET /permissions/roles
 * List all roles with their assigned permissions
 */
exports.listRoles = async (req, res, next) => {
  try {
    // Get all roles
    const rolesSql = `
      SELECT
        id,
        name,
        description,
        level,
        created_at
      FROM Roles
      ORDER BY level DESC
    `;

    const roles = await query(rolesSql);

    // For each role, get its permissions
    for (const role of roles) {
      const permissionsSql = `
        SELECT
          p.id,
          p.name,
          p.description,
          p.resource,
          p.action,
          rp.granted
        FROM Role_Permissions rp
        JOIN Permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
        ORDER BY p.resource, p.action
      `;

      role.permissions = await query(permissionsSql, [role.id]);
    }

    res.json({
      success: true,
      data: roles,
      meta: {
        total_roles: roles.length
      }
    });
  } catch (error) {
    logger.error('List roles error:', error);
    next(error);
  }
};

/**
 * GET /permissions/roles/:roleId
 * Get specific role with its permissions
 */
exports.getRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    // Get role
    const roleSql = `
      SELECT
        id,
        name,
        description,
        level,
        created_at,
        updated_at
      FROM Roles
      WHERE id = ?
    `;

    const [role] = await query(roleSql, [roleId]);

    if (!role) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'Role not found'
        }
      });
    }

    // Get role permissions
    const permissionsSql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.resource,
        p.action,
        rp.granted
      FROM Role_Permissions rp
      JOIN Permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
      ORDER BY p.resource, p.action
    `;

    role.permissions = await query(permissionsSql, [roleId]);

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    logger.error('Get role error:', error);
    next(error);
  }
};

/**
 * POST /permissions/roles/:roleId/permissions
 * Grant permission to a role
 *
 * Body:
 * - permission_id: ID of permission to grant
 * - granted: true (grant) or false (deny) - default: true
 */
exports.grantRolePermission = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { permission_id, granted = true } = req.body;

    // Validation
    if (!permission_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'permission_id is required'
        }
      });
    }

    // Verify role exists
    const [role] = await query('SELECT id FROM Roles WHERE id = ?', [roleId]);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'Role not found'
        }
      });
    }

    // Verify permission exists
    const [permission] = await query('SELECT id FROM Permissions WHERE id = ?', [permission_id]);
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PERMISSION_NOT_FOUND',
          message: 'Permission not found'
        }
      });
    }

    // Grant permission (INSERT ... ON DUPLICATE KEY UPDATE)
    const sql = `
      INSERT INTO Role_Permissions (role_id, permission_id, granted, created_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE granted = VALUES(granted), created_by = VALUES(created_by)
    `;

    await query(sql, [roleId, permission_id, granted, req.user.id]);

    logger.info(`Permission ${permission_id} ${granted ? 'granted to' : 'revoked from'} role ${roleId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: granted ? 'Permission granted to role' : 'Permission revoked from role',
      data: {
        role_id: parseInt(roleId),
        permission_id: parseInt(permission_id),
        granted
      }
    });
  } catch (error) {
    logger.error('Grant role permission error:', error);
    next(error);
  }
};

/**
 * DELETE /permissions/roles/:roleId/permissions/:permissionId
 * Remove permission assignment from role
 */
exports.revokeRolePermission = async (req, res, next) => {
  try {
    const { roleId, permissionId } = req.params;

    const sql = `
      DELETE FROM Role_Permissions
      WHERE role_id = ? AND permission_id = ?
    `;

    const result = await query(sql, [roleId, permissionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_NOT_FOUND',
          message: 'Permission assignment not found'
        }
      });
    }

    logger.info(`Permission ${permissionId} removed from role ${roleId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Permission removed from role'
    });
  } catch (error) {
    logger.error('Revoke role permission error:', error);
    next(error);
  }
};

/**
 * GET /permissions/users/:userId
 * Get user's complete permission set
 * Combines role-based and user-specific permissions
 */
exports.getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const [user] = await query('SELECT id, email FROM Users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Get user's permissions using the middleware function
    const permissions = await getUserPermissions(userId);

    // Group permissions by resource for better readability
    const permissionsByResource = permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push({
        id: perm.id,
        name: perm.name,
        description: perm.description,
        action: perm.action,
        source: perm.source
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        permissions: permissions,
        permissions_by_resource: permissionsByResource,
        total_permissions: permissions.length
      }
    });
  } catch (error) {
    logger.error('Get user permissions error:', error);
    next(error);
  }
};

/**
 * POST /permissions/users/:userId/permissions
 * Grant specific permission to user (override)
 *
 * Body:
 * - permission_id: ID of permission to grant
 * - granted: true (grant) or false (deny) - default: true
 * - expires_at: Optional expiration timestamp for temporary permissions
 */
exports.grantUserPermission = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { permission_id, granted = true, expires_at = null } = req.body;

    // Validation
    if (!permission_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'permission_id is required'
        }
      });
    }

    // Verify user exists
    const [user] = await query('SELECT id FROM Users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Verify permission exists
    const [permission] = await query('SELECT id, name FROM Permissions WHERE id = ?', [permission_id]);
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PERMISSION_NOT_FOUND',
          message: 'Permission not found'
        }
      });
    }

    // Grant user-specific permission
    const sql = `
      INSERT INTO User_Permissions (user_id, permission_id, granted, granted_by, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        granted = VALUES(granted),
        granted_by = VALUES(granted_by),
        expires_at = VALUES(expires_at),
        created_at = NOW()
    `;

    await query(sql, [userId, permission_id, granted, req.user.id, expires_at]);

    logger.info(`Permission ${permission.name} ${granted ? 'granted to' : 'revoked from'} user ${userId} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: granted ? 'Permission granted to user' : 'Permission revoked from user',
      data: {
        user_id: parseInt(userId),
        permission_id: parseInt(permission_id),
        permission_name: permission.name,
        granted,
        expires_at
      }
    });
  } catch (error) {
    logger.error('Grant user permission error:', error);
    next(error);
  }
};

/**
 * DELETE /permissions/users/:userId/permissions/:permissionId
 * Remove user-specific permission override
 */
exports.revokeUserPermission = async (req, res, next) => {
  try {
    const { userId, permissionId } = req.params;

    const sql = `
      DELETE FROM User_Permissions
      WHERE user_id = ? AND permission_id = ?
    `;

    const result = await query(sql, [userId, permissionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PERMISSION_OVERRIDE_NOT_FOUND',
          message: 'User permission override not found'
        }
      });
    }

    logger.info(`User permission override removed: user ${userId}, permission ${permissionId} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'User permission override removed'
    });
  } catch (error) {
    logger.error('Revoke user permission error:', error);
    next(error);
  }
};

/**
 * PATCH /permissions/users/:userId/role
 * Change user's role
 *
 * Body:
 * - role_name: Name of the new role (admin, moderator, partner, user)
 */
exports.changeUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role_name } = req.body;

    // Validation
    if (!role_name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'role_name is required'
        }
      });
    }

    // Verify user exists
    const [user] = await query('SELECT id, email FROM Users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Verify role exists
    const [role] = await query('SELECT id, name FROM Roles WHERE name = ?', [role_name]);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'Role not found'
        }
      });
    }

    // Update user's role
    await query('UPDATE Users SET role_id = ?, role = ? WHERE id = ?', [role.id, role.name, userId]);

    logger.info(`User ${userId} (${user.email}) role changed to ${role.name} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user_id: parseInt(userId),
        email: user.email,
        new_role: role.name
      }
    });
  } catch (error) {
    logger.error('Change user role error:', error);
    next(error);
  }
};

module.exports = {
  listPermissions: exports.listPermissions,
  listRoles: exports.listRoles,
  getRole: exports.getRole,
  grantRolePermission: exports.grantRolePermission,
  revokeRolePermission: exports.revokeRolePermission,
  getUserPermissions: exports.getUserPermissions,
  grantUserPermission: exports.grantUserPermission,
  revokeUserPermission: exports.revokeUserPermission,
  changeUserRole: exports.changeUserRole
};
