# APS Rate Limiting Integration Guide

This guide explains how to integrate Autodesk Platform Services (APS) rate limiting into your application to prevent 429 errors and optimize API usage.

## Overview

The rate limiting system consists of several components:

1. **RateLimitService** - Core service that tracks and enforces rate limits
2. **useRateLimit** - React hook for easy integration
3. **RateLimitMonitor** - UI component for monitoring rate limits
4. **EnhancedAPIService** - Wrapper service with built-in rate limiting

## Rate Limits

Based on APS documentation, the following rate limits apply:

### Hub Endpoints
- `GET /hubs`: 50 requests/minute
- `GET /hubs/{hub_id}`: 50 requests/minute

### Project Endpoints
- `GET /hubs/{hub_id}/projects`: 50 requests/minute
- `GET /hubs/{hub_id}/projects/{project_id}`: 50 requests/minute
- `GET /hubs/{hub_id}/projects/{project_id}/topFolders`: 300 requests/minute
- `GET /projects/{project_id}/downloads/{download_id}`: 300 requests/minute

### Folder Endpoints
- `GET /projects/{project_id}/folders/{folder_id}`: 300 requests/minute
- `GET /projects/{project_id}/folders/{folder_id}/contents`: 300 requests/minute
- `GET /projects/{project_id}/folders/{folder_id}/parent`: 50 requests/minute

### Item Endpoints
- `GET /projects/{project_id}/items/{item_id}`: 300 requests/minute
- `GET /projects/{project_id}/items/{item_id}/versions`: 800 requests/minute

### OSS Overall Limit
- **1000 requests/minute** across all OSS endpoints

## Usage Examples

### 1. Basic Integration with useRateLimit Hook

```javascript
import { useRateLimit } from '../hooks/useRateLimit';

const MyComponent = () => {
  const {
    makeRequest,
    canMakeRequest,
    getTimeUntilNextRequest,
    statistics,
    warnings
  } = useRateLimit();

  const loadData = async () => {
    if (!canMakeRequest('GET', '/projects/{project_id}/folders/{folder_id}')) {
      const waitTime = getTimeUntilNextRequest('GET', '/projects/{project_id}/folders/{folder_id}');
      console.log(`Rate limit reached. Wait ${waitTime}ms`);
      return;
    }

    try {
      const response = await makeRequest(
        () => fetch('/api/data'),
        'GET',
        '/projects/{project_id}/folders/{folder_id}'
      );
      
      const data = await response.json();
      console.log('Data loaded:', data);
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return (
    <div>
      <button onClick={loadData}>Load Data</button>
      {warnings.length > 0 && (
        <div className="warning">
          {warnings.length} rate limit warnings
        </div>
      )}
    </div>
  );
};
```

### 2. Using EnhancedAPIService

```javascript
import enhancedAPIService from '../services/EnhancedAPIService';

const loadProjectData = async (hubId, projectId, accessToken) => {
  try {
    // All these calls are automatically rate-limited
    const projects = await enhancedAPIService.getProjects(hubId, accessToken);
    const project = await enhancedAPIService.getProject(hubId, projectId, accessToken);
    const folders = await enhancedAPIService.getTopFolders(hubId, projectId, accessToken);
    
    return { projects, project, folders };
  } catch (error) {
    console.error('API calls failed:', error);
    throw error;
  }
};
```

### 3. Rate Limit Monitoring

```javascript
import RateLimitMonitor from '../components/RateLimitMonitor';

const App = () => {
  const [showMonitor, setShowMonitor] = useState(false);

  return (
    <div>
      <button onClick={() => setShowMonitor(true)}>
        Show Rate Monitor
      </button>
      
      {showMonitor && (
        <RateLimitMonitor 
          isVisible={showMonitor}
          onClose={() => setShowMonitor(false)}
        />
      )}
    </div>
  );
};
```

### 4. Custom Rate Limit Checks

```javascript
import rateLimitService from '../services/RateLimitService';

const checkRateLimits = () => {
  // Check specific endpoint
  const canMakeRequest = rateLimitService.canMakeRequest(
    'GET', 
    '/projects/{project_id}/folders/{folder_id}'
  );
  
  // Get time until next request
  const waitTime = rateLimitService.getTimeUntilNextRequest(
    'GET', 
    '/projects/{project_id}/folders/{folder_id}'
  );
  
  // Check OSS overall limit
  const ossStatus = rateLimitService.getOSSStatus();
  
  console.log('Can make request:', canMakeRequest);
  console.log('Wait time:', waitTime);
  console.log('OSS status:', ossStatus);
};
```

