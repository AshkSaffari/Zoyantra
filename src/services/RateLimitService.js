/**
 * APS Rate Limiting Service
 * Handles Autodesk Platform Services API rate limits and prevents 429 errors
 * Based on APS Data Management API rate limits documentation
 */

class RateLimitService {
  constructor() {
    // Rate limits per endpoint (requests per minute)
    this.rateLimits = {
      // Hub Endpoints
      'GET /hubs': 50,
      'GET /hubs/{hub_id}': 50,
      
      // Project Endpoints
      'GET /hubs/{hub_id}/projects': 50,
      'GET /hubs/{hub_id}/projects/{project_id}': 50,
      'GET /hubs/{hub_id}/projects/{project_id}/hub': 50,
      'GET /hubs/{hub_id}/projects/{project_id}/topFolders': 300,
      'GET /projects/{project_id}/downloads/{download_id}': 300,
      'GET /projects/{project_id}/jobs/{job_id}': 300,
      'POST /projects/{project_id}/downloads': 50,
      'POST /projects/{project_id}/storage': 300,
      
      // Folder Endpoints
      'GET /projects/{project_id}/folders/{folder_id}': 300,
      'GET /projects/{project_id}/folders/{folder_id}/contents': 300,
      'GET /projects/{project_id}/folders/{folder_id}/parent': 50,
      'GET /projects/{project_id}/folders/{folder_id}/refs': 50,
      'GET /projects/{project_id}/folders/{folder_id}/relationships/links': 50,
      'GET /projects/{project_id}/folders/{folder_id}/relationships/refs': 50,
      'GET /projects/{project_id}/folders/{folder_id}/search': 300,
      'POST /projects/{project_id}/folders': 50,
      'POST /projects/{project_id}/folders/{folder_id}/relationships/refs': 50,
      'PATCH /projects/{project_id}/folders/{folder_id}': 50,
      
      // Item Endpoints
      'GET /projects/{project_id}/items/{item_id}': 300,
      'GET /projects/{project_id}/items/{item_id}/parent': 50,
      'GET /projects/{project_id}/items/{item_id}/refs': 300,
      'GET /projects/{project_id}/items/{item_id}/relationships/refs': 50,
      'GET /projects/{project_id}/items/{item_id}/relationships/links': 50,
      'GET /projects/{project_id}/items/{item_id}/tip': 50,
      'GET /projects/{project_id}/items/{item_id}/versions': 800,
      'POST /projects/{project_id}/items': 50,
      'POST /projects/{project_id}/items/{item_id}/relationships/refs': 50,
      'PATCH /projects/{project_id}/items/{item_id}': 50,
      
      // Version Endpoints
      'GET /projects/{project_id}/versions/{version_id}': 300,
      'GET /projects/{project_id}/versions/{version_id}/downloadFormats': 50,
      'GET /projects/{project_id}/versions/{version_id}/downloads': 50,
      'GET /projects/{project_id}/versions/{version_id}/item': 50,
      'GET /projects/{project_id}/versions/{version_id}/refs': 50,
      'GET /projects/{project_id}/versions/{version_id}/relationships/links': 50,
      'GET /projects/{project_id}/versions/{version_id}/relationships/refs': 50,
      'POST /projects/{project_id}/versions': 300,
      'POST /projects/{project_id}/versions/{version_id}/relationships/refs': 50,
      'POST /projects/{project_id}/versions/{version_id}/relationships/links': 50,
      'PATCH /projects/{project_id}/versions/{version_id}': 50,
      'PATCH /projects/{project_id}/versions/{version_id}/relationships/links/{link_id}': 50,
      
      // Command Endpoint
      'POST /projects/{project_id}/commands': 300,
      
      // OSS Rate Limit (overall)
      'OSS_OVERALL': 1000
    };

    // Track requests per endpoint
    this.requestCounts = {};
    this.requestTimestamps = {};
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2
    };

