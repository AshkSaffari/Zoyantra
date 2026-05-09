class AccService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.accountId = null;
    this.baseURL = 'https://developer.api.autodesk.com';
    this.region = 'US'; // Default region
    this.clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
    this.clientSecret = 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa';
  }

  initialize(credentials) {
    this.accessToken = credentials.threeLegToken;
    this.refreshToken = credentials.refreshToken || this.refreshToken;
    this.accountId = credentials.accountId || this.accountId;
    this.tokenExpiry = credentials.tokenExpiry || this.tokenExpiry;
    this.tokenTimestamp = Date.now(); // Track when token was initialized
    
    console.log('✅ AccService initialized with token:', this.accessToken ? 'Present' : 'Missing');
    console.log('🔑 Token snippet:', this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'None');
    console.log('⏰ Token expiry:', this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : 'Not set');
  }

  setRegion(region) {
    this.region = region.toUpperCase();
    this.baseURL = 'https://developer.api.autodesk.com';
    console.log(`🌍 Region set to ${this.region}`);
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    if (!this.accessToken) {
      throw new Error('AccService not initialized. Please call initialize() first.');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) })
    };

    try {
      console.log(`🌐 Making ${method} request to: ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ API request successful: ${method} ${url}`);
      return result;
    } catch (error) {
      console.error(`❌ API request error: ${method} ${url}`, error);
      throw error;
    }
  }

  async getHubs() {
    try {
      console.log('🏢 Getting accessible hubs...');
      const response = await this.makeRequest('/project/v1/hubs');
      
      if (response.data && Array.isArray(response.data)) {
        const hubs = response.data.map(hub => ({
          id: hub.id,
          name: hub.attributes?.name || 'Unnamed Hub',
          type: hub.type,
          region: hub.attributes?.extension?.data?.region || 'US',
          status: hub.attributes?.status || 'active'
        }));
        console.log(`✅ Found ${hubs.length} accessible hubs`);
        return hubs;
      }
      
      console.log('⚠️ No hubs found in response');
      return [];
    } catch (error) {
      console.error('❌ Error getting hubs:', error);
      throw error;
    }
  }

  async getProjects(hubId) {
    try {
      console.log(`🏗️ Getting projects for hub: ${hubId}`);
      const response = await this.makeRequest(`/project/v1/hubs/${hubId}/projects`);
      
      if (response.data && Array.isArray(response.data)) {
        const projects = response.data.map(project => ({
          id: project.id,
          name: project.attributes?.name || 'Unnamed Project',
          type: project.type,
          jobNumber: project.attributes?.jobNumber,
          status: project.attributes?.status || 'active',
          description: project.attributes?.description
        }));
        console.log(`✅ Found ${projects.length} projects for hub ${hubId}`);
        return projects;
      }
      
      console.log('⚠️ No projects found in response');
      return [];
    } catch (error) {
      console.error('❌ Error getting projects:', error);
      throw error;
    }
  }

  async getProjectMembers(projectId) {
    try {
      console.log(`👥 Getting project members for project: ${projectId}`);
      const response = await this.makeRequest(`/project/v1/projects/${projectId}/users`);
      
      if (response.data && Array.isArray(response.data)) {
        const members = response.data.map(member => ({
          id: member.id,
          name: member.attributes?.name || 'Unknown User',
          email: member.attributes?.email,
          status: member.attributes?.status || 'active'
        }));
        console.log(`✅ Found ${members.length} project members`);
        return members;
      }
      
      console.log('⚠️ No project members found');
      return [];
    } catch (error) {
      console.error('❌ Error getting project members:', error);
      throw error;
    }
  }

  async getBudgets(projectId, options = {}) {
    try {
      console.log(`💰 Getting budgets for project: ${projectId}`);
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const response = await this.makeRequest(`/cost/v1/containers/${cleanProjectId}/budgets`);
      
      if (response.data && Array.isArray(response.data)) {
        const budgets = response.data.map(budget => ({
          id: budget.id,
          name: budget.attributes?.name || 'Unnamed Budget',
          amount: budget.attributes?.amount || 0,
          unitPrice: budget.attributes?.unitPrice || 0,
          quantity: budget.attributes?.quantity || 0,
          inputQuantity: budget.attributes?.inputQuantity || 0,
          unit: budget.attributes?.unit || 'units',
          description: budget.attributes?.description || '',
          status: budget.attributes?.status || 'active'
        }));
        console.log(`✅ Found ${budgets.length} budgets for project ${projectId}`);
        return budgets;
      }
      
      console.log('⚠️ No budgets found');
      return [];
    } catch (error) {
      console.error('❌ Error getting budgets:', error);
      throw error;
    }
  }

  // Static methods for backward compatibility
  static initialize(credentials) {
    if (!AccService.instance) {
      AccService.instance = new AccService();
    }
    AccService.instance.initialize(credentials);
    return AccService.instance;
  }

  static loadStoredCredentials() {
    try {
      const storedCredentials = JSON.parse(localStorage.getItem('cewa_credentials') || '{}');
      
      if (storedCredentials.threeLegToken) {
        console.log('🔄 Loading stored credentials...');
        AccService.initialize(storedCredentials);
        return true;
      } else {
        console.log('❌ No stored credentials found');
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading stored credentials:', error);
      return false;
    }
  }
}

export default AccService;
