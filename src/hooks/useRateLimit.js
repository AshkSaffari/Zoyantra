import { useState, useEffect, useCallback, useRef } from 'react';
import rateLimiter from '../utils/rateLimiter';

/**
 * React hook for managing APS rate limits and quotas
 * Provides real-time rate limit status and automatic request throttling
 */
export const useRateLimit = (endpoint, userId = null, applicationId = null) => {
  const [rateLimitStatus, setRateLimitStatus] = useState(null);
  const [quotaStatus, setQuotaStatus] = useState({});
  const [isRetryAfter, setIsRetryAfter] = useState(false);
  const [retryAfterTime, setRetryAfterTime] = useState(null);
  const intervalRef = useRef(null);

  // Update rate limit status
  const updateRateLimitStatus = useCallback(() => {
    const status = rateLimiter.getRateLimitStatus(endpoint, userId, applicationId);
    setRateLimitStatus(status);
    setIsRetryAfter(status.isRetryAfter);
    setRetryAfterTime(status.retryAfterTime);
  }, [endpoint, userId, applicationId]);

  // Update quota status for all resource types
  const updateQuotaStatus = useCallback(() => {
    const quotas = ['file_size', 'processing_time', 'monthly_requests', 'storage', 'concurrent_jobs'];
    const status = {};
    quotas.forEach(resourceType => {
      status[resourceType] = rateLimiter.getQuotaStatus(resourceType, userId, applicationId);
    });
    setQuotaStatus(status);
  }, [userId, applicationId]);

  // Check if a request can be made
  const canMakeRequest = useCallback(() => {
    const check = rateLimiter.checkRateLimit(endpoint, userId, applicationId);
    return check.allowed;
  }, [endpoint, userId, applicationId]);

  // Record a request
  const recordRequest = useCallback(() => {
    rateLimiter.recordRequest(endpoint, userId, applicationId);
    updateRateLimitStatus();
  }, [endpoint, userId, applicationId, updateRateLimitStatus]);

  // Check quota for a resource
  const checkQuota = useCallback((resourceType, requestedAmount) => {
    return rateLimiter.checkQuota(resourceType, requestedAmount, userId, applicationId);
  }, [userId, applicationId]);

  // Record quota usage
  const recordQuotaUsage = useCallback((resourceType, amount) => {
    rateLimiter.recordQuotaUsage(resourceType, amount, userId, applicationId);
    updateQuotaStatus();
  }, [userId, applicationId, updateQuotaStatus]);

  // Handle rate limit exceeded response
  const handleRateLimitExceeded = useCallback((retryAfterSeconds) => {
    rateLimiter.handleRateLimitExceeded(endpoint, retryAfterSeconds, userId, applicationId);
    updateRateLimitStatus();
  }, [endpoint, userId, applicationId, updateRateLimitStatus]);

  // Get remaining time until retry
  const getRetryAfterTime = useCallback(() => {
    if (!isRetryAfter || !retryAfterTime) return 0;
    return Math.max(0, retryAfterTime - Date.now());
  }, [isRetryAfter, retryAfterTime]);

  // Get retry after time in seconds
  const getRetryAfterSeconds = useCallback(() => {
    return Math.ceil(getRetryAfterTime() / 1000);
  }, [getRetryAfterTime]);

  // Wait for retry after period
  const waitForRetry = useCallback(async () => {
    const retryTime = getRetryAfterTime();
    if (retryTime > 0) {
      await new Promise(resolve => setTimeout(resolve, retryTime));
    }
  }, [getRetryAfterTime]);

  // Set up periodic status updates
  useEffect(() => {
    updateRateLimitStatus();
    updateQuotaStatus();

    // Update status every 5 seconds
    intervalRef.current = setInterval(() => {
      updateRateLimitStatus();
      updateQuotaStatus();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateRateLimitStatus, updateQuotaStatus]);

  return {
    // Rate limit status
    rateLimitStatus,
    canMakeRequest,
    recordRequest,
    handleRateLimitExceeded,
    
    // Retry after handling
    isRetryAfter,
    retryAfterTime,
    getRetryAfterTime,
    getRetryAfterSeconds,
    waitForRetry,
    
    // Quota management
    quotaStatus,
    checkQuota,
    recordQuotaUsage,
    
    // Status updates
    updateRateLimitStatus,
    updateQuotaStatus
  };
};

/**
 * Hook for managing multiple endpoints
 */
export const useMultiEndpointRateLimit = (endpoints, userId = null, applicationId = null) => {
  const [statuses, setStatuses] = useState({});
  const [overallStatus, setOverallStatus] = useState({
    canMakeRequest: true,
    worstEndpoint: null,
    totalRemainingRequests: 0
  });

  // Update all endpoint statuses
  const updateAllStatuses = useCallback(() => {
    const newStatuses = {};
    let totalRemaining = 0;
    let canMakeAnyRequest = false;
    let worstEndpoint = null;

    endpoints.forEach(endpoint => {
      const status = rateLimiter.getRateLimitStatus(endpoint, userId, applicationId);
      newStatuses[endpoint] = status;
      
      if (status.remainingRequests > 0) {
        canMakeAnyRequest = true;
        totalRemaining += status.remainingRequests;
      }
      
      if (!worstEndpoint || status.remainingRequests < worstEndpoint.remainingRequests) {
        worstEndpoint = status;
      }
    });

    setStatuses(newStatuses);
    setOverallStatus({
      canMakeRequest: canMakeAnyRequest,
      worstEndpoint,
      totalRemainingRequests: totalRemaining
    });
  }, [endpoints, userId, applicationId]);

  // Record request for specific endpoint
  const recordRequest = useCallback((endpoint) => {
    rateLimiter.recordRequest(endpoint, userId, applicationId);
    updateAllStatuses();
  }, [userId, applicationId, updateAllStatuses]);

  // Check if any endpoint can make a request
  const canMakeRequest = useCallback((preferredEndpoint = null) => {
    if (preferredEndpoint) {
      return rateLimiter.checkRateLimit(preferredEndpoint, userId, applicationId).allowed;
    }
    
    return endpoints.some(endpoint => 
      rateLimiter.checkRateLimit(endpoint, userId, applicationId).allowed
    );
  }, [endpoints, userId, applicationId]);

  // Get best endpoint to use
  const getBestEndpoint = useCallback(() => {
    let bestEndpoint = null;
    let maxRemaining = -1;

    endpoints.forEach(endpoint => {
      const status = rateLimiter.getRateLimitStatus(endpoint, userId, applicationId);
      if (status.remainingRequests > maxRemaining) {
        maxRemaining = status.remainingRequests;
        bestEndpoint = endpoint;
      }
    });

    return bestEndpoint;
  }, [endpoints, userId, applicationId]);

  useEffect(() => {
    updateAllStatuses();
    
    const interval = setInterval(updateAllStatuses, 5000);
    return () => clearInterval(interval);
  }, [updateAllStatuses]);

  return {
    statuses,
    overallStatus,
    canMakeRequest,
    recordRequest,
    getBestEndpoint,
    updateAllStatuses
  };
};

export default useRateLimit;