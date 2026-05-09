/**
 * APS Rate Limiter Utility
 * Handles rate limiting and quota management for Autodesk Platform Services
 * Based on APS documentation for rate limits and quotas
 */

class RateLimiter {
  constructor() {
    this.rateLimits = new Map();
    this.quotaUsage = new Map();
    this.retryAfter = new Map();
    this.requestHistory = new Map();
  }

  /**
   * Check if a request can be made based on rate limits
   * @param {string} endpoint - The API endpoint
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   * @returns {Object} Rate limit check result
   */
  checkRateLimit(endpoint, userId = null, applicationId = null) {
    const key = this.getRateLimitKey(endpoint, userId, applicationId);
    const now = Date.now();
    
    // Check if we're in a retry-after period
    if (this.retryAfter.has(key)) {
      const retryAfter = this.retryAfter.get(key);
      if (now < retryAfter) {
        return {
          allowed: false,
          reason: 'retry_after',
          retryAfter: retryAfter - now,
          message: `Rate limit exceeded. Retry after ${Math.ceil((retryAfter - now) / 1000)} seconds`
        };
      } else {
        this.retryAfter.delete(key);
      }
    }

    // Get rate limit configuration for this endpoint
    const rateLimit = this.getRateLimitConfig(endpoint);
    if (!rateLimit) {
      return { allowed: true, reason: 'no_limit' };
    }

    // Get request history for this key
    const history = this.requestHistory.get(key) || [];
    
    // Filter requests within the time window (last minute)
    const oneMinuteAgo = now - (60 * 1000);
    const recentRequests = history.filter(timestamp => timestamp > oneMinuteAgo);
    
    // Check if we're within the rate limit
    if (recentRequests.length >= rateLimit.maxRequests) {
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        currentRequests: recentRequests.length,
        maxRequests: rateLimit.maxRequests,
        resetTime: Math.min(...recentRequests) + (60 * 1000),
        message: `Rate limit exceeded: ${recentRequests.length}/${rateLimit.maxRequests} requests per minute`
      };
    }