    // Rate limit monitoring
    this.monitoring = {
      enabled: true,
      warnings: [],
      violations: []
    };
  }

  /**
   * Get rate limit for a specific endpoint
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @returns {number} Rate limit (requests per minute)
   */
  getRateLimit(method, endpoint) {
    const key = `${method} ${endpoint}`;
    return this.rateLimits[key] || 60; // Default to 60 requests per minute
  }

  /**
   * Check if request can be made without exceeding rate limit
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @returns {boolean} True if request can be made
   */
  canMakeRequest(method, endpoint) {
    const key = `${method} ${endpoint}`;
    const rateLimit = this.getRateLimit(method, endpoint);
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    if (this.requestTimestamps[key]) {
      this.requestTimestamps[key] = this.requestTimestamps[key].filter(
        timestamp => timestamp > oneMinuteAgo
      );
    } else {
      this.requestTimestamps[key] = [];
    }

    // Check if we're under the rate limit
    return this.requestTimestamps[key].length < rateLimit;
  }

  /**
   * Record a request for rate limiting
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   */
  recordRequest(method, endpoint) {
    const key = `${method} ${endpoint}`;
    const now = Date.now();

    if (!this.requestTimestamps[key]) {
      this.requestTimestamps[key] = [];
    }

    this.requestTimestamps[key].push(now);
    this.requestCounts[key] = (this.requestCounts[key] || 0) + 1;
  }

  /**
   * Get time until next request can be made
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @returns {number} Milliseconds until next request can be made
   */
  getTimeUntilNextRequest(method, endpoint) {
    const key = `${method} ${endpoint}`;
    const rateLimit = this.getRateLimit(method, endpoint);
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    if (!this.requestTimestamps[key]) {
      return 0;
    }

    // Clean old timestamps
    this.requestTimestamps[key] = this.requestTimestamps[key].filter(
      timestamp => timestamp > oneMinuteAgo
    );

    if (this.requestTimestamps[key].length < rateLimit) {
      return 0;
    }

    // Find the oldest request in the current window
    const oldestRequest = Math.min(...this.requestTimestamps[key]);
    const timeUntilOldestExpires = (oldestRequest + 60000) - now;

    return Math.max(0, timeUntilOldestExpires);
  }

  /**
   * Wait for rate limit to reset
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @returns {Promise<void>}
   */
  async waitForRateLimit(method, endpoint) {
    const waitTime = this.getTimeUntilNextRequest(method, endpoint);
    if (waitTime > 0) {
      console.log(`Rate limit reached for ${method} ${endpoint}. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Execute request with rate limiting and retry logic
   * @param {Function} requestFunction - Function that makes the API request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional options
   * @returns {Promise<any>} API response
   */
  async executeWithRateLimit(requestFunction, method, endpoint, options = {}) {
    const { maxRetries = this.retryConfig.maxRetries } = options;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if we can make the request
        if (!this.canMakeRequest(method, endpoint)) {
          await this.waitForRateLimit(method, endpoint);
        }

        // Record the request
        this.recordRequest(method, endpoint);

        // Make the request
        const response = await requestFunction();

        // Check for rate limit violation
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : this.getTimeUntilNextRequest(method, endpoint);
          
          this.recordRateLimitViolation(method, endpoint, response);
          
          if (attempt < maxRetries) {
            console.log(`Rate limit violation for ${method} ${endpoint}. Retrying after ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            throw new Error(`Rate limit exceeded for ${method} ${endpoint} after ${maxRetries} retries`);
          }
        }

        return response;

      } catch (error) {
        lastError = error;
        
        if (error.message.includes('Rate limit exceeded')) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`Request failed for ${method} ${endpoint}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Record rate limit violation for monitoring
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Response} response - HTTP response
   */
  recordRateLimitViolation(method, endpoint, response) {
    const violation = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      status: response.status,
      retryAfter: response.headers.get('Retry-After'),
      rateLimit: this.getRateLimit(method, endpoint)
    };

    this.monitoring.violations.push(violation);
    
    // Keep only last 100 violations
    if (this.monitoring.violations.length > 100) {
      this.monitoring.violations = this.monitoring.violations.slice(-100);
    }

    console.warn('Rate limit violation recorded:', violation);
  }

  /**
   * Get rate limit statistics
   * @returns {Object} Statistics about rate limiting
   */
  getStatistics() {
    const stats = {
      totalRequests: Object.values(this.requestCounts).reduce((sum, count) => sum + count, 0),
      violations: this.monitoring.violations.length,
      warnings: this.monitoring.warnings.length,
      endpoints: {}
    };

    // Calculate statistics per endpoint
    Object.keys(this.requestCounts).forEach(key => {
      const [method, endpoint] = key.split(' ', 2);
      const rateLimit = this.getRateLimit(method, endpoint);
      const currentRequests = this.requestTimestamps[key]?.length || 0;
      
      stats.endpoints[key] = {
        method,
        endpoint,
        rateLimit,
        currentRequests,
        utilization: (currentRequests / rateLimit) * 100,
        canMakeRequest: this.canMakeRequest(method, endpoint)
      };
    });

    return stats;
  }

  /**
   * Get rate limit warnings for high utilization endpoints
   * @param {number} threshold - Utilization threshold (0-100)
   * @returns {Array} Array of warning objects
   */
  getWarnings(threshold = 80) {
    const warnings = [];
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    Object.keys(this.requestTimestamps).forEach(key => {
      const [method, endpoint] = key.split(' ', 2);
      const rateLimit = this.getRateLimit(method, endpoint);
      
      // Clean old timestamps
      const recentRequests = this.requestTimestamps[key].filter(
        timestamp => timestamp > oneMinuteAgo
      );

      const utilization = (recentRequests.length / rateLimit) * 100;
      
      if (utilization >= threshold) {
        warnings.push({
          method,
          endpoint,
          rateLimit,
          currentRequests: recentRequests.length,
          utilization: Math.round(utilization),
          timeUntilReset: this.getTimeUntilNextRequest(method, endpoint)
        });
      }
    });

    return warnings;
  }

  /**
   * Reset rate limit counters (useful for testing)
   */
  reset() {
    this.requestCounts = {};
    this.requestTimestamps = {};
    this.monitoring.violations = [];
    this.monitoring.warnings = [];
  }

  /**
   * Check if OSS overall rate limit is being approached
   * @returns {boolean} True if approaching OSS rate limit
   */
  isApproachingOSSOverallLimit() {
    const ossLimit = this.rateLimits.OSS_OVERALL;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    let totalRequests = 0;
    Object.keys(this.requestTimestamps).forEach(key => {
      const recentRequests = this.requestTimestamps[key].filter(
        timestamp => timestamp > oneMinuteAgo
      );
      totalRequests += recentRequests.length;
    });

    return totalRequests >= (ossLimit * 0.9); // 90% of OSS limit
  }

  /**
   * Get OSS rate limit status
   * @returns {Object} OSS rate limit status
   */
  getOSSStatus() {
    const ossLimit = this.rateLimits.OSS_OVERALL;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    let totalRequests = 0;
    Object.keys(this.requestTimestamps).forEach(key => {
      const recentRequests = this.requestTimestamps[key].filter(
        timestamp => timestamp > oneMinuteAgo
      );
      totalRequests += recentRequests.length;
    });

    return {
      limit: ossLimit,
      current: totalRequests,
      utilization: (totalRequests / ossLimit) * 100,
      canMakeRequest: totalRequests < ossLimit,
      timeUntilReset: totalRequests > 0 ? 60000 - (now - Math.min(...Object.values(this.requestTimestamps).flat().filter(t => t > oneMinuteAgo))) : 0
    };
  }
}

// Create singleton instance
const rateLimitService = new RateLimitService();

export default rateLimitService;
