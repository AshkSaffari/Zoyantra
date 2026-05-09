# APS Data Management Rate Limits Implementation Guide

This document explains how the Zoyantra application implements rate limiting based on the official Autodesk Platform Services (APS) Data Management API rate limits.

## Overview

The APS Data Management services observe rate limits to ensure all clients get sufficient service and prevent runaway applications from consuming excessive resources. Our implementation follows the official APS documentation for rate limits and quotas.

## Rate Limit Categories

### 1. Project and Data Service Rate Limits

These rate limits apply to each of the Data Management API's endpoints. The rates are not service guarantees - in cases where total service use is too high across all clients, accepted request rates may drop until traffic subsides.

#### Hub Endpoints
| Method | Endpoint | Limit (requests/minute) |
|--------|----------|------------------------|
| GET | `/hubs` | 50 |
| GET | `/hubs/{hub_id}` | 50 |

#### Project Endpoints
| Method | Endpoint | Limit (requests/minute) |
|--------|----------|------------------------|
| GET | `/hubs/{hub_id}/projects` | 50 |
| GET | `/hubs/{hub_id}/projects/{project_id}` | 50 |
| GET | `/hubs/{hub_id}/projects/{project_id}/hub` | 50 |
| GET | `/hubs/{hub_id}/projects/{project_id}/topFolders` | 300 |
| GET | `/projects/{project_id}/downloads/{download_id}` | 300 |
| GET | `/projects/{project_id}/jobs/{job_id}` | 300 |
| POST | `/projects/{project_id}/downloads` | 50 |
| POST | `/projects/{project_id}/storage` | 300 |

#### Folder Endpoints
| Method | Endpoint | Limit (requests/minute) |
|--------|----------|------------------------|
| GET | `/projects/{project_id}/folders/{folder_id}` | 300 |
| GET | `/projects/{project_id}/folders/{folder_id}/contents` | 300 |
| GET | `/projects/{project_id}/folders/{folder_id}/parent` | 50 |
| GET | `/projects/{project_id}/folders/{folder_id}/refs` | 50 |
| GET | `/projects/{project_id}/folders/{folder_id}/relationships/links` | 50 |
| GET | `/projects/{project_id}/folders/{folder_id}/relationships/refs` | 50 |
| GET | `/projects/{project_id}/folders/{folder_id}/search` | 300 |
| POST | `/projects/{project_id}/folders` | 50 |
| POST | `/projects/{project_id}/folders/{folder_id}/relationships/refs` | 50 |
| PATCH | `/projects/{project_id}/folders/{folder_id}` | 50 |

#### Item Endpoints
| Method | Endpoint | Limit (requests/minute) |
|--------|----------|------------------------|
| GET | `/projects/{project_id}/items/{item_id}` | 300 |
| GET | `/projects/{project_id}/items/{item_id}/parent` | 50 |
| GET | `/projects/{project_id}/items/{item_id}/refs` | 300 |
| GET | `/projects/{project_id}/items/{item_id}/relationships/refs` | 50 |
| GET | `/projects/{project_id}/items/{item_id}/relationships/links` | 50 |
| GET | `/projects/{project_id}/items/{item_id}/tip` | 50 |
| GET | `/projects/{project_id}/items/{item_id}/versions` | 800 |
| POST | `/projects/{project_id}/items` | 50 |
| POST | `/projects/{project_id}/items/{item_id}/relationships/refs` | 50 |
| PATCH | `/projects/{project_id}/items/{item_id}` | 50 |

#### Version Endpoints
| Method | Endpoint | Limit (requests/minute) |
|--------|----------|------------------------|
| GET | `/projects/{project_id}/versions/{version_id}` | 300 |
| GET | `/projects/{project_id}/versions/{version_id}/downloadFormats` | 50 |
| GET | `/projects/{project_id}/versions/{version_id}/downloads` | 50 |
| GET | `/projects/{project_id}/versions/{version_id}/item` | 50 |
| GET | `/projects/{project_id}/versions/{version_id}/refs` | 50 |
| GET | `/projects/{project_id}/versions/{version_id}/relationships/links` | 50 |
| GET | `/projects/{project_id}/versions/{version_id}/relationships/refs` | 50 |
| POST | `/projects/{project_id}/versions` | 300 |
| POST | `/projects/{project_id}/versions/{version_id}/relationships/refs` | 50 |
| POST | `/projects/{project_id}/versions/{version_id}/relationships/links` | 50 |
| PATCH | `/projects/{project_id}/versions/{version_id}` | 50 |
| PATCH | `/projects/{project_id}/versions/{version_id}/relationships/links/{link_id}` | 50 |

#### Command Endpoint
| Method | Endpoint | Limit (requests/minute) |
|--------|----------|------------------------|
| POST | `/projects/{project_id}/commands` | 300 |

### 2. OSS Rate Limit