    return {
      allowed: true,
      reason: 'within_limit',
      currentRequests: recentRequests.length,
      maxRequests: rateLimit.maxRequests,
      remainingRequests: rateLimit.maxRequests - recentRequests.length
    };
  }

  /**
   * Record a request for rate limiting
   * @param {string} endpoint - The API endpoint
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   */
  recordRequest(endpoint, userId = null, applicationId = null) {
    const key = this.getRateLimitKey(endpoint, userId, applicationId);
    const now = Date.now();
    
    const history = this.requestHistory.get(key) || [];
    history.push(now);
    
    // Keep only requests from the last hour to prevent memory bloat
    const oneHourAgo = now - (60 * 60 * 1000);
    const filteredHistory = history.filter(timestamp => timestamp > oneHourAgo);
    
    this.requestHistory.set(key, filteredHistory);
  }

  /**
   * Handle a 429 response and set retry-after period
   * @param {string} endpoint - The API endpoint
   * @param {number} retryAfterSeconds - Seconds to wait before retrying
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   */
  handleRateLimitExceeded(endpoint, retryAfterSeconds, userId = null, applicationId = null) {
    const key = this.getRateLimitKey(endpoint, userId, applicationId);
    const retryAfter = Date.now() + (retryAfterSeconds * 1000);
    
    this.retryAfter.set(key, retryAfter);
    
    console.warn(`⚠️ Rate limit exceeded for ${endpoint}. Retry after ${retryAfterSeconds} seconds`);
  }

  /**
   * Check quota usage for a resource
   * @param {string} resourceType - Type of resource (file_size, processing_time, etc.)
   * @param {number} requestedAmount - Amount of resource requested
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   * @returns {Object} Quota check result
   */
  checkQuota(resourceType, requestedAmount, userId = null, applicationId = null) {
    const key = this.getQuotaKey(resourceType, userId, applicationId);
    const quota = this.getQuotaConfig(resourceType);
    
    if (!quota) {
      return { allowed: true, reason: 'no_quota' };
    }

    const currentUsage = this.quotaUsage.get(key) || 0;
    const totalUsage = currentUsage + requestedAmount;
    
    if (totalUsage > quota.limit) {
      return {
        allowed: false,
        reason: 'quota_exceeded',
        currentUsage: currentUsage,
        requestedAmount: requestedAmount,
        totalUsage: totalUsage,
        limit: quota.limit,
        message: `Quota exceeded: ${totalUsage}/${quota.limit} ${quota.unit}`
      };
    }

    return {
      allowed: true,
      reason: 'within_quota',
      currentUsage: currentUsage,
      requestedAmount: requestedAmount,
      totalUsage: totalUsage,
      limit: quota.limit,
      remaining: quota.limit - totalUsage
    };
  }

  /**
   * Record quota usage
   * @param {string} resourceType - Type of resource
   * @param {number} amount - Amount of resource used
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   */
  recordQuotaUsage(resourceType, amount, userId = null, applicationId = null) {
    const key = this.getQuotaKey(resourceType, userId, applicationId);
    const currentUsage = this.quotaUsage.get(key) || 0;
    this.quotaUsage.set(key, currentUsage + amount);
  }

  /**
   * Get rate limit configuration for an endpoint based on official APS Data Management rate limits
   * @param {string} endpoint - The API endpoint
   * @returns {Object} Rate limit configuration
   */
  getRateLimitConfig(endpoint) {
    // Official APS Data Management Rate Limits (requests per minute)
    const officialLimits = {
      // Hub Endpoints
      '/hubs': { maxRequests: 50, windowMs: 60000 },
      '/hubs/{hub_id}': { maxRequests: 50, windowMs: 60000 },
      
      // Project Endpoints
      '/hubs/{hub_id}/projects': { maxRequests: 50, windowMs: 60000 },
      '/hubs/{hub_id}/projects/{project_id}': { maxRequests: 50, windowMs: 60000 },
      '/hubs/{hub_id}/projects/{project_id}/hub': { maxRequests: 50, windowMs: 60000 },
      '/hubs/{hub_id}/projects/{project_id}/topFolders': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/downloads/{download_id}': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/jobs/{job_id}': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/downloads': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/storage': { maxRequests: 300, windowMs: 60000 },
      
      // Folder Endpoints
      '/projects/{project_id}/folders/{folder_id}': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}/contents': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}/parent': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}/relationships/links': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}/relationships/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}/search': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/folders': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}/relationships/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/folders/{folder_id}': { maxRequests: 50, windowMs: 60000 }, // PATCH
      
      // Item Endpoints
      '/projects/{project_id}/items/{item_id}': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}/parent': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}/refs': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}/relationships/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}/relationships/links': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}/tip': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}/versions': { maxRequests: 800, windowMs: 60000 },
      '/projects/{project_id}/items': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}/relationships/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/items/{item_id}': { maxRequests: 50, windowMs: 60000 }, // PATCH
      
      // Version Endpoints
      '/projects/{project_id}/versions/{version_id}': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/downloadFormats': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/downloads': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/item': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/relationships/links': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/relationships/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions': { maxRequests: 300, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/relationships/refs': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}/relationships/links': { maxRequests: 50, windowMs: 60000 },
      '/projects/{project_id}/versions/{version_id}': { maxRequests: 50, windowMs: 60000 }, // PATCH
      '/projects/{project_id}/versions/{version_id}/relationships/links/{link_id}': { maxRequests: 50, windowMs: 60000 },
      
      // Command Endpoint
      '/projects/{project_id}/commands': { maxRequests: 300, windowMs: 60000 },
      
      // OSS Rate Limit (overall for all OSS endpoints)
      'oss': { maxRequests: 1000, windowMs: 60000 }
    };

    // Extract path from endpoint URL
    let path = endpoint;
    try {
      const url = new URL(endpoint);
      path = url.pathname;
    } catch (e) {
      // If it's not a full URL, use as is
    }

    // Try to match exact endpoint patterns
    for (const [pattern, config] of Object.entries(officialLimits)) {
      if (pattern === 'oss') continue; // Handle OSS separately
      
      if (this.matchesPattern(path, pattern)) {
        return config;
      }
    }
    
    // Check for OSS endpoints
    if (path.includes('/buckets') || path.includes('/objects') || endpoint.includes('oss')) {
      return officialLimits.oss;
    }
    
    // Default conservative limits based on endpoint type
    if (path.includes('/hubs')) return { maxRequests: 50, windowMs: 60000 };
    if (path.includes('/projects') && path.includes('/folders')) return { maxRequests: 300, windowMs: 60000 };
    if (path.includes('/projects') && path.includes('/items')) return { maxRequests: 300, windowMs: 60000 };
    if (path.includes('/projects') && path.includes('/versions')) return { maxRequests: 300, windowMs: 60000 };
    if (path.includes('/projects') && path.includes('/commands')) return { maxRequests: 300, windowMs: 60000 };
    if (path.includes('/projects')) return { maxRequests: 50, windowMs: 60000 };
    
    // Default fallback
    return { maxRequests: 50, windowMs: 60000 };
  }

  /**
   * Check if a path matches a pattern
   * @param {string} path - The actual path
   * @param {string} pattern - The pattern to match
   * @returns {boolean} True if matches
   */
  matchesPattern(path, pattern) {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\{.*?\}/g, '[^/]+') // Replace {param} with [^/]+
      .replace(/\//g, '\\/'); // Escape forward slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Get quota configuration for a resource type
   * @param {string} resourceType - Type of resource
   * @returns {Object} Quota configuration
   */
  getQuotaConfig(resourceType) {
    const quotas = {
      'file_size': { limit: 100 * 1024 * 1024, unit: 'bytes' }, // 100MB per request
      'processing_time': { limit: 300, unit: 'seconds' }, // 5 minutes per job
      'monthly_requests': { limit: 10000, unit: 'requests' }, // 10k requests per month
      'storage': { limit: 1024 * 1024 * 1024, unit: 'bytes' }, // 1GB storage
      'concurrent_jobs': { limit: 5, unit: 'jobs' } // 5 concurrent jobs
    };

    return quotas[resourceType] || null;
  }

  /**
   * Get rate limit key for tracking
   * @param {string} endpoint - The API endpoint
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   * @returns {string} Rate limit key
   */
  getRateLimitKey(endpoint, userId, applicationId) {
    const parts = [endpoint];
    if (userId) parts.push(`user:${userId}`);
    if (applicationId) parts.push(`app:${applicationId}`);
    return parts.join('|');
  }

  /**
   * Get quota key for tracking
   * @param {string} resourceType - Type of resource
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   * @returns {string} Quota key
   */
  getQuotaKey(resourceType, userId, applicationId) {
    const parts = [resourceType];
    if (userId) parts.push(`user:${userId}`);
    if (applicationId) parts.push(`app:${applicationId}`);
    return parts.join('|');
  }

  /**
   * Get current rate limit status for an endpoint
   * @param {string} endpoint - The API endpoint
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   * @returns {Object} Current rate limit status
   */
  getRateLimitStatus(endpoint, userId = null, applicationId = null) {
    const key = this.getRateLimitKey(endpoint, userId, applicationId);
    const now = Date.now();
    const history = this.requestHistory.get(key) || [];
    const oneMinuteAgo = now - (60 * 1000);
    const recentRequests = history.filter(timestamp => timestamp > oneMinuteAgo);
    const rateLimit = this.getRateLimitConfig(endpoint);
    
    return {
      endpoint,
      currentRequests: recentRequests.length,
      maxRequests: rateLimit?.maxRequests || 0,
      remainingRequests: Math.max(0, (rateLimit?.maxRequests || 0) - recentRequests.length),
      resetTime: recentRequests.length > 0 ? Math.min(...recentRequests) + (60 * 1000) : now,
      isRetryAfter: this.retryAfter.has(key),
      retryAfterTime: this.retryAfter.get(key) || null
    };
  }

  /**
   * Get current quota status for a resource type
   * @param {string} resourceType - Type of resource
   * @param {string} userId - User ID (optional)
   * @param {string} applicationId - Application ID (optional)
   * @returns {Object} Current quota status
   */
  getQuotaStatus(resourceType, userId = null, applicationId = null) {
    const key = this.getQuotaKey(resourceType, userId, applicationId);
    const currentUsage = this.quotaUsage.get(key) || 0;
    const quota = this.getQuotaConfig(resourceType);
    
    return {
      resourceType,
      currentUsage,
      limit: quota?.limit || 0,
      remaining: Math.max(0, (quota?.limit || 0) - currentUsage),
      unit: quota?.unit || 'units',
      percentage: quota?.limit ? (currentUsage / quota.limit) * 100 : 0
    };
  }

  /**
   * Clear rate limit data (for testing or reset)
   * @param {string} endpoint - Optional endpoint to clear (clears all if not specified)
   */
  clearRateLimitData(endpoint = null) {
    if (endpoint) {
      // Clear specific endpoint
      const keysToDelete = [];
      for (const key of this.requestHistory.keys()) {
        if (key.startsWith(endpoint)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => {
        this.requestHistory.delete(key);
        this.retryAfter.delete(key);
      });
    } else {
      // Clear all data
      this.requestHistory.clear();
      this.retryAfter.clear();
    }
  }

  /**
   * Clear quota data (for testing or reset)
   * @param {string} resourceType - Optional resource type to clear (clears all if not specified)
   */
  clearQuotaData(resourceType = null) {
    if (resourceType) {
      // Clear specific resource type
      const keysToDelete = [];
      for (const key of this.quotaUsage.keys()) {
        if (key.startsWith(resourceType)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.quotaUsage.delete(key));
    } else {
      // Clear all quota data
      this.quotaUsage.clear();
    }
  }

  /**
   * Get comprehensive status for all tracked endpoints and quotas
   * @returns {Object} Complete status information
   */
  getFullStatus() {
    const rateLimitStatus = {};
    const quotaStatus = {};
    
    // Get status for all tracked endpoints
    for (const key of this.requestHistory.keys()) {
      const [endpoint] = key.split('|');
      rateLimitStatus[endpoint] = this.getRateLimitStatus(endpoint);
    }
    
    // Get status for all tracked quotas
    for (const key of this.quotaUsage.keys()) {
      const [resourceType] = key.split('|');
      quotaStatus[resourceType] = this.getQuotaStatus(resourceType);
    }
    
    return {
      rateLimits: rateLimitStatus,
      quotas: quotaStatus,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;
