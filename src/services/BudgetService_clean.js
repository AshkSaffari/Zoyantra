/**
 * BudgetService - Clean implementation for cases with no budget access
 * Handles scenarios where user doesn't have access to budgets or users in any hub
 */
class BudgetService {
  constructor(hubId, credentials) {
    this.hubId = hubId;
    this.credentials = credentials;
    this.accessToken = credentials?.threeLegToken;
    this.refreshToken = credentials?.refreshToken;
    this.tokenExpiry = credentials?.tokenExpiry;
    
    // Instance-based cache (no static pollution)
    this.budgetCache = new Map();
    this.lastFetchTime = null;
    
    console.log('💰 BudgetService created for hub:', hubId);
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    if (!this.accessToken) {
      throw new Error('No access token available for BudgetService');
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Detect hub region based on hub ID and name
   */
  detectHubRegion() {
    const hubId = this.hubId;
    const hubName = this.credentials?.hubName || '';
    
    // APAC detection patterns
    const apacPatterns = [
      /australia/i,
      /asia/i,
      /apac/i,
      /emea/i,
      /europe/i,
      /asia-pacific/i
    ];
    
    // Check hub name for APAC indicators
    if (apacPatterns.some(pattern => pattern.test(hubName))) {
      return 'APAC';
    }
    
    // Check hub ID patterns
    if (hubId && (
      hubId.includes('australia') ||
      hubId.includes('asia') ||
      hubId.includes('apac') ||
      hubId.includes('emea')
    )) {
      return 'APAC';
    }
    
    return 'US'; // Default to US
  }

  /**
   * Check if user has budget access for this hub
   */
  async checkBudgetAccess() {
    try {
      console.log('🔍 Checking budget access for hub:', this.hubId);
      
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
      console.error('❌ Error checking budget access:', error);
      return false;
    }
  }

  /**
   * Get budgets for a project - handles no access gracefully
   */
  async getBudgets(projectId, options = {}) {
    try {
      console.log('💰 Fetching budgets for project:', projectId, 'hub:', this.hubId);
      
      // Check if user has budget access first
      const hasAccess = await this.checkBudgetAccess();
      if (!hasAccess) {
        console.log('⚠️ No budget access available for this hub');
        return [];
      }

      // Validate project ID first
      if (!this.validateProjectId(projectId)) {
        console.warn('⚠️ Invalid project ID format:', projectId);
        return [];
      }

      // Check if user is authenticated
      if (!this.accessToken || this.accessToken.trim() === '') {
        console.warn('⚠️ No access token available, returning empty array');
        return [];
      }
      
      // Try to get real budgets
      const region = this.detectHubRegion();
      console.log('🌍 Detected region:', region);
      
      let budgets = [];
      
      if (region === 'APAC') {
        budgets = await this.getBudgetsForAPAC(projectId, options);
      } else {
        budgets = await this.getBudgetsForUS(projectId, options);
      }
      
      // If no real budgets found, return empty array
      if (budgets.length === 0) {
        console.log('⚠️ No real budgets found, returning empty array');
        return [];
      }
      
      console.log('✅ Successfully fetched', budgets.length, 'real budgets');
      return budgets;
      
    } catch (error) {
      console.error('❌ Error fetching budgets, returning empty array:', error);
      return [];
    }
  }


  /**
   * Get budgets for APAC hubs (BIM360-independent approach)
   */
  async getBudgetsForAPAC(projectId, options = {}) {
    console.log('🌏 Fetching budgets for APAC hub using BIM360-independent approach');
    
    const cleanProjectId = projectId.replace(/^b\./, '');
    const approaches = [
      // Approach 1: Pure ACC Project API
      async () => {
        console.log('🌏 Trying pure ACC Project API');
        const url = `https://developer.api.autodesk.com/cost/v1/projects/${cleanProjectId}/budgets`;
        const response = await fetch(url, { headers: this.getHeaders() });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Pure ACC API success:', data.data?.length || 0);
          return data.data || [];
        }
        return null;
      },
      
      // Approach 2: ACC Construction API
      async () => {
        console.log('🌏 Trying ACC Construction API');
        const url = `https://developer.api.autodesk.com/construction/cost/v1/projects/${cleanProjectId}/budgets`;
        const response = await fetch(url, { headers: this.getHeaders() });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ ACC Construction API success:', data.data?.length || 0);
          return data.data || [];
        }
        return null;
      }
    ];
    
    // Try each approach
    for (let i = 0; i < approaches.length; i++) {
      try {
        console.log(`🌏 Trying APAC approach ${i + 1}/${approaches.length}`);
        const result = await approaches[i]();
        if (result && result.length > 0) {
          console.log(`✅ APAC approach ${i + 1} succeeded with ${result.length} budgets`);
          return result;
        }
      } catch (error) {
        console.log(`⚠️ APAC approach ${i + 1} failed:`, error.message);
        continue;
      }
    }
    
    console.log('❌ All APAC approaches failed');
    return [];
  }

  /**
   * Get budgets for US hubs (container-based approach)
   */
  async getBudgetsForUS(projectId, options = {}) {
    console.log('🇺🇸 Fetching budgets for US hub using container-based approach');
    
    try {
      // Get container ID from project relationships
      const containerId = await this.getContainerId(projectId);
      if (!containerId) {
        console.log('⚠️ No container ID found for US project');
        return [];
      }
      
      console.log('🔍 Using container ID:', containerId);
      
      // Fetch budgets from container
      const url = `https://developer.api.autodesk.com/cost/v1/containers/${containerId}/budgets`;
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ US container API success:', data.results?.length || 0);
        return data.results || [];
      } else {
        console.log('⚠️ US container API failed:', response.status);
        return [];
      }
      
    } catch (error) {
      console.error('❌ Error in US budget fetching:', error);
      return [];
    }
  }

  /**
   * Get container ID for US projects
   */
  async getContainerId(projectId) {
    try {
      const cleanProjectId = projectId.replace(/^b\./, '');
      
      // Try to get container ID from project relationships
      const url = `https://developer.api.autodesk.com/project/v1/projects/${cleanProjectId}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      
      if (response.ok) {
        const projectData = await response.json();
        
        // Look for container ID in relationships
        if (projectData.data?.relationships?.costs) {
          const costsUrl = projectData.data.relationships.costs.links.related.href;
          const costsResponse = await fetch(costsUrl, { headers: this.getHeaders() });
          
          if (costsResponse.ok) {
            const costsData = await costsResponse.json();
            if (costsData.data?.length > 0) {
              const containerId = costsData.data[0].id;
              console.log('✅ Found container ID:', containerId);
              return containerId;
            }
          }
        }
      }
      
      // Fallback to project ID
      console.log('⚠️ Using project ID as container ID fallback');
      return cleanProjectId;
      
    } catch (error) {
      console.error('❌ Error getting container ID:', error);
      return projectId.replace(/^b\./, '');
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

  /**
   * Clear cache for this instance
   */
  clearCache() {
    this.budgetCache.clear();
    this.lastFetchTime = null;
    console.log('🧹 Cleared budget cache for hub:', this.hubId);
  }

  /**
   * Check if Cost Management is available for a project
   */
  async isCostManagementAvailable(projectId) {
    try {
      const budgets = await this.getBudgets(projectId, { limit: 1 });
      return budgets.length > 0;
    } catch (error) {
      console.error('❌ Error checking Cost Management availability:', error);
      return false;
    }
  }
}

export default BudgetService;