The Object Storage service defines an overall rate limit of **1000 requests per minute** for all OSS endpoints combined.

## Implementation Details

### Rate Limiter Class (`src/utils/rateLimiter.js`)

Our implementation includes:

1. **Endpoint-Specific Rate Limiting**: Each endpoint has its own rate limit based on official APS documentation
2. **Pattern Matching**: Intelligent pattern matching to identify endpoints and apply correct limits
3. **Retry-After Handling**: Automatic handling of HTTP 429 responses with Retry-After headers
4. **Request Tracking**: Per-endpoint request tracking with sliding window
5. **Quota Management**: Resource quota tracking for file sizes, processing time, etc.

### Key Features

#### 1. Automatic Rate Limit Detection
```javascript
// The rate limiter automatically detects endpoint patterns
const status = rateLimiter.checkRateLimit('https://developer.api.autodesk.com/projects/123/folders/456/contents');
// Returns: { allowed: true, currentRequests: 5, maxRequests: 300, remainingRequests: 295 }
```

#### 2. Retry-After Handling
```javascript
// When a 429 response is received
rateLimiter.handleRateLimitExceeded(endpoint, 30); // 30 seconds retry-after
// Subsequent requests will be blocked until the retry period expires
```

#### 3. Request Recording
```javascript
// Record a successful request
rateLimiter.recordRequest(endpoint, userId, applicationId);
```

#### 4. Status Monitoring
```javascript
// Get current rate limit status
const status = rateLimiter.getRateLimitStatus(endpoint);
console.log(`Current: ${status.currentRequests}/${status.maxRequests} requests`);
```

### Usage in Components

#### React Hook (`src/hooks/useRateLimit.js`)
```javascript
const { checkRateLimit, recordRequest, status } = useRateLimit();

// Before making an API call
const canMakeRequest = checkRateLimit(endpoint);
if (canMakeRequest.allowed) {
  // Make the API call
  const response = await fetch(endpoint);
  recordRequest(endpoint);
} else {
  console.log(`Rate limited: ${canMakeRequest.message}`);
}
```

#### Rate Limit Status Component (`src/components/RateLimitStatus.js`)
```javascript
<RateLimitStatus 
  endpoint={endpoint}
  showDetails={true}
  onRetryAfterExpired={() => console.log('Retry period expired')}
/>
```

## Scope and Limitations

### Project and Data Service Scope
- Rate limits are set per application (client ID) per API endpoint
- Applications can exceed 300 combined requests per minute if requests go to separate endpoints
- Each endpoint has its own independent rate limit

### OSS Scope
- OSS has an overall rate limit of 1000 requests per minute across all endpoints
- This applies to all OSS operations combined (buckets, objects, etc.)

## Violation Handling

### HTTP 429 Response
When an application exceeds an endpoint's rate limit:
1. The service returns HTTP 429 "Too Many Requests"
2. Response includes `Retry-After` header with seconds to wait
3. Our rate limiter automatically handles this and blocks requests until the retry period expires

### Example 429 Response
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 25
Server: Apigee Router
Content-Length: 44

{"developerMessage":"Quota limit exceeded."}
```

## Best Practices

### 1. Request Batching
- Batch multiple operations when possible
- Use pagination to reduce the number of requests
- Cache frequently accessed data

### 2. Error Handling
- Always check rate limit status before making requests
- Implement exponential backoff for retries
- Monitor rate limit usage in production

### 3. Monitoring
- Track rate limit usage across your application
- Set up alerts for approaching rate limits
- Monitor retry-after periods

### 4. Optimization
- Use the most efficient endpoints for your use case
- Consider using higher-limit endpoints when possible
- Implement request queuing for high-volume operations

## Configuration

### Environment Variables
```javascript
// Optional: Override default rate limits
REACT_APP_RATE_LIMIT_OVERRIDE=true
REACT_APP_CUSTOM_RATE_LIMITS='{"folders": 400, "items": 400}'
```

### Custom Rate Limits
```javascript
// Set custom rate limits for specific endpoints
rateLimiter.setCustomRateLimit('/custom/endpoint', { maxRequests: 100, windowMs: 60000 });
```

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**: Check if you're making too many requests to the same endpoint
2. **Retry-After Not Respected**: Ensure the rate limiter is properly handling 429 responses
3. **Pattern Matching Issues**: Verify endpoint patterns are correctly matched

### Debug Information
```javascript
// Get comprehensive status
const fullStatus = rateLimiter.getFullStatus();
console.log('Rate Limit Status:', fullStatus);

// Clear rate limit data for testing
rateLimiter.clearRateLimitData();
```

## Conclusion

This implementation ensures compliance with APS Data Management rate limits while providing a robust foundation for handling API requests efficiently. The rate limiter automatically adapts to different endpoint patterns and provides comprehensive monitoring and error handling capabilities.

For more information, refer to the official APS documentation on rate limits and quotas.