## Features

### Automatic Rate Limiting
- Tracks requests per endpoint
- Prevents exceeding rate limits
- Automatic retry with exponential backoff
- Handles 429 responses gracefully

### Monitoring and Alerts
- Real-time rate limit statistics
- Warning system for high utilization
- Violation tracking and reporting
- OSS overall limit monitoring

### Retry Logic
- Exponential backoff for failed requests
- Configurable retry attempts
- Automatic delay calculation
- Rate limit violation handling

### User Interface
- Rate limit monitor component
- Visual status indicators
- Warning notifications
- Statistics dashboard

## Configuration

### Retry Configuration
```javascript
const retryConfig = {
  maxRetries: 3,           // Maximum retry attempts
  baseDelay: 1000,         // Base delay in milliseconds
  maxDelay: 30000,         // Maximum delay in milliseconds
  backoffMultiplier: 2     // Exponential backoff multiplier
};
```

### Monitoring Configuration
```javascript
const monitoring = {
  enabled: true,           // Enable monitoring
  warnings: [],            // Warning threshold (0-100)
  violations: []          // Track violations
};
```

## Best Practices

### 1. Batch Requests
Instead of making multiple individual requests, batch them when possible:

```javascript
// Bad: Multiple individual requests
const loadMultipleFolders = async (folderIds) => {
  const results = [];
  for (const folderId of folderIds) {
    const response = await enhancedAPIService.getFolder(projectId, folderId, token);
    results.push(response);
  }
  return results;
};

// Good: Batch requests or use pagination
const loadMultipleFolders = async (folderIds) => {
  // Use search endpoint with multiple folder IDs
  const response = await enhancedAPIService.searchFolders(
    projectId, 
    rootFolderId, 
    { folderIds: folderIds.join(',') }, 
    token
  );
  return response;
};
```

### 2. Cache Results
Cache API responses to reduce redundant requests:

```javascript
const cache = new Map();

const getCachedData = async (key, fetchFunction) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetchFunction();
  cache.set(key, data);
  return data;
};
```

### 3. Monitor Rate Limits
Always monitor rate limit status:

```javascript
const { statistics, warnings } = useRateLimit();

useEffect(() => {
  if (warnings.length > 0) {
    console.warn('Rate limit warnings:', warnings);
    // Show user notification
  }
}, [warnings]);
```

### 4. Handle Errors Gracefully
Implement proper error handling for rate limit violations:

```javascript
const loadData = async () => {
  try {
    const response = await makeRequest(fetchFunction, 'GET', endpoint);
    return response;
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      // Show user-friendly message
      showNotification('Rate limit reached. Please wait a moment and try again.');
    } else {
      // Handle other errors
      console.error('Request failed:', error);
    }
  }
};
```

## Troubleshooting

### Common Issues

1. **429 Rate Limit Exceeded**
   - Check if you're making too many requests
   - Implement proper retry logic
   - Use rate limit monitoring

2. **Slow API Responses**
   - Check rate limit utilization
   - Consider batching requests
   - Implement caching

3. **Inconsistent Behavior**
   - Verify rate limit configuration
   - Check for duplicate requests
   - Monitor OSS overall limit

### Debug Information

```javascript
// Get detailed statistics
const stats = rateLimitService.getStatistics();
console.log('Rate limit statistics:', stats);

// Get warnings
const warnings = rateLimitService.getWarnings(80);
console.log('Rate limit warnings:', warnings);

// Get OSS status
const ossStatus = rateLimitService.getOSSStatus();
console.log('OSS status:', ossStatus);
```

## Integration Checklist

- [ ] Import rate limiting services
- [ ] Replace direct fetch calls with enhanced API service
- [ ] Add rate limit monitoring to components
- [ ] Implement error handling for rate limit violations
- [ ] Test with high request volumes
- [ ] Monitor rate limit statistics
- [ ] Configure retry logic appropriately
- [ ] Add user notifications for rate limit warnings

## Performance Considerations

- Rate limiting adds minimal overhead
- Automatic retry logic prevents failed requests
- Monitoring provides valuable insights
- Caching reduces redundant API calls
- Batch requests optimize rate limit usage

This rate limiting system ensures your application stays within APS rate limits while providing a smooth user experience.
