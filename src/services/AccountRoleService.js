/**
 * AccountRoleService - Manages account roles and user permissions
 */
import AccService from './AccService';

class AccountRoleService {
  constructor() {
    this.accService = AccService;
  }

  /**
   * Initialize the service with credentials
   */
  initialize(credentials) {
    AccService.initialize(credentials);
  }

  /**
   * Get account users with roles
   */
  async getAccountUsers(accountId) {
    try {
      console.log('🔍 Getting account users for account:', accountId);
      
      // Get users from ACC Construction Admin API
      const users = await this.accService.getAccountUsers(accountId);
      
      // Get roles for each user
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          try {
            const roles = await this.getUserRoles(accountId, user.id);
            return {
              ...user,
              roles: roles,
              primaryRole: roles.length > 0 ? roles[0].name : 'Member'
            };
          } catch (error) {
            console.warn('⚠️ Could not get roles for user:', user.id, error.message);
            return {
              ...user,
              roles: [],
              primaryRole: 'Member'
            };
          }
        })
      );
      
      console.log('✅ Account users with roles loaded:', usersWithRoles.length);
      return usersWithRoles;
    } catch (error) {
      console.error('❌ Error getting account users:', error);
      throw error;
    }
  }

  /**
   * Get project users with roles
   */
  async getProjectUsers(projectId) {
    try {
      console.log('🔍 Getting project users for project:', projectId);
      
      // Get users from ACC Construction Admin API
      const users = await this.accService.getProjectUsers(projectId);
      
      // Get roles for each user
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          try {
            const roles = await this.getUserRoles(user.accountId, user.id);
            return {
              ...user,
              roles: roles,
              primaryRole: roles.length > 0 ? roles[0].name : 'Member'
            };
          } catch (error) {
            console.warn('⚠️ Could not get roles for user:', user.id, error.message);
            return {
              ...user,
              roles: [],
              primaryRole: 'Member'
            };
          }
        })
      );
      
      console.log('✅ Project users with roles loaded:', usersWithRoles.length);
      return usersWithRoles;
    } catch (error) {
      console.error('❌ Error getting project users:', error);
      throw error;
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(accountId, userId) {
    try {
      console.log('🔍 Getting roles for user:', userId, 'in account:', accountId);
      
      const roles = await this.accService.getUserRoles(accountId, userId);
      console.log('✅ User roles loaded:', roles.length);
      return roles;
    } catch (error) {
      console.error('❌ Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Get available roles for selection
   */
  getAvailableRoles() {
    return [
      { id: 'admin', name: 'Administrator', description: 'Full access to all features' },
      { id: 'project_admin', name: 'Project Administrator', description: 'Manage project settings and users' },
      { id: 'project_manager', name: 'Project Manager', description: 'Manage project tasks and gates' },
      { id: 'team_lead', name: 'Team Lead', description: 'Lead team members and review work' },
      { id: 'reviewer', name: 'Reviewer', description: 'Review and approve documents' },
      { id: 'member', name: 'Member', description: 'Basic project access' },
      { id: 'viewer', name: 'Viewer', description: 'Read-only access' }
    ];
  }

  /**
   * Check if user has specific role
   */
  hasRole(user, roleId) {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.id === roleId || role.name === roleId);
  }

  /**
   * Check if user is admin
   */
  isAdmin(user) {
    return this.hasRole(user, 'admin') || this.hasRole(user, 'Administrator');
  }

  /**
   * Check if user can manage gates
   */
  canManageGates(user) {
    return this.hasRole(user, 'admin') || 
           this.hasRole(user, 'project_admin') || 
           this.hasRole(user, 'project_manager');
  }

  /**
   * Check if user can review documents
   */
  canReviewDocuments(user) {
    return this.hasRole(user, 'admin') || 
           this.hasRole(user, 'project_admin') || 
           this.hasRole(user, 'project_manager') || 
           this.hasRole(user, 'team_lead') || 
           this.hasRole(user, 'reviewer');
  }
}

export default new AccountRoleService();
