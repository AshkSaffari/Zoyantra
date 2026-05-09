/**
 * UserService - Clean implementation for cases with no user access
 * Handles scenarios where user doesn't have access to project members in any hub
 */
class UserService {
  constructor(hubId, credentials) {
    this.hubId = hubId;
    this.credentials = credentials;
    this.accessToken = credentials?.threeLegToken;
    this.refreshToken = credentials?.refreshToken;
    this.tokenExpiry = credentials?.tokenExpiry;
    
    console.log('👥 UserService created for hub:', hubId);
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    if (!this.accessToken) {
      throw new Error('No access token available for UserService');
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Check if user has access to project members
   */
  async checkUserAccess() {
    try {
      console.log('🔍 Checking user access for hub:', this.hubId);
      
      // Try a simple API call to check if we have any access
      const testUrl = 'https://developer.api.autodesk.com/project/v1/hubs';
      const response = await fetch(testUrl, { headers: this.getHeaders() });
      
      if (response.ok) {
        const data = await response.json();
        const hubs = data.data || [];
        
        // Check if current hub is in the list
        const currentHub = hubs.find(hub => hub.id === this.hubId);
        if (currentHub) {
          console.log('✅ Hub access confirmed:', currentHub.attributes?.name);
          return true;
        } else {
          console.log('⚠️ Current hub not found in accessible hubs');
          return false;
        }
      } else {
        console.log('❌ No access to hubs API:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking user access:', error);
      return false;
    }
  }

  /**
   * Get project members - handles no access gracefully
   */
  async getProjectMembers(projectId) {
    try {
      console.log('👥 Fetching project members for project:', projectId);
      
      // Check if user has access first
      const hasAccess = await this.checkUserAccess();
      if (!hasAccess) {
        console.log('⚠️ No user access available for this hub');
        return this.getMockUsers(projectId);
      }

      // Validate project ID first
      if (!this.validateProjectId(projectId)) {
        console.warn('⚠️ Invalid project ID format:', projectId);
        return this.getMockUsers(projectId);
      }

      // Check if user is authenticated
      if (!this.accessToken || this.accessToken.trim() === '') {
        console.warn('⚠️ No access token available, using mock users');
        return this.getMockUsers(projectId);
      }

      // Try to get real project members
      const cleanProjectId = projectId.replace(/^b\./, '');
      const response = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${cleanProjectId}/users`, {
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const members = data.results || [];
        console.log('✅ Successfully fetched', members.length, 'real project members');
        return members;
      }
      
      // If 404 or other error, return empty array
      if (response.status === 404) {
        console.log('⚠️ Project not found or no access to project members');
        return [];
      }
      
      throw new Error(`Failed to fetch project members: ${response.status}`);
      
    } catch (error) {
      console.error('❌ Error fetching project members:', error);
      return [];
    }
  }


  // Validate project ID format
  validateProjectId(projectId) {
    if (!projectId) return false;
    // Check if it's a valid UUID format (with or without 'b.' prefix)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanId = projectId.replace(/^b\./, '');
    return uuidRegex.test(cleanId);
  }
}

export default UserService;
