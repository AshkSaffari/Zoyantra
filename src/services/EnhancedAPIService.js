/**
 * Enhanced API Service with Rate Limiting
 * Wraps existing API calls with rate limiting and retry logic
 */

import rateLimitService from './RateLimitService';

class EnhancedAPIService {
  constructor() {
    this.baseURL = 'https://developer.api.autodesk.com';
  }

  /**
   * Make a rate-limited API request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Response>} API response
   */
  async makeRequest(method, endpoint, options = {}) {
    const { headers = {}, body, ...otherOptions } = options;
    
    const requestFunction = async () => {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
      
      return fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        ...otherOptions
      });
    };

    return rateLimitService.executeWithRateLimit(
      requestFunction,
      method,
      endpoint,
      { maxRetries: 3 }
    );
  }

  /**
   * GET request with rate limiting
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Response>} API response
   */
  async get(endpoint, options = {}) {
    return this.makeRequest('GET', endpoint, options);
  }

  /**
   * POST request with rate limiting
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Response>} API response
   */
  async post(endpoint, body = null, options = {}) {
    return this.makeRequest('POST', endpoint, { ...options, body });
  }

  /**
   * PATCH request with rate limiting
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Response>} API response
   */
  async patch(endpoint, body = null, options = {}) {
    return this.makeRequest('PATCH', endpoint, { ...options, body });
  }

  /**
   * DELETE request with rate limiting
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Response>} API response
   */
  async delete(endpoint, options = {}) {
    return this.makeRequest('DELETE', endpoint, options);
  }

  /**
   * Get hubs with rate limiting
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getHubs(accessToken) {
    return this.get('/project/v1/hubs', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get projects with rate limiting
   * @param {string} hubId - Hub ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getProjects(hubId, accessToken) {
    return this.get(`/project/v1/hubs/${hubId}/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get project details with rate limiting
   * @param {string} hubId - Hub ID
   * @param {string} projectId - Project ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getProject(hubId, projectId, accessToken) {
    return this.get(`/project/v1/hubs/${hubId}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get top folders with rate limiting
   * @param {string} hubId - Hub ID
   * @param {string} projectId - Project ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getTopFolders(hubId, projectId, accessToken) {
    return this.get(`/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get folder contents with rate limiting
   * @param {string} projectId - Project ID
   * @param {string} folderId - Folder ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getFolderContents(projectId, folderId, accessToken) {
    return this.get(`/data/v1/projects/${projectId}/folders/${folderId}/contents`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get folder details with rate limiting
   * @param {string} projectId - Project ID
   * @param {string} folderId - Folder ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getFolder(projectId, folderId, accessToken) {
    return this.get(`/data/v1/projects/${projectId}/folders/${folderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get item details with rate limiting
   * @param {string} projectId - Project ID
   * @param {string} itemId - Item ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getItem(projectId, itemId, accessToken) {
    return this.get(`/data/v1/projects/${projectId}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get item versions with rate limiting
   * @param {string} projectId - Project ID
   * @param {string} itemId - Item ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getItemVersions(projectId, itemId, accessToken) {
    return this.get(`/data/v1/projects/${projectId}/items/${itemId}/versions`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get version details with rate limiting
   * @param {string} projectId - Project ID
   * @param {string} versionId - Version ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getVersion(projectId, versionId, accessToken) {
    return this.get(`/data/v1/projects/${projectId}/versions/${versionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Create download with rate limiting
   * @param {string} projectId - Project ID
   * @param {Object} downloadData - Download data
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async createDownload(projectId, downloadData, accessToken) {
    return this.post(`/data/v1/projects/${projectId}/downloads`, downloadData, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get download status with rate limiting
   * @param {string} projectId - Project ID
   * @param {string} downloadId - Download ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getDownload(projectId, downloadId, accessToken) {
    return this.get(`/data/v1/projects/${projectId}/downloads/${downloadId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get project users with rate limiting
   * @param {string} hubId - Hub ID
   * @param {string} projectId - Project ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getProjectUsers(hubId, projectId, accessToken) {
    return this.get(`/project/v1/hubs/${hubId}/projects/${projectId}/users`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get project approvals with rate limiting
   * @param {string} hubId - Hub ID
   * @param {string} projectId - Project ID
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async getProjectApprovals(hubId, projectId, accessToken) {
    return this.get(`/project/v1/hubs/${hubId}/projects/${projectId}/approvals`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Search folders with rate limiting
   * @param {string} projectId - Project ID
   * @param {string} folderId - Folder ID
   * @param {Object} searchParams - Search parameters
   * @param {string} accessToken - Access token
   * @returns {Promise<Response>} API response
   */
  async searchFolders(projectId, folderId, searchParams, accessToken) {
    const queryString = new URLSearchParams(searchParams).toString();
    return this.get(`/data/v1/projects/${projectId}/folders/${folderId}/search?${queryString}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  /**
   * Get rate limit statistics
   * @returns {Object} Rate limit statistics
   */
  getRateLimitStatistics() {
    return rateLimitService.getStatistics();
  }

  /**
   * Get rate limit warnings
   * @param {number} threshold - Warning threshold (0-100)
   * @returns {Array} Array of warnings
   */
  getRateLimitWarnings(threshold = 80) {
    return rateLimitService.getWarnings(threshold);
  }

  /**
   * Check if approaching OSS overall limit
   * @returns {boolean} True if approaching limit
   */
  isApproachingOSSOverallLimit() {
    return rateLimitService.isApproachingOSSOverallLimit();
  }

  /**
   * Get OSS rate limit status
   * @returns {Object} OSS status
   */
  getOSSStatus() {
    return rateLimitService.getOSSStatus();
  }

  /**
   * Reset rate limit counters
   */
  resetRateLimits() {
    rateLimitService.reset();
  }
}

// Create singleton instance
const enhancedAPIService = new EnhancedAPIService();

export default enhancedAPIService;
