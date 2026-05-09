/**
 * BudgetService - Clean implementation from scratch
 * Handles budget fetching for both US and APAC hubs without static cache pollution
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
   * Get budgets for a project using region-aware approach
   */
  async getBudgets(projectId, options = {}) {
    try {
      console.log('💰 Fetching budgets for project:', projectId, 'hub:', this.hubId);
      
      // Validate project ID first
      if (!this.validateProjectId(projectId)) {
        console.warn('⚠️ Invalid project ID format:', projectId);
        return [];
      }

      // Check if user is authenticated
      if (!this.accessToken || this.accessToken.trim() === '') {
        console.warn('⚠️ No access token available, skipping budget fetch');
        return [];
      }
      
      // Check cache first
      const cacheKey = `${projectId}_${this.hubId}`;
      const now = Date.now();
      
      if (this.budgetCache.has(cacheKey) && this.lastFetchTime && (now - this.lastFetchTime) < 300000) {
        console.log('✅ Using cached budgets');
        return this.budgetCache.get(cacheKey);
      }
      
      const region = this.detectHubRegion();
      console.log('🌍 Detected region:', region);
      
      let budgets = [];
      
      if (region === 'APAC') {
        budgets = await this.getBudgetsForAPAC(projectId, options);
      } else {
        budgets = await this.getBudgetsForUS(projectId, options);
      }
      
      // Cache the results
      this.budgetCache.set(cacheKey, budgets);
      this.lastFetchTime = now;
      
      console.log('✅ Successfully fetched', budgets.length, 'budgets');
      return budgets;
      
    } catch (error) {
      console.error('❌ Error fetching budgets:', error);
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
      },
      
      // Approach 3: ACC Data Management API
      async () => {
        console.log('🌏 Trying ACC Data Management API');
        const url = `https://developer.api.autodesk.com/data/v1/projects/${cleanProjectId}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        
        if (response.ok) {
          const projectData = await response.json();
          console.log('✅ ACC Data Management project data retrieved');
          
          if (projectData.data?.relationships?.budgets) {
            const budgetsUrl = projectData.data.relationships.budgets.links.related.href;
            const budgetsResponse = await fetch(budgetsUrl, { headers: this.getHeaders() });
            
            if (budgetsResponse.ok) {
              const budgetsData = await budgetsResponse.json();
              console.log('✅ ACC Budgets from Data Management:', budgetsData.data?.length || 0);
              return budgetsData.data || [];
            }
          }
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
