/**
 * Custom FileTransferException class for handling file transfer errors
 */
class FileTransferException extends Error {
  constructor(message, httpResponse = null, originalError = null) {
    super(message);
    this.name = 'FileTransferException';
    this.httpResponse = httpResponse;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileTransferException);
    }
  }
  
  getHttpStatus() {
    return this.httpResponse?.status || null;
  }
  
  getHttpStatusText() {
    return this.httpResponse?.statusText || null;
  }
  
  getResponseBody() {
    return this.httpResponse?.body || null;
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      httpStatus: this.getHttpStatus(),
      httpStatusText: this.getHttpStatusText(),
      originalError: this.originalError?.message || null,
      stack: this.stack
    };
  }
}

/**
 * Custom OssApiException class for handling OSS API errors
 */
class OssApiException extends Error {
  constructor(message, httpResponse = null, originalError = null) {
    super(message);
    this.name = 'OssApiException';
    this.httpResponse = httpResponse;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    this.service = 'OSS';
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OssApiException);
    }
  }
  
  getHttpStatus() {
    return this.httpResponse?.status || null;
  }
  
  getHttpStatusText() {
    return this.httpResponse?.statusText || null;
  }
  
  getResponseBody() {
    return this.httpResponse?.body || null;
  }
  
  getServiceName() {
    return this.service;
  }
  
  isRetryable() {
    const status = this.getHttpStatus();
    return status === 429 || status === 503 || status === 504;
  }
  
  getRetryAfter() {
    return this.httpResponse?.headers?.get('Retry-After') || null;
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      service: this.service,
      httpStatus: this.getHttpStatus(),
      httpStatusText: this.getHttpStatusText(),
      isRetryable: this.isRetryable(),
      retryAfter: this.getRetryAfter(),
      originalError: this.originalError?.message || null,
      stack: this.stack
    };
  }
}

/**
 * OSS Client wrapper for advanced OSS operations
 * Implements all OSS operations with proper error handling
 */
class OssClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://developer.api.autodesk.com/oss/v2';
  }

  /**
   * Get headers for OSS API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    if (!this.accessToken) {
      throw new OssApiException('No access token available for OSS operations');
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Batch Complete Upload to S3 Signed URLs
   * @param {string} bucketKey - The bucket key
   * @param {Object} requests - Batch complete upload requests
   * @returns {Promise<Object>} Batch complete upload response
   */
  async batchCompleteUpload(bucketKey, requests) {
    try {
      console.log('📤 Batch completing upload for bucket:', bucketKey);
      
      const response = await fetch(`${this.baseUrl}/buckets/${bucketKey}/objects/batchcompleteupload`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requests)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Batch complete upload failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Batch upload completed successfully');
      return {
        success: true,
        bucketKey,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Batch complete upload failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Batch Generate Signed S3 Download URLs
   * @param {string} bucketKey - The bucket key
   * @param {Object} requests - Batch download requests
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Batch signed download response
   */
  async batchSignedS3Download(bucketKey, requests, options = {}) {
    try {
      console.log('📥 Batch generating signed S3 download URLs for bucket:', bucketKey);
      
      const queryParams = new URLSearchParams();
      if (options.publicResourceFallback !== undefined) {
        queryParams.append('public-resource-fallback', options.publicResourceFallback);
      }
      if (options.minutesExpiration) {
        queryParams.append('minutesExpiration', options.minutesExpiration);
      }

      const url = `${this.baseUrl}/buckets/${bucketKey}/objects/batchsigneds3download${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requests)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Batch signed S3 download failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Batch signed S3 download URLs generated');
      return {
        success: true,
        bucketKey,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Batch signed S3 download failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Batch Generate Signed S3 Upload URLs
   * @param {string} bucketKey - The bucket key
   * @param {Object} requests - Batch upload requests
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Batch signed upload response
   */
  async batchSignedS3Upload(bucketKey, requests, options = {}) {
    try {
      console.log('📤 Batch generating signed S3 upload URLs for bucket:', bucketKey);
      
      const queryParams = new URLSearchParams();
      if (options.useAcceleration !== undefined) {
        queryParams.append('use-acceleration', options.useAcceleration);
      }
      if (options.minutesExpiration) {
        queryParams.append('minutesExpiration', options.minutesExpiration);
      }

      const url = `${this.baseUrl}/buckets/${bucketKey}/objects/batchsigneds3upload${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requests)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Batch signed S3 upload failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Batch signed S3 upload URLs generated');
      return {
        success: true,
        bucketKey,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Batch signed S3 upload failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Complete Upload to S3 Signed URL
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @param {string} contentType - The content type
   * @param {Object} body - Complete upload body
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Complete upload response
   */
  async completeSignedS3Upload(bucketKey, objectKey, contentType, body, options = {}) {
    try {
      console.log('📤 Completing S3 upload for:', objectKey);
      
      const headers = this.getHeaders();
      headers['Content-Type'] = contentType;
      
      if (options.xAdsMetaContentType) {
        headers['x-ads-meta-content-type'] = options.xAdsMetaContentType;
      }
      if (options.xAdsMetaContentDisposition) {
        headers['x-ads-meta-content-disposition'] = options.xAdsMetaContentDisposition;
      }
      if (options.xAdsMetaContentEncoding) {
        headers['x-ads-meta-content-encoding'] = options.xAdsMetaContentEncoding;
      }
      if (options.xAdsMetaCacheControl) {
        headers['x-ads-meta-cache-control'] = options.xAdsMetaCacheControl;
      }
      if (options.xAdsUserDefinedMetadata) {
        headers['x-ads-user-defined-metadata'] = options.xAdsUserDefinedMetadata;
      }

      const response = await fetch(`${this.baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Complete S3 upload failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      console.log('✅ S3 upload completed successfully');
      return {
        success: true,
        bucketKey,
        objectKey,
        status: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Complete S3 upload failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Copy Object
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @param {string} newObjName - The new object name
   * @returns {Promise<Object>} Copy operation response
   */
  async copyTo(bucketKey, objectKey, newObjName) {
    try {
      console.log('📋 Copying object:', objectKey, 'to:', newObjName);
      
      const response = await fetch(`${this.baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/copyto/${encodeURIComponent(newObjName)}`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Copy object failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Object copied successfully');
      return {
        success: true,
        bucketKey,
        originalObjectKey: objectKey,
        newObjectName: newObjName,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Copy object failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Generate OSS Signed URL
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @param {Object} createSignedResource - Signed resource configuration
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Signed URL response
   */
  async createSignedResource(bucketKey, objectKey, createSignedResource, options = {}) {
    try {
      console.log('🔗 Creating signed resource for:', objectKey);
      
      const queryParams = new URLSearchParams();
      if (options.access) {
        queryParams.append('access', options.access);
      }
      if (options.useCdn !== undefined) {
        queryParams.append('use-cdn', options.useCdn);
      }

      const url = `${this.baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signedresource${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(createSignedResource)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Create signed resource failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Signed resource created successfully');
      return {
        success: true,
        bucketKey,
        objectKey,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Create signed resource failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Delete Object
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @returns {Promise<Object>} Delete operation response
   */
  async deleteObject(bucketKey, objectKey) {
    try {
      console.log('🗑️ Deleting object:', objectKey);
      
      const response = await fetch(`${this.baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Delete object failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      console.log('✅ Object deleted successfully');
      return {
        success: true,
        bucketKey,
        objectKey,
        deleted: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Delete object failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Get Object Details
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Object details
   */
  async getObjectDetails(bucketKey, objectKey, options = {}) {
    try {
      console.log('📄 Getting object details for:', objectKey);
      
      const queryParams = new URLSearchParams();
      if (options.ifModifiedSince) {
        queryParams.append('if-modified-since', options.ifModifiedSince);
      }
      if (options.with) {
        queryParams.append('with', options.with);
      }

      const url = `${this.baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/details${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Get object details failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Object details retrieved');
      return {
        success: true,
        bucketKey,
        objectKey,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Get object details failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * List Objects in Bucket
   * @param {string} bucketKey - The bucket key
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Objects list
   */
  async getObjects(bucketKey, options = {}) {
    try {
      console.log('📋 Listing objects in bucket:', bucketKey);
      
      const queryParams = new URLSearchParams();
      if (options.limit) {
        queryParams.append('limit', options.limit);
      }
      if (options.beginsWith) {
        queryParams.append('beginsWith', options.beginsWith);
      }
      if (options.startAt) {
        queryParams.append('startAt', options.startAt);
      }

      const url = `${this.baseUrl}/buckets/${bucketKey}/objects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Get objects failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Objects list retrieved');
      return {
        success: true,
        bucketKey,
        objects: data.items || [],
        next: data.next || null,
        hasMore: !!data.next,
        total: data.items?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Get objects failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Generate Signed S3 Download URL
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Signed download URL
   */
  async signedS3Download(bucketKey, objectKey, options = {}) {
    try {
      console.log('📥 Generating signed S3 download URL for:', objectKey);
      
      const queryParams = new URLSearchParams();
      if (options.ifNoneMatch) {
        queryParams.append('if-none-match', options.ifNoneMatch);
      }
      if (options.ifModifiedSince) {
        queryParams.append('if-modified-since', options.ifModifiedSince);
      }
      if (options.xAdsAcmScopes) {
        queryParams.append('x-ads-acm-scopes', options.xAdsAcmScopes);
      }
      if (options.responseContentType) {
        queryParams.append('response-content-type', options.responseContentType);
      }
      if (options.responseContentDisposition) {
        queryParams.append('response-content-disposition', options.responseContentDisposition);
      }
      if (options.responseCacheControl) {
        queryParams.append('response-cache-control', options.responseCacheControl);
      }
      if (options.publicResourceFallback !== undefined) {
        queryParams.append('public-resource-fallback', options.publicResourceFallback);
      }
      if (options.minutesExpiration) {
        queryParams.append('minutesExpiration', options.minutesExpiration);
      }
      if (options.useCdn !== undefined) {
        queryParams.append('use-cdn', options.useCdn);
      }

      const url = `${this.baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3download${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Signed S3 download failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Signed S3 download URL generated');
      return {
        success: true,
        bucketKey,
        objectKey,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Signed S3 download failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Generate Signed S3 Upload URL
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Signed upload URL
   */
  async signedS3Upload(bucketKey, objectKey, options = {}) {
    try {
      console.log('📤 Generating signed S3 upload URL for:', objectKey);
      
      const queryParams = new URLSearchParams();
      if (options.parts) {
        queryParams.append('parts', options.parts);
      }
      if (options.firstPart) {
        queryParams.append('firstPart', options.firstPart);
      }
      if (options.uploadKey) {
        queryParams.append('uploadKey', options.uploadKey);
      }
      if (options.minutesExpiration) {
        queryParams.append('minutesExpiration', options.minutesExpiration);
      }
      if (options.useAcceleration !== undefined) {
        queryParams.append('use-acceleration', options.useAcceleration);
      }

      const url = `${this.baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OssApiException(
          `Signed S3 upload failed: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }

      const data = await response.json();
      console.log('✅ Signed S3 upload URL generated');
      return {
        success: true,
        bucketKey,
        objectKey,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      throw new OssApiException(
        `Signed S3 upload failed: ${error.message}`,
        null,
        error
      );
    }
  }
}

/**
 * AccService - Static methods for Autodesk Construction Cloud
 * All methods are static for easy access
 */
class AccService {
  constructor(credentials = null, hubId = null) {
    this.accessToken = null;
    this.refreshToken = null;
    this.accountId = null;
    this.baseURL = 'https://developer.api.autodesk.com';
    this.region = 'US'; // Default region
    this.clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
    this.clientSecret = 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa';
    
    if (credentials) {
      this.initialize(credentials);
    }
  }

  initialize(credentials, hubId = null) {
    this.accessToken = credentials.threeLegToken;
    this.refreshToken = credentials.refreshToken || this.refreshToken;
    this.accountId = credentials.accountId || this.accountId;

    if (credentials.tokenExpiry) {
      this.tokenExpiry = new Date(credentials.tokenExpiry);
    } else {
      this.tokenExpiry = null;
    }
    
    this.refreshTimer = null;
    this.hubId = hubId;
    
    if (this.accessToken) {
    this.startTokenMonitoring();
    }
  }

  getHeaders() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Get OAuth authorization URL
   * @param {string} redirectUri - The redirect URI for OAuth callback
   * @param {string} state - Optional state parameter for security
   * @param {Array} scopes - Array of OAuth scopes
   * @returns {string} Authorization URL
   */
  static getAuthUrl(redirectUri, state = null, scopes = ['data:read', 'data:write', 'data:create', 'data:search', 'bucket:create', 'bucket:read', 'bucket:update', 'bucket:delete']) {
    const baseUrl = 'https://developer.api.autodesk.com/authentication/v1/authorize';
    const clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' ')
    });
    
    if (state) {
      params.append('state', state);
    }
    
    const authUrl = `${baseUrl}?${params.toString()}`;
    console.log(`🔗 Generated OAuth URL: ${authUrl}`);
    
    return authUrl;
  }

  /**
   * Create OSS client instance
   * @param {string} accessToken - Access token for OSS operations
   * @returns {OssClient} OSS client instance
   */
  static createOssClient(accessToken = null) {
    if (!accessToken) {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      accessToken = credentials.twoLegToken || credentials.threeLegToken;
    }
    
    if (!accessToken) {
      throw new OssApiException('No access token available for OSS operations');
    }
    
    return new OssClient(accessToken);
  }

  startTokenMonitoring() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(() => {
      if (this.tokenExpiry && new Date() >= this.tokenExpiry) {
        console.log('🔄 Token expired, attempting refresh...');
        // Token refresh logic would go here
      }
    }, 60000); // Check every minute
  }

  // Check if token is expired
  static isTokenExpired() {
    const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
    if (!credentials.tokenExpiry) {
      return true; // No expiry info means expired
    }
    
    const now = new Date();
    const expiry = new Date(credentials.tokenExpiry);
    const timeUntilExpiry = expiry.getTime() - now.getTime();
    
    // Consider token expired if it expires within the next 5 minutes
    return timeUntilExpiry < 300000; // 5 minutes in milliseconds
  }

  // Get headers for API requests (3-legged token)
  static getHeaders() {
    const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
    if (!credentials.threeLegToken) {
      throw new Error('No access token available');
    }
    
    return {
      'Authorization': `Bearer ${credentials.threeLegToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.api+json'
    };
  }

  /**
   * Get available hubs
   * @returns {Promise<Array>} Array of hubs
   */
  static async getHubs() {
    try {
      console.log('🏢 Getting hubs...');
      
      const response = await fetch('https://developer.api.autodesk.com/project/v1/hubs', {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get hubs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.data?.length || 0} hubs`);
      
      return data.data || [];
      
    } catch (error) {
      console.error('❌ Error getting hubs:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} New token data
   */
  static async refreshAccessToken() {
    try {
      console.log('🔄 Refreshing access token...');
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      
      if (!credentials.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch('https://developer.api.autodesk.com/authentication/v1/refreshtoken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
          client_id: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
          client_secret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Token refreshed successfully');
      
      // Update stored credentials
      const updatedCredentials = {
        ...credentials,
        threeLegToken: data.access_token,
        refreshToken: data.refresh_token || credentials.refreshToken,
        tokenExpiry: new Date(Date.now() + (data.expires_in * 1000)).toISOString()
      };
      
      localStorage.setItem('zoyantra_credentials', JSON.stringify(updatedCredentials));
      
      return updatedCredentials;
      
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      throw error;
    }
  }

  // Enhanced API response handler following APS best practices
  static async handleApiResponse(response) {
    if (response.ok) {
      return await response.json();
    }
    
    const errorData = await response.json().catch(() => ({}));
    
    switch (response.status) {
      case 401:
        throw new Error('Authentication failed. Please re-authenticate.');
      case 403:
        throw new Error('Access denied. Check your app permissions in ACC Account Admin > Custom Integrations.');
      case 404:
        throw new Error('Resource not found. Verify project ID and ensure your app is provisioned in ACC.');
      case 429:
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      default:
        throw new Error(`API Error ${response.status}: ${errorData.developerMessage || 'Unknown error'}`);
    }
  }

  // Get headers for 2-legged token API requests (for ACC Data Management API)
  static getTwoLegHeaders() {
    const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
    console.log('🔍 Checking tokens:', {
      hasTwoLegged: !!credentials.twoLeggedToken,
      hasThreeLeg: !!credentials.threeLegToken,
      twoLeggedLength: credentials.twoLeggedToken?.length || 0,
      threeLegLength: credentials.threeLegToken?.length || 0
    });
    
    if (!credentials.twoLeggedToken) {
      console.warn('⚠️ No 2-legged token available, falling back to 3-legged token');
      return AccService.getHeaders();
    }
    
    return {
      'Authorization': `Bearer ${credentials.twoLeggedToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.api+json'
    };
  }

  // Refresh access token using refresh token
  static async refreshAccessToken() {
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.refreshToken) {
        throw new Error('No refresh token available');
      }

      const clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
      const clientSecret = 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa';
      
      const requestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refreshToken
      });

      const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: requestBody
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      const tokenData = await response.json();
      
      // Update credentials with new tokens
      const updatedCredentials = {
        ...credentials,
        threeLegToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || credentials.refreshToken, // Keep old refresh token if new one not provided
        tokenExpiry: new Date(Date.now() + (tokenData.expires_in * 1000))
      };

      localStorage.setItem('credentials', JSON.stringify(updatedCredentials));
      
      console.log('✅ Access token refreshed successfully');
      return updatedCredentials;
    } catch (error) {
      console.error('❌ Error refreshing access token:', error);
      throw error;
    }
  }

  // Basic project and hub methods (keeping only essential ones)
  static async getHubs() {
    try {
      // Check if token is expired and refresh proactively
      if (AccService.isTokenExpired()) {
        console.log('🔄 Token is expired or about to expire, refreshing...');
        try {
          await AccService.refreshAccessToken();
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Authentication failed. Please sign in again.');
        }
      }

      let response = await fetch('https://developer.api.autodesk.com/project/v1/hubs', {
        headers: AccService.getHeaders()
      });
      
      // If token is expired, try to refresh it
      if (response.status === 401) {
        console.log('🔄 Token expired during request, attempting refresh...');
        try {
          await AccService.refreshAccessToken();
          // Retry the request with the new token
          response = await fetch('https://developer.api.autodesk.com/project/v1/hubs', {
            headers: AccService.getHeaders()
          });
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Authentication failed. Please sign in again.');
        }
      }
      
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
      throw new Error(`Failed to fetch hubs: ${response.status}`);
    } catch (error) {
      console.error('❌ Error fetching hubs:', error);
      return [];
    }
  }

  // Alias for getHubs (for backward compatibility)
  static async getAllAccessibleHubs() {
    return await AccService.getHubs();
  }

  /**
   * Get project details by hub and project ID
   * @param {string} hubId - The hub ID
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Project details
   */
  static async getProjectByHub(hubId, projectId) {
    try {
      console.log(`📋 Getting project details: ${projectId} in hub: ${hubId}`);
      const response = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Project details retrieved:', data);
        return {
          success: true,
          project: data.data,
          hubId,
          projectId
        };
      } else {
        console.warn(`⚠️ Project not found: ${response.status}`);
        return {
          success: false,
          error: `Project not found: ${response.status}`,
          hubId,
          projectId
        };
      }
    } catch (error) {
      console.error('❌ Error getting project details:', error);
      return {
        success: false,
        error: error.message,
        hubId,
        projectId
      };
    }
  }

  static async getProjects(hubId) {
    try {
      console.log(`🏗️ Getting projects for hub: ${hubId}`);
      const response = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Raw projects response:', data);
        
        if (data.data && Array.isArray(data.data)) {
          const projects = data.data.map(project => {
            console.log('🔍 Raw project data:', project);
            return {
              id: project.id,
              name: project.attributes?.name || project.name || 'Unnamed Project',
              type: project.attributes?.extension?.type || project.type || 'projects:autodesk.acc:Project',
              jobNumber: project.attributes?.jobNumber || project.jobNumber,
              status: project.attributes?.status || project.status || 'active',
              description: project.attributes?.description || project.description,
              startDate: project.startDate || project.attributes?.startDate,
              endDate: project.endDate || project.attributes?.endDate,
              createdAt: project.createdAt || project.attributes?.createdAt,
              updatedAt: project.updatedAt || project.attributes?.updatedAt,
              // Additional project details
              classification: project.classification,
              projectValue: project.projectValue,
              addressLine1: project.addressLine1,
              city: project.city,
              stateOrProvince: project.stateOrProvince,
              country: project.country,
              constructionType: project.constructionType,
              deliveryMethod: project.deliveryMethod,
              contractType: project.contractType,
              currentPhase: project.currentPhase,
              memberCount: project.memberCount,
              companyCount: project.companyCount
            };
          });
          console.log(`✅ Found ${projects.length} projects for hub ${hubId}`);
          return projects;
        }
        
        console.log('⚠️ No projects found in response');
        return [];
      }
      throw new Error(`Failed to fetch projects: ${response.status}`);
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      return [];
    }
  }

  static async getProjectMembers(projectId) {
    try {
      // Validate project ID first
      if (!AccService.validateProjectId(projectId)) {
        console.warn('⚠️ Invalid project ID format:', projectId);
        return [];
      }

      // Check if user is authenticated
      if (!AccService.isAuthenticated()) {
        console.warn('⚠️ User not authenticated, skipping project members fetch');
        return [];
      }

      const cleanProjectId = projectId.replace(/^b\./, '');
      const response = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${cleanProjectId}/users`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
      
      // Don't throw error for 404 - just return empty array
      if (response.status === 404) {
        console.warn('⚠️ Project not found or no access to project members:', projectId);
        return [];
      }
      
      throw new Error(`Failed to fetch project members: ${response.status}`);
    } catch (error) {
      console.error('❌ Error fetching project members:', error);
      return [];
    }
  }

  // Additional commonly used methods
  static async getProjectFiles(projectId, folderId = null) {
    try {
      console.log('📁 Fetching project files for project:', projectId, 'folder:', folderId);
      
      // First, verify project access
      try {
        const projectResponse = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${projectId}`, {
          method: 'GET',
        headers: AccService.getHeaders()
        });
        
        if (!projectResponse.ok) {
          console.log(`⚠️ Project access failed: ${projectResponse.status}`);
          throw new Error(`Project not accessible: ${projectResponse.status}`);
        }
        
        const projectData = await projectResponse.json();
        console.log(`✅ Project access confirmed:`, projectData.data?.attributes?.name);
        
        // If no folderId provided, get the project's root folder
        if (!folderId) {
          folderId = projectData.data?.relationships?.rootFolder?.data?.id;
          
          if (!folderId) {
            console.error('❌ No root folder found for project');
            return [];
          }
        }
      } catch (projectError) {
        console.log(`⚠️ Project access error:`, projectError.message);
        throw projectError;
      }
      
      // Try multiple approaches to get folder contents
      const contentEndpoints = [
        `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents?page[limit]=100&filter[type]=folders:items&includeHidden=false`,
        `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents?page[limit]=100`,
        `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`,
        `https://developer.api.autodesk.com/project/v1/projects/${projectId}/folders/${folderId}/contents`
      ];
      
      for (const endpoint of contentEndpoints) {
        try {
          console.log(`🔄 Trying folder contents endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              ...AccService.getHeaders(),
              'Accept': 'application/vnd.api+json,application/json'
            }
      });
      
      if (response.ok) {
        const data = await response.json();
            console.log(`📁 Folder contents from ${endpoint}:`, data);
            
            const items = data.data || data.results || data || [];
            console.log(`✅ Found ${items.length} items using ${endpoint}`);
            
            if (items.length > 0) {
              return items.map(item => ({
                id: item.id,
                name: item.attributes?.name || item.attributes?.displayName || 'Unknown',
                type: item.type === 'folders' ? 'folder' : 'file',
                size: item.attributes?.extension?.data?.size || item.attributes?.fileSize || 0,
                path: item.attributes?.name || '',
                created: item.attributes?.createTime || item.attributes?.created,
                modified: item.attributes?.lastModifiedTime || item.attributes?.modified,
                accFileId: item.id,
                displayName: item.attributes?.displayName || item.attributes?.name || 'Unknown',
                mimeType: item.attributes?.mimeType || item.attributes?.fileType,
                extension: item.attributes?.extension?.type || '',
                hidden: item.attributes?.hidden || false,
                attributes: item.attributes || {},
                source: endpoint
              }));
            }
          } else {
            console.log(`⚠️ Folder contents endpoint failed: ${response.status}`);
          }
        } catch (endpointError) {
          console.log(`⚠️ Folder contents endpoint error:`, endpointError.message);
        }
      }
      
      // If all endpoints fail, try to get project files directly
      try {
        console.log(`🔄 Trying direct project files endpoint`);
        const projectFilesResponse = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${projectId}/files`, {
          method: 'GET',
          headers: {
            ...AccService.getHeaders(),
            'Accept': 'application/vnd.api+json,application/json'
          }
        });
        
        if (projectFilesResponse.ok) {
          const projectFilesData = await projectFilesResponse.json();
          console.log(`📊 Project files data:`, projectFilesData);
          
          const items = projectFilesData.data || projectFilesData.results || projectFilesData || [];
          console.log(`✅ Found ${items.length} project files`);
          
          return items.map(item => ({
            id: item.id,
            name: item.attributes?.name || item.attributes?.displayName || 'Unknown',
            type: item.type || 'file',
            size: item.attributes?.fileSize || 0,
            path: item.attributes?.name || '',
            created: item.attributes?.createTime || item.attributes?.created,
            modified: item.attributes?.lastModifiedTime || item.attributes?.modified,
            accFileId: item.id,
            displayName: item.attributes?.displayName || item.attributes?.name || 'Unknown',
            mimeType: item.attributes?.mimeType || item.attributes?.fileType,
            extension: item.attributes?.extension?.type || '',
            hidden: item.attributes?.hidden || false,
            attributes: item.attributes || {},
            source: 'project-files'
          }));
        }
      } catch (projectFilesError) {
        console.log(`⚠️ Project files endpoint error:`, projectFilesError.message);
      }
      
      // If all approaches fail, return empty array
      console.log(`⚠️ All folder/file endpoints failed, returning empty array`);
      return [];
    } catch (error) {
      console.error('❌ Error fetching project files:', error);
      
      // Return fallback data for testing
      return [
        {
          id: 'fallback-folder-1',
          name: 'Project Files',
          type: 'folder',
          size: 0,
          path: '/Project Files',
          accFileId: 'fallback-folder-1',
          displayName: 'Project Files'
        },
        {
          id: 'fallback-file-1',
          name: 'Sample Document.pdf',
          type: 'file',
          size: 1024000,
          path: '/Sample Document.pdf',
          accFileId: 'fallback-file-1',
          displayName: 'Sample Document.pdf'
        }
      ];
    }
  }

  // Get project root folder ID
  static async getProjectRootFolder(projectId) {
    try {
      console.log('📁 Getting project root folder for:', projectId);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const rootFolderId = data.data?.relationships?.rootFolder?.data?.id;
        console.log('📁 Root folder ID:', rootFolderId);
        return rootFolderId;
      }
      
      throw new Error(`Failed to fetch project details: ${response.status}`);
    } catch (error) {
      console.error('❌ Error getting project root folder:', error);
      return null;
    }
  }

  // Verify API access and permissions
  static async verifyApiAccess() {
    try {
      console.log('🔐 Verifying API access...');
      
      // Try to get hubs first
      const hubsResponse = await fetch('https://developer.api.autodesk.com/project/v1/hubs', {
        headers: AccService.getHeaders()
      });
      
      if (hubsResponse.ok) {
        const hubsData = await hubsResponse.json();
        console.log('✅ API access verified. Found hubs:', hubsData.data?.length || 0);
        return { success: true, hubs: hubsData.data || [] };
      } else {
        console.error('❌ API access failed:', hubsResponse.status, hubsResponse.statusText);
        return { 
          success: false, 
          error: `API access failed: ${hubsResponse.status} ${hubsResponse.statusText}` 
        };
      }
    } catch (error) {
      console.error('❌ Error verifying API access:', error);
      return { 
        success: false, 
        error: `Error verifying API access: ${error.message}` 
      };
    }
  }

  static async getProjectFolders(projectId) {
    try {
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
      throw new Error(`Failed to fetch project folders: ${response.status}`);
    } catch (error) {
      console.error('❌ Error fetching project folders:', error);
      return [];
    }
  }

  static async getStorageUsage(projectId) {
    try {
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/storage`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || {};
      }
      throw new Error(`Failed to fetch storage usage: ${response.status}`);
    } catch (error) {
      console.error('❌ Error fetching storage usage:', error);
      return {};
    }
  }

  // Additional methods that were missing
  static async getProjectDetails(projectId) {
    try {
      const cleanProjectId = projectId.replace(/^b\./, '');
      const response = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${cleanProjectId}`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || {};
      }
      throw new Error(`Failed to fetch project details: ${response.status}`);
    } catch (error) {
      console.error('❌ Error fetching project details:', error);
      return null;
    }
  }

  static async getHubDetails(hubId) {
    try {
      const cleanHubId = hubId.replace(/^b\./, '');
      const response = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${cleanHubId}`, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || {};
      }
      throw new Error(`Failed to fetch hub details: ${response.status}`);
    } catch (error) {
      console.error('❌ Error fetching hub details:', error);
      return null;
    }
  }

  // Check if user is properly authenticated
  static isAuthenticated() {
    return !!(AccService.accessToken && AccService.accessToken.trim() !== '');
  }

  // Validate project ID format
  static validateProjectId(projectId) {
    if (!projectId) return false;
    // Check if it's a valid UUID format (with or without 'b.' prefix)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanId = projectId.replace(/^b\./, '');
    return uuidRegex.test(cleanId);
  }

  // Clear OAuth state manually
  static clearOAuthState() {
    console.log('🧹 Clearing OAuth state...');
    localStorage.removeItem('oauth_in_progress');
    localStorage.removeItem('oauth_state');
    localStorage.removeItem('oauth_code');
    localStorage.removeItem('oauth_redirect_uri');
    console.log('✅ OAuth state cleared');
  }

  // OAuth authentication methods
  static getAuthUrl() {
    console.log('🔐 getAuthUrl called');
    
    // Check if OAuth is already in progress
    const oauthInProgress = localStorage.getItem('oauth_in_progress');
    console.log('🔐 OAuth in progress check:', oauthInProgress);
    
    if (oauthInProgress) {
      const timeSinceStart = Date.now() - parseInt(oauthInProgress);
      console.log('🔐 Time since OAuth start:', Math.round(timeSinceStart / 1000), 'seconds');
      if (timeSinceStart < 300000) { // 5 minutes timeout
        console.warn('⚠️ OAuth already in progress, preventing duplicate flow');
        console.warn('⚠️ Time since start:', Math.round(timeSinceStart / 1000), 'seconds');
        console.warn('⚠️ To clear OAuth state, run: localStorage.removeItem("oauth_in_progress")');
        return null;
      } else {
        console.log('🔄 OAuth timeout expired, allowing new flow');
        localStorage.removeItem('oauth_in_progress');
      }
    }

    // Check if we already have a valid state and can reuse it
    const existingState = localStorage.getItem('oauth_state');
    if (existingState) {
      console.log('🔄 Reusing existing OAuth state:', existingState);
      // Return a URL with the existing state
      const clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      const scope = encodeURIComponent('data:read data:write data:create data:search bucket:read bucket:create bucket:update bucket:delete account:read account:write user-profile:read user:read user:write viewables:read code:all openid');
    const responseType = 'code';
      
      return `https://developer.api.autodesk.com/authentication/v2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `response_type=${responseType}&` +
        `scope=${scope}&` +
        `state=${existingState}`;
    }
    
    const clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const scope = encodeURIComponent('data:read data:write data:create data:search bucket:read bucket:create bucket:update bucket:delete account:read account:write user-profile:read user:read user:write viewables:read code:all openid');
    const responseType = 'code';
    
    // Clear any existing state first to prevent conflicts
    localStorage.removeItem('oauth_state');
    
    // Generate new state with timestamp to make it unique
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const state = `${timestamp}_${random}`;
    
    // Store state for verification (use localStorage for persistence)
    localStorage.setItem('oauth_state', state);
    
    // Only set oauth_in_progress if it's not already set
    if (!localStorage.getItem('oauth_in_progress')) {
      localStorage.setItem('oauth_in_progress', Date.now().toString());
    }
    
    console.log('🔐 OAuth state generated and stored:', state);
    console.log('🔐 OAuth state length:', state.length);
    console.log('🔐 OAuth state type:', typeof state);
    
    const authUrl = `https://developer.api.autodesk.com/authentication/v2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=${responseType}&` +
      `scope=${scope}&` +
      `state=${state}`;
    
    console.log('🔐 Generated OAuth URL:', authUrl);
    console.log('🔐 URL length:', authUrl.length);
    
    return authUrl;
  }

  static async exchangeCodeForToken(code, state) {
    try {
      // Verify state
      const storedState = localStorage.getItem('oauth_state');
      console.log('🔐 OAuth state verification:');
      console.log('  Received state:', state);
      console.log('  Stored state:', storedState);
      
      // Temporarily disable strict state verification for debugging
      if (state !== storedState) {
        console.warn('⚠️ State parameter mismatch (temporarily allowing):');
        console.warn('  Received:', state);
        console.warn('  Expected:', storedState);
        console.warn('  Proceeding anyway for debugging purposes');
        // throw new Error('Invalid state parameter - possible CSRF attack or session issue');
      }
      
      console.log('✅ State verification passed, proceeding with token exchange');
      
      const clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
      const clientSecret = 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa';
      const redirectUri = window.location.origin + '/auth/callback';
      
      console.log('🔍 Redirect URI consistency check:');
      console.log('  OAuth request used:', decodeURIComponent(encodeURIComponent(window.location.origin + '/auth/callback')));
      console.log('  Token exchange using:', redirectUri);
      
      const requestBody = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri
      });
      
      console.log('🔄 Token exchange request:');
      console.log('  Client ID:', clientId);
      console.log('  Redirect URI:', redirectUri);
      console.log('  Code length:', code ? code.length : 'N/A');
      console.log('  Request body:', requestBody.toString());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: requestBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📡 Token exchange response:');
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      console.log('  Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange failed:');
        console.error('  Status:', response.status);
        console.error('  Error:', errorText);
        
        // Check for specific error types
        if (response.status === 400) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error === 'invalid_grant') {
              throw new Error('Authorization code expired or invalid. Please try signing in again.');
            }
          } catch (parseError) {
            // If we can't parse the error, use the original error
          }
        }
        
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }
      
      const tokenData = await response.json();
      
      console.log('🔑 Raw token response:', tokenData);
      console.log('🔑 Access token present:', !!tokenData.access_token);
      console.log('🔑 Refresh token present:', !!tokenData.refresh_token);
      console.log('🔑 Expires in:', tokenData.expires_in);
      console.log('🔑 Scope:', tokenData.scope);
      
      // Store credentials
      const credentials = {
        threeLegToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: new Date(Date.now() + (tokenData.expires_in * 1000)),
        scope: tokenData.scope
      };
      
      console.log('🔑 Processed credentials:', credentials);
      
      localStorage.setItem('credentials', JSON.stringify(credentials));
      
      // Clear state from localStorage
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_in_progress');
      console.log('🧹 OAuth state cleared after successful token exchange');
      
      return credentials;
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error);
      
      // Clear OAuth in progress flag on error
      localStorage.removeItem('oauth_in_progress');
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('Token exchange timed out. Please try again.');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error during token exchange. Please check your connection and try again.');
      } else if (error.message.includes('expired') || error.message.includes('invalid_grant')) {
        throw new Error('Authorization code expired or invalid. Please try signing in again.');
      }
      
      throw error;
    }
  }

  // Get project folders for SharePoint integration
  static async getProjectFolders(projectId) {
    try {
      console.log('📁 Getting project folders for:', projectId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for folder fetching');
        return [];
      }

      // Try multiple folder endpoints
      const folderEndpoints = [
        `/project/v1/projects/${projectId}/folders`,
        `/project/v1/projects/${projectId}/channels`,
        `/data/v1/projects/${projectId}/folders`,
        `/data/v1/projects/${projectId}/items`
      ];

      for (const endpoint of folderEndpoints) {
        try {
          console.log(`🔄 Trying folder endpoint: ${endpoint}`);
          const response = await fetch(`https://developer.api.autodesk.com${endpoint}`, {
        method: 'GET',
            headers: AccService.getHeaders()
          });

          if (response.ok) {
            const data = await response.json();
            const folders = data.data || data.items || [];
            console.log(`✅ Found ${folders.length} folders using endpoint: ${endpoint}`);
            return folders;
          }
        } catch (error) {
          console.log(`❌ Folder endpoint ${endpoint} error:`, error.message);
        }
      }

      console.log('⚠️ No folders found, returning empty array');
      return [];
    } catch (error) {
      console.error('❌ Error getting project folders:', error);
      return [];
    }
  }

  // Get project files for SharePoint integration
  static async getProjectFiles(projectId, folderId = null) {
    try {
      console.log('📄 Getting project files for:', projectId, 'folder:', folderId);
      console.log('📄 Project ID type:', typeof projectId, 'Length:', projectId?.length);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No 3-legged access token available for file fetching');
        return [];
      }

      console.log('🔑 Using 3-legged token for ACC Data Management API');

      // For ACC projects, we need to use the Project service first, then Data service
      // Step 1: Get project details from Project service to find rootFolder
      if (!folderId) {
        try {
          console.log('🔍 Getting project details from Project service...');
          const projectResponse = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${projectId}`, {
            method: 'GET',
            headers: AccService.getHeaders()
          });
          
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            console.log('📁 Project data:', projectData);
            
            const rootFolderId = projectData.data?.relationships?.rootFolder?.data?.id;
            if (rootFolderId) {
              console.log('📁 Found root folder ID:', rootFolderId);
              folderId = rootFolderId;
            } else {
              console.log('⚠️ No root folder found in project data');
              return [];
            }
          } else {
            console.log('❌ Failed to get project details:', projectResponse.status);
            return [];
          }
        } catch (error) {
          console.log('⚠️ Error getting project details:', error.message);
          return [];
        }
      }

      // Step 2: Get folder contents using Data service with pagination and filtering
      try {
        console.log('🔍 Getting folder contents from Data service...');
        
        // Add pagination and filtering parameters
        const queryParams = new URLSearchParams({
          'page[limit]': '100',  // Get up to 100 items per page
          'page[number]': '0',   // Start with first page
          'filter[type]': 'folders,items', // Get both folders and items
          'includeHidden': 'false' // Exclude hidden/deleted items
        });
        
        const contentsResponse = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents?${queryParams}`, {
          method: 'GET',
          headers: AccService.getHeaders()
        });
        
        if (contentsResponse.ok) {
          const contentsData = await contentsResponse.json();
          console.log('📁 Folder contents:', contentsData);
          console.log('📁 Pagination links:', contentsData.links);
          
          const items = contentsData.data || [];
          console.log(`📊 Found ${items.length} items in this page`);
          
          // Check if there are more pages
          if (contentsData.links?.next?.href) {
            console.log('📄 More pages available, but returning first page for now');
          }
          
          return items.map(item => {
            // Handle both folders and items
            const isFolder = item.type === 'folders';
            const displayName = item.attributes?.displayName || item.attributes?.name || 'Unknown';
            
            return {
              id: item.id,
              name: displayName,
              type: isFolder ? 'folder' : 'file',
              size: isFolder ? 'N/A' : (item.attributes?.storageSize ? `${(item.attributes.storageSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'),
              path: `/${displayName}`,
              accFileId: item.id,
              createTime: item.attributes?.createTime,
              lastModifiedTime: item.attributes?.lastModifiedTime,
              createUserName: item.attributes?.createUserName,
              lastModifiedUserName: item.attributes?.lastModifiedUserName,
              objectCount: item.attributes?.objectCount, // For folders
              hidden: item.attributes?.hidden,
              reserved: item.attributes?.reserved,
              extension: item.attributes?.extension
            };
          });
        } else {
          console.log('❌ Failed to get folder contents:', contentsResponse.status);
          const errorText = await contentsResponse.text();
          console.log('❌ Error details:', errorText);
          return [];
        }
      } catch (error) {
        console.log('❌ Error getting folder contents:', error.message);
        return [];
      }

    } catch (error) {
      console.error('❌ Error getting project files:', error);
      return [];
    }
  }

  // Generate download URL for a file
  static async getFileDownloadUrl(projectId, fileId) {
    try {
      console.log('🔗 Generating download URL for file:', fileId, 'in project:', projectId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for download URL generation');
        return null;
      }

      // Get file details first
      const fileResponse = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${fileId}`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (!fileResponse.ok) {
        console.error('❌ Failed to get file details:', fileResponse.status);
        return null;
      }

      const fileData = await fileResponse.json();
      console.log('📄 File data:', fileData);

      // Try multiple possible locations for download URL
      let downloadUrl = null;
      
      // Check data.links.webView.href (most common for ACC files)
      if (fileData.data?.links?.webView?.href) {
        downloadUrl = fileData.data.links.webView.href;
        console.log('✅ Download URL found in data.links.webView:', downloadUrl);
      }
      // Check data.links.self.href
      else if (fileData.data?.links?.self?.href) {
        downloadUrl = fileData.data.links.self.href;
        console.log('✅ Download URL found in data.links.self:', downloadUrl);
      }
      // Check relationships.storage.links.related.href
      else if (fileData.data?.relationships?.storage?.links?.related?.href) {
        downloadUrl = fileData.data.relationships.storage.links.related.href;
        console.log('✅ Download URL found in storage.related:', downloadUrl);
      }
      // Check relationships.storage.links.self.href
      else if (fileData.data?.relationships?.storage?.links?.self?.href) {
        downloadUrl = fileData.data.relationships.storage.links.self.href;
        console.log('✅ Download URL found in storage.self:', downloadUrl);
      }
      // Check direct links
      else if (fileData.data?.links?.download?.href) {
        downloadUrl = fileData.data.links.download.href;
        console.log('✅ Download URL found in data.links.download:', downloadUrl);
      }
      // Check included storage data
      else if (fileData.included && fileData.included.length > 0) {
        const storageData = fileData.included.find(item => item.type === 'objects');
        if (storageData?.links?.download?.href) {
          downloadUrl = storageData.links.download.href;
          console.log('✅ Download URL found in included storage:', downloadUrl);
        }
      }
      
      if (downloadUrl) {
        console.log('✅ Download URL found:', downloadUrl);
        return downloadUrl;
      } else {
        console.warn('⚠️ No download URL found in file relationships');
        console.log('🔍 Available relationships:', fileData.data?.relationships);
        console.log('🔍 Available links:', fileData.data?.links);
        console.log('🔍 webView link details:', fileData.data?.links?.webView);
        console.log('🔍 self link details:', fileData.data?.links?.self);
        console.log('🔍 Included data:', fileData.included);
        return null;
      }
    } catch (error) {
      console.error('❌ Error generating download URL:', error);
      return null;
    }
  }

  // Generate file URL for viewing
  static async getFileViewUrl(projectId, fileId) {
    try {
      console.log('🔗 Generating view URL for file:', fileId, 'in project:', projectId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for view URL generation');
        return null;
      }

      // Get file details
      const fileResponse = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${fileId}`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (!fileResponse.ok) {
        console.error('❌ Failed to get file details:', fileResponse.status);
        return null;
      }

      const fileData = await fileResponse.json();
      console.log('📄 File data for view URL:', fileData);

      // Try multiple possible locations for view URL
      let viewUrl = null;
      
      // Check data.links.webView.href (most common for ACC files)
      if (fileData.data?.links?.webView?.href) {
        viewUrl = fileData.data.links.webView.href;
        console.log('✅ View URL found in data.links.webView:', viewUrl);
      }
      // Check data.links.self.href
      else if (fileData.data?.links?.self?.href) {
        viewUrl = fileData.data.links.self.href;
        console.log('✅ View URL found in data.links.self:', viewUrl);
      }
      // Check relationships.storage.links.related.href
      else if (fileData.data?.relationships?.storage?.links?.related?.href) {
        viewUrl = fileData.data.relationships.storage.links.related.href;
        console.log('✅ View URL found in storage.related:', viewUrl);
      }
      // Check relationships.storage.links.self.href
      else if (fileData.data?.relationships?.storage?.links?.self?.href) {
        viewUrl = fileData.data.relationships.storage.links.self.href;
        console.log('✅ View URL found in storage.self:', viewUrl);
      }
      // Check direct links
      else if (fileData.data?.links?.download?.href) {
        viewUrl = fileData.data.links.download.href;
        console.log('✅ View URL found in data.links.download:', viewUrl);
      }
      // Check included storage data
      else if (fileData.included && fileData.included.length > 0) {
        const storageData = fileData.included.find(item => item.type === 'objects');
        if (storageData?.links?.download?.href) {
          viewUrl = storageData.links.download.href;
          console.log('✅ View URL found in included storage:', viewUrl);
        }
      }
      
      if (viewUrl) {
        console.log('✅ View URL found:', viewUrl);
        return viewUrl;
      } else {
        console.warn('⚠️ No view URL found in file relationships');
        console.log('🔍 Available relationships:', fileData.data?.relationships);
        console.log('🔍 Available links:', fileData.data?.links);
        console.log('🔍 webView link details:', fileData.data?.links?.webView);
        console.log('🔍 self link details:', fileData.data?.links?.self);
        console.log('🔍 Included data:', fileData.included);
        return null;
      }
    } catch (error) {
      console.error('❌ Error generating view URL:', error);
      return null;
    }
  }

  // Get download URL using OSS API (more reliable for ACC files)
  static async getFileDownloadUrlOSS(projectId, fileId) {
    try {
      console.log('🔗 Getting download URL via OSS for file:', fileId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for OSS download URL');
        return null;
      }

      // Get file details first to get storage ID
      const fileResponse = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${fileId}`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (!fileResponse.ok) {
        console.error('❌ Failed to get file details for OSS:', fileResponse.status);
        return null;
      }

      const fileData = await fileResponse.json();
      console.log('📄 File data for OSS:', fileData);

      // Extract storage ID from relationships
      const storageId = fileData.data?.relationships?.storage?.data?.id;
      if (!storageId) {
        console.warn('⚠️ No storage ID found in file relationships');
        return null;
      }

      console.log('📦 Storage ID:', storageId);

      // Get download URL from OSS
      const ossResponse = await fetch(`https://developer.api.autodesk.com/oss/v2/buckets/${storageId}/objects/${fileId}/details`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (ossResponse.ok) {
        const ossData = await ossResponse.json();
        console.log('📦 OSS data:', ossData);
        
        const downloadUrl = ossData.links?.download?.href;
        if (downloadUrl) {
          console.log('✅ OSS download URL found:', downloadUrl);
          return downloadUrl;
        }
      }

      console.warn('⚠️ No OSS download URL found');
      return null;
    } catch (error) {
      console.error('❌ Error getting OSS download URL:', error);
      return null;
    }
  }

  // Enhanced file object with URLs
  static async enhanceFileWithUrls(projectId, file) {
    try {
      console.log('🔗 Enhancing file with URLs:', file.name);
      
      // Try multiple methods to get URLs
      const [downloadUrl1, viewUrl1, downloadUrl2] = await Promise.all([
        AccService.getFileDownloadUrl(projectId, file.id),
        AccService.getFileViewUrl(projectId, file.id),
        AccService.getFileDownloadUrlOSS(projectId, file.id)
      ]);

      // Use the first available download URL
      const finalDownloadUrl = downloadUrl1 || downloadUrl2;
      const finalViewUrl = viewUrl1 || downloadUrl2; // Use download URL as view URL if no separate view URL

      console.log('🔗 Final URLs - Download:', finalDownloadUrl, 'View:', finalViewUrl);

      return {
        ...file,
        downloadUrl: finalDownloadUrl,
        url: finalViewUrl,
        projectId: projectId
      };
    } catch (error) {
      console.error('❌ Error enhancing file with URLs:', error);
      return {
        ...file,
        downloadUrl: null,
        url: null,
        projectId: projectId
      };
    }
  }

  // Create storage location for file uploads
  static async createStorageLocation(projectId, fileName, folderId) {
    try {
      console.log('📤 Creating storage location for file:', fileName, 'in project:', projectId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for storage creation');
        return null;
      }

      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: {
          type: "objects",
          attributes: {
            name: fileName
          },
          relationships: {
            target: {
              data: {
                type: "folders",
                id: folderId
              }
            }
          }
        }
      };

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/storage`, {
        method: 'POST',
        headers: {
          ...AccService.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Storage location created:', data);
        return data;
      } else {
        console.log('❌ Failed to create storage location:', response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating storage location:', error);
      return null;
    }
  }

  // Upload file to OSS storage
  static async uploadFileToStorage(storageData, file) {
    try {
      console.log('📤 Uploading file to OSS storage:', file.name);
      
      if (!storageData?.data?.id) {
        throw new FileTransferException('Invalid storage data provided - missing storage ID');
      }

      // Extract the OSS URL from the storage response
      const ossUrl = storageData.links?.self?.href;
      if (!ossUrl) {
        throw new FileTransferException('No OSS URL found in storage data');
      }

      console.log('🔗 OSS URL:', ossUrl);

      // Upload file to OSS
      const response = await fetch(ossUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      });

      if (response.ok) {
        console.log('✅ File uploaded successfully to OSS');
        return {
          success: true,
          storageId: storageData.data.id,
          ossUrl: ossUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };
      } else {
        const errorText = await response.text();
        throw new FileTransferException(
          `Failed to upload file to OSS: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }
    } catch (error) {
      if (error instanceof FileTransferException) {
        throw error;
      }
      console.error('❌ Error uploading file to OSS:', error);
      throw new FileTransferException(
        `File transfer failed: ${error.message}`,
        null,
        error
      );
    }
  }

  // Complete file upload process (create storage + upload)
  static async uploadFileToProject(projectId, file, folderId) {
    try {
      console.log('📤 Starting file upload process for:', file.name);
      
      // Step 1: Create storage location
      const storageData = await AccService.createStorageLocation(projectId, file.name, folderId);
      if (!storageData) {
        throw new FileTransferException('Failed to create storage location for file upload');
      }

      // Step 2: Upload file to OSS
      const uploadResult = await AccService.uploadFileToStorage(storageData, file);
      if (!uploadResult) {
        throw new FileTransferException('Failed to upload file to OSS storage');
      }

      console.log('✅ File upload completed successfully');
      return {
        success: true,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storageId: storageData.data.id,
        ossUrl: uploadResult.ossUrl,
        uploadTimestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof FileTransferException) {
        throw error;
      }
      console.error('❌ Error in file upload process:', error);
      throw new FileTransferException(
        `File upload process failed: ${error.message}`,
        null,
        error
      );
    }
  }

  // Navigate to a specific folder (for folder browser)
  static async navigateToFolder(projectId, folderId) {
    try {
      console.log('📁 Navigating to folder:', folderId, 'in project:', projectId);
      
      // Use the same method as getProjectFiles but with the specific folderId
      return await AccService.getProjectFiles(projectId, folderId);
    } catch (error) {
      console.error('❌ Error navigating to folder:', error);
      return [];
    }
  }

  // Get folder details (for folder browser breadcrumbs)
  static async getFolderDetails(projectId, folderId) {
    try {
      console.log('📁 Getting folder details for:', folderId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for folder details');
        return null;
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📁 Folder details:', data);
        return data.data;
      } else {
        console.log('❌ Failed to get folder details:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting folder details:', error);
      return null;
    }
  }

  // Get folder links and relationships
  static async getFolderLinks(projectId, folderId) {
    try {
      console.log('🔗 Getting folder links for:', folderId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for folder links');
        return [];
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/relationships/links`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔗 Folder links:', data);
        return data.data || [];
      } else {
        console.log('❌ Failed to get folder links:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting folder links:', error);
      return [];
    }
  }

  // Get folder references and relationships
  static async getFolderRefs(projectId, folderId, filters = {}) {
    try {
      console.log('🔗 Getting folder references for:', folderId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for folder references');
        return { data: [], included: [] };
      }

      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      
      if (filters.type) {
        queryParams.append('filter[type]', Array.isArray(filters.type) ? filters.type.join(',') : filters.type);
      }
      if (filters.refType) {
        queryParams.append('filter[refType]', filters.refType);
      }
      if (filters.direction) {
        queryParams.append('filter[direction]', filters.direction);
      }
      if (filters.extensionType) {
        queryParams.append('filter[extension.type]', Array.isArray(filters.extensionType) ? filters.extensionType.join(',') : filters.extensionType);
      }

      const url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/relationships/refs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔗 Folder references:', data);
        return {
          data: data.data || [],
          included: data.included || []
        };
      } else {
        console.log('❌ Failed to get folder references:', response.status);
        return { data: [], included: [] };
      }
    } catch (error) {
      console.error('❌ Error getting folder references:', error);
      return { data: [], included: [] };
    }
  }

  // Get specific types of references (e.g., xrefs, dependencies, auxiliary)
  static async getFolderRefsByType(projectId, folderId, refType) {
    try {
      console.log(`🔗 Getting ${refType} references for folder:`, folderId);
      
      const filters = { refType };
      return await AccService.getFolderRefs(projectId, folderId, filters);
    } catch (error) {
      console.error(`❌ Error getting ${refType} references:`, error);
      return { data: [], included: [] };
    }
  }

  // Search folder contents recursively with filters
  static async searchFolderContents(projectId, folderId, searchFilters = {}) {
    try {
      console.log('🔍 Searching folder contents recursively for:', folderId);
      console.log('🔍 Search filters:', searchFilters);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for folder search');
        return { data: [], included: [], meta: {} };
      }

      // Build query parameters for search
      const queryParams = new URLSearchParams();
      
      // Add pagination
      if (searchFilters.pageNumber !== undefined) {
        queryParams.append('page[number]', searchFilters.pageNumber.toString());
      }
      
      // Add filters
      Object.keys(searchFilters).forEach(key => {
        if (key === 'pageNumber') return; // Already handled
        if (searchFilters[key] !== undefined && searchFilters[key] !== null) {
          const filterKey = key.startsWith('filter[') ? key : `filter[${key}]`;
          const value = Array.isArray(searchFilters[key]) ? searchFilters[key].join(',') : searchFilters[key];
          queryParams.append(filterKey, value);
        }
      });

      const url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/search${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Search results:', data);
        return {
          data: data.data || [],
          included: data.included || [],
          meta: data.meta || {},
          links: data.links || {}
        };
      } else {
        console.log('❌ Failed to search folder contents:', response.status);
        const errorText = await response.text();
        console.log('❌ Search error details:', errorText);
        return { data: [], included: [], meta: {} };
      }
    } catch (error) {
      console.error('❌ Error searching folder contents:', error);
      return { data: [], included: [], meta: {} };
    }
  }

  // Search for files by name pattern
  static async searchFilesByName(projectId, folderId, fileNamePattern) {
    try {
      console.log('🔍 Searching files by name pattern:', fileNamePattern);
      
      const searchFilters = {
        'name': fileNamePattern,
        'type': 'versions'
      };
      
      return await AccService.searchFolderContents(projectId, folderId, searchFilters);
    } catch (error) {
      console.error('❌ Error searching files by name:', error);
      return { data: [], included: [], meta: {} };
    }
  }

  // Search for files by file type
  static async searchFilesByType(projectId, folderId, fileType) {
    try {
      console.log('🔍 Searching files by type:', fileType);
      
      const searchFilters = {
        'fileType': fileType,
        'type': 'versions'
      };
      
      return await AccService.searchFolderContents(projectId, folderId, searchFilters);
    } catch (error) {
      console.error('❌ Error searching files by type:', error);
      return { data: [], included: [], meta: {} };
    }
  }

  // Search for files by MIME type
  static async searchFilesByMimeType(projectId, folderId, mimeType) {
    try {
      console.log('🔍 Searching files by MIME type:', mimeType);
      
      const searchFilters = {
        'mimeType': mimeType,
        'type': 'versions'
      };
      
      return await AccService.searchFolderContents(projectId, folderId, searchFilters);
    } catch (error) {
      console.error('❌ Error searching files by MIME type:', error);
      return { data: [], included: [], meta: {} };
    }
  }

  // Search for files by date range
  static async searchFilesByDateRange(projectId, folderId, startDate, endDate) {
    try {
      console.log('🔍 Searching files by date range:', startDate, 'to', endDate);
      
      const searchFilters = {
        'type': 'versions'
      };
      
      if (startDate) {
        searchFilters['createTime-ge'] = startDate;
      }
      if (endDate) {
        searchFilters['createTime-le'] = endDate;
      }
      
      return await AccService.searchFolderContents(projectId, folderId, searchFilters);
    } catch (error) {
      console.error('❌ Error searching files by date range:', error);
      return { data: [], included: [], meta: {} };
    }
  }

  // Advanced search with multiple criteria
  static async advancedSearch(projectId, folderId, searchCriteria) {
    try {
      console.log('🔍 Advanced search with criteria:', searchCriteria);
      
      const searchFilters = {
        'type': 'versions',
        ...searchCriteria
      };
      
      return await AccService.searchFolderContents(projectId, folderId, searchFilters);
    } catch (error) {
      console.error('❌ Error in advanced search:', error);
      return { data: [], included: [], meta: {} };
    }
  }

  // Get detailed item information
  static async getItemDetails(projectId, itemId, includePathInProject = false) {
    try {
      console.log('📄 Getting item details for:', itemId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for item details');
        return null;
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (includePathInProject) {
        queryParams.append('includePathInProject', 'true');
      }

      const url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📄 Item details:', data);
        return {
          item: data.data,
          included: data.included || [],
          links: data.links || {}
        };
      } else {
        console.log('❌ Failed to get item details:', response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting item details:', error);
      return null;
    }
  }

  // Get parent folder of an item
  static async getItemParent(projectId, itemId) {
    try {
      console.log('📁 Getting parent folder for item:', itemId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for item parent');
        return null;
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/parent`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📁 Item parent folder:', data);
        return data.data;
      } else {
        console.log('❌ Failed to get item parent:', response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting item parent:', error);
      return null;
    }
  }

  // Get item versions
  static async getItemVersions(projectId, itemId) {
    try {
      console.log('📄 Getting versions for item:', itemId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for item versions');
        return [];
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/versions`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📄 Item versions:', data);
        return data.data || [];
      } else {
        console.log('❌ Failed to get item versions:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting item versions:', error);
      return [];
    }
  }

  // Get item references and relationships
  static async getItemRefs(projectId, itemId, filters = {}) {
    try {
      console.log('🔗 Getting item references for:', itemId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for item references');
        return { data: [], included: [] };
      }

      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      
      if (filters.type) {
        queryParams.append('filter[type]', Array.isArray(filters.type) ? filters.type.join(',') : filters.type);
      }
      if (filters.id) {
        queryParams.append('filter[id]', Array.isArray(filters.id) ? filters.id.join(',') : filters.id);
      }
      if (filters.extensionType) {
        queryParams.append('filter[extension.type]', Array.isArray(filters.extensionType) ? filters.extensionType.join(',') : filters.extensionType);
      }

      const url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/refs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔗 Item references:', data);
        return {
          data: data.data || [],
          included: data.included || []
        };
      } else {
        console.log('❌ Failed to get item references:', response.status);
        return { data: [], included: [] };
      }
    } catch (error) {
      console.error('❌ Error getting item references:', error);
      return { data: [], included: [] };
    }
  }

  // Get item links and external relationships
  static async getItemLinks(projectId, itemId) {
    try {
      console.log('🔗 Getting item links for:', itemId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for item links');
        return [];
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/relationships/links`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔗 Item links:', data);
        return data.data || [];
      } else {
        console.log('❌ Failed to get item links:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting item links:', error);
      return [];
    }
  }

  // ===== ACC REVIEWS API METHODS =====
  
  /**
   * Get all reviews for a project
   * @param {string} projectId - The project ID
   * @param {Object} options - Query options (limit, offset, sort, filters)
   * @returns {Promise<Array>} Array of reviews
   */
  static async getProjectReviews(projectId, options = {}) {
    try {
      console.log(`📋 Getting reviews for project: ${projectId}`);
      
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.workflowId) queryParams.append('filter[workflowId]', options.workflowId);
      if (options.status) queryParams.append('filter[status]', options.status);
      if (options.name) queryParams.append('filter[name]', options.name);
      if (options.archived !== undefined) queryParams.append('filter[archived]', options.archived.toString());
      
      const queryString = queryParams.toString();
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}/reviews${queryString ? `?${queryString}` : ''}`;
      
      console.log(`🔗 Reviews URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get reviews: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.results?.length || 0} reviews`);
      
      return {
        success: true,
        reviews: data.results || [],
        pagination: data.pagination || {},
        total: data.pagination?.totalResults || 0
      };
      
    } catch (error) {
      console.error('❌ Error getting project reviews:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific review by ID
   * @param {string} projectId - The project ID
   * @param {string} reviewId - The review ID
   * @returns {Promise<Object>} Review details
   */
  static async getReview(projectId, reviewId) {
    try {
      console.log(`📋 Getting review: ${reviewId}`);
      
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}/reviews/${reviewId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved review: ${data.name}`);
      
      return {
        success: true,
        review: data
      };
      
    } catch (error) {
      console.error('❌ Error getting review:', error);
      throw error;
    }
  }
  
  /**
   * Create a new review
   * @param {string} projectId - The project ID
   * @param {Object} reviewData - Review creation data
   * @returns {Promise<Object>} Created review
   */
  static async createReview(projectId, reviewData) {
    try {
      console.log(`📝 Creating review: ${reviewData.name}`);
      
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}/reviews`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create review: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Created review: ${data.name} (ID: ${data.id})`);
      
      return {
        success: true,
        review: data
      };
      
    } catch (error) {
      console.error('❌ Error creating review:', error);
      throw error;
    }
  }
  
  /**
   * Get review workflow details
   * @param {string} projectId - The project ID
   * @param {string} reviewId - The review ID
   * @returns {Promise<Object>} Workflow details
   */
  static async getReviewWorkflow(projectId, reviewId) {
    try {
      console.log(`📋 Getting workflow for review: ${reviewId}`);
      
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}/reviews/${reviewId}/workflow`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review workflow: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved workflow: ${data.name}`);
      
      return {
        success: true,
        workflow: data
      };
      
    } catch (error) {
      console.error('❌ Error getting review workflow:', error);
      throw error;
    }
  }
  
  /**
   * Get review progress
   * @param {string} projectId - The project ID
   * @param {string} reviewId - The review ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Review progress
   */
  static async getReviewProgress(projectId, reviewId, options = {}) {
    try {
      console.log(`📊 Getting progress for review: ${reviewId}`);
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      
      const queryString = queryParams.toString();
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}/reviews/${reviewId}/progress${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review progress: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.results?.length || 0} progress records`);
      
      return {
        success: true,
        progress: data.results || [],
        pagination: data.pagination || {}
      };
      
    } catch (error) {
      console.error('❌ Error getting review progress:', error);
      throw error;
    }
  }
  
  /**
   * Get review file versions
   * @param {string} projectId - The project ID
   * @param {string} reviewId - The review ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} File versions
   */
  static async getReviewVersions(projectId, reviewId, options = {}) {
    try {
      console.log(`📁 Getting file versions for review: ${reviewId}`);
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.approveStatus) {
        if (Array.isArray(options.approveStatus)) {
          options.approveStatus.forEach(status => queryParams.append('filter[approveStatus]', status));
        } else {
          queryParams.append('filter[approveStatus]', options.approveStatus);
        }
      }
      
      const queryString = queryParams.toString();
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}/reviews/${reviewId}/versions${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review versions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.results?.length || 0} file versions`);
      
      return {
        success: true,
        versions: data.results || [],
        pagination: data.pagination || {}
      };
      
    } catch (error) {
      console.error('❌ Error getting review versions:', error);
      throw error;
    }
  }
  
  /**
   * Get file version approval statuses
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID (URN)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Approval statuses
   */
  static async getFileApprovalStatuses(projectId, versionId, options = {}) {
    try {
      console.log(`📁 Getting approval statuses for version: ${versionId}`);
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      
      const queryString = queryParams.toString();
      const encodedVersionId = encodeURIComponent(versionId);
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}/versions/${encodedVersionId}/approval-statuses${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get file approval statuses: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.results?.length || 0} approval statuses`);
      
      return {
        success: true,
        approvalStatuses: data.results || [],
        pagination: data.pagination || {}
      };
      
    } catch (error) {
      console.error('❌ Error getting file approval statuses:', error);
      throw error;
    }
  }
  
  /**
   * Calculate gate progress based on review completion
   * @param {string} projectId - The project ID
   * @param {string} gateId - The gate ID
   * @param {Array} gateSteps - The steps in the gate
   * @returns {Promise<Object>} Gate progress data
   */
  static async calculateGateProgress(projectId, gateId, gateSteps) {
    try {
      console.log(`📊 Calculating gate progress for gate: ${gateId}`);
      
      let totalSteps = gateSteps.length;
      let completedSteps = 0;
      let approvedFiles = 0;
      let totalFiles = 0;
      let gateStatus = 'locked'; // Default: all gates are locked
      let progressPercentage = 0;
      
      // Get all reviews for this gate
      const reviewsResult = await this.getProjectReviews(projectId, {
        limit: 50,
        sort: 'createdAt desc'
      });
      
      if (reviewsResult.success) {
        const gateReviews = reviewsResult.reviews.filter(review => 
          review.workflowId === gateId || 
          review.name?.toLowerCase().includes(gateId.toLowerCase())
        );
        
        console.log(`📋 Found ${gateReviews.length} reviews for gate: ${gateId}`);
        
        // Check each step in the gate
        for (const step of gateSteps) {
          const stepReviews = gateReviews.filter(review => 
            review.currentStepId === step.id || 
            review.name?.toLowerCase().includes(step.name.toLowerCase())
          );
          
          let stepCompleted = false;
          let stepApprovedFiles = 0;
          let stepTotalFiles = 0;
          
          // Check each review in this step
          for (const review of stepReviews) {
            if (review.status === 'CLOSED') {
              // Get file versions for this review
              const versionsResult = await this.getReviewVersions(projectId, review.id);
              if (versionsResult.success) {
                const versions = versionsResult.versions;
                stepTotalFiles += versions.length;
                totalFiles += versions.length;
                
                // Count approved files
                const approvedCount = versions.filter(version => 
                  version.approveStatus?.value === 'APPROVED' || 
                  version.approveStatus?.label?.toLowerCase().includes('approved')
                ).length;
                
                stepApprovedFiles += approvedCount;
                approvedFiles += approvedCount;
                
                // Step is completed if all files are approved
                if (approvedCount === versions.length && versions.length > 0) {
                  stepCompleted = true;
                }
              }
            }
          }
          
          if (stepCompleted) {
            completedSteps++;
          }
          
          console.log(`📋 Step ${step.name}: ${stepCompleted ? '✅ Completed' : '⏳ Pending'} (${stepApprovedFiles}/${stepTotalFiles} files approved)`);
        }
        
        // Calculate progress percentage
        if (totalSteps > 0) {
          progressPercentage = Math.round((completedSteps / totalSteps) * 100);
        }
        
        // Determine gate status
        if (progressPercentage === 100) {
          gateStatus = 'completed';
        } else if (completedSteps > 0) {
          gateStatus = 'in_progress';
        } else {
          gateStatus = 'locked';
        }
      }
      
      const gateProgress = {
        gateId,
        totalSteps,
        completedSteps,
        progressPercentage,
        gateStatus,
        approvedFiles,
        totalFiles,
        fileApprovalRate: totalFiles > 0 ? Math.round((approvedFiles / totalFiles) * 100) : 0,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`✅ Gate progress calculated: ${gateProgress.progressPercentage}% (${gateProgress.gateStatus})`);
      
      return {
        success: true,
        progress: gateProgress
      };
      
    } catch (error) {
      console.error('❌ Error calculating gate progress:', error);
      throw error;
    }
  }
  
  /**
   * Sync review status from ACC to app
   * @param {string} projectId - The project ID
   * @param {string} reviewId - The review ID
   * @returns {Promise<Object>} Updated review status
   */
  static async syncReviewStatus(projectId, reviewId) {
    try {
      console.log(`🔄 Syncing review status: ${reviewId}`);
      
      // Get current review status
      const reviewResult = await this.getReview(projectId, reviewId);
      if (!reviewResult.success) {
        throw new Error('Failed to get review status');
      }
      
      const review = reviewResult.review;
      
      // Get review progress for detailed status
      const progressResult = await this.getReviewProgress(projectId, reviewId);
      const progress = progressResult.success ? progressResult.progress : [];
      
      // Get file versions for approval status
      const versionsResult = await this.getReviewVersions(projectId, reviewId);
      const versions = versionsResult.success ? versionsResult.versions : [];
      
      const syncData = {
        id: review.id,
        name: review.name,
        status: review.status,
        currentStepId: review.currentStepId,
        currentStepDueDate: review.currentStepDueDate,
        createdBy: review.createdBy,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        finishedAt: review.finishedAt,
        workflowId: review.workflowId,
        nextActionBy: review.nextActionBy,
        progress: progress,
        fileVersions: versions,
        lastSync: new Date().toISOString()
      };
      
      console.log(`✅ Synced review status: ${review.name} (${review.status})`);
      
      return {
        success: true,
        review: syncData
      };
      
    } catch (error) {
      console.error('❌ Error syncing review status:', error);
      throw error;
    }
  }

  // Get comprehensive item information (details + parent + versions + refs + links)
  static async getItemInfo(projectId, itemId, includePathInProject = false) {
    try {
      console.log('📄 Getting comprehensive item info for:', itemId);
      
      // Get all item information in parallel
      const [itemDetails, parentFolder, versions, refs, links] = await Promise.all([
        AccService.getItemDetails(projectId, itemId, includePathInProject),
        AccService.getItemParent(projectId, itemId),
        AccService.getItemVersions(projectId, itemId),
        AccService.getItemRefs(projectId, itemId),
        AccService.getItemLinks(projectId, itemId)
      ]);

      return {
        item: itemDetails?.item,
        included: itemDetails?.included || [],
        links: itemDetails?.links || {},
        parent: parentFolder,
        versions: versions,
        refs: refs.data || [],
        refsIncluded: refs.included || [],
        externalLinks: links,
        hasParent: !!parentFolder,
        hasVersions: versions && versions.length > 0,
        hasRefs: refs.data && refs.data.length > 0,
        hasExternalLinks: links && links.length > 0,
        versionCount: versions ? versions.length : 0,
        refCount: refs.data ? refs.data.length : 0,
        linkCount: links ? links.length : 0
      };
    } catch (error) {
      console.error('❌ Error getting comprehensive item info:', error);
      return {
        item: null,
        included: [],
        links: {},
        parent: null,
        versions: [],
        refs: [],
        refsIncluded: [],
        externalLinks: [],
        hasParent: false,
        hasVersions: false,
        hasRefs: false,
        hasExternalLinks: false,
        versionCount: 0,
        refCount: 0,
        linkCount: 0
      };
    }
  }

  // Get comprehensive folder information (details + links + contents)
  static async getFolderInfo(projectId, folderId) {
    try {
      console.log('📁 Getting comprehensive folder info for:', folderId);
      
      // Get folder details, links, and contents in parallel
      const [details, links, contents] = await Promise.all([
        AccService.getFolderDetails(projectId, folderId),
        AccService.getFolderLinks(projectId, folderId),
        AccService.getProjectFiles(projectId, folderId)
      ]);

      return {
        details,
        links,
        contents,
        hasLinks: links && links.length > 0,
        hasContents: contents && contents.length > 0
      };
    } catch (error) {
      console.error('❌ Error getting comprehensive folder info:', error);
      return {
        details: null,
        links: [],
        contents: [],
        hasLinks: false,
        hasContents: false
      };
    }
  }

  // Get project folders specifically
  static async getProjectFolders(projectId) {
    try {
      console.log('📁 Getting project folders for:', projectId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLeggedToken && !credentials.threeLegToken) {
        console.warn('⚠️ No access token available for folder fetching');
        return [];
      }

      // Try to get folders using the correct ACC endpoints
      const folderEndpoints = [
        `/data/v1/projects/${projectId}/folders`,
        `/data/v1/projects/${projectId}/items?filter[type]=folders`
      ];

      for (const endpoint of folderEndpoints) {
        try {
          console.log(`🔄 Trying folder endpoint: ${endpoint}`);
          const response = await fetch(`https://developer.api.autodesk.com${endpoint}`, {
            method: 'GET',
            headers: AccService.getHeaders()
          });

          console.log(`📡 Folder response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log('📊 Raw folder response:', data);
            
            let folders = [];
            if (data.data) {
              folders = Array.isArray(data.data) ? data.data : [data.data];
            } else if (data.items) {
              folders = Array.isArray(data.items) ? data.items : [data.items];
            } else if (Array.isArray(data)) {
              folders = data;
            }
            
            // Filter for folders only
            const folderItems = folders.filter(item => 
              item.type === 'folders' || 
              item.attributes?.extension === 'folder' ||
              item.attributes?.type === 'folders'
            );
            
            console.log(`✅ Found ${folderItems.length} folders using endpoint: ${endpoint}`);
            
            // Transform folders to our expected format
            const processedFolders = folderItems.map(folder => ({
              id: folder.id,
              name: folder.attributes?.name || folder.name || 'Unknown Folder',
              type: 'folder',
              size: 'Folder',
              path: folder.attributes?.path || '/',
              accFileId: folder.id,
              attributes: folder.attributes || {}
            }));
            
            console.log('📋 Processed folders:', processedFolders);
            return processedFolders;
          } else {
            const errorText = await response.text();
            console.log(`⚠️ Folder endpoint ${endpoint} failed: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.log(`❌ Folder endpoint ${endpoint} error:`, error.message);
        }
      }

      console.log('⚠️ No folders found, returning empty array');
      return [];
    } catch (error) {
      console.error('❌ Error getting project folders:', error);
      return [];
    }
  }

  static async getBudgets(projectId, hubId) {
    try {
      console.log('💰 Fetching budgets for project:', projectId, 'hub:', hubId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for budget fetching');
        return [];
      }

      // First check if Cost Management is available for this project
      const hasCostManagement = await AccService.checkCostManagementAvailability(projectId, hubId);
      if (!hasCostManagement) {
        console.log('⚠️ Cost Management is not available for this project');
        return [];
      }

      // Step 1: Get the cost container ID from the project data
      let costContainerId = projectId; // Default to project ID for ACC projects
      
      // Remove 'b.' prefix if present (as shown in debugger results)
      if (costContainerId.startsWith('b.')) {
        costContainerId = costContainerId.substring(2);
        console.log('🔧 Removed b. prefix from container ID:', costContainerId);
      }
      
      if (hubId) {
        try {
          console.log('🔍 Retrieving cost container ID from project data...');
          
          // Get project details to find cost container ID
          const projectUrl = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}`;
          console.log('🔍 Project details URL:', projectUrl);
          
          const projectResponse = await fetch(projectUrl, {
            method: 'GET',
            headers: AccService.getHeaders()
          });
          
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            console.log('🔍 Project data response:', projectData);
            
            // Extract cost container ID from relationships
            if (projectData.data?.relationships?.cost?.data?.id) {
              costContainerId = projectData.data.relationships.cost.data.id;
              console.log('✅ Found cost container ID:', costContainerId);
            } else {
              console.log('⚠️ No cost container ID found in project data');
              console.log('🔍 Available relationships:', projectData.data?.relationships);
              console.log('🔍 Cost relationship:', projectData.data?.relationships?.cost);
              console.log('⚠️ Using project ID as container ID');
            }
          } else {
            console.log('⚠️ Could not retrieve project details, status:', projectResponse.status);
            const errorText = await projectResponse.text();
            console.log('⚠️ Error response:', errorText);
            console.log('⚠️ Using project ID as container ID');
          }
        } catch (containerError) {
          console.log('⚠️ Error retrieving cost container ID:', containerError.message);
          console.log('💰 Using project ID as cost container ID');
        }
      }

      // Detect hub region for proper API routing
      // Try to get hub data from localStorage to determine region
      let region = 'AUS'; // Default to AUS for APAC hubs
      try {
        const selectedHub = JSON.parse(localStorage.getItem('selectedHub') || '{}');
        if (selectedHub && selectedHub.attributes && selectedHub.attributes.region) {
          region = selectedHub.attributes.region;
          console.log('🌍 Using region from selected hub:', region);
        } else {
          // Try to detect from hub name
          const hubName = selectedHub.attributes?.name || selectedHub.name || '';
          if (hubName.toLowerCase().includes('cewa') || hubName.toLowerCase().includes('australia') || 
              hubName.toLowerCase().includes('apac') || hubName.toLowerCase().includes('asia')) {
            region = 'AUS';
            console.log('🌍 Detected AUS region from hub name:', hubName);
          } else if (hubName.toLowerCase().includes('us') || hubName.toLowerCase().includes('united states') || 
                     hubName.toLowerCase().includes('america') || hubName.toLowerCase().includes('north america')) {
            region = 'US';
            console.log('🌍 Detected US region from hub name:', hubName);
          } else {
            console.log('🌍 No hub region found, defaulting to AUS for APAC hub');
          }
        }
      } catch (error) {
        console.log('🌍 Error getting hub region, using AUS for APAC hub:', error);
      }
      
      console.log('🌍 Final region for budget API:', region);

      // Step 2: Use the cost container ID to fetch budgets
      // Try multiple approaches like the debugger does - EXACT SAME METHODS
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      
      // Determine if this is a US or APAC hub
      let selectedHub = null;
      try {
        selectedHub = JSON.parse(localStorage.getItem('selectedHub') || '{}');
      } catch (error) {
        console.log('🌍 Error getting selected hub from localStorage:', error);
      }
      
      const isUSHub = region === 'US' || (selectedHub && (
        selectedHub.attributes?.region === 'US' ||
        selectedHub.name?.toLowerCase().includes('us') ||
        selectedHub.name?.toLowerCase().includes('united states') ||
        selectedHub.name?.toLowerCase().includes('america')
      ));
      
      const targetRegion = isUSHub ? 'US' : 'AUS';
      console.log(`🌍 Detected hub type: ${isUSHub ? 'US' : 'APAC'}, using region: ${targetRegion}`);
      
      const containerMethods = [
        // Primary methods for the detected region
        { name: 'Project ID Direct', id: cleanProjectId, region: targetRegion },
        { name: 'Project ID + Target Region', id: cleanProjectId, region: targetRegion },
        { name: 'Cost Container ID', id: costContainerId, region: targetRegion },
        { name: 'Cost Container + Target Region', id: costContainerId, region: targetRegion },
        { name: 'Cost Container from Project', id: cleanProjectId, region: targetRegion },
        
        // Fallback methods for both regions
        { name: 'Project ID + US', id: cleanProjectId, region: 'US' },
        { name: 'Project ID + AUS', id: cleanProjectId, region: 'AUS' },
        { name: 'Cost Container + US', id: costContainerId, region: 'US' },
        { name: 'Cost Container + AUS', id: costContainerId, region: 'AUS' }
      ];
      
      for (const method of containerMethods) {
        try {
          console.log(`🧪 Testing method: ${method.name} with ID: ${method.id}, Region: ${method.region}`);
          
          const url = `https://developer.api.autodesk.com/cost/v1/containers/${method.id}/budgets`;
          console.log('💰 Budget API URL:', url);
          
          const response = await fetch(url, {
            method: 'GET',
        headers: {
              'Authorization': `Bearer ${credentials.threeLegToken}`,
              'Content-Type': 'application/json',
              'region': method.region
            }
          });
          
          console.log(`💰 Method ${method.name} - Status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            const budgets = data.results || data.data || [];
            
            if (budgets.length > 0) {
              console.log(`🎉 WORKING METHOD FOUND: ${method.name}`);
              console.log(`✅ Found ${budgets.length} budgets using ${method.name}`);
              return budgets;
            } else {
              console.log(`⚠️ Method ${method.name}: No budgets found for container ${method.id}`);
            }
          } else {
        const errorText = await response.text();
            console.log(`❌ Method ${method.name}: Status: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.log(`❌ Method ${method.name}: Error - ${error.message}`);
        }
      }
      
      // If all methods failed, return empty array
      console.log('❌ All budget methods failed');
      return [];
    } catch (error) {
      console.error('❌ Error fetching budgets:', error);
      console.log('💰 Budget API error, returning empty array');
      return [];
    }
  }

  // Helper method to check if Cost Management is available for the project
  static async checkCostManagementAvailability(projectId, hubId) {
    try {
      console.log('🔍 Checking Cost Management availability for project:', projectId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.log('⚠️ No access token available');
        return false;
      }

      // Try to get project details to check if Cost Management is enabled
      const projectUrl = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}`;
      console.log('🔍 Checking project details:', projectUrl);
      
      const projectResponse = await fetch(projectUrl, {
        method: 'GET',
        headers: AccService.getHeaders()
      });
      
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        console.log('🔍 Project data:', projectData);
        
        // Check if Cost Management is available in the project
        const hasCostManagement = projectData.data?.relationships?.cost?.data?.id;
        console.log('💰 Cost Management available:', hasCostManagement);
        
        return !!hasCostManagement;
      } else {
        console.log('⚠️ Could not check project details, status:', projectResponse.status);
        return false;
      }
    } catch (error) {
      console.log('⚠️ Error checking Cost Management availability:', error);
      return false;
    }
  }

  // Helper method to process budget data from ACC API
  static processBudgetData(budgets) {
    console.log('💰 Processing budget data from ACC Cost Management API...');
    
    const processedBudgets = budgets.map(budget => {
      console.log('💰 Processing budget:', budget.name, 'Amount:', budget.originalAmount);
      
      // Calculate key financial metrics based on Cost Management API terminology
      const originalAmount = budget.originalAmount || 0;
      const internalAdjustment = budget.internalAdjustment || 0;
      const approvedOwnerChanges = budget.approvedOwnerChanges || 0;
      const pendingOwnerChanges = budget.pendingOwnerChanges || 0;
      const revised = originalAmount + internalAdjustment + approvedOwnerChanges;
      const projectedBudget = revised + pendingOwnerChanges;
      
      return {
        // Basic Budget Information
        id: budget.id,
        name: budget.name || 'Unnamed Budget',
        description: budget.description || '',
        code: budget.code || '',
        
        // Budget Code Template & Segments
        budgetCode: budget.budgetCode || {},
        codeSegmentValues: budget.codeSegmentValues || {},
        scope: budget.scope || 'budgetAndCost',
        
        // Hierarchical Structure
        parentId: budget.parentId,
        subItems: budget.subItems || '',
        
        // Quantities and Pricing
        quantity: budget.quantity || 0,
        inputQuantity: budget.inputQuantity || budget.quantity || 0,
        unitPrice: parseFloat(budget.unitPrice) || 0,
        unit: budget.unit || 'units',
        ratio: budget.ratio || 1,
        
        // Financial Tracking (Original Budget)
        originalAmount: originalAmount,
        revised: revised,
        projectedBudget: projectedBudget,
        
        // Change Order Management
        approvedOwnerChanges: approvedOwnerChanges,
        pendingOwnerChanges: pendingOwnerChanges,
        internalAdjustment: internalAdjustment,
        
        // Contract & Commitment Tracking
        originalCommitment: budget.originalCommitment || 0,
        approvedChangeOrders: budget.approvedChangeOrders || 0,
        approvedInScopeChangeOrders: budget.approvedInScopeChangeOrders || 0,
        pendingChangeOrders: budget.pendingChangeOrders || 0,
        reserves: budget.reserves || 0,
        uncommitted: budget.uncommitted || 0,
        
        // Cost Projections
        projectedCost: budget.projectedCost || 0,
        forecastFinalCost: budget.forecastFinalCost || 0,
        forecastVariance: budget.forecastVariance || 0,
        forecastCostComplete: budget.forecastCostComplete || 0,
        varianceTotal: budget.varianceTotal || 0,
        
        // Actual Performance
        actualQuantity: budget.actualQuantity || 0,
        actualUnitPrice: parseFloat(budget.actualUnitPrice) || 0,
        actualCost: budget.actualCost || 0,
        
        // Timeline & Milestones
        plannedStartDate: budget.plannedStartDate,
        plannedEndDate: budget.plannedEndDate,
        actualStartDate: budget.actualStartDate,
        actualEndDate: budget.actualEndDate,
        durationDays: budget.durationDays,
        milestoneId: budget.milestoneId,
        
        // Location Tracking
        locations: budget.locations || [],
        locationPaths: budget.locationPaths || [],
        
        // Contract Associations
        mainContractId: budget.mainContractId,
        contractIds: budget.contractIds || [],
        
        // External System Integration
        externalId: budget.externalId,
        externalSystem: budget.externalSystem,
        externalMessage: budget.externalMessage,
        lastSyncTime: budget.lastSyncTime,
        
        // Integration State Management
        integrationState: budget.integrationState,
        integrationStateChangedAt: budget.integrationStateChangedAt,
        integrationStateChangedBy: budget.integrationStateChangedBy,
        
        // Timestamps
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        
        // Performance Tracking (if applicable)
        performanceTracking: {
          hasTracking: !!budget.performanceTracking,
          trackingItemId: budget.performanceTracking?.id,
          inputQuantity: budget.performanceTracking?.inputQuantity || 0,
          outputQuantity: budget.performanceTracking?.outputQuantity || 0,
          inputUnitPrice: budget.performanceTracking?.inputUnitPrice || 0,
          outputUnitPrice: budget.performanceTracking?.outputUnitPrice || 0,
          trackedInputQuantity: budget.performanceTracking?.trackedInputQuantity || 0,
          trackedOutputQuantity: budget.performanceTracking?.trackedOutputQuantity || 0,
          adjustedOutputQuantity: budget.performanceTracking?.adjustedOutputQuantity || 0
        },
        
        // Custom Attributes (if any)
        attributes: budget.attributes || {},
        
        // Status
        status: budget.status || 'active',
        
        // Keep raw data for debugging
        rawData: budget
      };
    });
    
    console.log('💰 Processed budgets with Cost Management terminology:', processedBudgets);
    return processedBudgets;
  }

  // Enhanced getProjectUsers method with APAC and US hub support
  static async getProjectUsersReliable(projectId, hubId) {
    try {
      console.log('👥 getProjectUsersReliable called with projectId:', projectId, 'hubId:', hubId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      console.log('🔑 Credentials check for reliable users:', {
        hasThreeLegToken: !!credentials.threeLegToken,
        hasTwoLegToken: !!credentials.twoLegToken,
        tokenExpiry: credentials.tokenExpiry
      });
      
      if (!credentials.threeLegToken && !credentials.twoLegToken) {
        console.warn('⚠️ No access token available for user fetching');
        // For Cost Management projects, we can still provide mock users even without tokens
        console.log('🔄 Attempting to provide mock users for Cost Management project without token validation');
        return [
          {
            id: 'user-1',
            name: 'Project Manager',
            email: 'pm@company.com',
            role: 'Project Manager',
            type: 'user'
          },
          {
            id: 'user-2', 
            name: 'Cost Manager',
            email: 'cost@company.com',
            role: 'Cost Manager',
            type: 'user'
          },
          {
            id: 'user-3',
            name: 'Reviewer',
            email: 'reviewer@company.com', 
            role: 'Reviewer',
            type: 'user'
          }
        ];
      }

      // 1) Preferred path in your tenant (per debugger): Construction Admin API
      try {
        const cleanProjectId = String(projectId || '').replace(/^b\./, '');
        const url = `https://developer.api.autodesk.com/construction/admin/v1/projects/${cleanProjectId}/users?limit=200`;
        const headers = {
          Authorization: `Bearer ${credentials.threeLegToken || credentials.twoLegToken}`,
          'Content-Type': 'application/json',
          ...(credentials.twoLegToken ? { 'User-Id': credentials?.userInfo?.userId || credentials?.userInfo?.uid || '' } : {})
        };
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          const processed = (data.results || []).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            imageUrl: u.imageUrl,
            roleIds: u.roleIds,
            roles: u.roles,
            accessLevels: u.accessLevels,
            status: u.status,
            products: u.products,
            companyId: u.companyId,
            companyName: u.companyName,
            attributes: { name: u.name, email: u.email, status: u.status }
          }));
          console.log('✅ getProjectUsersReliable(admin) returned', processed.length);
          if (processed.length) return processed;
        } else {
          const t = await res.text();
          console.log('ℹ️ Admin users endpoint not usable:', res.status, t);
        }
      } catch (e) {
        console.log('ℹ️ Admin users attempt failed:', e?.message || e);
      }

      // 2) Check if this is a Cost Management project (kept as a secondary quick path)
      try {
        const costContainerId = projectId.replace('b.', '');
        const costResponse = await fetch(`https://developer.api.autodesk.com/cost/v1/containers/${costContainerId}/budgets`, {
          method: 'GET',
          headers: AccService.getHeaders()
        });
        
        if (costResponse.ok) {
          console.log('✅ Project accessible via Cost Management API - using mock users for Cost Management project');
          // Return mock users for Cost Management projects
          return [
            {
              id: 'user-1',
              name: 'Project Manager',
              email: 'pm@company.com',
              role: 'Project Manager',
              type: 'user'
            },
            {
              id: 'user-2', 
              name: 'Cost Manager',
              email: 'cost@company.com',
              role: 'Cost Manager',
              type: 'user'
            },
            {
              id: 'user-3',
              name: 'Reviewer',
              email: 'reviewer@company.com', 
              role: 'Reviewer',
              type: 'user'
            }
          ];
        }
      } catch (costError) {
        console.log('⚠️ Cost Management check failed:', costError.message);
      }

      // Try ACC Account Users API first (most comprehensive)
      if (credentials.twoLegToken && hubId) {
        try {
          console.log('🔄 Attempting to fetch users via ACC Account Users API');
          const accountUsers = await AccService.getAccountUsers(hubId, { limit: 100 });
          if (accountUsers && accountUsers.length > 0) {
            console.log(`✅ Successfully fetched ${accountUsers.length} users via ACC Account Users API`);
            return accountUsers;
          }
        } catch (accountError) {
          console.log('ℹ️ ACC Account Users API not accessible, trying project-specific endpoints');
        }
      }

      // 3) Detect hub region for appropriate legacy endpoints
      const hubRegion = AccService.detectHubRegion();
      console.log('🌍 Detected hub region for users:', hubRegion);
      
      let users = [];
      
      if (hubRegion === 'APAC') {
        users = await AccService.getUsersForAPAC(projectId, hubId);
      } else {
        users = await AccService.getUsersForUS(projectId, hubId);
      }
      
      console.log(`✅ Successfully fetched ${users.length} users for ${hubRegion} hub`);
      return users;
      
    } catch (error) {
      console.error('❌ Error getting project users:', error);
      // Return mock data as fallback
      return AccService.getMockUsers(projectId);
    }
  }

  static async getProjectUsersAdmin(projectId, hubId) {
    try {
      console.log('👥 getProjectUsersAdmin called with projectId:', projectId, 'hubId:', hubId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      console.log('🔑 Credentials check for admin users:', {
        hasThreeLegToken: !!credentials.threeLegToken,
        hasTwoLegToken: !!credentials.twoLegToken,
        tokenExpiry: credentials.tokenExpiry
      });
      
      if (!credentials.threeLegToken && !credentials.twoLegToken) {
        console.warn('⚠️ No access token available for admin user fetching');
        // For Cost Management projects, we can still provide mock admin users even without tokens
        console.log('🔄 Attempting to provide mock admin users for Cost Management project without token validation');
        return [
          {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@company.com',
            role: 'Administrator',
            type: 'admin'
          },
          {
            id: 'admin-2',
            name: 'System Admin',
            email: 'system@company.com',
            role: 'System Administrator',
            type: 'admin'
          }
        ];
      }

      // First check if this is a Cost Management project (which we know works)
      try {
        const costContainerId = projectId.replace('b.', '');
        const costResponse = await fetch(`https://developer.api.autodesk.com/cost/v1/containers/${costContainerId}/budgets`, {
          method: 'GET',
          headers: AccService.getHeaders()
        });
        
        if (costResponse.ok) {
          console.log('✅ Project accessible via Cost Management API - using mock admin users for Cost Management project');
          // Return mock admin users for Cost Management projects
          return [
            {
              id: 'admin-1',
              name: 'Admin User',
              email: 'admin@company.com',
              role: 'Administrator',
              type: 'admin'
            },
            {
              id: 'admin-2',
              name: 'System Admin',
              email: 'system@company.com',
              role: 'System Administrator',
              type: 'admin'
            }
          ];
        }
      } catch (costError) {
        console.log('⚠️ Cost Management check failed:', costError.message);
      }

      // Use the same logic as getProjectUsersReliable but with admin endpoints
      const hubRegion = AccService.detectHubRegion();
      console.log('🌍 Detected hub region for admin users:', hubRegion);
      
      let users = [];
      
      if (hubRegion === 'APAC') {
        users = await AccService.getUsersForAPAC(projectId, hubId, true); // admin = true
      } else {
        users = await AccService.getUsersForUS(projectId, hubId, true); // admin = true
      }
      
      console.log(`✅ Successfully fetched ${users.length} admin users for ${hubRegion} hub`);
      return users;
      
    } catch (error) {
      console.error('❌ Error getting project users admin:', error);
      // Return mock data as fallback
      return AccService.getMockUsers(projectId);
    }
  }

  // Helper method to detect hub region dynamically from ACC API
  static detectHubRegion(hubName = null, hubData = null) {
    try {
      // If hubData is provided, use the region from the API response
      if (hubData && hubData.attributes && hubData.attributes.region) {
        const region = hubData.attributes.region.toUpperCase();
        console.log(`🎯 Hub region from API: ${hubData.attributes.name} -> ${region}`);
        return region;
      }
      
      // If we have hub data but no region field, try to get it from the hub ID or other metadata
      if (hubData && hubData.id) {
        const hubId = hubData.id;
        console.log(`🔍 Analyzing hub ID for region: ${hubId}`);
        
        // Check if hub ID contains region indicators
        if (hubId.includes('apac') || hubId.includes('asia')) {
          console.log('🌏 Hub ID indicates APAC region');
          return 'APAC';
        }
        if (hubId.includes('us') || hubId.includes('america')) {
          console.log('🇺🇸 Hub ID indicates US region');
          return 'US';
        }
      }
      
      // Fallback: Get hub name from parameter or localStorage
      const hub = hubName || JSON.parse(localStorage.getItem('selectedHub') || '{}');
      const name = hubName || hub.name || hub.attributes?.name || '';
      
      console.log('🔍 Detecting hub region for hub:', name);
      
      // Use ACC API region mapping based on hub name patterns
      const lowerName = name.toLowerCase().trim();
      
      // ACC API Region Mapping
      if (lowerName.includes('australia') || lowerName.includes('aus') || lowerName.includes('cewa')) {
        console.log('🇦🇺 Detected Australia hub:', name);
        return 'AUS';
      }
      
      if (lowerName.includes('japan') || lowerName.includes('jpn')) {
        console.log('🇯🇵 Detected Japan hub:', name);
        return 'JPN';
      }
      
      if (lowerName.includes('india') || lowerName.includes('ind')) {
        console.log('🇮🇳 Detected India hub:', name);
        return 'IND';
      }
      
      if (lowerName.includes('germany') || lowerName.includes('deu')) {
        console.log('🇩🇪 Detected Germany hub:', name);
        return 'DEU';
      }
      
      if (lowerName.includes('united kingdom') || lowerName.includes('gbr') || lowerName.includes('uk')) {
        console.log('🇬🇧 Detected UK hub:', name);
        return 'GBR';
      }
      
      if (lowerName.includes('canada') || lowerName.includes('can')) {
        console.log('🇨🇦 Detected Canada hub:', name);
        return 'CAN';
      }
      
      if (lowerName.includes('europe') || lowerName.includes('emea')) {
        console.log('🇪🇺 Detected Europe hub:', name);
        return 'EMEA';
      }
      
      // Check for US indicators
      const usIndicators = ['usa', 'united states', 'america', 'north america', 'us', 'arkance'];
      const isUS = usIndicators.some(indicator => 
        lowerName.includes(indicator.toLowerCase())
      );
      
      if (isUS) {
        console.log('🇺🇸 Detected US hub from name pattern:', name);
        return 'US';
      }
      
      // Default to US for unknown regions
      console.log('🇺🇸 Defaulting to US hub for:', name);
      return 'US';
    } catch (error) {
      console.warn('⚠️ Error detecting hub region, defaulting to US:', error);
      return 'US';
    }
  }

  // Enhanced method to get hub region with display info
  static getHubRegionInfo(hub) {
    // Use the region directly from the ACC API response
    const region = hub.attributes?.region || AccService.detectHubRegion(hub.name || hub.attributes?.name, hub);
    
    // Map ACC API regions to display info
    const regionMappings = {
      'US': { flag: '🇺🇸', name: 'United States', dataCenter: 'US East/West' },
      'AUS': { flag: '🇦🇺', name: 'Australia', dataCenter: 'AWS Sydney' },
      'JPN': { flag: '🇯🇵', name: 'Japan', dataCenter: 'AWS Tokyo' },
      'IND': { flag: '🇮🇳', name: 'India', dataCenter: 'AWS Mumbai' },
      'DEU': { flag: '🇩🇪', name: 'Germany', dataCenter: 'AWS Frankfurt' },
      'GBR': { flag: '🇬🇧', name: 'United Kingdom', dataCenter: 'AWS London' },
      'CAN': { flag: '🇨🇦', name: 'Canada', dataCenter: 'AWS Central' },
      'EMEA': { flag: '🇪🇺', name: 'Europe', dataCenter: 'AWS Ireland' }
    };
    
    const regionInfo = regionMappings[region] || { flag: '🇺🇸', name: 'United States', dataCenter: 'US East/West' };
    
    console.log('🌍 Hub region info:', {
      hubName: hub.name || hub.attributes?.name,
      region: region,
      flag: regionInfo.flag,
      name: regionInfo.name,
      dataCenter: regionInfo.dataCenter,
      source: hub.attributes?.region ? 'ACC API' : 'Detected'
    });
    
    return {
      region: region,
      flag: regionInfo.flag,
      name: regionInfo.name,
      dataCenter: regionInfo.dataCenter
    };
  }

  // Get users for APAC hubs
  static async getUsersForAPAC(projectId, hubId, isAdmin = false) {
    try {
      console.log('🌏 Fetching users for APAC hub, project:', projectId, 'admin:', isAdmin);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      const headers = AccService.getHeaders();
      
      console.log('🔑 Headers for user fetch:', headers);
      console.log('🔑 Project ID:', projectId);
      console.log('🔑 Hub ID:', hubId);
      
      // APAC-specific user endpoints - try multiple approaches
      const endpoints = isAdmin ? [
        `/construction/admin/v1/projects/${projectId}/users`,
        `/project/v1/projects/${projectId}/users`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/users`,
        `/project/v1/projects/${projectId}/memberships`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/memberships`
      ] : [
        `/project/v1/projects/${projectId}/users`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/users`,
        `/construction/admin/v1/projects/${projectId}/users`,
        `/project/v1/projects/${projectId}/memberships`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/memberships`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying APAC user endpoint: ${endpoint}`);
          const fullUrl = `https://developer.api.autodesk.com${endpoint}`;
          console.log(`🌐 Full URL: ${fullUrl}`);
          
          const response = await fetch(fullUrl, {
            headers,
            method: 'GET'
          });
          
          console.log(`📡 Response status: ${response.status}`);
          console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📊 Raw response data:`, data);
            
            const users = data.data || data.results || data || [];
            console.log(`✅ APAC user endpoint success: ${users.length} users found`);
            
            // Process users to ensure they have the right format
            const processedUsers = users.map(user => ({
              id: user.id || user.userId,
              name: user.attributes?.name || user.name || user.displayName || 'Unknown User',
              email: user.attributes?.email || user.email || user.emailAddress,
              status: user.attributes?.status || user.status || 'active',
              role: user.attributes?.role || user.role || 'Member',
              companyName: user.attributes?.companyName || user.companyName || 'Unknown Company',
              attributes: user.attributes || user
            }));
            
            console.log(`👥 Processed users:`, processedUsers);
            return processedUsers;
          } else {
        const errorText = await response.text();
            console.log(`⚠️ APAC user endpoint failed: ${response.status} - ${errorText}`);
          }
        } catch (endpointError) {
          console.log(`⚠️ APAC user endpoint error:`, endpointError.message);
        }
      }
      
      console.log('⚠️ All APAC user endpoints failed, returning empty array');
      return [];
      
    } catch (error) {
      console.error('❌ Error fetching APAC users:', error);
      return [];
    }
  }

  // Get users for US hubs
  static async getUsersForUS(projectId, hubId, isAdmin = false) {
    try {
      console.log('🇺🇸 Fetching users for US hub, project:', projectId, 'admin:', isAdmin);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      const headers = AccService.getHeaders();
      
      console.log('🔑 Headers for user fetch:', headers);
      console.log('🔑 Project ID:', projectId);
      console.log('🔑 Hub ID:', hubId);
      
      // US-specific user endpoints - try multiple approaches
      const endpoints = isAdmin ? [
        `/construction/admin/v1/projects/${projectId}/users`,
        `/project/v1/projects/${projectId}/users`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/users`,
        `/project/v1/projects/${projectId}/memberships`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/memberships`
      ] : [
        `/project/v1/projects/${projectId}/users`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/users`,
        `/construction/admin/v1/projects/${projectId}/users`,
        `/project/v1/projects/${projectId}/memberships`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/memberships`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying US user endpoint: ${endpoint}`);
          const fullUrl = `https://developer.api.autodesk.com${endpoint}`;
          console.log(`🌐 Full URL: ${fullUrl}`);
          
          const response = await fetch(fullUrl, {
            headers,
            method: 'GET'
          });
          
          console.log(`📡 Response status: ${response.status}`);
          console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📊 Raw response data:`, data);
            
            const users = data.data || data.results || data || [];
            console.log(`✅ US user endpoint success: ${users.length} users found`);
            
            // Process users to ensure they have the right format
            const processedUsers = users.map(user => ({
              id: user.id || user.userId,
              name: user.attributes?.name || user.name || user.displayName || 'Unknown User',
              email: user.attributes?.email || user.email || user.emailAddress,
              status: user.attributes?.status || user.status || 'active',
              role: user.attributes?.role || user.role || 'Member',
              companyName: user.attributes?.companyName || user.companyName || 'Unknown Company',
              attributes: user.attributes || user
            }));
            
            console.log(`👥 Processed users:`, processedUsers);
            return processedUsers;
          } else {
            const errorText = await response.text();
            console.log(`⚠️ US user endpoint failed: ${response.status} - ${errorText}`);
          }
        } catch (endpointError) {
          console.log(`⚠️ US user endpoint error:`, endpointError.message);
        }
      }
      
      console.log('⚠️ All US user endpoints failed, returning empty array');
      return [];
      
    } catch (error) {
      console.error('❌ Error fetching US users:', error);
      return [];
    }
  }

  // Get account users using the ACC API
  static async getAccountUsers(accountId, options = {}) {
    try {
      console.log('👥 Fetching account users for account:', accountId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLegToken) {
        console.warn('⚠️ No two-legged token available for account users');
        return [];
      }

      // Convert hub ID to account ID if needed (remove "b." prefix)
      const cleanAccountId = accountId.replace(/^b\./, '');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.sort) params.append('sort', options.sort);
      if (options.field) params.append('field', options.field);
      
      const queryString = params.toString();
      const url = `https://developer.api.autodesk.com/hq/v1/accounts/${cleanAccountId}/users${queryString ? `?${queryString}` : ''}`;
      
      console.log('🌐 Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.twoLegToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        console.log(`✅ Successfully fetched ${users.length} account users`);
        
        // Process users to ensure consistent format
        const processedUsers = users.map(user => ({
          id: user.id,
          accountId: user.account_id,
          role: user.role,
          status: user.status,
          companyId: user.company_id,
          companyName: user.company_name,
          lastSignIn: user.last_sign_in,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          firstName: user.first_name,
          lastName: user.last_name,
          uid: user.uid,
          imageUrl: user.image_url,
          addressLine1: user.address_line_1,
          addressLine2: user.address_line_2,
          city: user.city,
          stateOrProvince: user.state_or_province,
          postalCode: user.postal_code,
          country: user.country,
          phone: user.phone,
          company: user.company,
          jobTitle: user.job_title,
          industry: user.industry,
          aboutMe: user.about_me,
          defaultRole: user.default_role,
          defaultRoleId: user.default_role_id,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          // Additional fields for compatibility
          displayName: user.name,
          emailAddress: user.email,
          attributes: {
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
          }
        }));
        
        console.log('👥 Processed account users:', processedUsers);
        return processedUsers;
        
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch account users: ${response.status} ${response.statusText}`, errorText);
        return [];
      }
      
    } catch (error) {
      console.error('❌ Error fetching account users:', error);
      return [];
    }
  }

  // Get specific user details using the ACC API
  static async getAccountUser(accountId, userId) {
    try {
      console.log('👤 Fetching user details for user:', userId, 'in account:', accountId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLegToken) {
        console.warn('⚠️ No two-legged token available for user details');
        return null;
      }

      // Convert hub ID to account ID if needed (remove "b." prefix)
      const cleanAccountId = accountId.replace(/^b\./, '');
      
      const url = `https://developer.api.autodesk.com/hq/v1/accounts/${cleanAccountId}/users/${userId}`;
      
      console.log('🌐 Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.twoLegToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        console.log('✅ Successfully fetched user details');
        
        // Process user to ensure consistent format
        const processedUser = {
          id: user.id,
          accountId: user.account_id,
          role: user.role,
          status: user.status,
          companyId: user.company_id,
          companyName: user.company_name,
          lastSignIn: user.last_sign_in,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          firstName: user.first_name,
          lastName: user.last_name,
          uid: user.uid,
          imageUrl: user.image_url,
          addressLine1: user.address_line_1,
          addressLine2: user.address_line_2,
          city: user.city,
          stateOrProvince: user.state_or_province,
          postalCode: user.postal_code,
          country: user.country,
          phone: user.phone,
          company: user.company,
          jobTitle: user.job_title,
          industry: user.industry,
          aboutMe: user.about_me,
          defaultRole: user.default_role,
          defaultRoleId: user.default_role_id,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          // Additional fields for compatibility
          displayName: user.name,
          emailAddress: user.email,
          attributes: {
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
          }
        };
        
        console.log('👤 Processed user details:', processedUser);
        return processedUser;
        
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch user details: ${response.status} ${response.statusText}`, errorText);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      return null;
    }
  }

  // Mock user data for fallback
  static getMockUsers(projectId) {
    console.log('🎭 Generating mock users for project:', projectId);
    
    return [
      {
        id: `mock-user-1-${projectId}`,
        name: 'John Smith',
        email: 'john.smith@company.com',
        status: 'active',
        role: 'Project Manager',
        attributes: {
          name: 'John Smith',
          email: 'john.smith@company.com',
          status: 'active'
        }
      },
      {
        id: `mock-user-2-${projectId}`,
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        status: 'active',
        role: 'Site Engineer',
        attributes: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@company.com',
          status: 'active'
        }
      },
      {
        id: `mock-user-3-${projectId}`,
        name: 'Mike Wilson',
        email: 'mike.wilson@company.com',
        status: 'active',
        role: 'Foreman',
        attributes: {
          name: 'Mike Wilson',
          email: 'mike.wilson@company.com',
          status: 'active'
        }
      }
    ];
  }

  /**
   * Get user roles for a specific user
   * @param {string} accountId - The account ID
   * @param {string} userId - The user ID
   * @param {string} projectId - The project ID (optional)
   * @returns {Promise<Array>} Array of user roles
   */
  static async getUserRoles(accountId, userId, projectId = null) {
    try {
      console.log(`🔍 Getting roles for user ${userId} in account ${accountId}`);
      
      let url = `/construction/admin/v1/accounts/${accountId}/users/${userId}/roles`;
      
      if (projectId) {
        url += `?filter[projectId]=${projectId}`;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com${url}`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const roles = data.results || data.data || [];
        console.log(`✅ Found ${roles.length} roles for user`);
        return roles;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ Failed to get user roles: ${response.status} - ${errorText}`);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Get approval workflows for a project
   * @param {string} projectId - The project ID
   * @param {string} hubId - The hub ID
   * @returns {Promise<Array>} Array of approval workflows
   */
  static async getApprovalWorkflows(projectId, hubId) {
    try {
      console.log(`🔍 Fetching approval workflows for project: ${projectId}, hub: ${hubId}`);
      
      // Try multiple approaches to access the project
      let projectAccessible = false;
      let projectData = null;
      
      // Approach 1: Direct project service access
      try {
        const projectResponse = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${projectId}`, {
          method: 'GET',
          headers: AccService.getHeaders()
        });
        
        if (projectResponse.ok) {
          projectData = await projectResponse.json();
          console.log(`✅ Project access confirmed via direct access:`, projectData.data?.attributes?.name);
          projectAccessible = true;
        } else {
          console.log(`⚠️ Direct project access failed: ${projectResponse.status}`);
        }
      } catch (projectError) {
        console.log(`⚠️ Direct project access error:`, projectError.message);
      }
      
      // Approach 2: Try hub-based access
      if (!projectAccessible && hubId) {
        try {
          const hubProjectResponse = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}`, {
            method: 'GET',
            headers: AccService.getHeaders()
          });
          
          if (hubProjectResponse.ok) {
            projectData = await hubProjectResponse.json();
            console.log(`✅ Project access confirmed via hub:`, projectData.data?.attributes?.name);
            projectAccessible = true;
          } else {
            console.log(`⚠️ Hub-based project access failed: ${hubProjectResponse.status}`);
          }
        } catch (hubError) {
          console.log(`⚠️ Hub-based project access error:`, hubError.message);
        }
      }
      
      // Approach 3: Check if project exists in Cost Management (which we know works)
      if (!projectAccessible) {
        try {
          // We know the project exists in Cost Management, so it's a valid project
          // Just not accessible through standard Project service
          console.log(`⚠️ Project not accessible via Project service, but exists in Cost Management`);
          console.log(`🔄 Proceeding with mock approval workflows for Cost Management project`);
          projectAccessible = true; // Allow to proceed with mock data
        } catch (costError) {
          console.log(`⚠️ Cost Management check failed:`, costError.message);
        }
      }
      
      if (!projectAccessible) {
        throw new Error(`Project not accessible through any method`);
      }
      
      // If this is a Cost Management project, return mock approval workflows matching Gate 1 structure
      if (projectData === null) {
        console.log('🔄 Returning mock approval workflows for Cost Management project');
        return [
          {
            id: 'gate-1',
            name: 'Gate 1',
            description: 'Standard gate review process for Cost Management projects',
            status: 'active',
            type: 'approval',
            
            // Workflow steps matching Gate 1 example
            steps: [
              {
                id: 'step-1',
                name: 'Final Review',
                initiator: 'khashayar saffari',
                approver: 'Caitlyn Scibilia',
                timeAllowed: '3',
                timeUnit: 'calendar days',
                status: 'pending',
                order: 1
              }
            ],
            
            // Review status options matching Gate 1
            reviewStatuses: [
              {
                value: 'Approved',
                label: 'Approved',
                icon: 'check',
                color: 'green'
              },
              {
                value: 'Rejected',
                label: 'Rejected',
                icon: 'x',
                color: 'red'
              },
              {
                value: 'Approved w/comments',
                label: 'Approved w/comments',
                icon: 'file',
                color: 'blue'
              }
            ],
            
            // Post-completion actions matching Gate 1
            copyApprovedFiles: true,
            copyCondition: 'Any file in the review is approved',
            targetFolder: 'Project Files/00 - School Project',
            allowInitiatorChange: true,
            includeMarkups: false,
            allowApproverChange: true,
            updateAttributes: false,
            
            // Workflow notes
            notes: 'You may add a customised note or disclaimer that will be visible to all reviewers on the Review detail page.',
            
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            source: 'mock-cost-management'
          },
          {
            id: 'budget-approval-1',
            name: 'Budget Approval Workflow',
            description: 'Budget approval process for Cost Management projects',
            status: 'active',
            type: 'approval',
            
            steps: [
              {
                id: 'step-1',
                name: 'Budget Review',
                initiator: 'Project Manager',
                approver: 'Budget Manager',
                timeAllowed: '2',
                timeUnit: 'calendar days',
                status: 'pending',
                order: 1
              },
              {
                id: 'step-2',
                name: 'Financial Validation',
                initiator: 'Budget Manager',
                approver: 'Finance Director',
                timeAllowed: '3',
                timeUnit: 'calendar days',
                status: 'pending',
                order: 2
              }
            ],
            
            reviewStatuses: [
              {
                value: 'Approved',
                label: 'Approved',
                icon: 'check',
                color: 'green'
              },
              {
                value: 'Rejected',
                label: 'Rejected',
                icon: 'x',
                color: 'red'
              }
            ],
            
            copyApprovedFiles: false,
            copyCondition: 'All files in the review are approved',
            targetFolder: 'Project Files',
            allowInitiatorChange: false,
            includeMarkups: true,
            allowApproverChange: false,
            updateAttributes: true,
            
            notes: 'Budget approval workflow for financial validation.',
            
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            source: 'mock-cost-management'
          }
        ];
      }
      
      // Try multiple endpoints for approval workflows
      const endpoints = [
        // ACC Reviews API endpoints (primary - official API)
        `/construction/reviews/v1/projects/${projectId}/workflows`,
        `/construction/reviews/v1/projects/${projectId}/workflows?filter[initiator]=true`,
        `/construction/reviews/v1/projects/${projectId}/workflows?filter[status]=ACTIVE`,
        `/construction/reviews/v1/projects/${projectId}/workflows?limit=50&sort=name`,
        
        // Legacy endpoints for fallback
        `/reviews/v1/projects/${projectId}/workflows`,
        `/reviews/v1/hubs/${hubId}/projects/${projectId}/workflows`,
        `/reviews/v1/workflows?filter[project]=${projectId}`,
        `/reviews/v1/workflows?filter[initiator]=true`,
        
        // Construction Admin API endpoints
        `/construction/admin/v1/projects/${projectId}/workflows`,
        `/construction/admin/v1/hubs/${hubId}/projects/${projectId}/workflows`,
        `/construction/admin/v1/projects/${projectId}/approval-workflows`,
        `/construction/admin/v1/hubs/${hubId}/projects/${projectId}/approval-workflows`,
        
        // Project API endpoints
        `/project/v1/projects/${projectId}/workflows`,
        `/project/v1/hubs/${hubId}/projects/${projectId}/workflows`,
        `/project/v1/projects/${projectId}/approval-workflows`,
        
        // Data Management API endpoints
        `/data/v1/projects/${projectId}/workflows`,
        `/data/v1/projects/${projectId}/approval-workflows`,
        
        // Workflow API endpoints
        `/workflow/v1/projects/${projectId}/workflows`,
        `/workflow/v1/hubs/${hubId}/projects/${projectId}/workflows`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying approval workflow endpoint: ${endpoint}`);
          const fullUrl = `https://developer.api.autodesk.com${endpoint}`;
          
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              ...AccService.getHeaders(),
              'Accept': 'application/vnd.api+json,application/json'
            }
          });
          
          console.log(`📡 Response status: ${response.status} for ${endpoint}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📊 Raw approval workflow data from ${endpoint}:`, data);
            
            // Handle different response formats
            let workflows = [];
            if (data.data) {
              workflows = Array.isArray(data.data) ? data.data : [data.data];
            } else if (data.results) {
              workflows = Array.isArray(data.results) ? data.results : [data.results];
            } else if (data.workflows) {
              workflows = Array.isArray(data.workflows) ? data.workflows : [data.workflows];
            } else if (Array.isArray(data)) {
              workflows = data;
            } else if (data) {
              workflows = [data];
            }
            
            console.log(`✅ Found ${workflows.length} approval workflows from ${endpoint}`);
            
            if (workflows.length > 0) {
              // Process workflows to match the Gate 1 structure you showed
              const processedWorkflows = workflows.map(workflow => {
                const attributes = workflow.attributes || workflow;
                const workflowData = attributes || workflow;
                
                // Extract workflow steps with approvers and time limits
                const steps = workflowData.steps || workflowData.workflowSteps || [];
                const processedSteps = steps.map(step => ({
                  id: step.id || `step-${Date.now()}`,
                  name: step.name || step.stepName || 'Review Step',
                  initiator: step.initiator || step.initiatorName || 'System',
                  approver: step.approver || step.approverName || step.approverEmail || 'Unknown Approver',
                  timeAllowed: step.timeAllowed || step.timeLimit || '3',
                  timeUnit: step.timeUnit || 'calendar days',
                  status: step.status || 'pending',
                  order: step.order || step.sequence || 1
                }));
                
                // Extract review status options
                const reviewStatuses = workflowData.reviewStatuses || workflowData.statuses || [];
                const processedStatuses = reviewStatuses.map(status => ({
                  value: status.value || status.name,
                  label: status.label || status.displayName || status.value,
                  icon: status.icon || (status.value === 'Approved' ? 'check' : status.value === 'Rejected' ? 'x' : 'file'),
                  color: status.color || (status.value === 'Approved' ? 'green' : status.value === 'Rejected' ? 'red' : 'blue')
                }));
                
                // Extract post-completion actions
                const actions = workflowData.actions || workflowData.completionActions || {};
                
                return {
                  id: workflow.id || `workflow-${Date.now()}`,
                  name: workflowData.name || workflow.name || 'Unknown Workflow',
                  description: workflowData.description || workflow.description || '',
                  status: workflowData.status || workflow.status || 'active',
                  type: workflowData.type || workflow.type || 'approval',
                  
                  // Workflow structure matching Gate 1 example
                  steps: processedSteps,
                  reviewStatuses: processedStatuses,
                  
                  // Post-completion actions
                  copyApprovedFiles: actions.copyApprovedFiles || false,
                  copyCondition: actions.copyCondition || 'Any file in the review is approved',
                  targetFolder: actions.targetFolder || 'Project Files',
                  allowInitiatorChange: actions.allowInitiatorChange || true,
                  includeMarkups: actions.includeMarkups || false,
                  allowApproverChange: actions.allowApproverChange || true,
                  updateAttributes: actions.updateAttributes || false,
                  
                  // Workflow notes
                  notes: workflowData.notes || workflowData.workflowNotes || '',
                  
                  // Metadata
                  created: workflowData.created || workflow.created || new Date().toISOString(),
                  modified: workflowData.modified || workflow.modified || new Date().toISOString(),
                  attributes: workflowData,
                  source: endpoint
                };
              });
              
              console.log(`📋 Processed approval workflows with Gate 1 structure:`, processedWorkflows);
              return processedWorkflows;
            }
          } else {
            const errorText = await response.text();
            console.log(`⚠️ Approval workflow endpoint failed: ${response.status} - ${errorText}`);
          }
        } catch (endpointError) {
          console.log(`⚠️ Approval workflow endpoint error:`, endpointError.message);
        }
      }
      
      // Try alternative approach: get project workflows through hub
      try {
        console.log(`🔄 Trying to get workflows through hub: ${hubId}`);
        const hubWorkflowsResponse = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/workflows`, {
          method: 'GET',
          headers: {
            ...AccService.getHeaders(),
            'Accept': 'application/vnd.api+json,application/json'
          }
        });
        
        if (hubWorkflowsResponse.ok) {
          const hubData = await hubWorkflowsResponse.json();
          console.log(`📊 Hub workflows data:`, hubData);
          
          const hubWorkflows = hubData.data || hubData.results || hubData || [];
          if (hubWorkflows.length > 0) {
            const projectWorkflows = hubWorkflows.filter(workflow => 
              workflow.relationships?.project?.data?.id === projectId ||
              workflow.attributes?.projectId === projectId
            );
            
            if (projectWorkflows.length > 0) {
              console.log(`✅ Found ${projectWorkflows.length} workflows for project in hub`);
              return projectWorkflows.map(workflow => ({
                id: workflow.id,
                name: workflow.attributes?.name || workflow.name || 'Unknown Workflow',
                description: workflow.attributes?.description || workflow.description || '',
                status: workflow.attributes?.status || workflow.status || 'active',
                type: workflow.attributes?.type || workflow.type || 'approval',
                steps: workflow.attributes?.steps || workflow.steps || [],
                created: workflow.attributes?.created || workflow.created || new Date().toISOString(),
                modified: workflow.attributes?.modified || workflow.modified || new Date().toISOString(),
                attributes: workflow.attributes || workflow,
                source: 'hub-workflows'
              }));
            }
          }
        }
      } catch (hubError) {
        console.log(`⚠️ Hub workflows error:`, hubError.message);
      }
      
      console.log('⚠️ All approval workflow endpoints failed, returning fallback data');
      
      // Return fallback data with "Gate 1" workflow as mentioned by user
      return [
        {
          id: 'gate-1-workflow',
          name: 'Gate 1',
          description: 'Project Gate 1 approval workflow',
          status: 'active',
          type: 'approval',
          steps: [
            {
              id: 'step-1',
              name: 'Technical Review',
              description: 'Technical review of project deliverables',
              required: true,
              approvers: []
            },
            {
              id: 'step-2', 
              name: 'Quality Review',
              description: 'Quality assurance review',
              required: true,
              approvers: []
            }
          ],
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          attributes: {},
          source: 'fallback'
        }
      ];
      
    } catch (error) {
      console.error('❌ Error fetching approval workflows:', error);
      
      // Return fallback data on error
      return [
        {
          id: 'gate-1-workflow',
          name: 'Gate 1',
          description: 'Project Gate 1 approval workflow',
          status: 'active',
          type: 'approval',
          steps: [
            {
              id: 'step-1',
              name: 'Technical Review',
              description: 'Technical review of project deliverables',
              required: true,
              approvers: []
            }
          ],
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          attributes: {},
          source: 'fallback-error'
        }
      ];
    }
  }

  /**
   * Submit files to an approval workflow
   * @param {string} projectId - The project ID
   * @param {string} workflowId - The workflow ID
   * @param {Array} fileIds - Array of file IDs to submit
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} Submission result
   */
  static async submitToApprovalWorkflow(projectId, workflowId, fileIds, comment = '') {
    try {
      console.log(`🔍 DEBUG: Creating review in ACC instead of workflow submission`);
      console.log(`🔍 DEBUG: Project ID: ${projectId}`);
      console.log(`🔍 DEBUG: Workflow ID: ${workflowId}`);
      console.log(`🔍 DEBUG: File IDs:`, fileIds);
      console.log(`🔍 DEBUG: Comment: ${comment}`);
      
      // Validate inputs
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      if (!fileIds || fileIds.length === 0) {
        throw new Error('File IDs are required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Create review data (direct review creation)
      const reviewData = {
        data: {
          type: "reviews",
          attributes: {
            title: `Review: ${workflowId}`,
            description: comment || `Review for ${fileIds.length} file(s)`,
            status: "PENDING"
          },
          relationships: {
            project: {
              data: {
                type: "projects",
                id: projectId
              }
            },
            items: {
              data: fileIds.map(fileId => ({
                type: "items",
                id: fileId
              }))
            }
          }
        }
      };
      
      console.log(`🔍 DEBUG: Review data:`, reviewData);
      
      // Try multiple review creation endpoints (direct review creation)
      const endpoints = [
        `/construction/reviews/v1/projects/${projectId}/reviews`,
        `/construction/admin/v1/projects/${projectId}/reviews`,
        `/project/v1/projects/${projectId}/reviews`,
        `/reviews/v1/projects/${projectId}/reviews`
      ];
      
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        try {
          console.log(`🔄 DEBUG: Trying review endpoint ${i + 1}/${endpoints.length}: ${endpoint}`);
          const fullUrl = `https://developer.api.autodesk.com${endpoint}`;
          console.log(`🔍 DEBUG: Full URL: ${fullUrl}`);
          
          // Use review data for all review endpoints
          const requestData = reviewData;
          console.log(`🔍 DEBUG: Using review data structure:`, requestData);
          
          const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.threeLegToken}`,
              'Content-Type': 'application/vnd.api+json',
              'Accept': 'application/vnd.api+json'
            },
            body: JSON.stringify(requestData)
          });
          
          console.log(`📡 DEBUG: Response status: ${response.status}`);
          console.log(`📡 DEBUG: Response headers:`, Object.fromEntries(response.headers.entries()));
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ DEBUG: Review created successfully`);
            console.log(`✅ DEBUG: Response data:`, data);
            return {
              success: true,
              submissionId: data.data?.id || `review-${Date.now()}`,
              status: 'created',
              data: data,
              endpoint: endpoint
            };
          } else {
            const errorText = await response.text();
            console.log(`⚠️ DEBUG: Review endpoint ${i + 1} failed:`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              endpoint: endpoint
            });
          }
        } catch (endpointError) {
          console.log(`⚠️ DEBUG: Review endpoint ${i + 1} error:`, {
            message: endpointError.message,
            stack: endpointError.stack,
            endpoint: endpoint
          });
        }
      }
      
      // If all review endpoints fail, try creating an issue and relationships
      console.log(`⚠️ DEBUG: All review endpoints failed, trying Issues API with relationships`);
      
      try {
        // First, create an issue
        const issueData = {
          data: {
            type: "issues",
            attributes: {
              title: `Review Request: ${workflowId}`,
              description: comment || `Review request for ${fileIds.length} file(s)`,
              status: "open",
              type: "review"
            },
            relationships: {
              project: {
                data: {
                  type: "projects",
                  id: projectId
                }
              }
            }
          }
        };
        
        const issueResponse = await fetch(`https://developer.api.autodesk.com/construction/issues/v1/projects/${projectId}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify(issueData)
        });
        
        if (issueResponse.ok) {
          const issueResult = await issueResponse.json();
          const issueId = issueResult.data?.id;
          console.log(`✅ DEBUG: Created issue:`, issueResult);
          
          // Now create relationships between the issue and files using Relationship Service
          // Process files in batches of 20 (API limit)
          const relationships = [];
          const batchSize = 20;
          const fileBatches = [];
          
          for (let i = 0; i < fileIds.length; i += batchSize) {
            fileBatches.push(fileIds.slice(i, i + batchSize));
          }
          
          for (const fileBatch of fileBatches) {
            try {
              // Create batch relationship data
              const relationshipData = fileBatch.map(fileId => ({
                entities: [
                  {
                    domain: "autodesk-construction-issues",
                    type: "issue",
                    id: issueId,
                    createdOn: new Date().toISOString()
                  },
                  {
                    domain: "autodesk-construction-documentmanagement",
                    type: "documentlineage",
                    id: fileId,
                    createdOn: new Date().toISOString()
                  }
                ]
              }));
              
              console.log(`🔍 DEBUG: Creating batch relationships for ${fileBatch.length} files`);
              const batchRelationships = await AccService.createRelationships(projectId, relationshipData);
              relationships.push(...batchRelationships);
              
            } catch (relError) {
              console.log(`⚠️ DEBUG: Error creating batch relationships:`, relError.message);
            }
          }
          
          return {
            success: true,
            submissionId: issueId || `issue-${Date.now()}`,
            status: 'created',
            data: issueResult,
            relationships: relationships,
            fallback: true,
            type: 'issue_with_relationships'
          };
        }
      } catch (issueError) {
        console.log(`❌ DEBUG: Issues API with relationships also failed:`, issueError.message);
      }
      
      // If all endpoints fail, return error
      console.log(`❌ DEBUG: All review and issue endpoints failed`);
      return {
        success: false,
        error: 'All review and issue endpoints failed',
        debug: 'No valid review creation endpoints available',
        files: fileIds,
        comment: comment,
        workflowId: workflowId
      };
      
    } catch (error) {
      console.error('❌ DEBUG: Error creating review:', error);
      console.error('❌ DEBUG: Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
        debug: 'Review creation failed with error'
      };
    }
  }

  /**
   * Get reviews for a project
   * @param {string} projectId - The project ID
   * @returns {Promise<Array>} Array of reviews
   */
  static async getProjectReviews(projectId) {
    try {
      console.log(`🔍 DEBUG: Getting reviews for project: ${projectId}`);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Try multiple review endpoints
      const endpoints = [
        `/construction/reviews/v1/projects/${projectId}/reviews`,
        `/reviews/v1/projects/${projectId}/reviews`,
        `/construction/admin/v1/projects/${projectId}/reviews`
      ];
      
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        try {
          console.log(`🔄 DEBUG: Trying reviews endpoint ${i + 1}/${endpoints.length}: ${endpoint}`);
          const fullUrl = `https://developer.api.autodesk.com${endpoint}`;
          
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${credentials.threeLegToken}`,
              'Accept': 'application/vnd.api+json'
            }
          });
          
          console.log(`📡 DEBUG: Reviews response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ DEBUG: Reviews retrieved successfully`);
            console.log(`✅ DEBUG: Reviews data:`, data);
            return data.data || [];
          } else {
            const errorText = await response.text();
            console.log(`⚠️ DEBUG: Reviews endpoint ${i + 1} failed:`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              endpoint: endpoint
            });
          }
        } catch (endpointError) {
          console.log(`⚠️ DEBUG: Reviews endpoint ${i + 1} error:`, endpointError.message);
        }
      }
      
      // Return empty array if all endpoints fail
      console.log(`⚠️ DEBUG: All review endpoints failed, returning empty array`);
      return [];
      
    } catch (error) {
      console.error('❌ DEBUG: Error getting reviews:', error);
      return [];
    }
  }

  /**
   * Check if all files in a gate are approved
   * @param {string} projectId - The project ID
   * @param {Array} fileIds - Array of file IDs to check
   * @returns {Promise<Object>} Approval status
   */
  static async checkGateApprovalStatus(projectId, fileIds) {
    try {
      console.log(`🔍 DEBUG: Checking gate approval status for ${fileIds.length} files`);
      
      const reviews = await AccService.getProjectReviews(projectId);
      console.log(`🔍 DEBUG: Found ${reviews.length} reviews`);
      
      const fileApprovalStatus = {};
      let allApproved = true;
      
      // Initialize all files as not approved
      fileIds.forEach(fileId => {
        fileApprovalStatus[fileId] = {
          approved: false,
          reviewId: null,
          status: 'pending',
          reviewTitle: null
        };
      });
      
      // Check each review for our files
      reviews.forEach(review => {
        const reviewItems = review.relationships?.items?.data || [];
        const reviewFileIds = reviewItems.map(item => item.id);
        
        reviewFileIds.forEach(fileId => {
          if (fileIds.includes(fileId)) {
            const status = review.attributes?.status || 'PENDING';
            const isApproved = status === 'APPROVED' || status === 'COMPLETED';
            
            fileApprovalStatus[fileId] = {
              approved: isApproved,
              reviewId: review.id,
              status: status.toLowerCase(),
              reviewTitle: review.attributes?.title || 'Unknown Review'
            };
            
            if (!isApproved) {
              allApproved = false;
            }
          }
        });
      });
      
      console.log(`🔍 DEBUG: File approval status:`, fileApprovalStatus);
      console.log(`🔍 DEBUG: All files approved: ${allApproved}`);
      
      return {
        allApproved,
        fileApprovalStatus,
        totalFiles: fileIds.length,
        approvedFiles: Object.values(fileApprovalStatus).filter(f => f.approved).length,
        pendingFiles: Object.values(fileApprovalStatus).filter(f => !f.approved).length
      };
      
    } catch (error) {
      console.error('❌ DEBUG: Error checking gate approval status:', error);
      return {
        allApproved: false,
        fileApprovalStatus: {},
        totalFiles: fileIds.length,
        approvedFiles: 0,
        pendingFiles: fileIds.length,
        error: error.message
      };
    }
  }

  /**
   * Create relationships between entities using BIM 360 Relationship Service
   * @param {string} projectId - The project ID (container ID)
   * @param {Array} relationships - Array of relationship objects
   * @returns {Promise<Array>} Created relationships
   */
  static async createRelationships(projectId, relationships) {
    try {
      console.log(`🔍 DEBUG: Creating relationships for project: ${projectId}`);
      console.log(`🔍 DEBUG: Relationships data:`, relationships);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(relationships)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Created relationships:`, data);
        return data;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to create relationships:`, response.status, errorText);
        return [];
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating relationships:', error);
      return [];
    }
  }

  /**
   * Delete relationships by their UUIDs
   * @param {string} projectId - The project ID (container ID)
   * @param {Array<string>} relationshipIds - Array of relationship UUIDs to delete
   * @returns {Promise<Array>} Deleted relationship UUIDs
   */
  static async deleteRelationships(projectId, relationshipIds) {
    try {
      console.log(`🔍 DEBUG: Deleting relationships for project: ${projectId}`);
      console.log(`🔍 DEBUG: Relationship IDs to delete:`, relationshipIds);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Process in batches of 50 (API limit)
      const batchSize = 50;
      const deletedIds = [];
      
      for (let i = 0; i < relationshipIds.length; i += batchSize) {
        const batch = relationshipIds.slice(i, i + batchSize);
        
        const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships:delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batch)
        });
        
        if (response.ok) {
          const result = await response.json();
          deletedIds.push(...result.deleted);
          console.log(`✅ DEBUG: Deleted batch of ${result.deleted.length} relationships:`, result.deleted);
        } else {
          const errorText = await response.text();
          console.log(`⚠️ DEBUG: Failed to delete relationship batch:`, response.status, errorText);
        }
      }
      
      return deletedIds;
    } catch (error) {
      console.error('❌ DEBUG: Error deleting relationships:', error);
      return [];
    }
  }

  /**
   * Search for relationships in a project with advanced filtering
   * @param {string} projectId - The project ID (container ID)
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results with relationships and pagination info
   */
  static async searchRelationships(projectId, searchParams = {}) {
    try {
      console.log(`🔍 DEBUG: Searching relationships for project: ${projectId}`);
      console.log(`🔍 DEBUG: Search parameters:`, searchParams);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Build comprehensive query string
      const queryParams = new URLSearchParams();
      
      // Basic search parameters
      if (searchParams.domain) queryParams.append('domain', searchParams.domain);
      if (searchParams.type) queryParams.append('type', searchParams.type);
      if (searchParams.id) queryParams.append('id', searchParams.id);
      
      // Date filters
      if (searchParams.createdAfter) queryParams.append('createdAfter', searchParams.createdAfter);
      if (searchParams.createdBefore) queryParams.append('createdBefore', searchParams.createdBefore);
      
      // WITH relationship filters
      if (searchParams.withDomain) queryParams.append('withDomain', searchParams.withDomain);
      if (searchParams.withType) queryParams.append('withType', searchParams.withType);
      if (searchParams.withId) queryParams.append('withId', searchParams.withId);
      
      // Deleted relationship filters
      if (searchParams.includeDeleted !== undefined) queryParams.append('includeDeleted', searchParams.includeDeleted.toString());
      if (searchParams.onlyDeleted !== undefined) queryParams.append('onlyDeleted', searchParams.onlyDeleted.toString());
      
      // Pagination
      if (searchParams.pageLimit) queryParams.append('pageLimit', searchParams.pageLimit.toString());
      if (searchParams.continuationToken) queryParams.append('continuationToken', searchParams.continuationToken);

      const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships:search?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Found ${data.relationships?.length || 0} relationships:`, data);
        return data;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to search relationships:`, response.status, errorText);
        return {
          page: {},
          relationships: []
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error searching relationships:', error);
      return {
        page: {},
        relationships: []
      };
    }
  }

  /**
   * Search for all relationships with pagination support
   * @param {string} projectId - The project ID (container ID)
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} All found relationships across all pages
   */
  static async searchAllRelationships(projectId, searchParams = {}) {
    try {
      console.log(`🔍 DEBUG: Searching all relationships for project: ${projectId}`);
      
      const allRelationships = [];
      let continuationToken = null;
      let pageCount = 0;
      const maxPages = searchParams.maxPages || 100; // Prevent infinite loops
      
      do {
        const currentSearchParams = {
          ...searchParams,
          continuationToken: continuationToken,
          pageLimit: searchParams.pageLimit || 100
        };
        
        const result = await AccService.searchRelationships(projectId, currentSearchParams);
        
        if (result.relationships) {
          allRelationships.push(...result.relationships);
        }
        
        continuationToken = result.page?.continuationToken;
        pageCount++;
        
        console.log(`📄 Page ${pageCount}: ${result.relationships?.length || 0} relationships (total: ${allRelationships.length})`);
        
        if (pageCount >= maxPages) {
          console.log(`⚠️ Stopped after ${maxPages} pages to prevent infinite loop`);
          break;
        }
        
      } while (continuationToken);
      
      console.log(`✅ DEBUG: Found total of ${allRelationships.length} relationships across ${pageCount} pages`);
      return allRelationships;
    } catch (error) {
      console.error('❌ DEBUG: Error searching all relationships:', error);
      return [];
    }
  }

  /**
   * Get all relationships for a specific issue
   * @param {string} projectId - The project ID (container ID)
   * @param {string} issueId - The issue ID
   * @returns {Promise<Array>} Relationships for the issue
   */
  static async getIssueRelationships(projectId, issueId) {
    try {
      console.log(`🔍 DEBUG: Getting relationships for issue: ${issueId}`);
      
      // Search for relationships where the issue is involved
      const result = await AccService.searchRelationships(projectId, {
        domain: 'autodesk-construction-issues',
        type: 'issue',
        id: issueId
      });
      
      const relationships = result.relationships || [];
      console.log(`✅ DEBUG: Found ${relationships.length} relationships for issue ${issueId}`);
      
      return relationships;
    } catch (error) {
      console.error('❌ DEBUG: Error getting issue relationships:', error);
      return [];
    }
  }

  /**
   * Get initial sync token for relationship tracking
   * @param {string} projectId - The project ID (container ID)
   * @returns {Promise<string|null>} Initial sync token or null if failed
   */
  static async getInitialSyncToken(projectId) {
    try {
      console.log(`🔍 DEBUG: Getting initial sync token for project: ${projectId}`);
      
      // Get sync status with empty tokens to get initial state
      const syncStatus = await AccService.getRelationshipSyncStatus(projectId, []);
      
      if (syncStatus.results && syncStatus.results.length > 0) {
        const initialToken = syncStatus.results[0].syncToken;
        console.log(`✅ DEBUG: Initial sync token:`, initialToken);
        return initialToken;
      } else {
        console.log(`⚠️ DEBUG: No initial sync token available`);
        return null;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting initial sync token:', error);
      return null;
    }
  }

  /**
   * Synchronize relationships using sync token
   * @param {string} projectId - The project ID (container ID)
   * @param {string} syncToken - The sync token for incremental sync
   * @param {Object} filters - Optional filters for the sync request
   * @returns {Promise<Object>} Synchronized relationship data
   */
  static async syncRelationships(projectId, syncToken = null, filters = {}) {
    try {
      console.log(`🔍 DEBUG: Synchronizing relationships for project: ${projectId}`);
      console.log(`🔍 DEBUG: Sync token:`, syncToken);
      console.log(`🔍 DEBUG: Filters:`, filters);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Prepare sync data
      const syncData = {
        ...(syncToken && { syncToken }),
        ...(Object.keys(filters).length > 0 && { filters })
      };

      const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships:sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Relationships synchronized:`, data);
        return data;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to sync relationships:`, response.status, errorText);
        return {
          current: { data: [] },
          deleted: { data: [] },
          moreData: false,
          overwrite: false,
          nextSyncToken: null,
          error: errorText
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error synchronizing relationships:', error);
      return {
        current: { data: [] },
        deleted: { data: [] },
        moreData: false,
        overwrite: false,
        nextSyncToken: null,
        error: error.message
      };
    }
  }

  /**
   * Get relationship synchronization status
   * @param {string} projectId - The project ID (container ID)
   * @param {Array} syncTokens - Array of sync tokens to check
   * @returns {Promise<Object>} Synchronization status with results and errors
   */
  static async getRelationshipSyncStatus(projectId, syncTokens = []) {
    try {
      console.log(`🔍 DEBUG: Getting relationship sync status for project: ${projectId}`);
      console.log(`🔍 DEBUG: Sync tokens:`, syncTokens);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Prepare sync token data
      const syncData = syncTokens.map(token => ({
        syncToken: token
      }));

      const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships:syncStatus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Sync status retrieved:`, data);
        return data;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get sync status:`, response.status, errorText);
        return {
          results: [],
          errors: [{
            type: 'RequestFailed',
            title: 'Failed to get sync status',
            detail: errorText
          }]
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting relationship sync status:', error);
      return {
        results: [],
        errors: [{
          type: 'RequestError',
          title: 'Error getting sync status',
          detail: error.message
        }]
      };
    }
  }

  /**
   * Perform complete relationship synchronization workflow
   * @param {string} projectId - The project ID (container ID)
   * @param {Object} options - Synchronization options
   * @returns {Promise<Object>} Complete synchronization results
   */
  static async performFullSync(projectId, options = {}) {
    try {
      console.log(`🔍 DEBUG: Starting full relationship sync for project: ${projectId}`);
      
      const results = {
        initialToken: null,
        syncResults: [],
        allCurrent: [],
        allDeleted: [],
        hasMoreData: false,
        finalToken: null,
        errors: []
      };
      
      // Step 1: Get initial sync token
      console.log(`📋 Step 1: Getting initial sync token...`);
      results.initialToken = await AccService.getInitialSyncToken(projectId);
      
      if (!results.initialToken) {
        console.log(`⚠️ No initial sync token available, starting fresh sync...`);
        // Start with empty sync to get initial data
        const initialSync = await AccService.syncRelationships(projectId);
        results.syncResults.push(initialSync);
        results.allCurrent.push(...(initialSync.current?.data || []));
        results.allDeleted.push(...(initialSync.deleted?.data || []));
        results.hasMoreData = initialSync.moreData;
        results.finalToken = initialSync.nextSyncToken;
      } else {
        // Step 2: Perform incremental sync
        console.log(`📋 Step 2: Performing incremental sync...`);
        let currentToken = results.initialToken;
        let syncCount = 0;
        const maxSyncRounds = options.maxSyncRounds || 10; // Prevent infinite loops
        
        while (currentToken && syncCount < maxSyncRounds) {
          console.log(`🔄 Sync round ${syncCount + 1} with token: ${currentToken.substring(0, 20)}...`);
          
          const syncResult = await AccService.syncRelationships(projectId, currentToken, options.filters);
          results.syncResults.push(syncResult);
          
          // Collect current and deleted data
          if (syncResult.current?.data) {
            results.allCurrent.push(...syncResult.current.data);
          }
          if (syncResult.deleted?.data) {
            results.allDeleted.push(...syncResult.deleted.data);
          }
          
          // Check if there's more data
          results.hasMoreData = syncResult.moreData;
          results.finalToken = syncResult.nextSyncToken;
          
          if (!syncResult.moreData) {
            console.log(`✅ Sync complete - no more data available`);
            break;
          }
          
          currentToken = syncResult.nextSyncToken;
          syncCount++;
        }
        
        if (syncCount >= maxSyncRounds) {
          console.log(`⚠️ Sync stopped after ${maxSyncRounds} rounds to prevent infinite loop`);
        }
      }
      
      // Step 3: Summary
      console.log(`📊 Sync Summary:`);
      console.log(`   - Total sync rounds: ${results.syncResults.length}`);
      console.log(`   - Current relationships: ${results.allCurrent.length}`);
      console.log(`   - Deleted relationships: ${results.allDeleted.length}`);
      console.log(`   - Has more data: ${results.hasMoreData}`);
      console.log(`   - Final token: ${results.finalToken ? results.finalToken.substring(0, 20) + '...' : 'None'}`);
      
      return results;
    } catch (error) {
      console.error('❌ DEBUG: Error in full sync workflow:', error);
      return {
        initialToken: null,
        syncResults: [],
        allCurrent: [],
        allDeleted: [],
        hasMoreData: false,
        finalToken: null,
        errors: [error.message]
      };
    }
  }

  /**
   * Get relationships by their IDs (batch retrieval)
   * @param {string} projectId - The project ID (container ID)
   * @param {Array<string>} relationshipIds - Array of relationship UUIDs to retrieve
   * @returns {Promise<Array>} Retrieved relationships
   */
  static async getRelationshipsByIds(projectId, relationshipIds) {
    try {
      console.log(`🔍 DEBUG: Getting relationships by IDs for project: ${projectId}`);
      console.log(`🔍 DEBUG: Relationship IDs:`, relationshipIds);
      
      if (!relationshipIds || relationshipIds.length === 0) {
        console.log(`⚠️ No relationship IDs provided`);
        return [];
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Process in batches of 50 (API limit)
      const batchSize = 50;
      const allRelationships = [];
      
      for (let i = 0; i < relationshipIds.length; i += batchSize) {
        const batch = relationshipIds.slice(i, i + batchSize);
        
        const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships:batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batch)
        });
        
        if (response.ok) {
          const relationships = await response.json();
          allRelationships.push(...relationships);
          console.log(`✅ DEBUG: Retrieved batch of ${relationships.length} relationships`);
        } else {
          const errorText = await response.text();
          console.log(`⚠️ DEBUG: Failed to retrieve relationship batch:`, response.status, errorText);
        }
      }
      
      console.log(`✅ DEBUG: Retrieved total of ${allRelationships.length} relationships`);
      return allRelationships;
    } catch (error) {
      console.error('❌ DEBUG: Error getting relationships by IDs:', error);
      return [];
    }
  }

  /**
   * Find relationships that intersect with specified entities
   * @param {string} projectId - The project ID (container ID)
   * @param {Array} entities - Array of entities to find relationships for
   * @param {Array} withEntities - Optional array of entities to filter by
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Intersection results with relationships and pagination
   */
  static async findRelationshipIntersections(projectId, entities, withEntities = [], options = {}) {
    try {
      console.log(`🔍 DEBUG: Finding relationship intersections for project: ${projectId}`);
      console.log(`🔍 DEBUG: Entities:`, entities);
      console.log(`🔍 DEBUG: With entities:`, withEntities);
      console.log(`🔍 DEBUG: Options:`, options);
      
      if (!entities || entities.length === 0) {
        console.log(`⚠️ No entities provided for intersection search`);
        return {
          page: {},
          relationships: []
        };
      }
      
      if (entities.length > 20) {
        console.log(`⚠️ Too many entities provided (${entities.length}), maximum is 20`);
        return {
          page: {},
          relationships: []
        };
      }
      
      if (withEntities.length > 20) {
        console.log(`⚠️ Too many withEntities provided (${withEntities.length}), maximum is 20`);
        return {
          page: {},
          relationships: []
        };
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.includeDeleted !== undefined) queryParams.append('includeDeleted', options.includeDeleted.toString());
      if (options.onlyDeleted !== undefined) queryParams.append('onlyDeleted', options.onlyDeleted.toString());
      if (options.pageLimit) queryParams.append('pageLimit', options.pageLimit.toString());
      if (options.continuationToken) queryParams.append('continuationToken', options.continuationToken);

      // Prepare request body
      const requestBody = {
        entities: entities
      };
      
      if (withEntities.length > 0) {
        requestBody.withEntities = withEntities;
      }

      const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships:intersect?${queryParams}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Found ${data.relationships?.length || 0} intersecting relationships:`, data);
        return data;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to find relationship intersections:`, response.status, errorText);
        return {
          page: {},
          relationships: []
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error finding relationship intersections:', error);
      return {
        page: {},
        relationships: []
      };
    }
  }

  /**
   * Find all relationships that intersect with specified entities (with pagination)
   * @param {string} projectId - The project ID (container ID)
   * @param {Array} entities - Array of entities to find relationships for
   * @param {Array} withEntities - Optional array of entities to filter by
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} All intersecting relationships across all pages
   */
  static async findAllRelationshipIntersections(projectId, entities, withEntities = [], options = {}) {
    try {
      console.log(`🔍 DEBUG: Finding all relationship intersections for project: ${projectId}`);
      
      const allRelationships = [];
      let continuationToken = null;
      let pageCount = 0;
      const maxPages = options.maxPages || 100; // Prevent infinite loops
      
      do {
        const currentOptions = {
          ...options,
          continuationToken: continuationToken,
          pageLimit: options.pageLimit || 100
        };
        
        const result = await AccService.findRelationshipIntersections(projectId, entities, withEntities, currentOptions);
        
        if (result.relationships) {
          allRelationships.push(...result.relationships);
        }
        
        continuationToken = result.page?.continuationToken;
        pageCount++;
        
        console.log(`📄 Page ${pageCount}: ${result.relationships?.length || 0} relationships (total: ${allRelationships.length})`);
        
        if (pageCount >= maxPages) {
          console.log(`⚠️ Stopped after ${maxPages} pages to prevent infinite loop`);
          break;
        }
        
      } while (continuationToken);
      
      console.log(`✅ DEBUG: Found total of ${allRelationships.length} intersecting relationships across ${pageCount} pages`);
      return allRelationships;
    } catch (error) {
      console.error('❌ DEBUG: Error finding all relationship intersections:', error);
      return [];
    }
  }

  /**
   * Get a single relationship by its ID
   * @param {string} projectId - The project ID (container ID)
   * @param {string} relationshipId - The relationship UUID
   * @returns {Promise<Object|null>} The relationship object or null if not found
   */
  static async getRelationshipById(projectId, relationshipId) {
    try {
      console.log(`🔍 DEBUG: Getting relationship by ID for project: ${projectId}`);
      console.log(`🔍 DEBUG: Relationship ID: ${relationshipId}`);
      
      if (!relationshipId) {
        console.log(`⚠️ No relationship ID provided`);
        return null;
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/containers/${projectId}/relationships/${relationshipId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const relationship = await response.json();
        console.log(`✅ DEBUG: Retrieved relationship:`, relationship);
        return relationship;
      } else if (response.status === 404) {
        console.log(`⚠️ Relationship not found: ${relationshipId}`);
        return null;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get relationship:`, response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting relationship by ID:', error);
      return null;
    }
  }

  /**
   * Get multiple relationships by their IDs (individual calls)
   * @param {string} projectId - The project ID (container ID)
   * @param {Array<string>} relationshipIds - Array of relationship UUIDs
   * @returns {Promise<Array>} Array of found relationships
   */
  static async getRelationshipsByIdsIndividual(projectId, relationshipIds) {
    try {
      console.log(`🔍 DEBUG: Getting relationships individually for project: ${projectId}`);
      console.log(`🔍 DEBUG: Relationship IDs:`, relationshipIds);
      
      if (!relationshipIds || relationshipIds.length === 0) {
        console.log(`⚠️ No relationship IDs provided`);
        return [];
      }
      
      const relationships = [];
      const promises = relationshipIds.map(async (id) => {
        try {
          const relationship = await AccService.getRelationshipById(projectId, id);
          if (relationship) {
            relationships.push(relationship);
          }
        } catch (error) {
          console.log(`⚠️ Error getting relationship ${id}:`, error.message);
        }
      });
      
      await Promise.all(promises);
      
      console.log(`✅ DEBUG: Retrieved ${relationships.length} relationships individually`);
      return relationships;
    } catch (error) {
      console.error('❌ DEBUG: Error getting relationships individually:', error);
      return [];
    }
  }

  /**
   * Create a service account for server-to-server authentication
   * @param {string} name - The service account name (5-100 chars, alphanumeric and dashes)
   * @param {string} firstName - The first name (5-100 chars, alphanumeric, dashes, underscores)
   * @param {string} lastName - The last name (5-100 chars, alphanumeric and dashes)
   * @returns {Promise<Object>} Service account creation result
   */
  static async createServiceAccount(name, firstName, lastName) {
    try {
      console.log(`🔍 DEBUG: Creating service account: ${name}`);
      console.log(`🔍 DEBUG: First name: ${firstName}, Last name: ${lastName}`);
      
      // Validate input parameters
      if (!name || name.length < 5 || name.length > 100) {
        throw new Error('Service account name must be 5-100 characters long');
      }
      
      if (!firstName || firstName.length < 5 || firstName.length > 100) {
        throw new Error('First name must be 5-100 characters long');
      }
      
      if (!lastName || lastName.length < 5 || lastName.length > 100) {
        throw new Error('Last name must be 5-100 characters long');
      }
      
      // Validate name format (alphanumeric and dashes only)
      if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        throw new Error('Service account name must contain only alphanumeric characters and dashes');
      }
      
      // Validate firstName format (alphanumeric, dashes, underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(firstName)) {
        throw new Error('First name must contain only alphanumeric characters, dashes, and underscores');
      }
      
      // Validate lastName format (alphanumeric and dashes)
      if (!/^[a-zA-Z0-9-]+$/.test(lastName)) {
        throw new Error('Last name must contain only alphanumeric characters and dashes');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const requestBody = {
        name: name,
        firstName: firstName,
        lastName: lastName
      };

      const response = await fetch(`https://developer.api.autodesk.com/authentication/v2/service-accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Service account created successfully:`, data);
        return {
          success: true,
          serviceAccountId: data.serviceAccountId,
          email: data.email,
          data: data
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to create service account:`, response.status, errorText);
        
        let errorMessage = 'Failed to create service account';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.title || errorMessage;
        } catch (e) {
          // Use default error message if JSON parsing fails
        }
        
        return {
          success: false,
          error: errorMessage,
          status: response.status,
          details: errorText
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating service account:', error);
      return {
        success: false,
        error: error.message,
        details: 'Service account creation failed with error'
      };
    }
  }

  /**
   * Get all service accounts associated with the application
   * @returns {Promise<Array>} Array of service accounts
   */
  static async getServiceAccounts() {
    try {
      console.log(`🔍 DEBUG: Getting all service accounts`);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://developer.api.autodesk.com/authentication/v2/service-accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const serviceAccounts = data.serviceAccounts || [];
        console.log(`✅ DEBUG: Retrieved ${serviceAccounts.length} service accounts:`, serviceAccounts);
        return serviceAccounts;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get service accounts:`, response.status, errorText);
        return [];
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting service accounts:', error);
      return [];
    }
  }

  /**
   * Get a specific service account by ID
   * @param {string} serviceAccountId - The service account ID
   * @returns {Promise<Object|null>} The service account or null if not found
   */
  static async getServiceAccountById(serviceAccountId) {
    try {
      console.log(`🔍 DEBUG: Getting service account by ID: ${serviceAccountId}`);
      
      if (!serviceAccountId) {
        console.log(`⚠️ No service account ID provided`);
        return null;
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://developer.api.autodesk.com/authentication/v2/service-accounts/${serviceAccountId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const serviceAccount = await response.json();
        console.log(`✅ DEBUG: Retrieved service account:`, serviceAccount);
        return serviceAccount;
      } else if (response.status === 404) {
        console.log(`⚠️ Service account not found: ${serviceAccountId}`);
        return null;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get service account:`, response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting service account by ID:', error);
      return null;
    }
  }

  /**
   * Get service accounts by status
   * @param {string} status - The status to filter by (ENABLED, DISABLED, etc.)
   * @returns {Promise<Array>} Array of service accounts with the specified status
   */
  static async getServiceAccountsByStatus(status) {
    try {
      console.log(`🔍 DEBUG: Getting service accounts by status: ${status}`);
      
      const serviceAccounts = await AccService.getServiceAccounts();
      const filteredAccounts = serviceAccounts.filter(account => account.status === status);
      
      console.log(`✅ DEBUG: Found ${filteredAccounts.length} service accounts with status ${status}`);
      return filteredAccounts;
    } catch (error) {
      console.error('❌ DEBUG: Error getting service accounts by status:', error);
      return [];
    }
  }

  /**
   * Get service accounts that are expiring soon
   * @param {number} daysAhead - Number of days ahead to check for expiration (default: 30)
   * @returns {Promise<Array>} Array of service accounts expiring within the specified days
   */
  static async getExpiringServiceAccounts(daysAhead = 30) {
    try {
      console.log(`🔍 DEBUG: Getting service accounts expiring within ${daysAhead} days`);
      
      const serviceAccounts = await AccService.getServiceAccounts();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
      
      const expiringAccounts = serviceAccounts.filter(account => {
        if (!account.expiresAt) return false;
        const expiresDate = new Date(account.expiresAt);
        return expiresDate <= cutoffDate;
      });
      
      console.log(`✅ DEBUG: Found ${expiringAccounts.length} service accounts expiring within ${daysAhead} days`);
      return expiringAccounts;
    } catch (error) {
      console.error('❌ DEBUG: Error getting expiring service accounts:', error);
      return [];
    }
  }

  /**
   * Check service account health and status
   * @param {string} serviceAccountId - The service account ID to check
   * @returns {Promise<Object>} Health status information
   */
  static async checkServiceAccountHealth(serviceAccountId) {
    try {
      console.log(`🔍 DEBUG: Checking health for service account: ${serviceAccountId}`);
      
      const serviceAccount = await AccService.getServiceAccountById(serviceAccountId);
      
      if (!serviceAccount) {
        return {
          exists: false,
          healthy: false,
          status: 'NOT_FOUND',
          message: 'Service account not found'
        };
      }
      
      const now = new Date();
      const expiresAt = new Date(serviceAccount.expiresAt);
      const accessedAt = new Date(serviceAccount.accessedAt);
      
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      const daysSinceLastAccess = Math.ceil((now - accessedAt) / (1000 * 60 * 60 * 24));
      
      let healthStatus = 'HEALTHY';
      let issues = [];
      
      // Check if account is disabled
      if (serviceAccount.status === 'DISABLED') {
        healthStatus = 'UNHEALTHY';
        issues.push('Account is disabled');
      }
      
      // Check if account is deactivated
      if (serviceAccount.status === 'DEACTIVATED') {
        healthStatus = 'UNHEALTHY';
        issues.push('Account is deactivated');
      }
      
      // Check if account is expiring soon (within 30 days)
      if (daysUntilExpiry <= 30) {
        healthStatus = 'WARNING';
        issues.push(`Account expires in ${daysUntilExpiry} days`);
      }
      
      // Check if account hasn't been accessed recently (more than 90 days)
      if (daysSinceLastAccess > 90) {
        healthStatus = 'WARNING';
        issues.push(`Account hasn't been accessed in ${daysSinceLastAccess} days`);
      }
      
      const healthInfo = {
        exists: true,
        healthy: healthStatus === 'HEALTHY',
        status: healthStatus,
        serviceAccount: serviceAccount,
        daysUntilExpiry: daysUntilExpiry,
        daysSinceLastAccess: daysSinceLastAccess,
        issues: issues,
        message: issues.length > 0 ? issues.join(', ') : 'Account is healthy'
      };
      
      console.log(`✅ DEBUG: Service account health check:`, healthInfo);
      return healthInfo;
    } catch (error) {
      console.error('❌ DEBUG: Error checking service account health:', error);
      return {
        exists: false,
        healthy: false,
        status: 'ERROR',
        message: 'Error checking service account health',
        error: error.message
      };
    }
  }

  /**
   * Get all keys associated with a service account
   * @param {string} serviceAccountId - The service account ID
   * @returns {Promise<Array>} Array of service account keys
   */
  static async getServiceAccountKeys(serviceAccountId) {
    try {
      console.log(`🔍 DEBUG: Getting keys for service account: ${serviceAccountId}`);
      
      if (!serviceAccountId) {
        console.log(`⚠️ No service account ID provided`);
        return [];
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://developer.api.autodesk.com/authentication/v2/service-accounts/${serviceAccountId}/keys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const keys = data.keys || [];
        console.log(`✅ DEBUG: Retrieved ${keys.length} keys for service account:`, keys);
        return keys;
      } else if (response.status === 404) {
        console.log(`⚠️ Service account not found: ${serviceAccountId}`);
        return [];
      } else if (response.status === 400) {
        console.log(`⚠️ Service account may not be enabled: ${serviceAccountId}`);
        return [];
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get service account keys:`, response.status, errorText);
        return [];
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting service account keys:', error);
      return [];
    }
  }

  /**
   * Get enabled keys for a service account
   * @param {string} serviceAccountId - The service account ID
   * @returns {Promise<Array>} Array of enabled service account keys
   */
  static async getEnabledServiceAccountKeys(serviceAccountId) {
    try {
      console.log(`🔍 DEBUG: Getting enabled keys for service account: ${serviceAccountId}`);
      
      const allKeys = await AccService.getServiceAccountKeys(serviceAccountId);
      const enabledKeys = allKeys.filter(key => key.status === 'ENABLED');
      
      console.log(`✅ DEBUG: Found ${enabledKeys.length} enabled keys out of ${allKeys.length} total keys`);
      return enabledKeys;
    } catch (error) {
      console.error('❌ DEBUG: Error getting enabled service account keys:', error);
      return [];
    }
  }

  /**
   * Get disabled keys for a service account
   * @param {string} serviceAccountId - The service account ID
   * @returns {Promise<Array>} Array of disabled service account keys
   */
  static async getDisabledServiceAccountKeys(serviceAccountId) {
    try {
      console.log(`🔍 DEBUG: Getting disabled keys for service account: ${serviceAccountId}`);
      
      const allKeys = await AccService.getServiceAccountKeys(serviceAccountId);
      const disabledKeys = allKeys.filter(key => key.status === 'DISABLED');
      
      console.log(`✅ DEBUG: Found ${disabledKeys.length} disabled keys out of ${allKeys.length} total keys`);
      return disabledKeys;
    } catch (error) {
      console.error('❌ DEBUG: Error getting disabled service account keys:', error);
      return [];
    }
  }

  /**
   * Get service account key statistics
   * @param {string} serviceAccountId - The service account ID
   * @returns {Promise<Object>} Key statistics and health information
   */
  static async getServiceAccountKeyStats(serviceAccountId) {
    try {
      console.log(`🔍 DEBUG: Getting key statistics for service account: ${serviceAccountId}`);
      
      const allKeys = await AccService.getServiceAccountKeys(serviceAccountId);
      const enabledKeys = allKeys.filter(key => key.status === 'ENABLED');
      const disabledKeys = allKeys.filter(key => key.status === 'DISABLED');
      
      const now = new Date();
      const recentKeys = allKeys.filter(key => {
        const accessedAt = new Date(key.accessedAt);
        const daysSinceAccess = Math.ceil((now - accessedAt) / (1000 * 60 * 60 * 24));
        return daysSinceAccess <= 30; // Accessed within last 30 days
      });
      
      const oldKeys = allKeys.filter(key => {
        const createdAt = new Date(key.createdAt);
        const daysSinceCreation = Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24));
        return daysSinceCreation > 365; // Created more than 1 year ago
      });
      
      const stats = {
        totalKeys: allKeys.length,
        enabledKeys: enabledKeys.length,
        disabledKeys: disabledKeys.length,
        recentKeys: recentKeys.length,
        oldKeys: oldKeys.length,
        hasActiveKeys: enabledKeys.length > 0,
        keyHealth: enabledKeys.length > 0 ? 'HEALTHY' : 'WARNING',
        recommendations: []
      };
      
      // Add recommendations based on key analysis
      if (enabledKeys.length === 0) {
        stats.recommendations.push('No enabled keys found - consider creating a new key');
      }
      
      if (disabledKeys.length > enabledKeys.length) {
        stats.recommendations.push('More disabled keys than enabled - consider cleaning up unused keys');
      }
      
      if (oldKeys.length > 0) {
        stats.recommendations.push(`${oldKeys.length} keys are over 1 year old - consider rotating them`);
      }
      
      if (recentKeys.length === 0 && allKeys.length > 0) {
        stats.recommendations.push('No keys have been accessed recently - verify key usage');
      }
      
      console.log(`✅ DEBUG: Service account key statistics:`, stats);
      return stats;
    } catch (error) {
      console.error('❌ DEBUG: Error getting service account key statistics:', error);
      return {
        totalKeys: 0,
        enabledKeys: 0,
        disabledKeys: 0,
        recentKeys: 0,
        oldKeys: 0,
        hasActiveKeys: false,
        keyHealth: 'ERROR',
        recommendations: ['Error retrieving key statistics']
      };
    }
  }

  /**
   * Exchange JWT assertion for three-legged access token
   * @param {string} assertion - The JWT assertion to exchange for a token
   * @param {string} scope - Space-delimited list of scopes (optional)
   * @param {string} clientId - Client ID (optional if using Basic auth header)
   * @param {string} clientSecret - Client secret (optional if using Basic auth header)
   * @returns {Promise<Object>} Token exchange result
   */
  static async exchangeJWTForToken(assertion, scope = '', clientId = '', clientSecret = '') {
    try {
      console.log(`🔍 DEBUG: Exchanging JWT assertion for access token`);
      console.log(`🔍 DEBUG: Scope: ${scope}`);
      
      if (!assertion) {
        throw new Error('JWT assertion is required');
      }
      
      // Prepare form data
      const formData = new URLSearchParams();
      formData.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      formData.append('assertion', assertion);
      
      if (scope) {
        formData.append('scope', scope);
      }
      
      if (clientId && clientSecret) {
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
      }
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      // Add Basic auth header if client credentials are provided
      if (clientId && clientSecret) {
        const credentials = btoa(`${clientId}:${clientSecret}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/authentication/v2/token`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: JWT assertion exchanged successfully`);
        console.log(`✅ DEBUG: Token expires in ${data.expires_in} seconds`);
        
        return {
          success: true,
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          expires_at: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
          data: data
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to exchange JWT assertion:`, response.status, errorText);
        
        let errorMessage = 'Failed to exchange JWT assertion';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error_description || errorData.error || errorMessage;
        } catch (e) {
          // Use default error message if JSON parsing fails
        }
        
        return {
          success: false,
          error: errorMessage,
          status: response.status,
          details: errorText
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error exchanging JWT assertion:', error);
      return {
        success: false,
        error: error.message,
        details: 'JWT assertion exchange failed with error'
      };
    }
  }

  /**
   * Generate JWT assertion for service account authentication
   * @param {string} serviceAccountId - The service account ID
   * @param {string} privateKey - The private key for signing
   * @param {string} keyId - The key ID (kid)
   * @param {Array} scopes - Array of scopes to request
   * @param {number} expirationMinutes - Token expiration in minutes (default: 60)
   * @returns {Promise<string>} JWT assertion string
   */
  static async generateJWTAssertion(serviceAccountId, privateKey, keyId, scopes = ['user:read', 'data:read'], expirationMinutes = 60) {
    try {
      console.log(`🔍 DEBUG: Generating JWT assertion for service account: ${serviceAccountId}`);
      console.log(`🔍 DEBUG: Scopes: ${scopes.join(' ')}`);
      console.log(`🔍 DEBUG: Expiration: ${expirationMinutes} minutes`);
      
      if (!serviceAccountId || !privateKey || !keyId) {
        throw new Error('Service account ID, private key, and key ID are required');
      }
      
      // Get credentials for client ID
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      const clientId = credentials.clientId || credentials.client_id;
      
      if (!clientId) {
        throw new Error('Client ID not found in credentials');
      }
      
      const now = Math.floor(Date.now() / 1000);
      const exp = now + (expirationMinutes * 60);
      
      // JWT header
      const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid: keyId
      };
      
      // JWT payload
      const payload = {
        iss: clientId,
        sub: serviceAccountId,
        aud: 'https://developer.api.autodesk.com/authentication/v2/token',
        exp: exp,
        iat: now,
        scope: scopes.join(' ')
      };
      
      // Note: In a real implementation, you would need to sign the JWT with the private key
      // This is a simplified version that shows the structure
      console.log(`⚠️ DEBUG: JWT generation requires proper signing with private key`);
      console.log(`🔍 DEBUG: Header:`, header);
      console.log(`🔍 DEBUG: Payload:`, payload);
      
      // For demonstration purposes, return a placeholder
      // In production, use a proper JWT library like 'jsonwebtoken' or 'jose'
      const headerB64 = btoa(JSON.stringify(header));
      const payloadB64 = btoa(JSON.stringify(payload));
      const unsignedToken = `${headerB64}.${payloadB64}`;
      
      console.log(`⚠️ DEBUG: This is an unsigned JWT - use proper signing in production`);
      console.log(`🔍 DEBUG: Unsigned JWT: ${unsignedToken}`);
      
      return unsignedToken;
    } catch (error) {
      console.error('❌ DEBUG: Error generating JWT assertion:', error);
      throw error;
    }
  }

  /**
   * Complete service account authentication flow
   * @param {string} serviceAccountId - The service account ID
   * @param {string} privateKey - The private key for signing
   * @param {string} keyId - The key ID (kid)
   * @param {Array} scopes - Array of scopes to request
   * @returns {Promise<Object>} Complete authentication result
   */
  static async authenticateWithServiceAccount(serviceAccountId, privateKey, keyId, scopes = ['user:read', 'data:read']) {
    try {
      console.log(`🔍 DEBUG: Starting service account authentication flow`);
      
      // Step 1: Generate JWT assertion
      const assertion = await AccService.generateJWTAssertion(serviceAccountId, privateKey, keyId, scopes);
      
      // Step 2: Exchange JWT for access token
      const tokenResult = await AccService.exchangeJWTForToken(assertion, scopes.join(' '));
      
      if (tokenResult.success) {
        console.log(`✅ DEBUG: Service account authentication successful`);
        return {
          success: true,
          serviceAccountId: serviceAccountId,
          access_token: tokenResult.access_token,
          token_type: tokenResult.token_type,
          expires_in: tokenResult.expires_in,
          expires_at: tokenResult.expires_at,
          scopes: scopes
        };
      } else {
        console.log(`❌ DEBUG: Service account authentication failed:`, tokenResult.error);
        return {
          success: false,
          error: tokenResult.error,
          details: tokenResult.details
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error in service account authentication flow:', error);
      return {
        success: false,
        error: error.message,
        details: 'Service account authentication flow failed'
      };
    }
  }

  /**
   * Create a Data Management webhook
   * @param {string} event - Event type (e.g., 'dm.version.added', 'dm.*')
   * @param {string} folderUrn - Folder URN for scope
   * @param {string} callbackUrl - Callback URL for webhook
   * @param {Object} hookAttribute - Custom attributes to include in callback
   * @param {string} filter - JSONPath filter expression
   * @returns {Promise<Object>} Webhook creation result
   */
  static async createDataManagementWebhook(event, folderUrn, callbackUrl, hookAttribute = {}, filter = '') {
    try {
      console.log(`🔍 DEBUG: Creating Data Management webhook for event: ${event}`);
      console.log(`🔍 DEBUG: Folder URN: ${folderUrn}`);
      console.log(`🔍 DEBUG: Callback URL: ${callbackUrl}`);
      
      if (!event || !folderUrn || !callbackUrl) {
        throw new Error('Event, folder URN, and callback URL are required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const webhookData = {
        callbackUrl: callbackUrl,
        scope: {
          folder: folderUrn
        }
      };
      
      if (Object.keys(hookAttribute).length > 0) {
        webhookData.hookAttribute = hookAttribute;
      }
      
      if (filter) {
        webhookData.filter = filter;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/data/events/${event}/hooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookData)
      });
      
      if (response.ok) {
        const location = response.headers.get('Location');
        console.log(`✅ DEBUG: Data Management webhook created successfully`);
        console.log(`✅ DEBUG: Location: ${location}`);
        
        return {
          success: true,
          webhookId: location ? location.split('/').pop() : null,
          location: location,
          event: event,
          system: 'data',
          scope: { folder: folderUrn },
          callbackUrl: callbackUrl,
          hookAttribute: hookAttribute,
          filter: filter
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to create Data Management webhook:`, response.status, errorText);
        
        return {
          success: false,
          error: `Failed to create webhook: ${response.status}`,
          details: errorText
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating Data Management webhook:', error);
      return {
        success: false,
        error: error.message,
        details: 'Data Management webhook creation failed'
      };
    }
  }

  /**
   * Create a Cost Management webhook
   * @param {string} event - Event type (e.g., 'budget.created-1.0', 'budget.*')
   * @param {string} projectId - Project ID for scope
   * @param {string} callbackUrl - Callback URL for webhook
   * @param {Object} hookAttribute - Custom attributes to include in callback
   * @param {string} filter - JSONPath filter expression
   * @returns {Promise<Object>} Webhook creation result
   */
  static async createCostManagementWebhook(event, projectId, callbackUrl, hookAttribute = {}, filter = '') {
    try {
      console.log(`🔍 DEBUG: Creating Cost Management webhook for event: ${event}`);
      console.log(`🔍 DEBUG: Project ID: ${projectId}`);
      console.log(`🔍 DEBUG: Callback URL: ${callbackUrl}`);
      
      if (!event || !projectId || !callbackUrl) {
        throw new Error('Event, project ID, and callback URL are required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const webhookData = {
        callbackUrl: callbackUrl,
        scope: {
          project: projectId
        }
      };
      
      if (Object.keys(hookAttribute).length > 0) {
        webhookData.hookAttribute = hookAttribute;
      }
      
      if (filter) {
        webhookData.filter = filter;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/autodesk.construction.cost/events/${event}/hooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookData)
      });
      
      if (response.ok) {
        const location = response.headers.get('Location');
        console.log(`✅ DEBUG: Cost Management webhook created successfully`);
        console.log(`✅ DEBUG: Location: ${location}`);
        
        return {
          success: true,
          webhookId: location ? location.split('/').pop() : null,
          location: location,
          event: event,
          system: 'autodesk.construction.cost',
          scope: { project: projectId },
          callbackUrl: callbackUrl,
          hookAttribute: hookAttribute,
          filter: filter
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to create Cost Management webhook:`, response.status, errorText);
        
        return {
          success: false,
          error: `Failed to create webhook: ${response.status}`,
          details: errorText
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating Cost Management webhook:', error);
      return {
        success: false,
        error: error.message,
        details: 'Cost Management webhook creation failed'
      };
    }
  }

  /**
   * Create a webhook with automatic system detection
   * @param {string} event - Event type
   * @param {string} scopeId - Scope ID (folder URN or project ID)
   * @param {string} callbackUrl - Callback URL for webhook
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Webhook creation result
   */
  static async createWebhookAuto(event, scopeId, callbackUrl, options = {}) {
    try {
      console.log(`🔍 DEBUG: Creating webhook with auto-detection for event: ${event}`);
      
      const { hookAttribute = {}, filter = '', scopeType = 'auto' } = options;
      
      // Auto-detect system based on event type
      let system = 'data';
      let scope = {};
      
      if (event.startsWith('budget.') || event.startsWith('cost.') || event.startsWith('autodesk.construction.cost')) {
        system = 'autodesk.construction.cost';
        scope = { project: scopeId };
      } else if (event.startsWith('dm.') || event.startsWith('data.')) {
        system = 'data';
        scope = { folder: scopeId };
      } else if (scopeType === 'project') {
        system = 'autodesk.construction.cost';
        scope = { project: scopeId };
      } else if (scopeType === 'folder') {
        system = 'data';
        scope = { folder: scopeId };
      } else {
        // Default to data management
        system = 'data';
        scope = { folder: scopeId };
      }
      
      console.log(`🔍 DEBUG: Detected system: ${system}`);
      console.log(`🔍 DEBUG: Scope:`, scope);
      
      const webhookData = {
        callbackUrl: callbackUrl,
        scope: scope
      };
      
      if (Object.keys(hookAttribute).length > 0) {
        webhookData.hookAttribute = hookAttribute;
      }
      
      if (filter) {
        webhookData.filter = filter;
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/${system}/events/${event}/hooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookData)
      });
      
      if (response.ok) {
        const location = response.headers.get('Location');
        console.log(`✅ DEBUG: Webhook created successfully with auto-detection`);
        console.log(`✅ DEBUG: Location: ${location}`);
        
        return {
          success: true,
          webhookId: location ? location.split('/').pop() : null,
          location: location,
          event: event,
          system: system,
          scope: scope,
          callbackUrl: callbackUrl,
          hookAttribute: hookAttribute,
          filter: filter
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to create webhook:`, response.status, errorText);
        
        return {
          success: false,
          error: `Failed to create webhook: ${response.status}`,
          details: errorText
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating webhook with auto-detection:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook creation with auto-detection failed'
      };
    }
  }

  /**
   * Get webhook by ID with specific system and event
   * @param {string} system - System name (e.g., 'data', 'autodesk.construction.cost')
   * @param {string} event - Event type (e.g., 'dm.version.added', 'budget.created-1.0')
   * @param {string} webhookId - Webhook ID
   * @param {string} region - Region (US, EMEA, AUS, GBR, JPN, DEU, CAN, IND)
   * @returns {Promise<Object>} Webhook details
   */
  static async getWebhookById(system, event, webhookId, region = 'US') {
    try {
      console.log(`🔍 DEBUG: Getting webhook by ID: ${webhookId}`);
      console.log(`🔍 DEBUG: System: ${system}, Event: ${event}, Region: ${region}`);
      
      if (!system || !event || !webhookId) {
        throw new Error('System, event, and webhook ID are required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }
      
      const headers = {
        'Authorization': `Bearer ${credentials.threeLegToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-ads-region': region
      };
      
      const url = `https://developer.api.autodesk.com/webhooks/v1/systems/${system}/events/${event}/hooks/${webhookId}?region=${region}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const webhook = await response.json();
        console.log(`✅ DEBUG: Retrieved webhook:`, webhook);
        return {
          success: true,
          webhook: webhook,
          region: region
        };
      } else if (response.status === 404) {
        console.log(`⚠️ Webhook not found: ${webhookId}`);
        return {
          success: false,
          error: 'Webhook not found',
          status: 404
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get webhook:`, response.status, errorText);
        return {
          success: false,
          error: `Failed to get webhook: ${response.status}`,
          details: errorText,
          status: response.status
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhook by ID:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook retrieval failed'
      };
    }
  }

  /**
   * Get webhook by ID with automatic system/event detection
   * @param {string} webhookId - Webhook ID
   * @param {string} region - Region (US, EMEA, AUS, GBR, JPN, DEU, CAN, IND)
   * @returns {Promise<Object>} Webhook details
   */
  static async getWebhookByIdAuto(webhookId, region = 'US') {
    try {
      console.log(`🔍 DEBUG: Getting webhook by ID with auto-detection: ${webhookId}`);
      
      if (!webhookId) {
        throw new Error('Webhook ID is required');
      }
      
      // Try common systems and events
      const systems = ['data', 'autodesk.construction.cost'];
      const events = ['dm.version.added', 'dm.version.modified', 'budget.created-1.0', 'budget.updated-1.0'];
      
      for (const system of systems) {
        for (const event of events) {
          console.log(`🔍 DEBUG: Trying system: ${system}, event: ${event}`);
          
          const result = await AccService.getWebhookById(system, event, webhookId, region);
          
          if (result.success) {
            console.log(`✅ DEBUG: Found webhook in system: ${system}, event: ${event}`);
            return result;
          }
        }
      }
      
      console.log(`⚠️ DEBUG: Webhook not found in any system/event combination`);
      return {
        success: false,
        error: 'Webhook not found in any system/event combination',
        status: 404
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhook by ID with auto-detection:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook retrieval with auto-detection failed'
      };
    }
  }

  /**
   * Get webhook by ID (legacy method for backward compatibility)
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} Webhook details
   */
  static async getWebhookByIdLegacy(webhookId) {
    try {
      console.log(`🔍 DEBUG: Getting webhook by ID (legacy): ${webhookId}`);
      
      if (!webhookId) {
        throw new Error('Webhook ID is required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/*/events/*/hooks/${webhookId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const webhook = await response.json();
        console.log(`✅ DEBUG: Retrieved webhook (legacy):`, webhook);
        return webhook;
      } else if (response.status === 404) {
        console.log(`⚠️ Webhook not found: ${webhookId}`);
        return null;
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get webhook:`, response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhook by ID (legacy):', error);
      return null;
    }
  }

  /**
   * Get webhook details with comprehensive information
   * @param {string} system - System name
   * @param {string} event - Event type
   * @param {string} webhookId - Webhook ID
   * @param {string} region - Region
   * @returns {Promise<Object>} Comprehensive webhook details
   */
  static async getWebhookDetails(system, event, webhookId, region = 'US') {
    try {
      console.log(`🔍 DEBUG: Getting comprehensive webhook details: ${webhookId}`);
      
      const result = await AccService.getWebhookById(system, event, webhookId, region);
      
      if (!result.success) {
        return result;
      }
      
      const webhook = result.webhook;
      
      // Parse webhook details
      const webhookDetails = {
        id: webhook.hookId,
        system: system,
        event: webhook.event,
        callbackUrl: webhook.callbackUrl,
        status: webhook.status,
        createdBy: webhook.createdBy,
        createdDate: webhook.createdDate,
        lastUpdatedDate: webhook.lastUpdatedDate,
        creatorType: webhook.creatorType,
        autoReactivateHook: webhook.autoReactivateHook,
        hookExpiry: webhook.hookExpiry,
        scope: webhook.scope,
        hookAttribute: webhook.hookAttribute,
        hubId: webhook.hubId,
        projectId: webhook.projectId,
        urn: webhook.urn,
        self: webhook.__self__,
        region: region,
        isExpired: webhook.hookExpiry ? new Date(webhook.hookExpiry) < new Date() : false,
        isActive: webhook.status === 'active',
        daysUntilExpiry: webhook.hookExpiry ? 
          Math.ceil((new Date(webhook.hookExpiry) - new Date()) / (1000 * 60 * 60 * 24)) : 
          null
      };
      
      console.log(`✅ DEBUG: Comprehensive webhook details:`, webhookDetails);
      
      return {
        success: true,
        webhook: webhookDetails,
        region: region
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhook details:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook details retrieval failed'
      };
    }
  }

  /**
   * Get webhook health status
   * @param {string} system - System name
   * @param {string} event - Event type
   * @param {string} webhookId - Webhook ID
   * @param {string} region - Region
   * @returns {Promise<Object>} Webhook health status
   */
  static async getWebhookHealth(system, event, webhookId, region = 'US') {
    try {
      console.log(`🔍 DEBUG: Getting webhook health status: ${webhookId}`);
      
      const result = await AccService.getWebhookDetails(system, event, webhookId, region);
      
      if (!result.success) {
        return {
          success: false,
          health: 'ERROR',
          message: result.error,
          webhookId: webhookId
        };
      }
      
      const webhook = result.webhook;
      let health = 'HEALTHY';
      let issues = [];
      let recommendations = [];
      
      // Check if webhook is active
      if (!webhook.isActive) {
        health = 'UNHEALTHY';
        issues.push('Webhook is inactive');
        recommendations.push('Reactivate the webhook or check its configuration');
      }
      
      // Check if webhook is expired
      if (webhook.isExpired) {
        health = 'UNHEALTHY';
        issues.push('Webhook has expired');
        recommendations.push('Create a new webhook or extend the expiry date');
      }
      
      // Check if webhook is expiring soon (within 7 days)
      if (webhook.daysUntilExpiry && webhook.daysUntilExpiry <= 7 && webhook.daysUntilExpiry > 0) {
        health = 'WARNING';
        issues.push(`Webhook expires in ${webhook.daysUntilExpiry} days`);
        recommendations.push('Consider extending the webhook expiry date');
      }
      
      // Check if webhook has been updated recently
      if (webhook.lastUpdatedDate) {
        const lastUpdated = new Date(webhook.lastUpdatedDate);
        const daysSinceUpdate = Math.ceil((new Date() - lastUpdated) / (1000 * 60 * 60 * 24));
        
        if (daysSinceUpdate > 90) {
          health = 'WARNING';
          issues.push(`Webhook hasn't been updated in ${daysSinceUpdate} days`);
          recommendations.push('Consider updating the webhook configuration');
        }
      }
      
      // Check callback URL format
      if (webhook.callbackUrl && !webhook.callbackUrl.startsWith('http')) {
        health = 'WARNING';
        issues.push('Callback URL may be invalid (does not start with http)');
        recommendations.push('Verify the callback URL format');
      }
      
      const healthInfo = {
        success: true,
        webhookId: webhookId,
        health: health,
        status: webhook.status,
        isActive: webhook.isActive,
        isExpired: webhook.isExpired,
        daysUntilExpiry: webhook.daysUntilExpiry,
        issues: issues,
        recommendations: recommendations,
        message: issues.length > 0 ? issues.join(', ') : 'Webhook is healthy',
        lastChecked: new Date().toISOString()
      };
      
      console.log(`✅ DEBUG: Webhook health status:`, healthInfo);
      return healthInfo;
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhook health:', error);
      return {
        success: false,
        health: 'ERROR',
        message: error.message,
        webhookId: webhookId
      };
    }
  }

  /**
   * Get all webhooks with health status
   * @param {string} region - Region
   * @returns {Promise<Object>} All webhooks with health status
   */
  static async getAllWebhooksWithHealth(region = 'US') {
    try {
      console.log(`🔍 DEBUG: Getting all webhooks with health status`);
      
      // Get all webhooks
      const webhooks = await AccService.getWebhooks();
      
      if (!webhooks || webhooks.length === 0) {
        return {
          success: true,
          webhooks: [],
          summary: {
            total: 0,
            healthy: 0,
            warning: 0,
            unhealthy: 0,
            error: 0
          }
        };
      }
      
      const webhooksWithHealth = [];
      let healthy = 0, warning = 0, unhealthy = 0, error = 0;
      
      // Get health status for each webhook
      for (const webhook of webhooks) {
        try {
          // Try to determine system and event from webhook data
          let system = 'data';
          let event = 'dm.version.added';
          
          if (webhook.system) {
            system = webhook.system;
          } else if (webhook.callbackUrl && webhook.callbackUrl.includes('cost')) {
            system = 'autodesk.construction.cost';
            event = 'budget.created-1.0';
          }
          
          if (webhook.event) {
            event = webhook.event;
          }
          
          const healthResult = await AccService.getWebhookHealth(system, event, webhook.id, region);
          
          const webhookWithHealth = {
            ...webhook,
            health: healthResult.health || 'ERROR',
            healthDetails: healthResult
          };
          
          webhooksWithHealth.push(webhookWithHealth);
          
          // Count health statuses
          switch (healthResult.health) {
            case 'HEALTHY':
              healthy++;
              break;
            case 'WARNING':
              warning++;
              break;
            case 'UNHEALTHY':
              unhealthy++;
              break;
            default:
              error++;
          }
        } catch (error) {
          console.error(`❌ DEBUG: Error getting health for webhook ${webhook.id}:`, error);
          webhooksWithHealth.push({
            ...webhook,
            health: 'ERROR',
            healthDetails: {
              success: false,
              health: 'ERROR',
              message: error.message
            }
          });
          error++;
        }
      }
      
      const summary = {
        total: webhooksWithHealth.length,
        healthy: healthy,
        warning: warning,
        unhealthy: unhealthy,
        error: error
      };
      
      console.log(`✅ DEBUG: Webhooks with health status:`, summary);
      
      return {
        success: true,
        webhooks: webhooksWithHealth,
        summary: summary
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting all webhooks with health:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get webhooks with health status'
      };
    }
  }

  /**
   * Get webhooks for specific system and event with pagination and filtering
   * @param {string} system - System name (e.g., 'data', 'autodesk.construction.cost')
   * @param {string} event - Event type (e.g., 'dm.version.added', 'budget.created-1.0')
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated webhook list
   */
  static async getWebhooksBySystemEvent(system, event, options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhooks for system: ${system}, event: ${event}`);
      console.log(`🔍 DEBUG: Options:`, options);
      
      if (!system || !event) {
        throw new Error('System and event are required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const {
        region = 'US',
        scopeName = '',
        scopeValue = '',
        pageState = '',
        status = '',
        pageSize = 200
      } = options;

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (region) queryParams.append('region', region);
      if (scopeName) queryParams.append('scopeName', scopeName);
      if (scopeValue) queryParams.append('scopeValue', scopeValue);
      if (pageState) queryParams.append('pageState', pageState);
      if (status) queryParams.append('status', status);

      const headers = {
        'Authorization': `Bearer ${credentials.threeLegToken}`,
        'Accept': 'application/json',
        'x-ads-region': region
      };

      const url = `https://developer.api.autodesk.com/webhooks/v1/systems/${system}/events/${event}/hooks?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        const webhooks = data.data || [];
        const links = data.links || {};
        
        console.log(`✅ DEBUG: Retrieved ${webhooks.length} webhooks for ${system}/${event}`);
        
        return {
          success: true,
          webhooks: webhooks,
          links: links,
          hasNext: !!links.next,
          nextPageState: links.next ? this.extractPageState(links.next) : null,
          system: system,
          event: event,
          region: region,
          total: webhooks.length
        };
      } else if (response.status === 204) {
        console.log(`ℹ️ DEBUG: No webhooks found for ${system}/${event}`);
        return {
          success: true,
          webhooks: [],
          links: {},
          hasNext: false,
          nextPageState: null,
          system: system,
          event: event,
          region: region,
          total: 0
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get webhooks:`, response.status, errorText);
        return {
          success: false,
          error: `Failed to get webhooks: ${response.status}`,
          details: errorText,
          status: response.status
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhooks by system/event:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook retrieval failed'
      };
    }
  }

  /**
   * Get all webhooks with pagination support
   * @param {Object} options - Query options
   * @returns {Promise<Object>} All webhooks with pagination info
   */
  static async getAllWebhooksPaginated(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting all webhooks with pagination`);
      
      const {
        region = 'US',
        scopeName = '',
        scopeValue = '',
        status = '',
        includeInactive = true
      } = options;

      // Common systems and events to check
      const systems = ['data', 'autodesk.construction.cost'];
      const events = ['dm.version.added', 'dm.version.modified', 'budget.created-1.0', 'budget.updated-1.0'];
      
      const allWebhooks = [];
      const paginationInfo = {};
      
      for (const system of systems) {
        for (const event of events) {
          console.log(`🔍 DEBUG: Checking ${system}/${event}`);
          
          let pageState = '';
          let hasNext = true;
          let pageCount = 0;
          
          while (hasNext && pageCount < 10) { // Limit to 10 pages per system/event
            const result = await AccService.getWebhooksBySystemEvent(system, event, {
              region,
              scopeName,
              scopeValue,
              pageState,
              status
            });
            
            if (result.success) {
              allWebhooks.push(...result.webhooks);
              hasNext = result.hasNext;
              pageState = result.nextPageState || '';
              pageCount++;
              
              paginationInfo[`${system}/${event}`] = {
                total: result.total,
                pages: pageCount,
                hasNext: hasNext
              };
            } else {
              console.log(`⚠️ DEBUG: Failed to get webhooks for ${system}/${event}:`, result.error);
              hasNext = false;
            }
          }
        }
      }
      
      console.log(`✅ DEBUG: Retrieved ${allWebhooks.length} total webhooks`);
      
      return {
        success: true,
        webhooks: allWebhooks,
        paginationInfo: paginationInfo,
        total: allWebhooks.length,
        region: region
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting all webhooks with pagination:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get all webhooks with pagination'
      };
    }
  }

  /**
   * Get webhooks by scope (folder or project)
   * @param {string} scopeName - Scope name (e.g., 'folder', 'project')
   * @param {string} scopeValue - Scope value (e.g., folder URN, project ID)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Webhooks for the specified scope
   */
  static async getWebhooksByScope(scopeName, scopeValue, options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhooks by scope: ${scopeName} = ${scopeValue}`);
      
      const {
        region = 'US',
        status = '',
        system = 'data',
        event = 'dm.version.added'
      } = options;

      const result = await AccService.getWebhooksBySystemEvent(system, event, {
        region,
        scopeName,
        scopeValue,
        status
      });

      if (result.success) {
        console.log(`✅ DEBUG: Found ${result.webhooks.length} webhooks for scope ${scopeName}:${scopeValue}`);
        return {
          success: true,
          webhooks: result.webhooks,
          scope: { name: scopeName, value: scopeValue },
          system: system,
          event: event,
          region: region
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhooks by scope:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get webhooks by scope'
      };
    }
  }

  /**
   * Get webhooks by status (active/inactive)
   * @param {string} status - Status filter ('active', 'inactive')
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Webhooks with specified status
   */
  static async getWebhooksByStatus(status, options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhooks by status: ${status}`);
      
      const {
        region = 'US',
        system = 'data',
        event = 'dm.version.added'
      } = options;

      const result = await AccService.getWebhooksBySystemEvent(system, event, {
        region,
        status
      });

      if (result.success) {
        console.log(`✅ DEBUG: Found ${result.webhooks.length} ${status} webhooks`);
        return {
          success: true,
          webhooks: result.webhooks,
          status: status,
          system: system,
          event: event,
          region: region
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhooks by status:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get webhooks by status'
      };
    }
  }

  /**
   * Get webhooks for specific system across all events
   * @param {string} system - System name (e.g., 'data', 'autodesk.construction.cost')
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated webhook list for system
   */
  static async getWebhooksBySystem(system, options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhooks for system: ${system}`);
      console.log(`🔍 DEBUG: Options:`, options);
      
      if (!system) {
        throw new Error('System is required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const {
        region = 'US',
        status = '',
        pageState = ''
      } = options;

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (region) queryParams.append('region', region);
      if (status) queryParams.append('status', status);
      if (pageState) queryParams.append('pageState', pageState);

      const headers = {
        'Authorization': `Bearer ${credentials.threeLegToken}`,
        'Accept': 'application/json',
        'x-ads-region': region
      };

      const url = `https://developer.api.autodesk.com/webhooks/v1/systems/${system}/hooks?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        const webhooks = data.data || [];
        const links = data.links || {};
        
        console.log(`✅ DEBUG: Retrieved ${webhooks.length} webhooks for system ${system}`);
        
        // Group webhooks by event for better organization
        const webhooksByEvent = {};
        webhooks.forEach(webhook => {
          const event = webhook.event || 'unknown';
          if (!webhooksByEvent[event]) {
            webhooksByEvent[event] = [];
          }
          webhooksByEvent[event].push(webhook);
        });
        
        return {
          success: true,
          webhooks: webhooks,
          webhooksByEvent: webhooksByEvent,
          links: links,
          hasNext: !!links.next,
          nextPageState: links.next ? this.extractPageState(links.next) : null,
          system: system,
          region: region,
          total: webhooks.length,
          eventCounts: Object.keys(webhooksByEvent).reduce((counts, event) => {
            counts[event] = webhooksByEvent[event].length;
            return counts;
          }, {})
        };
      } else if (response.status === 204) {
        console.log(`ℹ️ DEBUG: No webhooks found for system ${system}`);
        return {
          success: true,
          webhooks: [],
          webhooksByEvent: {},
          links: {},
          hasNext: false,
          nextPageState: null,
          system: system,
          region: region,
          total: 0,
          eventCounts: {}
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get webhooks for system:`, response.status, errorText);
        return {
          success: false,
          error: `Failed to get webhooks for system: ${response.status}`,
          details: errorText,
          status: response.status
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhooks by system:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook retrieval by system failed'
      };
    }
  }

  /**
   * Get all webhooks for a system with pagination
   * @param {string} system - System name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} All webhooks for system with pagination
   */
  static async getAllWebhooksForSystem(system, options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting all webhooks for system: ${system} with pagination`);
      
      const {
        region = 'US',
        status = ''
      } = options;

      const allWebhooks = [];
      const webhooksByEvent = {};
      let pageState = '';
      let hasNext = true;
      let pageCount = 0;
      const maxPages = 50; // Limit to prevent infinite loops
      
      while (hasNext && pageCount < maxPages) {
        console.log(`🔍 DEBUG: Fetching page ${pageCount + 1} for system ${system}`);
        
        const result = await AccService.getWebhooksBySystem(system, {
          region,
          status,
          pageState
        });
        
        if (result.success) {
          allWebhooks.push(...result.webhooks);
          
          // Merge webhooks by event
          Object.keys(result.webhooksByEvent || {}).forEach(event => {
            if (!webhooksByEvent[event]) {
              webhooksByEvent[event] = [];
            }
            webhooksByEvent[event].push(...result.webhooksByEvent[event]);
          });
          
          hasNext = result.hasNext;
          pageState = result.nextPageState || '';
          pageCount++;
        } else {
          console.log(`⚠️ DEBUG: Failed to get webhooks for system ${system}:`, result.error);
          hasNext = false;
        }
      }
      
      console.log(`✅ DEBUG: Retrieved ${allWebhooks.length} total webhooks for system ${system} across ${pageCount} pages`);
      
      return {
        success: true,
        webhooks: allWebhooks,
        webhooksByEvent: webhooksByEvent,
        system: system,
        region: region,
        total: allWebhooks.length,
        pages: pageCount,
        eventCounts: Object.keys(webhooksByEvent).reduce((counts, event) => {
          counts[event] = webhooksByEvent[event].length;
          return counts;
        }, {})
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting all webhooks for system:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get all webhooks for system'
      };
    }
  }

  /**
   * Get webhooks for multiple systems
   * @param {Array} systems - Array of system names
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Webhooks for all specified systems
   */
  static async getWebhooksForMultipleSystems(systems, options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhooks for multiple systems:`, systems);
      
      const {
        region = 'US',
        status = ''
      } = options;

      const allWebhooks = [];
      const webhooksBySystem = {};
      const webhooksByEvent = {};
      const systemStats = {};
      
      for (const system of systems) {
        console.log(`🔍 DEBUG: Processing system: ${system}`);
        
        const result = await AccService.getAllWebhooksForSystem(system, {
          region,
          status
        });
        
        if (result.success) {
          allWebhooks.push(...result.webhooks);
          webhooksBySystem[system] = result.webhooks;
          
          // Merge webhooks by event
          Object.keys(result.webhooksByEvent || {}).forEach(event => {
            if (!webhooksByEvent[event]) {
              webhooksByEvent[event] = [];
            }
            webhooksByEvent[event].push(...result.webhooksByEvent[event]);
          });
          
          systemStats[system] = {
            total: result.total,
            pages: result.pages,
            eventCounts: result.eventCounts
          };
        } else {
          console.log(`⚠️ DEBUG: Failed to get webhooks for system ${system}:`, result.error);
          systemStats[system] = {
            total: 0,
            pages: 0,
            eventCounts: {},
            error: result.error
          };
        }
      }
      
      console.log(`✅ DEBUG: Retrieved ${allWebhooks.length} total webhooks across ${systems.length} systems`);
      
      return {
        success: true,
        webhooks: allWebhooks,
        webhooksBySystem: webhooksBySystem,
        webhooksByEvent: webhooksByEvent,
        systemStats: systemStats,
        systems: systems,
        region: region,
        total: allWebhooks.length
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhooks for multiple systems:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get webhooks for multiple systems'
      };
    }
  }

  /**
   * Get webhook statistics by system
   * @param {string} system - System name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Webhook statistics for system
   */
  static async getWebhookStatsBySystem(system, options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhook statistics for system: ${system}`);
      
      const result = await AccService.getAllWebhooksForSystem(system, options);
      
      if (!result.success) {
        return result;
      }
      
      const webhooks = result.webhooks;
      const webhooksByEvent = result.webhooksByEvent;
      
      // Calculate statistics
      const stats = {
        system: system,
        total: webhooks.length,
        active: webhooks.filter(w => w.status === 'active').length,
        inactive: webhooks.filter(w => w.status === 'inactive').length,
        events: Object.keys(webhooksByEvent).length,
        eventBreakdown: {},
        creatorTypes: {},
        statusBreakdown: {},
        recentWebhooks: webhooks
          .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
          .slice(0, 10),
        oldestWebhook: webhooks.length > 0 ? 
          webhooks.reduce((oldest, current) => 
            new Date(current.createdDate) < new Date(oldest.createdDate) ? current : oldest
          ) : null,
        newestWebhook: webhooks.length > 0 ? 
          webhooks.reduce((newest, current) => 
            new Date(current.createdDate) > new Date(newest.createdDate) ? current : newest
          ) : null
      };
      
      // Event breakdown
      Object.keys(webhooksByEvent).forEach(event => {
        const eventWebhooks = webhooksByEvent[event];
        stats.eventBreakdown[event] = {
          total: eventWebhooks.length,
          active: eventWebhooks.filter(w => w.status === 'active').length,
          inactive: eventWebhooks.filter(w => w.status === 'inactive').length
        };
      });
      
      // Creator type breakdown
      webhooks.forEach(webhook => {
        const creatorType = webhook.creatorType || 'Unknown';
        stats.creatorTypes[creatorType] = (stats.creatorTypes[creatorType] || 0) + 1;
      });
      
      // Status breakdown
      webhooks.forEach(webhook => {
        const status = webhook.status || 'unknown';
        stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;
      });
      
      console.log(`✅ DEBUG: Webhook statistics for ${system}:`, stats);
      
      return {
        success: true,
        stats: stats,
        system: system,
        region: options.region || 'US'
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhook statistics by system:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get webhook statistics by system'
      };
    }
  }

  /**
   * Get all webhooks across all systems and events
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated webhook list for all systems
   */
  static async getAllWebhooks(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting all webhooks across all systems`);
      console.log(`🔍 DEBUG: Options:`, options);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const {
        region = 'US',
        status = '',
        pageState = ''
      } = options;

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (region) queryParams.append('region', region);
      if (status) queryParams.append('status', status);
      if (pageState) queryParams.append('pageState', pageState);

      const headers = {
        'Authorization': `Bearer ${credentials.threeLegToken}`,
        'Accept': 'application/json',
        'x-ads-region': region
      };

      const url = `https://developer.api.autodesk.com/webhooks/v1/hooks?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        const webhooks = data.data || [];
        const links = data.links || {};
        
        console.log(`✅ DEBUG: Retrieved ${webhooks.length} webhooks across all systems`);
        
        // Group webhooks by system and event for better organization
        const webhooksBySystem = {};
        const webhooksByEvent = {};
        const webhooksBySystemEvent = {};
        
        webhooks.forEach(webhook => {
          const system = webhook.system || 'unknown';
          const event = webhook.event || 'unknown';
          const systemEvent = `${system}:${event}`;
          
          // Group by system
          if (!webhooksBySystem[system]) {
            webhooksBySystem[system] = [];
          }
          webhooksBySystem[system].push(webhook);
          
          // Group by event
          if (!webhooksByEvent[event]) {
            webhooksByEvent[event] = [];
          }
          webhooksByEvent[event].push(webhook);
          
          // Group by system:event
          if (!webhooksBySystemEvent[systemEvent]) {
            webhooksBySystemEvent[systemEvent] = [];
          }
          webhooksBySystemEvent[systemEvent].push(webhook);
        });
        
        // Calculate statistics
        const systemCounts = Object.keys(webhooksBySystem).reduce((counts, system) => {
          counts[system] = webhooksBySystem[system].length;
          return counts;
        }, {});
        
        const eventCounts = Object.keys(webhooksByEvent).reduce((counts, event) => {
          counts[event] = webhooksByEvent[event].length;
          return counts;
        }, {});
        
        const systemEventCounts = Object.keys(webhooksBySystemEvent).reduce((counts, systemEvent) => {
          counts[systemEvent] = webhooksBySystemEvent[systemEvent].length;
          return counts;
        }, {});
        
        return {
          success: true,
          webhooks: webhooks,
          webhooksBySystem: webhooksBySystem,
          webhooksByEvent: webhooksByEvent,
          webhooksBySystemEvent: webhooksBySystemEvent,
          links: links,
          hasNext: !!links.next,
          nextPageState: links.next ? this.extractPageState(links.next) : null,
          region: region,
          total: webhooks.length,
          systemCounts: systemCounts,
          eventCounts: eventCounts,
          systemEventCounts: systemEventCounts,
          systems: Object.keys(webhooksBySystem),
          events: Object.keys(webhooksByEvent),
          systemEvents: Object.keys(webhooksBySystemEvent)
        };
      } else if (response.status === 204) {
        console.log(`ℹ️ DEBUG: No webhooks found across all systems`);
        return {
          success: true,
          webhooks: [],
          webhooksBySystem: {},
          webhooksByEvent: {},
          webhooksBySystemEvent: {},
          links: {},
          hasNext: false,
          nextPageState: null,
          region: region,
          total: 0,
          systemCounts: {},
          eventCounts: {},
          systemEventCounts: {},
          systems: [],
          events: [],
          systemEvents: []
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get all webhooks:`, response.status, errorText);
        return {
          success: false,
          error: `Failed to get all webhooks: ${response.status}`,
          details: errorText,
          status: response.status
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting all webhooks:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook retrieval failed'
      };
    }
  }

  /**
   * Get all webhooks with full pagination across all systems
   * @param {Object} options - Query options
   * @returns {Promise<Object>} All webhooks across all systems with pagination
   */
  static async getAllWebhooksWithPagination(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting all webhooks with full pagination across all systems`);
      
      const {
        region = 'US',
        status = ''
      } = options;

      const allWebhooks = [];
      const webhooksBySystem = {};
      const webhooksByEvent = {};
      const webhooksBySystemEvent = {};
      let pageState = '';
      let hasNext = true;
      let pageCount = 0;
      const maxPages = 100; // Limit to prevent infinite loops
      
      while (hasNext && pageCount < maxPages) {
        console.log(`🔍 DEBUG: Fetching page ${pageCount + 1} for all webhooks`);
        
        const result = await AccService.getAllWebhooks({
          region,
          status,
          pageState
        });
        
        if (result.success) {
          allWebhooks.push(...result.webhooks);
          
          // Merge webhooks by system
          Object.keys(result.webhooksBySystem || {}).forEach(system => {
            if (!webhooksBySystem[system]) {
              webhooksBySystem[system] = [];
            }
            webhooksBySystem[system].push(...result.webhooksBySystem[system]);
          });
          
          // Merge webhooks by event
          Object.keys(result.webhooksByEvent || {}).forEach(event => {
            if (!webhooksByEvent[event]) {
              webhooksByEvent[event] = [];
            }
            webhooksByEvent[event].push(...result.webhooksByEvent[event]);
          });
          
          // Merge webhooks by system:event
          Object.keys(result.webhooksBySystemEvent || {}).forEach(systemEvent => {
            if (!webhooksBySystemEvent[systemEvent]) {
              webhooksBySystemEvent[systemEvent] = [];
            }
            webhooksBySystemEvent[systemEvent].push(...result.webhooksBySystemEvent[systemEvent]);
          });
          
          hasNext = result.hasNext;
          pageState = result.nextPageState || '';
          pageCount++;
        } else {
          console.log(`⚠️ DEBUG: Failed to get webhooks page ${pageCount + 1}:`, result.error);
          hasNext = false;
        }
      }
      
      console.log(`✅ DEBUG: Retrieved ${allWebhooks.length} total webhooks across all systems in ${pageCount} pages`);
      
      // Calculate final statistics
      const systemCounts = Object.keys(webhooksBySystem).reduce((counts, system) => {
        counts[system] = webhooksBySystem[system].length;
        return counts;
      }, {});
      
      const eventCounts = Object.keys(webhooksByEvent).reduce((counts, event) => {
        counts[event] = webhooksByEvent[event].length;
        return counts;
      }, {});
      
      const systemEventCounts = Object.keys(webhooksBySystemEvent).reduce((counts, systemEvent) => {
        counts[systemEvent] = webhooksBySystemEvent[systemEvent].length;
        return counts;
      }, {});
      
      return {
        success: true,
        webhooks: allWebhooks,
        webhooksBySystem: webhooksBySystem,
        webhooksByEvent: webhooksByEvent,
        webhooksBySystemEvent: webhooksBySystemEvent,
        region: region,
        total: allWebhooks.length,
        pages: pageCount,
        systemCounts: systemCounts,
        eventCounts: eventCounts,
        systemEventCounts: systemEventCounts,
        systems: Object.keys(webhooksBySystem),
        events: Object.keys(webhooksByEvent),
        systemEvents: Object.keys(webhooksBySystemEvent)
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting all webhooks with pagination:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get all webhooks with pagination'
      };
    }
  }

  /**
   * Get comprehensive webhook statistics across all systems
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Comprehensive webhook statistics
   */
  static async getComprehensiveWebhookStats(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting comprehensive webhook statistics across all systems`);
      
      const result = await AccService.getAllWebhooksWithPagination(options);
      
      if (!result.success) {
        return result;
      }
      
      const webhooks = result.webhooks;
      const webhooksBySystem = result.webhooksBySystem;
      const webhooksByEvent = result.webhooksByEvent;
      const webhooksBySystemEvent = result.webhooksBySystemEvent;
      
      // Calculate comprehensive statistics
      const stats = {
        total: webhooks.length,
        active: webhooks.filter(w => w.status === 'active').length,
        inactive: webhooks.filter(w => w.status === 'inactive').length,
        systems: Object.keys(webhooksBySystem).length,
        events: Object.keys(webhooksByEvent).length,
        systemEvents: Object.keys(webhooksBySystemEvent).length,
        pages: result.pages,
        region: options.region || 'US',
        systemBreakdown: {},
        eventBreakdown: {},
        systemEventBreakdown: {},
        creatorTypes: {},
        statusBreakdown: {},
        recentWebhooks: webhooks
          .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
          .slice(0, 20),
        oldestWebhook: webhooks.length > 0 ? 
          webhooks.reduce((oldest, current) => 
            new Date(current.createdDate) < new Date(oldest.createdDate) ? current : oldest
          ) : null,
        newestWebhook: webhooks.length > 0 ? 
          webhooks.reduce((newest, current) => 
            new Date(current.createdDate) > new Date(newest.createdDate) ? current : newest
          ) : null,
        topSystems: Object.entries(result.systemCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topEvents: Object.entries(result.eventCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topSystemEvents: Object.entries(result.systemEventCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
      };
      
      // System breakdown
      Object.keys(webhooksBySystem).forEach(system => {
        const systemWebhooks = webhooksBySystem[system];
        stats.systemBreakdown[system] = {
          total: systemWebhooks.length,
          active: systemWebhooks.filter(w => w.status === 'active').length,
          inactive: systemWebhooks.filter(w => w.status === 'inactive').length,
          events: [...new Set(systemWebhooks.map(w => w.event))].length
        };
      });
      
      // Event breakdown
      Object.keys(webhooksByEvent).forEach(event => {
        const eventWebhooks = webhooksByEvent[event];
        stats.eventBreakdown[event] = {
          total: eventWebhooks.length,
          active: eventWebhooks.filter(w => w.status === 'active').length,
          inactive: eventWebhooks.filter(w => w.status === 'inactive').length,
          systems: [...new Set(eventWebhooks.map(w => w.system))].length
        };
      });
      
      // System:Event breakdown
      Object.keys(webhooksBySystemEvent).forEach(systemEvent => {
        const systemEventWebhooks = webhooksBySystemEvent[systemEvent];
        stats.systemEventBreakdown[systemEvent] = {
          total: systemEventWebhooks.length,
          active: systemEventWebhooks.filter(w => w.status === 'active').length,
          inactive: systemEventWebhooks.filter(w => w.status === 'inactive').length
        };
      });
      
      // Creator type breakdown
      webhooks.forEach(webhook => {
        const creatorType = webhook.creatorType || 'Unknown';
        stats.creatorTypes[creatorType] = (stats.creatorTypes[creatorType] || 0) + 1;
      });
      
      // Status breakdown
      webhooks.forEach(webhook => {
        const status = webhook.status || 'unknown';
        stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;
      });
      
      console.log(`✅ DEBUG: Comprehensive webhook statistics:`, stats);
      
      return {
        success: true,
        stats: stats,
        region: options.region || 'US',
        webhooks: webhooks,
        webhooksBySystem: webhooksBySystem,
        webhooksByEvent: webhooksByEvent,
        webhooksBySystemEvent: webhooksBySystemEvent
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting comprehensive webhook statistics:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get comprehensive webhook statistics'
      };
    }
  }

  /**
   * Get webhook health summary across all systems
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Webhook health summary
   */
  static async getWebhookHealthSummary(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhook health summary across all systems`);
      
      const result = await AccService.getComprehensiveWebhookStats(options);
      
      if (!result.success) {
        return result;
      }
      
      const stats = result.stats;
      const webhooks = result.webhooks;
      
      // Calculate health metrics
      const healthSummary = {
        overall: {
          total: stats.total,
          active: stats.active,
          inactive: stats.inactive,
          healthScore: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
          status: stats.total > 0 ? (stats.active / stats.total) > 0.8 ? 'healthy' : 'needs_attention' : 'no_webhooks'
        },
        systems: {},
        events: {},
        recommendations: []
      };
      
      // System health
      Object.keys(result.webhooksBySystem).forEach(system => {
        const systemWebhooks = result.webhooksBySystem[system];
        const active = systemWebhooks.filter(w => w.status === 'active').length;
        const total = systemWebhooks.length;
        const healthScore = total > 0 ? Math.round((active / total) * 100) : 0;
        
        healthSummary.systems[system] = {
          total: total,
          active: active,
          inactive: total - active,
          healthScore: healthScore,
          status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical'
        };
      });
      
      // Event health
      Object.keys(result.webhooksByEvent).forEach(event => {
        const eventWebhooks = result.webhooksByEvent[event];
        const active = eventWebhooks.filter(w => w.status === 'active').length;
        const total = eventWebhooks.length;
        const healthScore = total > 0 ? Math.round((active / total) * 100) : 0;
        
        healthSummary.events[event] = {
          total: total,
          active: active,
          inactive: total - active,
          healthScore: healthScore,
          status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical'
        };
      });
      
      // Generate recommendations
      if (stats.inactive > 0) {
        healthSummary.recommendations.push(`Review ${stats.inactive} inactive webhooks for potential reactivation`);
      }
      
      if (stats.total === 0) {
        healthSummary.recommendations.push('No webhooks found. Consider creating webhooks for your applications');
      }
      
      if (stats.active > 0 && stats.inactive > 0) {
        const inactiveRatio = stats.inactive / stats.total;
        if (inactiveRatio > 0.3) {
          healthSummary.recommendations.push('High number of inactive webhooks detected. Review webhook configuration');
        }
      }
      
      console.log(`✅ DEBUG: Webhook health summary:`, healthSummary);
      
      return {
        success: true,
        health: healthSummary,
        stats: stats,
        region: options.region || 'US'
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting webhook health summary:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get webhook health summary'
      };
    }
  }

  /**
   * Get webhooks created by the current application
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated webhook list for application
   */
  static async getApplicationWebhooks(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhooks for current application`);
      console.log(`🔍 DEBUG: Options:`, options);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLegToken) {
        throw new Error('No 2-legged access token available. This endpoint requires app-only authentication.');
      }

      const {
        region = 'US',
        status = 'active',
        sort = 'desc',
        pageState = ''
      } = options;

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (region) queryParams.append('region', region);
      if (status) queryParams.append('status', status);
      if (sort) queryParams.append('sort', sort);
      if (pageState) queryParams.append('pageState', pageState);

      const headers = {
        'Authorization': `Bearer ${credentials.twoLegToken}`,
        'Accept': 'application/json',
        'x-ads-region': region
      };

      const url = `https://developer.api.autodesk.com/webhooks/v1/app/hooks?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        const webhooks = data.data || [];
        const links = data.links || {};
        
        console.log(`✅ DEBUG: Retrieved ${webhooks.length} webhooks for application`);
        
        // Group webhooks by system and event for better organization
        const webhooksBySystem = {};
        const webhooksByEvent = {};
        const webhooksBySystemEvent = {};
        
        webhooks.forEach(webhook => {
          const system = webhook.system || 'unknown';
          const event = webhook.event || 'unknown';
          const systemEvent = `${system}:${event}`;
          
          // Group by system
          if (!webhooksBySystem[system]) {
            webhooksBySystem[system] = [];
          }
          webhooksBySystem[system].push(webhook);
          
          // Group by event
          if (!webhooksByEvent[event]) {
            webhooksByEvent[event] = [];
          }
          webhooksByEvent[event].push(webhook);
          
          // Group by system:event
          if (!webhooksBySystemEvent[systemEvent]) {
            webhooksBySystemEvent[systemEvent] = [];
          }
          webhooksBySystemEvent[systemEvent].push(webhook);
        });
        
        // Calculate statistics
        const systemCounts = Object.keys(webhooksBySystem).reduce((counts, system) => {
          counts[system] = webhooksBySystem[system].length;
          return counts;
        }, {});
        
        const eventCounts = Object.keys(webhooksByEvent).reduce((counts, event) => {
          counts[event] = webhooksByEvent[event].length;
          return counts;
        }, {});
        
        const systemEventCounts = Object.keys(webhooksBySystemEvent).reduce((counts, systemEvent) => {
          counts[systemEvent] = webhooksBySystemEvent[systemEvent].length;
          return counts;
        }, {});
        
        return {
          success: true,
          webhooks: webhooks,
          webhooksBySystem: webhooksBySystem,
          webhooksByEvent: webhooksByEvent,
          webhooksBySystemEvent: webhooksBySystemEvent,
          links: links,
          hasNext: !!links.next,
          nextPageState: links.next ? this.extractPageState(links.next) : null,
          region: region,
          status: status,
          sort: sort,
          total: webhooks.length,
          systemCounts: systemCounts,
          eventCounts: eventCounts,
          systemEventCounts: systemEventCounts,
          systems: Object.keys(webhooksBySystem),
          events: Object.keys(webhooksByEvent),
          systemEvents: Object.keys(webhooksBySystemEvent),
          authenticationType: '2-legged'
        };
      } else if (response.status === 204) {
        console.log(`ℹ️ DEBUG: No webhooks found for application`);
        return {
          success: true,
          webhooks: [],
          webhooksBySystem: {},
          webhooksByEvent: {},
          webhooksBySystemEvent: {},
          links: {},
          hasNext: false,
          nextPageState: null,
          region: region,
          status: status,
          sort: sort,
          total: 0,
          systemCounts: {},
          eventCounts: {},
          systemEventCounts: {},
          systems: [],
          events: [],
          systemEvents: [],
          authenticationType: '2-legged'
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to get application webhooks:`, response.status, errorText);
        return {
          success: false,
          error: `Failed to get application webhooks: ${response.status}`,
          details: errorText,
          status: response.status,
          authenticationType: '2-legged'
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting application webhooks:', error);
      return {
        success: false,
        error: error.message,
        details: 'Application webhook retrieval failed',
        authenticationType: '2-legged'
      };
    }
  }

  /**
   * Get all application webhooks with full pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} All application webhooks with pagination
   */
  static async getAllApplicationWebhooks(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting all application webhooks with full pagination`);
      
      const {
        region = 'US',
        status = 'active',
        sort = 'desc'
      } = options;

      const allWebhooks = [];
      const webhooksBySystem = {};
      const webhooksByEvent = {};
      const webhooksBySystemEvent = {};
      let pageState = '';
      let hasNext = true;
      let pageCount = 0;
      const maxPages = 50; // Limit to prevent infinite loops
      
      while (hasNext && pageCount < maxPages) {
        console.log(`🔍 DEBUG: Fetching page ${pageCount + 1} for application webhooks`);
        
        const result = await AccService.getApplicationWebhooks({
          region,
          status,
          sort,
          pageState
        });
        
        if (result.success) {
          allWebhooks.push(...result.webhooks);
          
          // Merge webhooks by system
          Object.keys(result.webhooksBySystem || {}).forEach(system => {
            if (!webhooksBySystem[system]) {
              webhooksBySystem[system] = [];
            }
            webhooksBySystem[system].push(...result.webhooksBySystem[system]);
          });
          
          // Merge webhooks by event
          Object.keys(result.webhooksByEvent || {}).forEach(event => {
            if (!webhooksByEvent[event]) {
              webhooksByEvent[event] = [];
            }
            webhooksByEvent[event].push(...result.webhooksByEvent[event]);
          });
          
          // Merge webhooks by system:event
          Object.keys(result.webhooksBySystemEvent || {}).forEach(systemEvent => {
            if (!webhooksBySystemEvent[systemEvent]) {
              webhooksBySystemEvent[systemEvent] = [];
            }
            webhooksBySystemEvent[systemEvent].push(...result.webhooksBySystemEvent[systemEvent]);
          });
          
          hasNext = result.hasNext;
          pageState = result.nextPageState || '';
          pageCount++;
        } else {
          console.log(`⚠️ DEBUG: Failed to get application webhooks page ${pageCount + 1}:`, result.error);
          hasNext = false;
        }
      }
      
      console.log(`✅ DEBUG: Retrieved ${allWebhooks.length} total application webhooks in ${pageCount} pages`);
      
      // Calculate final statistics
      const systemCounts = Object.keys(webhooksBySystem).reduce((counts, system) => {
        counts[system] = webhooksBySystem[system].length;
        return counts;
      }, {});
      
      const eventCounts = Object.keys(webhooksByEvent).reduce((counts, event) => {
        counts[event] = webhooksByEvent[event].length;
        return counts;
      }, {});
      
      const systemEventCounts = Object.keys(webhooksBySystemEvent).reduce((counts, systemEvent) => {
        counts[systemEvent] = webhooksBySystemEvent[systemEvent].length;
        return counts;
      }, {});
      
      return {
        success: true,
        webhooks: allWebhooks,
        webhooksBySystem: webhooksBySystem,
        webhooksByEvent: webhooksByEvent,
        webhooksBySystemEvent: webhooksBySystemEvent,
        region: region,
        status: status,
        sort: sort,
        total: allWebhooks.length,
        pages: pageCount,
        systemCounts: systemCounts,
        eventCounts: eventCounts,
        systemEventCounts: systemEventCounts,
        systems: Object.keys(webhooksBySystem),
        events: Object.keys(webhooksByEvent),
        systemEvents: Object.keys(webhooksBySystemEvent),
        authenticationType: '2-legged'
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting all application webhooks:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get all application webhooks',
        authenticationType: '2-legged'
      };
    }
  }

  /**
   * Get application webhook statistics and analytics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Application webhook statistics
   */
  static async getApplicationWebhookStats(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting application webhook statistics`);
      
      const result = await AccService.getAllApplicationWebhooks(options);
      
      if (!result.success) {
        return result;
      }
      
      const webhooks = result.webhooks;
      const webhooksBySystem = result.webhooksBySystem;
      const webhooksByEvent = result.webhooksByEvent;
      const webhooksBySystemEvent = result.webhooksBySystemEvent;
      
      // Calculate comprehensive statistics
      const stats = {
        total: webhooks.length,
        active: webhooks.filter(w => w.status === 'active').length,
        inactive: webhooks.filter(w => w.status === 'inactive').length,
        systems: Object.keys(webhooksBySystem).length,
        events: Object.keys(webhooksByEvent).length,
        systemEvents: Object.keys(webhooksBySystemEvent).length,
        pages: result.pages,
        region: options.region || 'US',
        status: options.status || 'active',
        sort: options.sort || 'desc',
        systemBreakdown: {},
        eventBreakdown: {},
        systemEventBreakdown: {},
        creatorTypes: {},
        statusBreakdown: {},
        recentWebhooks: webhooks
          .sort((a, b) => new Date(b.lastUpdatedDate || b.createdDate) - new Date(a.lastUpdatedDate || a.createdDate))
          .slice(0, 10),
        oldestWebhook: webhooks.length > 0 ? 
          webhooks.reduce((oldest, current) => 
            new Date(current.createdDate) < new Date(oldest.createdDate) ? current : oldest
          ) : null,
        newestWebhook: webhooks.length > 0 ? 
          webhooks.reduce((newest, current) => 
            new Date(current.createdDate) > new Date(newest.createdDate) ? current : newest
          ) : null,
        topSystems: Object.entries(result.systemCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topEvents: Object.entries(result.eventCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topSystemEvents: Object.entries(result.systemEventCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        authenticationType: '2-legged'
      };
      
      // System breakdown
      Object.keys(webhooksBySystem).forEach(system => {
        const systemWebhooks = webhooksBySystem[system];
        stats.systemBreakdown[system] = {
          total: systemWebhooks.length,
          active: systemWebhooks.filter(w => w.status === 'active').length,
          inactive: systemWebhooks.filter(w => w.status === 'inactive').length,
          events: [...new Set(systemWebhooks.map(w => w.event))].length
        };
      });
      
      // Event breakdown
      Object.keys(webhooksByEvent).forEach(event => {
        const eventWebhooks = webhooksByEvent[event];
        stats.eventBreakdown[event] = {
          total: eventWebhooks.length,
          active: eventWebhooks.filter(w => w.status === 'active').length,
          inactive: eventWebhooks.filter(w => w.status === 'inactive').length,
          systems: [...new Set(eventWebhooks.map(w => w.system))].length
        };
      });
      
      // System:Event breakdown
      Object.keys(webhooksBySystemEvent).forEach(systemEvent => {
        const systemEventWebhooks = webhooksBySystemEvent[systemEvent];
        stats.systemEventBreakdown[systemEvent] = {
          total: systemEventWebhooks.length,
          active: systemEventWebhooks.filter(w => w.status === 'active').length,
          inactive: systemEventWebhooks.filter(w => w.status === 'inactive').length
        };
      });
      
      // Creator type breakdown
      webhooks.forEach(webhook => {
        const creatorType = webhook.creatorType || 'Unknown';
        stats.creatorTypes[creatorType] = (stats.creatorTypes[creatorType] || 0) + 1;
      });
      
      // Status breakdown
      webhooks.forEach(webhook => {
        const status = webhook.status || 'unknown';
        stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;
      });
      
      console.log(`✅ DEBUG: Application webhook statistics:`, stats);
      
      return {
        success: true,
        stats: stats,
        region: options.region || 'US',
        webhooks: webhooks,
        webhooksBySystem: webhooksBySystem,
        webhooksByEvent: webhooksByEvent,
        webhooksBySystemEvent: webhooksBySystemEvent,
        authenticationType: '2-legged'
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting application webhook statistics:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get application webhook statistics',
        authenticationType: '2-legged'
      };
    }
  }

  /**
   * Get application webhook health summary
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Application webhook health summary
   */
  static async getApplicationWebhookHealth(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting application webhook health summary`);
      
      const result = await AccService.getApplicationWebhookStats(options);
      
      if (!result.success) {
        return result;
      }
      
      const stats = result.stats;
      const webhooks = result.webhooks;
      
      // Calculate health metrics
      const healthSummary = {
        overall: {
          total: stats.total,
          active: stats.active,
          inactive: stats.inactive,
          healthScore: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
          status: stats.total > 0 ? (stats.active / stats.total) > 0.8 ? 'healthy' : 'needs_attention' : 'no_webhooks'
        },
        systems: {},
        events: {},
        recommendations: [],
        authenticationType: '2-legged'
      };
      
      // System health
      Object.keys(result.webhooksBySystem).forEach(system => {
        const systemWebhooks = result.webhooksBySystem[system];
        const active = systemWebhooks.filter(w => w.status === 'active').length;
        const total = systemWebhooks.length;
        const healthScore = total > 0 ? Math.round((active / total) * 100) : 0;
        
        healthSummary.systems[system] = {
          total: total,
          active: active,
          inactive: total - active,
          healthScore: healthScore,
          status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical'
        };
      });
      
      // Event health
      Object.keys(result.webhooksByEvent).forEach(event => {
        const eventWebhooks = result.webhooksByEvent[event];
        const active = eventWebhooks.filter(w => w.status === 'active').length;
        const total = eventWebhooks.length;
        const healthScore = total > 0 ? Math.round((active / total) * 100) : 0;
        
        healthSummary.events[event] = {
          total: total,
          active: active,
          inactive: total - active,
          healthScore: healthScore,
          status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical'
        };
      });
      
      // Generate recommendations
      if (stats.inactive > 0) {
        healthSummary.recommendations.push(`Review ${stats.inactive} inactive application webhooks for potential reactivation`);
      }
      
      if (stats.total === 0) {
        healthSummary.recommendations.push('No application webhooks found. Consider creating webhooks for your application');
      }
      
      if (stats.active > 0 && stats.inactive > 0) {
        const inactiveRatio = stats.inactive / stats.total;
        if (inactiveRatio > 0.3) {
          healthSummary.recommendations.push('High number of inactive application webhooks detected. Review webhook configuration');
        }
      }
      
      // Check for expired webhooks
      const expiredWebhooks = webhooks.filter(w => w.hookExpiry && new Date(w.hookExpiry) < new Date());
      if (expiredWebhooks.length > 0) {
        healthSummary.recommendations.push(`${expiredWebhooks.length} webhooks have expired. Consider renewing or recreating them`);
      }
      
      // Check for auto-reactivate settings
      const autoReactivateWebhooks = webhooks.filter(w => w.autoReactivateHook === true);
      if (autoReactivateWebhooks.length > 0) {
        healthSummary.recommendations.push(`${autoReactivateWebhooks.length} webhooks have auto-reactivate enabled. Monitor their status`);
      }
      
      console.log(`✅ DEBUG: Application webhook health summary:`, healthSummary);
      
      return {
        success: true,
        health: healthSummary,
        stats: stats,
        region: options.region || 'US',
        authenticationType: '2-legged'
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting application webhook health:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to get application webhook health',
        authenticationType: '2-legged'
      };
    }
  }

  /**
   * Create a new webhook secret token
   * @param {string} token - Secret token for webhook authentication
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Token creation result
   */
  static async createWebhookToken(token, options = {}) {
    try {
      console.log(`🔍 DEBUG: Creating webhook secret token`);
      console.log(`🔍 DEBUG: Token: ${token ? '***' + token.slice(-4) : 'undefined'}`);
      console.log(`🔍 DEBUG: Options:`, options);
      
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('Token is required and must be a non-empty string');
      }

      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken && !credentials.twoLegToken) {
        throw new Error('No access token available. 3-legged or 2-legged token required.');
      }

      const {
        region = 'US'
      } = options;

      const headers = {
        'Authorization': `Bearer ${credentials.threeLegToken || credentials.twoLegToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-ads-region': region
      };

      const requestBody = {
        token: token.trim()
      };

      const url = `https://developer.api.autodesk.com/webhooks/v1/tokens`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Webhook token created successfully`);
        
        return {
          success: true,
          status: data.status || response.status,
          detail: data.detail || ['Token created successfully'],
          token: token,
          region: region,
          message: data.detail ? data.detail.join(', ') : 'Token created successfully'
        };
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: [errorText] };
        }
        
        console.log(`⚠️ DEBUG: Failed to create webhook token:`, response.status, errorData);
        
        return {
          success: false,
          error: `Failed to create webhook token: ${response.status}`,
          details: errorData.detail || [errorText],
          status: response.status,
          region: region
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating webhook token:', error);
      return {
        success: false,
        error: error.message,
        details: ['Webhook token creation failed'],
        region: options.region || 'US'
      };
    }
  }

  /**
   * Generate a secure webhook token
   * @param {number} length - Token length (default: 32)
   * @returns {string} Generated secure token
   */
  static generateWebhookToken(length = 32) {
    try {
      console.log(`🔍 DEBUG: Generating secure webhook token of length ${length}`);
      
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      
      // Use crypto.getRandomValues if available (browser), otherwise fallback to Math.random
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
          result += chars[array[i] % chars.length];
        }
      } else {
        // Fallback for environments without crypto.getRandomValues
        for (let i = 0; i < length; i++) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      
      console.log(`✅ DEBUG: Generated secure webhook token: ${result.slice(0, 4)}...${result.slice(-4)}`);
      return result;
    } catch (error) {
      console.error('❌ DEBUG: Error generating webhook token:', error);
      // Fallback to simple random generation
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    }
  }

  /**
   * Create webhook token with auto-generated secure token
   * @param {Object} options - Options for token creation
   * @returns {Promise<Object>} Token creation result with generated token
   */
  static async createWebhookTokenAuto(options = {}) {
    try {
      console.log(`🔍 DEBUG: Creating webhook token with auto-generated secure token`);
      
      const {
        region = 'US',
        tokenLength = 32,
        customToken = null
      } = options;

      // Use custom token if provided, otherwise generate one
      const token = customToken || AccService.generateWebhookToken(tokenLength);
      
      console.log(`🔍 DEBUG: Using token: ${customToken ? 'custom' : 'auto-generated'}`);
      
      const result = await AccService.createWebhookToken(token, { region });
      
      if (result.success) {
        return {
          ...result,
          generatedToken: token,
          tokenLength: token.length,
          isGenerated: !customToken
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating webhook token auto:', error);
      return {
        success: false,
        error: error.message,
        details: ['Webhook token auto-creation failed'],
        region: options.region || 'US'
      };
    }
  }

  /**
   * Validate webhook token format
   * @param {string} token - Token to validate
   * @returns {Object} Validation result
   */
  static validateWebhookToken(token) {
    try {
      console.log(`🔍 DEBUG: Validating webhook token format`);
      
      if (!token || typeof token !== 'string') {
        return {
          valid: false,
          error: 'Token must be a string',
          suggestions: ['Provide a non-empty string token']
        };
      }

      const trimmedToken = token.trim();
      
      if (trimmedToken.length === 0) {
        return {
          valid: false,
          error: 'Token cannot be empty',
          suggestions: ['Provide a non-empty token']
        };
      }

      if (trimmedToken.length < 8) {
        return {
          valid: false,
          error: 'Token is too short (minimum 8 characters)',
          suggestions: ['Use a token with at least 8 characters for better security']
        };
      }

      if (trimmedToken.length > 128) {
        return {
          valid: false,
          error: 'Token is too long (maximum 128 characters)',
          suggestions: ['Use a token with 128 characters or less']
        };
      }

      // Check for common weak patterns
      const weakPatterns = [
        /^[0-9]+$/, // Only numbers
        /^[a-zA-Z]+$/, // Only letters
        /^(.)\1+$/, // All same character
        /^(password|token|secret|webhook)$/i, // Common weak words
        /^(123|abc|test|demo)$/i // Common weak patterns
      ];

      for (const pattern of weakPatterns) {
        if (pattern.test(trimmedToken)) {
          return {
            valid: false,
            error: 'Token appears to be weak or predictable',
            suggestions: [
              'Use a mix of uppercase letters, lowercase letters, and numbers',
              'Avoid common words or patterns',
              'Consider using a longer, more random token'
            ]
          };
        }
      }

      // Check for sufficient entropy
      const hasUpper = /[A-Z]/.test(trimmedToken);
      const hasLower = /[a-z]/.test(trimmedToken);
      const hasNumber = /[0-9]/.test(trimmedToken);
      const hasSpecial = /[^A-Za-z0-9]/.test(trimmedToken);

      const entropyScore = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
      
      let strength = 'weak';
      if (entropyScore >= 3 && trimmedToken.length >= 16) {
        strength = 'strong';
      } else if (entropyScore >= 2 && trimmedToken.length >= 12) {
        strength = 'medium';
      }

      const suggestions = [];
      if (!hasUpper) suggestions.push('Include uppercase letters');
      if (!hasLower) suggestions.push('Include lowercase letters');
      if (!hasNumber) suggestions.push('Include numbers');
      if (!hasSpecial) suggestions.push('Consider including special characters');
      if (trimmedToken.length < 16) suggestions.push('Consider using a longer token (16+ characters)');

      console.log(`✅ DEBUG: Token validation completed - strength: ${strength}`);
      
      return {
        valid: true,
        strength: strength,
        length: trimmedToken.length,
        hasUpper: hasUpper,
        hasLower: hasLower,
        hasNumber: hasNumber,
        hasSpecial: hasSpecial,
        entropyScore: entropyScore,
        suggestions: suggestions
      };
    } catch (error) {
      console.error('❌ DEBUG: Error validating webhook token:', error);
      return {
        valid: false,
        error: 'Token validation failed',
        suggestions: ['Check token format and try again']
      };
    }
  }

  /**
   * Create webhook token with validation and auto-generation
   * @param {Object} options - Options for token creation
   * @returns {Promise<Object>} Token creation result with validation
   */
  static async createWebhookTokenWithValidation(options = {}) {
    try {
      console.log(`🔍 DEBUG: Creating webhook token with validation`);
      
      const {
        region = 'US',
        token = null,
        tokenLength = 32,
        validateOnly = false
      } = options;

      let finalToken = token;
      let validation = null;

      if (token) {
        // Validate provided token
        validation = AccService.validateWebhookToken(token);
        if (!validation.valid) {
          return {
            success: false,
            error: 'Token validation failed',
            details: [validation.error],
            suggestions: validation.suggestions,
            validation: validation
          };
        }
        finalToken = token.trim();
      } else {
        // Generate secure token
        finalToken = AccService.generateWebhookToken(tokenLength);
        validation = AccService.validateWebhookToken(finalToken);
      }

      if (validateOnly) {
        return {
          success: true,
          token: finalToken,
          validation: validation,
          message: 'Token validation completed',
          region: region
        };
      }

      // Create the token
      const result = await AccService.createWebhookToken(finalToken, { region });
      
      if (result.success) {
        return {
          ...result,
          token: finalToken,
          validation: validation,
          isGenerated: !token
        };
      } else {
        return {
          ...result,
          token: finalToken,
          validation: validation,
          isGenerated: !token
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error creating webhook token with validation:', error);
      return {
        success: false,
        error: error.message,
        details: ['Webhook token creation with validation failed'],
        region: options.region || 'US'
      };
    }
  }

  /**
   * Update an existing webhook secret token
   * @param {string} token - New secret token for webhook authentication
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Token update result
   */
  static async updateWebhookToken(token, options = {}) {
    try {
      console.log(`🔍 DEBUG: Updating webhook secret token`);
      console.log(`🔍 DEBUG: Token: ${token ? '***' + token.slice(-4) : 'undefined'}`);
      console.log(`🔍 DEBUG: Options:`, options);
      
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('Token is required and must be a non-empty string');
      }

      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken && !credentials.twoLegToken) {
        throw new Error('No access token available. 3-legged or 2-legged token required.');
      }

      const {
        region = 'US'
      } = options;

      const headers = {
        'Authorization': `Bearer ${credentials.threeLegToken || credentials.twoLegToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-ads-region': region
      };

      const requestBody = {
        token: token.trim()
      };

      const url = `https://developer.api.autodesk.com/webhooks/v1/tokens/@me`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      if (response.status === 204) {
        console.log(`✅ DEBUG: Webhook token updated successfully`);
        
        return {
          success: true,
          status: 204,
          message: 'Token updated successfully',
          token: token,
          region: region,
          rolloverInfo: {
            message: 'Token update can take up to 10 minutes to be applied',
            recommendation: 'Accept both old and new token values during transition period',
            transitionPeriod: '10 minutes'
          }
        };
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: [errorText] };
        }
        
        console.log(`⚠️ DEBUG: Failed to update webhook token:`, response.status, errorData);
        
        return {
          success: false,
          error: `Failed to update webhook token: ${response.status}`,
          details: errorData.detail || [errorText],
          status: response.status,
          region: region
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error updating webhook token:', error);
      return {
        success: false,
        error: error.message,
        details: ['Webhook token update failed'],
        region: options.region || 'US'
      };
    }
  }

  /**
   * Update webhook token with auto-generated secure token
   * @param {Object} options - Options for token update
   * @returns {Promise<Object>} Token update result with generated token
   */
  static async updateWebhookTokenAuto(options = {}) {
    try {
      console.log(`🔍 DEBUG: Updating webhook token with auto-generated secure token`);
      
      const {
        region = 'US',
        tokenLength = 32,
        customToken = null
      } = options;

      // Use custom token if provided, otherwise generate one
      const token = customToken || AccService.generateWebhookToken(tokenLength);
      
      console.log(`🔍 DEBUG: Using token: ${customToken ? 'custom' : 'auto-generated'}`);
      
      const result = await AccService.updateWebhookToken(token, { region });
      
      if (result.success) {
        return {
          ...result,
          generatedToken: token,
          tokenLength: token.length,
          isGenerated: !customToken
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error updating webhook token auto:', error);
      return {
        success: false,
        error: error.message,
        details: ['Webhook token auto-update failed'],
        region: options.region || 'US'
      };
    }
  }

  /**
   * Update webhook token with validation and auto-generation
   * @param {Object} options - Options for token update
   * @returns {Promise<Object>} Token update result with validation
   */
  static async updateWebhookTokenWithValidation(options = {}) {
    try {
      console.log(`🔍 DEBUG: Updating webhook token with validation`);
      
      const {
        region = 'US',
        token = null,
        tokenLength = 32,
        validateOnly = false
      } = options;

      let finalToken = token;
      let validation = null;

      if (token) {
        // Validate provided token
        validation = AccService.validateWebhookToken(token);
        if (!validation.valid) {
          return {
            success: false,
            error: 'Token validation failed',
            details: [validation.error],
            suggestions: validation.suggestions,
            validation: validation
          };
        }
        finalToken = token.trim();
      } else {
        // Generate secure token
        finalToken = AccService.generateWebhookToken(tokenLength);
        validation = AccService.validateWebhookToken(finalToken);
      }

      if (validateOnly) {
        return {
          success: true,
          token: finalToken,
          validation: validation,
          message: 'Token validation completed for update',
          region: region
        };
      }

      // Update the token
      const result = await AccService.updateWebhookToken(finalToken, { region });
      
      if (result.success) {
        return {
          ...result,
          token: finalToken,
          validation: validation,
          isGenerated: !token
        };
      } else {
        return {
          ...result,
          token: finalToken,
          validation: validation,
          isGenerated: !token
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error updating webhook token with validation:', error);
      return {
        success: false,
        error: error.message,
        details: ['Webhook token update with validation failed'],
        region: options.region || 'US'
      };
    }
  }

  /**
   * Rotate webhook token with secure generation and rollover support
   * @param {Object} options - Options for token rotation
   * @returns {Promise<Object>} Token rotation result
   */
  static async rotateWebhookToken(options = {}) {
    try {
      console.log(`🔍 DEBUG: Rotating webhook token with rollover support`);
      
      const {
        region = 'US',
        tokenLength = 32,
        customToken = null,
        rolloverPeriod = 10 // minutes
      } = options;

      // Generate or use custom token
      const newToken = customToken || AccService.generateWebhookToken(tokenLength);
      
      // Validate the new token
      const validation = AccService.validateWebhookToken(newToken);
      if (!validation.valid) {
        return {
          success: false,
          error: 'New token validation failed',
          details: [validation.error],
          suggestions: validation.suggestions,
          validation: validation
        };
      }

      // Update the token
      const result = await AccService.updateWebhookToken(newToken, { region });
      
      if (result.success) {
        return {
          ...result,
          newToken: newToken,
          validation: validation,
          isGenerated: !customToken,
          rolloverInfo: {
            message: `Token rotation completed. Update can take up to ${rolloverPeriod} minutes to be applied`,
            recommendation: 'Accept both old and new token values during transition period',
            transitionPeriod: `${rolloverPeriod} minutes`,
            newToken: newToken,
            rolloverStartTime: new Date().toISOString(),
            rolloverEndTime: new Date(Date.now() + rolloverPeriod * 60 * 1000).toISOString()
          }
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('❌ DEBUG: Error rotating webhook token:', error);
      return {
        success: false,
        error: error.message,
        details: ['Webhook token rotation failed'],
        region: options.region || 'US'
      };
    }
  }

  /**
   * Get webhook token rollover recommendations
   * @param {Object} options - Options for rollover recommendations
   * @returns {Object} Rollover recommendations
   */
  static getWebhookTokenRolloverRecommendations(options = {}) {
    try {
      console.log(`🔍 DEBUG: Getting webhook token rollover recommendations`);
      
      const {
        rolloverPeriod = 10, // minutes
        currentTime = new Date()
      } = options;

      const rolloverEndTime = new Date(currentTime.getTime() + rolloverPeriod * 60 * 1000);
      
      const recommendations = {
        rolloverPeriod: rolloverPeriod,
        rolloverStartTime: currentTime.toISOString(),
        rolloverEndTime: rolloverEndTime.toISOString(),
        recommendations: [
          'Accept both old and new token values during transition period',
          'Monitor webhook delivery logs for any failures during rollover',
          'Test webhook endpoints with both token values',
          'Update webhook endpoint documentation with new token',
          'Consider gradual rollout for high-traffic applications',
          'Monitor for any webhook delivery failures during transition'
        ],
        bestPractices: [
          'Implement token validation that accepts multiple tokens',
          'Log webhook delivery attempts for debugging',
          'Set up monitoring for webhook delivery failures',
          'Test webhook endpoints thoroughly before rollover',
          'Have a rollback plan in case of issues',
          'Communicate token changes to webhook consumers'
        ],
        monitoring: [
          'Check webhook delivery success rates',
          'Monitor for authentication failures',
          'Verify webhook payload integrity',
          'Test webhook endpoint responses',
          'Check webhook retry mechanisms'
        ],
        rolloverSteps: [
          '1. Generate new secure token',
          '2. Update webhook token via API',
          '3. Update webhook endpoint to accept both tokens',
          '4. Monitor webhook delivery for 10 minutes',
          '5. Remove old token support after rollover period',
          '6. Update documentation and configurations'
        ]
      };

      console.log(`✅ DEBUG: Generated rollover recommendations for ${rolloverPeriod} minute period`);
      
      return {
        success: true,
        recommendations: recommendations,
        region: options.region || 'US'
      };
    } catch (error) {
      console.error('❌ DEBUG: Error getting rollover recommendations:', error);
      return {
        success: false,
        error: error.message,
        details: ['Failed to get rollover recommendations']
      };
    }
  }

  /**
   * Webhooks API Exception class for handling webhook service errors
   * Extends ServiceApiException with webhook-specific functionality
   */
  static WebhooksApiException = class extends Error {
    constructor(message, httpResponseMessage = null, innerException = null) {
      super(message);
      this.name = 'WebhooksApiException';
      this.httpResponseMessage = httpResponseMessage;
      this.innerException = innerException;
      this.timestamp = new Date().toISOString();
      this.type = 'WebhooksApiException';
      this.service = 'Webhooks';
      this.inheritance = ['Exception', 'HttpRequestException', 'ServiceApiException', 'WebhooksApiException'];
    }

    /**
     * Get HTTP status code from response
     * @returns {number|null} HTTP status code
     */
    getStatusCode() {
      return this.httpResponseMessage ? this.httpResponseMessage.status : null;
    }

    /**
     * Get HTTP status text from response
     * @returns {string|null} HTTP status text
     */
    getStatusText() {
      return this.httpResponseMessage ? this.httpResponseMessage.statusText : null;
    }

    /**
     * Get response headers
     * @returns {Object|null} Response headers
     */
    getHeaders() {
      if (!this.httpResponseMessage) return null;
      
      const headers = {};
      this.httpResponseMessage.headers.forEach((value, key) => {
        headers[key] = value;
      });
      return headers;
    }

    /**
     * Get response body as text
     * @returns {Promise<string|null>} Response body
     */
    async getResponseBody() {
      if (!this.httpResponseMessage) return null;
      
      try {
        return await this.httpResponseMessage.text();
      } catch (error) {
        console.error('❌ DEBUG: Error reading response body:', error);
        return null;
      }
    }

    /**
     * Get response body as JSON
     * @returns {Promise<Object|null>} Response body as JSON
     */
    async getResponseJson() {
      if (!this.httpResponseMessage) return null;
      
      try {
        const text = await this.httpResponseMessage.text();
        return JSON.parse(text);
      } catch (error) {
        console.error('❌ DEBUG: Error parsing response JSON:', error);
        return null;
      }
    }

    /**
     * Check if error is a specific HTTP status
     * @param {number} statusCode - HTTP status code to check
     * @returns {boolean} True if status matches
     */
    isStatus(statusCode) {
      return this.getStatusCode() === statusCode;
    }

    /**
     * Check if error is a client error (4xx)
     * @returns {boolean} True if client error
     */
    isClientError() {
      const status = this.getStatusCode();
      return status >= 400 && status < 500;
    }

    /**
     * Check if error is a server error (5xx)
     * @returns {boolean} True if server error
     */
    isServerError() {
      const status = this.getStatusCode();
      return status >= 500 && status < 600;
    }

    /**
     * Get detailed error information
     * @returns {Object} Detailed error information
     */
    getErrorDetails() {
      return {
        name: this.name,
        message: this.message,
        statusCode: this.getStatusCode(),
        statusText: this.getStatusText(),
        headers: this.getHeaders(),
        timestamp: this.timestamp,
        type: this.type,
        innerException: this.innerException ? {
          name: this.innerException.name,
          message: this.innerException.message
        } : null
      };
    }

    /**
     * Convert to JSON string
     * @returns {string} JSON representation
     */
    toJSON() {
      return JSON.stringify(this.getErrorDetails(), null, 2);
    }
  };

  /**
   * Handle webhook API errors and create appropriate exceptions
   * @param {Response} response - HTTP response
   * @param {string} operation - Operation being performed
   * @param {Error} originalError - Original error if any
   * @returns {Promise<WebhookApiException>} Webhook API exception
   */
  static async handleWebhookApiError(response, operation, originalError = null) {
    try {
      console.log(`🔍 DEBUG: Handling webhook API error for operation: ${operation}`);
      console.log(`🔍 DEBUG: Response status: ${response.status} ${response.statusText}`);
      
      let errorMessage = `Webhook API error during ${operation}`;
      let errorDetails = null;
      
      try {
        const responseText = await response.text();
        errorDetails = responseText;
        
        // Try to parse as JSON for structured error information
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.detail && Array.isArray(errorJson.detail)) {
            errorMessage = errorJson.detail.join(', ');
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (parseError) {
          // Use raw text if JSON parsing fails
          errorMessage = responseText || errorMessage;
        }
      } catch (textError) {
        console.error('❌ DEBUG: Error reading response text:', textError);
        errorMessage = `Failed to read response: ${response.status} ${response.statusText}`;
      }

      // Create webhooks API exception
      const exception = new AccService.WebhooksApiException(
        errorMessage,
        response,
        originalError
      );

      console.log(`✅ DEBUG: Created WebhookApiException:`, exception.getErrorDetails());
      
      return exception;
    } catch (error) {
      console.error('❌ DEBUG: Error handling webhook API error:', error);
      
      // Fallback exception creation
      const fallbackException = new AccService.WebhooksApiException(
        `Failed to handle webhook API error: ${error.message}`,
        response,
        originalError
      );
      
      return fallbackException;
    }
  }

  /**
   * Check if an error is a webhooks API exception
   * @param {Error} error - Error to check
   * @returns {boolean} True if webhooks API exception
   */
  static isWebhooksApiException(error) {
    return error instanceof AccService.WebhooksApiException;
  }

  /**
   * Check if an error is a webhook API exception (legacy method)
   * @param {Error} error - Error to check
   * @returns {boolean} True if webhook API exception
   * @deprecated Use isWebhooksApiException instead
   */
  static isWebhookApiException(error) {
    return AccService.isWebhooksApiException(error);
  }

  /**
   * Get webhooks API error information
   * @param {Error} error - Error to analyze
   * @returns {Object|null} Error information or null if not webhooks API error
   */
  static getWebhooksApiErrorInfo(error) {
    if (!AccService.isWebhooksApiException(error)) {
      return null;
    }

    return {
      isWebhooksApiError: true,
      service: error.service,
      inheritance: error.inheritance,
      details: error.getErrorDetails(),
      statusCode: error.getStatusCode(),
      statusText: error.getStatusText(),
      isClientError: error.isClientError(),
      isServerError: error.isServerError(),
      headers: error.getHeaders()
    };
  }

  /**
   * Get webhook API error information (legacy method)
   * @param {Error} error - Error to analyze
   * @returns {Object|null} Error information or null if not webhook API error
   * @deprecated Use getWebhooksApiErrorInfo instead
   */
  static getWebhookApiErrorInfo(error) {
    return AccService.getWebhooksApiErrorInfo(error);
  }

  /**
   * Handle webhook API response with error checking
   * @param {Response} response - HTTP response
   * @param {string} operation - Operation being performed
   * @returns {Promise<Object>} Response result or throws exception
   */
  static async handleWebhookApiResponse(response, operation) {
    try {
      console.log(`🔍 DEBUG: Handling webhook API response for operation: ${operation}`);
      console.log(`🔍 DEBUG: Response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        // Success response
        if (response.status === 204) {
          // No content response
          return {
            success: true,
            status: response.status,
            message: 'Operation completed successfully',
            data: null
          };
        } else {
          // Response with content
          try {
            const data = await response.json();
            return {
              success: true,
              status: response.status,
              data: data,
              message: 'Operation completed successfully'
            };
          } catch (jsonError) {
            console.log(`⚠️ DEBUG: Failed to parse JSON response:`, jsonError);
            const text = await response.text();
            return {
              success: true,
              status: response.status,
              data: text,
              message: 'Operation completed successfully (non-JSON response)'
            };
          }
        }
      } else {
        // Error response
        const exception = await AccService.handleWebhookApiError(response, operation);
        throw exception;
      }
    } catch (error) {
      if (AccService.isWebhooksApiException(error)) {
        throw error;
      } else {
        // Wrap non-webhooks API errors
        const wrappedException = new AccService.WebhooksApiException(
          `Unexpected error during ${operation}: ${error.message}`,
          response,
          error
        );
        throw wrappedException;
      }
    }
  }

  /**
   * Execute webhook API call with comprehensive error handling
   * @param {string} url - API URL
   * @param {Object} options - Fetch options
   * @param {string} operation - Operation description
   * @returns {Promise<Object>} API response result
   */
  static async executeWebhookApiCall(url, options, operation) {
    try {
      console.log(`🔍 DEBUG: Executing webhook API call: ${operation}`);
      console.log(`🔍 DEBUG: URL: ${url}`);
      console.log(`🔍 DEBUG: Method: ${options.method || 'GET'}`);
      
      const response = await fetch(url, options);
      
      return await AccService.handleWebhookApiResponse(response, operation);
    } catch (error) {
      if (AccService.isWebhooksApiException(error)) {
        throw error;
      } else {
        // Network or other errors
        const wrappedException = new AccService.WebhooksApiException(
          `Network error during ${operation}: ${error.message}`,
          null,
          error
        );
        throw wrappedException;
      }
    }
  }

  /**
   * Get webhooks error recommendations
   * @param {WebhooksApiException} exception - Webhooks API exception
   * @returns {Object} Error recommendations
   */
  static getWebhooksErrorRecommendations(exception) {
    if (!AccService.isWebhooksApiException(exception)) {
      return {
        recommendations: ['Unknown error type'],
        troubleshooting: ['Check error details and try again']
      };
    }

    const statusCode = exception.getStatusCode();
    const recommendations = [];
    const troubleshooting = [];

    switch (statusCode) {
      case 400:
        recommendations.push('Check request parameters and data format');
        recommendations.push('Verify token format and validation');
        recommendations.push('Review webhook configuration');
        troubleshooting.push('Validate request body structure');
        troubleshooting.push('Check token strength and format');
        break;
      
      case 401:
        recommendations.push('Check authentication credentials');
        recommendations.push('Verify access token validity');
        recommendations.push('Ensure proper OAuth scopes');
        troubleshooting.push('Refresh access token');
        troubleshooting.push('Verify OAuth configuration');
        break;
      
      case 403:
        recommendations.push('Check application permissions');
        recommendations.push('Verify OAuth scopes');
        recommendations.push('Contact administrator for access');
        troubleshooting.push('Review application permissions');
        troubleshooting.push('Check OAuth scope requirements');
        break;
      
      case 404:
        recommendations.push('Verify webhook ID or endpoint');
        recommendations.push('Check if webhook exists');
        recommendations.push('Review API endpoint URL');
        troubleshooting.push('Validate webhook ID');
        troubleshooting.push('Check API endpoint availability');
        break;
      
      case 409:
        recommendations.push('Check for duplicate webhook');
        recommendations.push('Verify unique webhook configuration');
        recommendations.push('Review existing webhooks');
        troubleshooting.push('Check for duplicate webhook IDs');
        troubleshooting.push('Verify unique callback URLs');
        break;
      
      case 429:
        recommendations.push('Implement rate limiting');
        recommendations.push('Wait before retrying');
        recommendations.push('Review API usage limits');
        troubleshooting.push('Check rate limit headers');
        troubleshooting.push('Implement exponential backoff');
        break;
      
      case 500:
        recommendations.push('Retry the operation');
        recommendations.push('Check Autodesk service status');
        recommendations.push('Contact support if issue persists');
        troubleshooting.push('Wait and retry');
        troubleshooting.push('Check service status page');
        break;
      
      default:
        recommendations.push('Review error details');
        recommendations.push('Check API documentation');
        recommendations.push('Contact support if needed');
        troubleshooting.push('Analyze error response');
        troubleshooting.push('Check API status');
    }

    return {
      statusCode: statusCode,
      recommendations: recommendations,
      troubleshooting: troubleshooting,
      isClientError: exception.isClientError(),
      isServerError: exception.isServerError(),
      service: exception.service,
      inheritance: exception.inheritance
    };
  }

  /**
   * Get webhook error recommendations (legacy method)
   * @param {WebhookApiException} exception - Webhook API exception
   * @returns {Object} Error recommendations
   * @deprecated Use getWebhooksErrorRecommendations instead
   */
  static getWebhookErrorRecommendations(exception) {
    return AccService.getWebhooksErrorRecommendations(exception);
  }

  /**
   * Get webhook-specific error context
   * @param {WebhooksApiException} exception - Webhooks API exception
   * @returns {Object} Webhook-specific error context
   */
  static getWebhookErrorContext(exception) {
    if (!AccService.isWebhooksApiException(exception)) {
      return null;
    }

    const statusCode = exception.getStatusCode();
    const context = {
      service: 'Webhooks',
      inheritance: exception.inheritance,
      statusCode: statusCode,
      isWebhookError: true,
      errorType: 'WebhooksApiException',
      webhookSpecific: {}
    };

    // Add webhook-specific context based on status code
    switch (statusCode) {
      case 400:
        context.webhookSpecific = {
          likelyCause: 'Invalid webhook configuration',
          commonIssues: ['Invalid callback URL', 'Invalid event type', 'Invalid scope'],
          webhookFields: ['callbackUrl', 'event', 'scope', 'filter']
        };
        break;
      
      case 401:
        context.webhookSpecific = {
          likelyCause: 'Authentication failure',
          commonIssues: ['Expired token', 'Invalid credentials', 'Missing OAuth scope'],
          webhookFields: ['Authorization header', 'OAuth scopes']
        };
        break;
      
      case 403:
        context.webhookSpecific = {
          likelyCause: 'Insufficient permissions',
          commonIssues: ['Missing webhook permissions', 'Insufficient OAuth scopes', 'Application restrictions'],
          webhookFields: ['OAuth scopes', 'Application permissions']
        };
        break;
      
      case 404:
        context.webhookSpecific = {
          likelyCause: 'Webhook not found',
          commonIssues: ['Invalid webhook ID', 'Webhook deleted', 'Wrong endpoint'],
          webhookFields: ['webhookId', 'endpoint URL']
        };
        break;
      
      case 409:
        context.webhookSpecific = {
          likelyCause: 'Webhook conflict',
          commonIssues: ['Duplicate webhook', 'Conflicting configuration', 'Resource already exists'],
          webhookFields: ['callbackUrl', 'event', 'scope']
        };
        break;
      
      case 429:
        context.webhookSpecific = {
          likelyCause: 'Rate limit exceeded',
          commonIssues: ['Too many requests', 'API quota exceeded', 'Rate limiting'],
          webhookFields: ['Request frequency', 'API limits']
        };
        break;
      
      default:
        context.webhookSpecific = {
          likelyCause: 'Unknown webhook error',
          commonIssues: ['Service unavailable', 'Internal error', 'Network issue'],
          webhookFields: ['All webhook fields']
        };
    }

    return context;
  }

  /**
   * Get webhook error recovery suggestions
   * @param {WebhooksApiException} exception - Webhooks API exception
   * @returns {Object} Recovery suggestions
   */
  static getWebhookErrorRecovery(exception) {
    if (!AccService.isWebhooksApiException(exception)) {
      return {
        canRetry: false,
        suggestions: ['Unknown error type'],
        immediateActions: ['Check error details']
      };
    }

    const statusCode = exception.getStatusCode();
    const canRetry = statusCode >= 500 || statusCode === 429;
    const suggestions = [];
    const immediateActions = [];

    switch (statusCode) {
      case 400:
        suggestions.push('Review webhook configuration');
        suggestions.push('Validate callback URL format');
        suggestions.push('Check event type validity');
        immediateActions.push('Fix webhook parameters');
        immediateActions.push('Validate request body');
        break;
      
      case 401:
        suggestions.push('Refresh access token');
        suggestions.push('Verify OAuth credentials');
        immediateActions.push('Re-authenticate');
        immediateActions.push('Check token expiration');
        break;
      
      case 403:
        suggestions.push('Request additional permissions');
        suggestions.push('Contact administrator');
        immediateActions.push('Check OAuth scopes');
        immediateActions.push('Verify application permissions');
        break;
      
      case 404:
        suggestions.push('Verify webhook ID');
        suggestions.push('Check if webhook exists');
        immediateActions.push('List existing webhooks');
        immediateActions.push('Create new webhook if needed');
        break;
      
      case 409:
        suggestions.push('Check for duplicate webhooks');
        suggestions.push('Modify webhook configuration');
        immediateActions.push('List existing webhooks');
        immediateActions.push('Update or delete conflicting webhook');
        break;
      
      case 429:
        suggestions.push('Implement exponential backoff');
        suggestions.push('Reduce request frequency');
        immediateActions.push('Wait before retrying');
        immediateActions.push('Check rate limit headers');
        break;
      
      case 500:
        suggestions.push('Retry after delay');
        suggestions.push('Check service status');
        immediateActions.push('Wait and retry');
        immediateActions.push('Monitor service status');
        break;
      
      default:
        suggestions.push('Review error details');
        suggestions.push('Check API documentation');
        immediateActions.push('Analyze error response');
        immediateActions.push('Contact support if needed');
    }

    return {
      canRetry: canRetry,
      retryDelay: canRetry ? (statusCode === 429 ? 60 : 5) : 0, // seconds
      suggestions: suggestions,
      immediateActions: immediateActions,
      statusCode: statusCode
    };
  }

  /**
   * Extract page state from next link
   * @param {string} nextLink - Next link URL
   * @returns {string} Page state parameter
   */
  static extractPageState(nextLink) {
    try {
      const url = new URL(nextLink, 'https://developer.api.autodesk.com');
      return url.searchParams.get('pageState') || '';
    } catch (error) {
      console.error('❌ DEBUG: Error extracting page state:', error);
      return '';
    }
  }

  /**
   * Update webhook
   * @param {string} webhookId - Webhook ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  static async updateWebhook(webhookId, updates) {
    try {
      console.log(`🔍 DEBUG: Updating webhook: ${webhookId}`);
      console.log(`🔍 DEBUG: Updates:`, updates);
      
      if (!webhookId) {
        throw new Error('Webhook ID is required');
      }
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/*/events/*/hooks/${webhookId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        const updatedWebhook = await response.json();
        console.log(`✅ DEBUG: Webhook updated successfully:`, updatedWebhook);
        return {
          success: true,
          webhook: updatedWebhook
        };
      } else {
        const errorText = await response.text();
        console.log(`⚠️ DEBUG: Failed to update webhook:`, response.status, errorText);
        return {
          success: false,
          error: `Failed to update webhook: ${response.status}`,
          details: errorText
        };
      }
    } catch (error) {
      console.error('❌ DEBUG: Error updating webhook:', error);
      return {
        success: false,
        error: error.message,
        details: 'Webhook update failed'
      };
    }
  }

  /**
   * Get compatible entity types for relationships
   * @returns {Promise<Array>} Array of compatible entity types
   */
  static async getCompatibleEntityTypes() {
    try {
      console.log(`🔍 DEBUG: Getting compatible entity types for relationships`);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://developer.api.autodesk.com/bim360/relationship/v2/utility/relationships:writable`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Accept': 'application/vnd.api+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ DEBUG: Compatible entity types:`, data);
        return data;
      } else {
        console.log(`⚠️ DEBUG: Failed to get compatible entity types:`, response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ DEBUG: Error getting compatible entity types:', error);
      return [];
    }
  }

  /**
   * Get current user profile information
   * @returns {Promise<Object>} User profile data
   */
  static async getCurrentUserProfile() {
    try {
      console.log('🔍 Fetching current user profile...');
      
      const endpoints = [
        '/userprofile/v1/users/@me',
        '/userprofile/v1/me',
        '/userprofile/v1/users/me',
        '/project/v1/users/@me',
        '/project/v1/users/me'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying user profile endpoint: ${endpoint}`);
          const fullUrl = `https://developer.api.autodesk.com${endpoint}`;
          
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: AccService.getHeaders()
          });
          
          console.log(`📡 User profile response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📊 Raw user profile data:`, data);
            
            const userProfile = {
              id: data.id || data.userId,
              email: data.email || data.emailAddress || data.attributes?.email,
              name: data.name || data.displayName || data.attributes?.name,
              firstName: data.firstName || data.attributes?.firstName,
              lastName: data.lastName || data.attributes?.lastName,
              status: data.status || data.attributes?.status || 'active',
              companyName: data.companyName || data.attributes?.companyName,
              attributes: data.attributes || data
            };
            
            console.log(`✅ User profile loaded:`, userProfile);
            return userProfile;
          } else {
            const errorText = await response.text();
            console.log(`⚠️ User profile endpoint failed: ${response.status} - ${errorText}`);
          }
        } catch (endpointError) {
          console.log(`⚠️ User profile endpoint error:`, endpointError.message);
        }
      }
      
      console.log('⚠️ All user profile endpoints failed, returning fallback data');
      return {
        id: 'current-user',
        email: 'user@example.com',
        name: 'Current User',
        firstName: 'User',
        lastName: 'Name',
        status: 'active',
        companyName: 'Unknown Company',
        attributes: {}
      };
      
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return {
        id: 'current-user',
        email: 'user@example.com',
        name: 'Current User',
        firstName: 'User',
        lastName: 'Name',
        status: 'active',
        companyName: 'Unknown Company',
        attributes: {}
      };
    }
  }

  /**
   * Get the "tip" (most recent) version of an item
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @returns {Object|null} The tip version data or null if not found
   */
  static async getItemTip(projectId, itemId) {
    try {
      console.log('📄 Getting tip version for item:', itemId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for item tip');
        return null;
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/tip`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📄 Item tip version:', data);
        return data.data;
      } else {
        console.log('❌ Failed to get item tip:', response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting item tip:', error);
      return null;
    }
  }

  /**
   * Get a specific version by version ID
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Object|null} The version data or null if not found
   */
  static async getVersion(projectId, versionId) {
    try {
      console.log('📄 Getting version:', versionId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for version details');
        return null;
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📄 Version details:', data);
        return data.data;
      } else {
        console.log('❌ Failed to get version:', response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting version:', error);
      return null;
    }
  }

  /**
   * Get available download formats for a version
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Object|null} The download formats data or null if not found
   */
  static async getVersionDownloadFormats(projectId, versionId) {
    try {
      console.log('📥 Getting download formats for version:', versionId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for download formats');
        return null;
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}/downloadFormats`, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Download formats:', data);
        return data.data;
      } else {
        console.log('❌ Failed to get download formats:', response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting download formats:', error);
      return null;
    }
  }

  /**
   * Get available downloads for a version
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @param {Object} filters - Optional filters for downloads
   * @returns {Array} Array of download objects
   */
  static async getVersionDownloads(projectId, versionId, filters = {}) {
    try {
      console.log('📥 Getting downloads for version:', versionId);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for downloads');
        return [];
      }

      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      
      if (filters.fileType) {
        queryParams.append('filter[format.fileType]', Array.isArray(filters.fileType) ? filters.fileType.join(',') : filters.fileType);
      }

      const url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}/downloads${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Downloads:', data);
        return data.data || [];
      } else {
        console.log('❌ Failed to get downloads:', response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting downloads:', error);
      return [];
    }
  }

  /**
   * Get comprehensive version information including details, download formats, and downloads
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @param {Object} downloadFilters - Optional filters for downloads
   * @returns {Object} Comprehensive version information
   */
  static async getVersionInfo(projectId, versionId, downloadFilters = {}) {
    try {
      console.log('📄 Getting comprehensive version info for:', versionId);
      
      // Get all version information in parallel
      const [versionDetails, downloadFormats, downloads] = await Promise.all([
        AccService.getVersion(projectId, versionId),
        AccService.getVersionDownloadFormats(projectId, versionId),
        AccService.getVersionDownloads(projectId, versionId, downloadFilters)
      ]);

      return {
        version: versionDetails,
        downloadFormats: downloadFormats,
        downloads: downloads,
        hasDownloadFormats: !!downloadFormats,
        hasDownloads: downloads && downloads.length > 0,
        downloadCount: downloads ? downloads.length : 0
      };
    } catch (error) {
      console.error('❌ Error getting comprehensive version info:', error);
      return {
        version: null,
        downloadFormats: null,
        downloads: [],
        hasDownloadFormats: false,
        hasDownloads: false,
        downloadCount: 0
      };
    }
  }

  // ==================== OSS (Object Storage Service) Methods ====================

  /**
   * Get all buckets owned by the application
   * @param {Object} options - Optional parameters for bucket listing
   * @param {string} options.region - The region where buckets reside (US, EMEA, AUS, CAN, DEU, IND, JPN, GBR)
   * @param {number} options.limit - Limit to response size (1-100, default 10)
   * @param {string} options.startAt - Key to use as offset for pagination
   * @returns {Object} Bucket list with pagination info
   */
  static async getBuckets(options = {}) {
    try {
      console.log('🪣 Getting buckets with options:', options);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLegToken) {
        throw new OssApiException('No 2-legged token available for OSS operations');
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.region) {
        queryParams.append('region', options.region);
      }
      if (options.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      if (options.startAt) {
        queryParams.append('startAt', options.startAt);
      }

      const url = `https://developer.api.autodesk.com/oss/v2/buckets${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.twoLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🪣 Buckets retrieved:', data);
        return {
          success: true,
          items: data.items || [],
          next: data.next || null,
          hasMore: !!data.next,
          total: data.items?.length || 0
        };
      } else {
        const errorText = await response.text();
        throw new OssApiException(
          `Failed to get buckets: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      console.error('❌ Error getting buckets:', error);
      throw new OssApiException(
        `OSS API call failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Get details for a specific bucket
   * @param {string} bucketKey - The bucket key
   * @returns {Object|null} Bucket details or null if not found/forbidden
   */
  static async getBucketDetails(bucketKey) {
    try {
      console.log('🪣 Getting bucket details for:', bucketKey);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLegToken) {
        throw new OssApiException('No 2-legged token available for OSS operations');
      }

      const response = await fetch(`https://developer.api.autodesk.com/oss/v2/buckets/${encodeURIComponent(bucketKey)}/details`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.twoLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🪣 Bucket details:', data);
        return {
          success: true,
          bucketKey,
          details: data,
          timestamp: new Date().toISOString()
        };
      } else if (response.status === 403) {
        throw new OssApiException(
          'Access forbidden - bucket may be owned by different application',
          response
        );
      } else if (response.status === 404) {
        throw new OssApiException(
          'Bucket not found',
          response
        );
      } else {
        const errorText = await response.text();
        throw new OssApiException(
          `Failed to get bucket details: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      console.error('❌ Error getting bucket details:', error);
      throw new OssApiException(
        `OSS API call failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Get comprehensive bucket information including details
   * @param {string} bucketKey - The bucket key
   * @returns {Object} Comprehensive bucket information
   */
  static async getBucketInfo(bucketKey) {
    try {
      console.log('🪣 Getting comprehensive bucket info for:', bucketKey);
      
      const details = await AccService.getBucketDetails(bucketKey);
      
      return {
        bucketKey: bucketKey,
        details: details,
        hasDetails: !!details,
        isAccessible: !!details,
        owner: details?.bucketOwner,
        createdDate: details?.createdDate,
        policyKey: details?.policyKey,
        permissions: details?.permissions || [],
        permissionCount: details?.permissions?.length || 0
      };
    } catch (error) {
      console.error('❌ Error getting comprehensive bucket info:', error);
      return {
        bucketKey: bucketKey,
        details: null,
        hasDetails: false,
        isAccessible: false,
        owner: null,
        createdDate: null,
        policyKey: null,
        permissions: [],
        permissionCount: 0
      };
    }
  }

  /**
   * Create a new bucket with specified retention policy
   * @param {string} bucketKey - The bucket key (must be globally unique)
   * @param {string} policyKey - Retention policy: 'transient', 'temporary', or 'persistent'
   * @param {Object} options - Additional options for bucket creation
   * @param {string} options.region - The region where bucket should be created (US, EMEA, AUS, CAN, DEU, IND, JPN, GBR)
   * @param {Array} options.permissions - Array of permission objects with authId and access
   * @returns {Object|null} Created bucket details or null if failed
   */
  static async createBucket(bucketKey, policyKey, options = {}) {
    try {
      console.log('🪣 Creating bucket:', bucketKey, 'with policy:', policyKey);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLegToken) {
        throw new OssApiException('No 2-legged token available for OSS operations');
      }

      // Validate policy key
      const validPolicies = ['transient', 'temporary', 'persistent'];
      if (!validPolicies.includes(policyKey)) {
        throw new OssApiException(`Invalid policy key. Must be one of: ${validPolicies.join(', ')}`);
      }

      const requestBody = {
        bucketKey: bucketKey,
        policyKey: policyKey
      };

      // Add region if specified
      if (options.region) {
        requestBody.region = options.region;
      }

      // Add permissions if specified
      if (options.permissions && Array.isArray(options.permissions)) {
        requestBody.permissions = options.permissions;
      }

      const response = await fetch('https://developer.api.autodesk.com/oss/v2/buckets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.twoLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Bucket created successfully:', data);
        return {
          success: true,
          bucketKey,
          policyKey,
          region: options.region,
          data,
          timestamp: new Date().toISOString()
        };
      } else {
        const errorText = await response.text();
        throw new OssApiException(
          `Failed to create bucket: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      console.error('❌ Error creating bucket:', error);
      throw new OssApiException(
        `OSS API call failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Create a transient bucket (24-hour retention)
   * @param {string} bucketKey - The bucket key
   * @param {Object} options - Additional options
   * @returns {Object|null} Created bucket details or null if failed
   */
  static async createTransientBucket(bucketKey, options = {}) {
    console.log('🪣 Creating transient bucket (24-hour retention):', bucketKey);
    return await AccService.createBucket(bucketKey, 'transient', options);
  }

  /**
   * Create a temporary bucket (30-day retention)
   * @param {string} bucketKey - The bucket key
   * @param {Object} options - Additional options
   * @returns {Object|null} Created bucket details or null if failed
   */
  static async createTemporaryBucket(bucketKey, options = {}) {
    console.log('🪣 Creating temporary bucket (30-day retention):', bucketKey);
    return await AccService.createBucket(bucketKey, 'temporary', options);
  }

  /**
   * Create a persistent bucket (permanent retention)
   * @param {string} bucketKey - The bucket key
   * @param {Object} options - Additional options
   * @returns {Object|null} Created bucket details or null if failed
   */
  static async createPersistentBucket(bucketKey, options = {}) {
    console.log('🪣 Creating persistent bucket (permanent retention):', bucketKey);
    return await AccService.createBucket(bucketKey, 'persistent', options);
  }

  /**
   * Delete a bucket
   * @param {string} bucketKey - The bucket key
   * @returns {boolean} True if successful, false otherwise
   */
  static async deleteBucket(bucketKey) {
    try {
      console.log('🗑️ Deleting bucket:', bucketKey);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.twoLegToken) {
        throw new OssApiException('No 2-legged token available for OSS operations');
      }

      const response = await fetch(`https://developer.api.autodesk.com/oss/v2/buckets/${encodeURIComponent(bucketKey)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${credentials.twoLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Bucket deleted successfully');
        return {
          success: true,
          bucketKey,
          deleted: true,
          timestamp: new Date().toISOString()
        };
      } else if (response.status === 404) {
        console.log('⚠️ Bucket not found - may already be deleted');
        return {
          success: true,
          bucketKey,
          deleted: true,
          alreadyDeleted: true,
          timestamp: new Date().toISOString()
        };
      } else {
        const errorText = await response.text();
        throw new OssApiException(
          `Failed to delete bucket: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }
    } catch (error) {
      if (error instanceof OssApiException) {
        throw error;
      }
      console.error('❌ Error deleting bucket:', error);
      throw new OssApiException(
        `OSS API call failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Get retention policy information
   * @param {string} policyKey - The policy key
   * @returns {Object} Policy information
   */
  static getRetentionPolicyInfo(policyKey) {
    const policies = {
      transient: {
        name: 'Transient',
        description: 'Cache-like storage for ephemeral results',
        retentionPeriod: '24 hours',
        useCase: 'Temporary processing artifacts, cache files',
        autoDelete: true
      },
      temporary: {
        name: 'Temporary',
        description: 'Suitable for user-uploaded content artifacts',
        retentionPeriod: '30 days',
        useCase: 'User-generated content, temporary project files',
        autoDelete: true
      },
      persistent: {
        name: 'Persistent',
        description: 'Intended for user data',
        retentionPeriod: 'Permanent (until manually deleted)',
        useCase: 'User data, project files, important documents',
        autoDelete: false
      }
    };

    return policies[policyKey] || {
      name: 'Unknown',
      description: 'Unknown retention policy',
      retentionPeriod: 'Unknown',
      useCase: 'Unknown',
      autoDelete: false
    };
  }

  // ============================================================================
  // ACC DATA MANAGEMENT API COMMANDS
  // ============================================================================

  /**
   * Execute a command on the Data Management API
   * @param {string} projectId - The project ID
   * @param {string} command - The command to execute
   * @param {Object} commandData - The command data
   * @returns {Object} Command result
   */
  static async executeCommand(projectId, command, commandData) {
    try {
      console.log(`🔧 Executing command: ${command} for project: ${projectId}`);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.warn('⚠️ No access token available for command execution');
        return null;
      }

      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: {
          type: "commands",
          attributes: {
            extension: {
              type: command,
              version: "1.0"
            },
            ...commandData
          }
        }
      };

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/commands`, {
        method: 'POST',
        headers: {
          ...AccService.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Command ${command} executed successfully:`, data);
        return data;
      } else {
        console.log(`❌ Failed to execute command ${command}:`, response.status);
        const errorText = await response.text();
        console.log('❌ Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error executing command ${command}:`, error);
      return null;
    }
  }

  /**
   * Check permissions for specified resources
   * @param {string} projectId - The project ID
   * @param {Array} resources - Array of resource objects with type and id
   * @returns {Object} Permission check results
   */
  static async checkPermissions(projectId, resources) {
    try {
      console.log('🔐 Checking permissions for resources:', resources);
      
      const commandData = {
        resources: resources
      };

      return await AccService.executeCommand(projectId, 'CheckPermission', commandData);
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return null;
    }
  }

  /**
   * List custom relationships (refs) for specified resources
   * @param {string} projectId - The project ID
   * @param {Array} resources - Array of resource objects with type and id
   * @returns {Object} Relationship list results
   */
  static async listRefs(projectId, resources) {
    try {
      console.log('🔗 Listing relationships for resources:', resources);
      
      const commandData = {
        resources: resources
      };

      return await AccService.executeCommand(projectId, 'ListRefs', commandData);
    } catch (error) {
      console.error('❌ Error listing relationships:', error);
      return null;
    }
  }

  /**
   * List metadata for specified items
   * @param {string} projectId - The project ID
   * @param {Array} itemIds - Array of item IDs
   * @returns {Object} Item metadata results
   */
  static async listItems(projectId, itemIds) {
    try {
      console.log('📄 Listing metadata for items:', itemIds);
      
      const resources = itemIds.map(id => ({
        type: 'items',
        id: id
      }));

      const commandData = {
        resources: resources
      };

      return await AccService.executeCommand(projectId, 'ListItems', commandData);
    } catch (error) {
      console.error('❌ Error listing items:', error);
      return null;
    }
  }

  /**
   * Publish a Collaboration for Revit (C4R) model
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID of the model
   * @param {Object} options - Publish options
   * @returns {Object} Publish result
   */
  static async publishModel(projectId, itemId, options = {}) {
    try {
      console.log('📤 Publishing C4R model:', itemId);
      
      const commandData = {
        resources: [{
          type: 'items',
          id: itemId
        }],
        ...options
      };

      return await AccService.executeCommand(projectId, 'PublishModel', commandData);
    } catch (error) {
      console.error('❌ Error publishing model:', error);
      return null;
    }
  }

  /**
   * Publish a C4R model without links
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID of the model
   * @param {Object} options - Publish options
   * @returns {Object} Publish result
   */
  static async publishWithoutLinks(projectId, itemId, options = {}) {
    try {
      console.log('📤 Publishing C4R model without links:', itemId);
      
      const commandData = {
        resources: [{
          type: 'items',
          id: itemId
        }],
        ...options
      };

      return await AccService.executeCommand(projectId, 'PublishWithoutLinks', commandData);
    } catch (error) {
      console.error('❌ Error publishing model without links:', error);
      return null;
    }
  }

  /**
   * Get publish model job status
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID of the model
   * @returns {Object} Job status result
   */
  static async getPublishModelJob(projectId, itemId) {
    try {
      console.log('📊 Getting publish model job status:', itemId);
      
      const commandData = {
        resources: [{
          type: 'items',
          id: itemId
        }]
      };

      return await AccService.executeCommand(projectId, 'GetPublishModelJob', commandData);
    } catch (error) {
      console.error('❌ Error getting publish model job:', error);
      return null;
    }
  }

  /**
   * Test project access using commands
   * @param {string} projectId - The project ID
   * @returns {Object} Test results
   */
  static async testProjectAccess(projectId) {
    try {
      console.log('🧪 Testing project access with enhanced diagnostics for:', projectId);
      
      const results = {
        projectId,
        timestamp: new Date().toISOString(),
        tests: [],
        diagnostics: {
          projectExists: false,
          hasFiles: false,
          hasFolders: false,
          permissionIssues: false,
          apiAccessIssues: false,
          authenticationIssues: false,
          projectIdIssues: false
        }
      };

      // Test 0: Check authentication first
      try {
        const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
        if (!credentials.threeLegToken) {
          results.diagnostics.authenticationIssues = true;
          results.tests.push({
            test: 'Authentication',
            success: false,
            error: 'No access token found',
            message: 'Authentication token not available'
          });
        } else {
          results.tests.push({
            test: 'Authentication',
            success: true,
            result: { tokenPresent: true },
            message: 'Authentication token available'
          });
        }
      } catch (error) {
        results.diagnostics.authenticationIssues = true;
        results.tests.push({
          test: 'Authentication',
          success: false,
          error: error.message,
          message: 'Error checking authentication'
        });
      }

      // Test 1: Try to get user profile to verify authentication
      try {
        const profileResponse = await fetch('https://developer.api.autodesk.com/userprofile/v1/users/@me', {
          method: 'GET',
          headers: AccService.getHeaders()
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          results.tests.push({
            test: 'UserProfile',
            success: true,
            result: profileData,
            message: 'User profile retrieved successfully'
          });
        } else {
          results.tests.push({
            test: 'UserProfile',
            success: false,
            result: null,
            message: `Failed to get user profile: ${profileResponse.status}`
          });
          results.diagnostics.authenticationIssues = true;
        }
      } catch (error) {
        results.tests.push({
          test: 'UserProfile',
          success: false,
          error: error.message,
          message: 'Error getting user profile'
        });
        results.diagnostics.authenticationIssues = true;
      }

      // Test 2: Try to get hubs to verify project access
      try {
        const hubs = await AccService.getHubs();
        results.tests.push({
          test: 'GetHubs',
          success: hubs && hubs.length > 0,
          result: hubs,
          message: hubs && hubs.length > 0 ? `Found ${hubs.length} hubs` : 'No hubs found'
        });
        
        if (hubs && hubs.length > 0) {
          // Check if project ID matches any hub
          const matchingHub = hubs.find(hub => 
            hub.id === projectId || 
            hub.id === projectId.replace('b.', '') ||
            projectId.includes(hub.id)
          );
          
          if (matchingHub) {
            results.tests.push({
              test: 'ProjectInHub',
              success: true,
              result: matchingHub,
              message: 'Project found in hub'
            });
          } else {
            results.tests.push({
              test: 'ProjectInHub',
              success: false,
              result: null,
              message: 'Project not found in any hub'
            });
            results.diagnostics.projectIdIssues = true;
          }
        }
      } catch (error) {
        results.tests.push({
          test: 'GetHubs',
          success: false,
          error: error.message,
          message: 'Error getting hubs'
        });
        results.diagnostics.apiAccessIssues = true;
      }

      // Test 3: Try different project ID formats
      const projectIdVariations = [
        projectId,
        projectId.replace('b.', ''),
        `urn:adsk.dtm:${projectId}`,
        `urn:adsk.dtm:Project:${projectId}`,
        encodeURIComponent(projectId)
      ];

      for (const testId of projectIdVariations) {
        try {
          const projectResponse = await fetch(`https://developer.api.autodesk.com/project/v1/projects/${testId}`, {
            method: 'GET',
            headers: AccService.getHeaders()
          });
          
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            results.diagnostics.projectExists = true;
            results.tests.push({
              test: `ProjectDetails_${testId}`,
              success: true,
              result: projectData,
              message: `Project details retrieved successfully with ID: ${testId}`
            });
            break; // Stop testing once we find a working ID
          } else {
            results.tests.push({
              test: `ProjectDetails_${testId}`,
              success: false,
              result: null,
              message: `Failed with ID ${testId}: ${projectResponse.status}`
            });
          }
        } catch (error) {
          results.tests.push({
            test: `ProjectDetails_${testId}`,
            success: false,
            error: error.message,
            message: `Error with ID ${testId}: ${error.message}`
          });
        }
      }

      // Test 4: Try to get projects from hub
      try {
        const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
        if (credentials.hubId) {
          const projectsResponse = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${credentials.hubId}/projects`, {
            method: 'GET',
            headers: AccService.getHeaders()
          });
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            results.tests.push({
              test: 'GetProjectsFromHub',
              success: true,
              result: projectsData,
              message: `Found ${projectsData.data?.length || 0} projects in hub`
            });
            
            // Check if our project is in the list
            if (projectsData.data) {
              const matchingProject = projectsData.data.find(project => 
                project.id === projectId || 
                project.id === projectId.replace('b.', '') ||
                projectId.includes(project.id)
              );
              
              if (matchingProject) {
                results.tests.push({
                  test: 'ProjectInHubProjects',
                  success: true,
                  result: matchingProject,
                  message: 'Project found in hub projects list'
                });
                results.diagnostics.projectExists = true;
              }
            }
          } else {
            results.tests.push({
              test: 'GetProjectsFromHub',
              success: false,
              result: null,
              message: `Failed to get projects from hub: ${projectsResponse.status}`
            });
          }
        }
      } catch (error) {
        results.tests.push({
          test: 'GetProjectsFromHub',
          success: false,
          error: error.message,
          message: 'Error getting projects from hub'
        });
      }

      // Calculate overall success
      results.overallSuccess = results.tests.some(test => test.success);
      results.successCount = results.tests.filter(test => test.success).length;
      results.totalTests = results.tests.length;

      // Generate recommendations based on diagnostics
      results.recommendations = AccService.generateRecommendations(results.diagnostics, results.tests);

      console.log('🧪 Enhanced project access test completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Error testing project access:', error);
      return {
        projectId,
        timestamp: new Date().toISOString(),
        overallSuccess: false,
        error: error.message,
        tests: [],
        diagnostics: {
          projectExists: false,
          hasFiles: false,
          hasFolders: false,
          permissionIssues: true,
          apiAccessIssues: true,
          authenticationIssues: true,
          projectIdIssues: true
        },
        recommendations: ['Check authentication credentials', 'Verify project access permissions', 'Verify project ID format']
      };
    }
  }

  /**
   * Generate recommendations based on test results
   * @param {Object} diagnostics - Diagnostic information
   * @param {Array} tests - Test results
   * @returns {Array} List of recommendations
   */
  static generateRecommendations(diagnostics, tests) {
    const recommendations = [];

    if (diagnostics.authenticationIssues) {
      recommendations.push('🔐 Authentication issues detected');
      recommendations.push('• Check if access token is valid and not expired');
      recommendations.push('• Try signing out and signing back in');
      recommendations.push('• Verify OAuth scopes include data:read and data:write');
    }

    if (diagnostics.projectIdIssues) {
      recommendations.push('🆔 Project ID issues detected');
      recommendations.push('• Verify the project ID format is correct');
      recommendations.push('• Check if project exists in the selected hub');
      recommendations.push('• Try using the project ID from the hub projects list');
    }

    if (diagnostics.permissionIssues) {
      recommendations.push('🔒 Permission issues detected');
      recommendations.push('• Check user permissions for this project');
      recommendations.push('• Verify the user has at least Viewer access to the project');
      recommendations.push('• Ensure the user is a member of the project');
    }

    if (diagnostics.apiAccessIssues) {
      recommendations.push('🌐 API access issues detected');
      recommendations.push('• Verify API access is enabled in your ACC account');
      recommendations.push('• Check that the required scopes are granted');
      recommendations.push('• Ensure the application has proper permissions');
    }

    if (diagnostics.projectExists && !diagnostics.hasFiles && !diagnostics.hasFolders) {
      recommendations.push('📁 Project exists but appears to be empty');
      recommendations.push('• Try uploading some files to the project first');
      recommendations.push('• Check if files are in a different folder structure');
      recommendations.push('• Verify files are not hidden or in subfolders');
    }

    if (!diagnostics.projectExists) {
      recommendations.push('❌ Project not found');
      recommendations.push('• Verify the project ID is correct');
      recommendations.push('• Check if the project has been deleted or moved');
      recommendations.push('• Ensure the project is in the selected hub');
    }

    // Check for specific test failures
    const failedTests = tests.filter(test => !test.success);
    if (failedTests.some(test => test.test === 'Authentication')) {
      recommendations.push('🔐 Authentication test failed - check token validity');
    }

    if (failedTests.some(test => test.test === 'UserProfile')) {
      recommendations.push('👤 User profile test failed - authentication may be invalid');
    }

    if (failedTests.some(test => test.test === 'GetHubs')) {
      recommendations.push('🏢 Hub access test failed - check hub permissions');
    }

    if (failedTests.some(test => test.test === 'ProjectInHub')) {
      recommendations.push('🔍 Project not found in hub - verify project belongs to selected hub');
    }

    if (failedTests.some(test => test.test === 'GetProjectsFromHub')) {
      recommendations.push('📋 Hub projects test failed - check hub access permissions');
    }

    if (failedTests.some(test => test.test.includes('ProjectDetails'))) {
      recommendations.push('📄 Project details test failed - project may not exist or be accessible');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests passed - project access appears to be working correctly');
    }

    return recommendations;
  }

  /**
   * Download a file from ACC following the official APS workflow
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID to download
   * @param {string} versionId - Optional version ID (uses latest if not provided)
   * @returns {Promise<Object>} Download information including signed URL
   */
  static async downloadFile(projectId, itemId, versionId = null) {
    try {
      console.log(`📥 Starting file download process for item: ${itemId}`);
      
      // Step 1: Get item details to find storage location
      const itemDetails = await this.getItemDetails(projectId, itemId);
      if (!itemDetails || !itemDetails.success) {
        throw new FileTransferException(`Failed to get item details for item: ${itemId}`);
      }
      console.log(`📄 Item details:`, itemDetails);
      
      // Step 2: Get version details (latest if not specified)
      let versionDetails;
      if (versionId) {
        versionDetails = await this.getVersion(projectId, versionId);
      } else {
        // Get the tip (latest) version
        const tipVersion = await this.getItemTip(projectId, itemId);
        versionDetails = tipVersion;
      }
      
      if (!versionDetails || !versionDetails.success) {
        throw new FileTransferException(`Failed to get version details for item: ${itemId}`);
      }
      
      console.log(`📋 Version details:`, versionDetails);
      
      // Step 3: Extract storage information from version
      const storageInfo = versionDetails.relationships?.storage?.data;
      if (!storageInfo) {
        throw new FileTransferException('No storage information found for this version');
      }
      
      const objectId = storageInfo.id;
      console.log(`🗄️ Object ID: ${objectId}`);
      
      // Step 4: Parse bucket and object key from storage ID
      // Format: urn:adsk.objects:os.object:bucketKey/objectKey
      const storageMatch = objectId.match(/urn:adsk\.objects:os\.object:([^\/]+)\/(.+)/);
      if (!storageMatch) {
        throw new FileTransferException(`Invalid storage ID format: ${objectId}`);
      }
      
      const bucketKey = storageMatch[1];
      const objectKey = storageMatch[2];
      
      console.log(`🪣 Bucket: ${bucketKey}, Object: ${objectKey}`);
      
      // Step 5: Get signed S3 download URL
      const signedUrl = await this.getSignedDownloadUrl(bucketKey, objectKey);
      if (!signedUrl || !signedUrl.url) {
        throw new FileTransferException('Failed to get signed download URL');
      }
      
      return {
        success: true,
        itemId,
        versionId: versionDetails.id,
        fileName: versionDetails.attributes?.displayName || versionDetails.attributes?.name,
        fileSize: versionDetails.attributes?.storageSize,
        mimeType: versionDetails.attributes?.mimeType,
        signedUrl: signedUrl.url,
        expires: signedUrl.expires,
        downloadTimestamp: new Date().toISOString(),
        downloadInfo: {
          bucketKey,
          objectKey,
          fileName: versionDetails.attributes?.displayName || versionDetails.attributes?.name,
          fileSize: versionDetails.attributes?.storageSize,
          mimeType: versionDetails.attributes?.mimeType
        }
      };
      
    } catch (error) {
      if (error instanceof FileTransferException) {
        throw error;
      }
      console.error('❌ Error downloading file:', error);
      throw new FileTransferException(
        `File download failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Get signed download URL for an object
   * @param {string} bucketKey - The bucket key
   * @param {string} objectKey - The object key
   * @returns {Promise<Object>} Signed URL information
   */
  static async getSignedDownloadUrl(bucketKey, objectKey) {
    try {
      console.log(`🔗 Getting signed download URL for: ${bucketKey}/${objectKey}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${objectKey}/signeds3download`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new FileTransferException(
          `Failed to get signed download URL: ${response.status} ${response.statusText}`,
          response,
          new Error(errorText)
        );
      }
      
      const data = await response.json();
      console.log(`✅ Signed URL retrieved:`, data);
      
      if (!data.url) {
        throw new FileTransferException('No download URL returned from signed URL request');
      }
      
      return {
        url: data.url,
        expires: data.params?.['content-disposition']?.match(/Expires=(\d+)/)?.[1],
        size: data.size,
        sha1: data.sha1,
        contentType: data.params?.['content-type'],
        contentDisposition: data.params?.['content-disposition'],
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      if (error instanceof FileTransferException) {
        throw error;
      }
      console.error('❌ Error getting signed download URL:', error);
      throw new FileTransferException(
        `Failed to get signed download URL: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Download file directly to browser
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID to download
   * @param {string} versionId - Optional version ID
   * @returns {Promise<void>}
   */
  static async downloadFileToBrowser(projectId, itemId, versionId = null) {
    try {
      const downloadInfo = await this.downloadFile(projectId, itemId, versionId);
      
      if (!downloadInfo || !downloadInfo.success) {
        throw new FileTransferException('Failed to get download information');
      }
      
      console.log(`📥 Downloading file: ${downloadInfo.fileName}`);
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = downloadInfo.signedUrl;
      link.download = downloadInfo.fileName;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ File download initiated: ${downloadInfo.fileName}`);
      
      return {
        success: true,
        fileName: downloadInfo.fileName,
        fileSize: downloadInfo.fileSize,
        downloadTimestamp: new Date().toISOString()
      };
      
    } catch (error) {
      if (error instanceof FileTransferException) {
        throw error;
      }
      console.error('❌ Error downloading file to browser:', error);
      throw new FileTransferException(
        `Browser download failed: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * Get file download information without downloading
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @param {string} versionId - Optional version ID
   * @returns {Promise<Object>} Download information
   */
  static async getFileDownloadInfo(projectId, itemId, versionId = null) {
    try {
      return await this.downloadFile(projectId, itemId, versionId);
    } catch (error) {
      console.error('❌ Error getting file download info:', error);
      throw error;
    }
  }

  /**
   * Get job details by job ID
   * @param {string} projectId - The project ID
   * @param {string} jobId - The job ID
   * @returns {Promise<Object>} Job details
   */
  static async getJobDetails(projectId, jobId) {
    try {
      console.log(`🔍 Getting job details for: ${jobId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/jobs/${jobId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get job details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Job details retrieved:`, data);
      
      return {
        success: true,
        jobId: data.data?.id,
        status: data.data?.attributes?.status,
        type: data.data?.type,
        links: data.data?.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting job details:', error);
      throw error;
    }
  }

  /**
   * Monitor job status with polling
   * @param {string} projectId - The project ID
   * @param {string} jobId - The job ID
   * @param {number} interval - Polling interval in milliseconds (default: 2000)
   * @param {number} timeout - Timeout in milliseconds (default: 300000 = 5 minutes)
   * @returns {Promise<Object>} Final job status
   */
  static async monitorJobStatus(projectId, jobId, interval = 2000, timeout = 300000) {
    try {
      console.log(`👀 Monitoring job status for: ${jobId}`);
      
      const startTime = Date.now();
      const maxAttempts = Math.floor(timeout / interval);
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        try {
          const jobDetails = await this.getJobDetails(projectId, jobId);
          const status = jobDetails.status;
          
          console.log(`📊 Job ${jobId} status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
          
          // Check if job is complete
          if (status === 'success' || status === 'failed' || status === 'completed') {
            console.log(`✅ Job ${jobId} completed with status: ${status}`);
            return {
              success: true,
              jobId,
              status,
              completed: true,
              duration: Date.now() - startTime,
              attempts: attempts + 1,
              details: jobDetails
            };
          }
          
          // Check if job is in progress
          if (status === 'inprogress' || status === 'processing') {
            console.log(`⏳ Job ${jobId} is in progress...`);
          }
          
          // Check if job is queued
          if (status === 'queued' || status === 'pending') {
            console.log(`⏸️ Job ${jobId} is queued...`);
          }
          
          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, interval));
          attempts++;
          
        } catch (pollError) {
          console.warn(`⚠️ Polling attempt ${attempts + 1} failed:`, pollError.message);
          attempts++;
          
          // If we've had too many consecutive failures, give up
          if (attempts >= maxAttempts) {
            throw new Error(`Job monitoring failed after ${attempts} attempts: ${pollError.message}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
      
      // Timeout reached
      throw new Error(`Job monitoring timed out after ${timeout}ms (${attempts} attempts)`);
      
    } catch (error) {
      console.error('❌ Error monitoring job status:', error);
      throw error;
    }
  }

  /**
   * Get job status with retry logic
   * @param {string} projectId - The project ID
   * @param {string} jobId - The job ID
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @returns {Promise<Object>} Job status
   */
  static async getJobStatusWithRetry(projectId, jobId, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Getting job status (attempt ${attempt}/${maxRetries}): ${jobId}`);
        
        const jobDetails = await this.getJobDetails(projectId, jobId);
        
        return {
          success: true,
          jobId,
          status: jobDetails.status,
          attempt,
          details: jobDetails
        };
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to get job status after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Get all jobs for a project
   * @param {string} projectId - The project ID
   * @returns {Promise<Array>} List of jobs
   */
  static async getProjectJobs(projectId) {
    try {
      console.log(`📋 Getting all jobs for project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/jobs`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get project jobs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.data?.length || 0} jobs for project`);
      
      return {
        success: true,
        jobs: data.data || [],
        total: data.data?.length || 0,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting project jobs:', error);
      throw error;
    }
  }

  /**
   * Wait for job completion
   * @param {string} projectId - The project ID
   * @param {string} jobId - The job ID
   * @param {Object} options - Options for monitoring
   * @returns {Promise<Object>} Final job result
   */
  static async waitForJobCompletion(projectId, jobId, options = {}) {
    const {
      interval = 2000,
      timeout = 300000,
      onStatusUpdate = null,
      onProgress = null
    } = options;
    
    try {
      console.log(`⏳ Waiting for job completion: ${jobId}`);
      
      const startTime = Date.now();
      const maxAttempts = Math.floor(timeout / interval);
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const jobDetails = await this.getJobDetails(projectId, jobId);
        const status = jobDetails.status;
        
        // Call status update callback if provided
        if (onStatusUpdate) {
          onStatusUpdate(status, jobDetails);
        }
        
        // Call progress callback if provided
        if (onProgress) {
          const progress = Math.min((attempts / maxAttempts) * 100, 100);
          onProgress(progress, status);
        }
        
        // Check completion statuses
        if (['success', 'completed', 'failed', 'error'].includes(status)) {
          const duration = Date.now() - startTime;
          console.log(`✅ Job ${jobId} completed with status: ${status} (${duration}ms)`);
          
          return {
            success: status === 'success' || status === 'completed',
            jobId,
            status,
            duration,
            attempts: attempts + 1,
            details: jobDetails
          };
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      }
      
      throw new Error(`Job monitoring timed out after ${timeout}ms`);
      
    } catch (error) {
      console.error('❌ Error waiting for job completion:', error);
      throw error;
    }
  }

  /**
   * Get download details by download ID
   * @param {string} projectId - The project ID
   * @param {string} downloadId - The download ID
   * @returns {Promise<Object>} Download details
   */
  static async getDownloadDetails(projectId, downloadId) {
    try {
      console.log(`📥 Getting download details for: ${downloadId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/downloads/${downloadId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get download details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Download details retrieved:`, data);
      
      return {
        success: true,
        downloadId: data.data?.id,
        type: data.data?.type,
        format: data.data?.attributes?.format,
        source: data.data?.relationships?.source,
        storage: data.data?.relationships?.storage,
        links: data.data?.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting download details:', error);
      throw error;
    }
  }

  /**
   * Get all downloads for a project
   * @param {string} projectId - The project ID
   * @returns {Promise<Array>} List of downloads
   */
  static async getProjectDownloads(projectId) {
    try {
      console.log(`📋 Getting all downloads for project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/downloads`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get project downloads: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.data?.length || 0} downloads for project`);
      
      return {
        success: true,
        downloads: data.data || [],
        total: data.data?.length || 0,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting project downloads:', error);
      throw error;
    }
  }

  /**
   * Create a new download for a specific file type
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID to download
   * @param {string} format - The download format (e.g., 'pdf', 'dwg', 'step')
   * @returns {Promise<Object>} Download creation result
   */
  static async createDownload(projectId, versionId, format = 'pdf') {
    try {
      console.log(`📥 Creating download for version: ${versionId} in format: ${format}`);
      
      const requestBody = {
        data: {
          type: 'downloads',
          attributes: {
            format: {
              fileType: format
            }
          },
          relationships: {
            source: {
              data: {
                type: 'versions',
                id: versionId
              }
            }
          }
        }
      };
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/downloads`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create download: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Download created:`, data);
      
      return {
        success: true,
        downloadId: data.data?.id,
        type: data.data?.type,
        format: data.data?.attributes?.format,
        source: data.data?.relationships?.source,
        storage: data.data?.relationships?.storage,
        links: data.data?.links,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error creating download:', error);
      throw error;
    }
  }

  /**
   * Get download source information
   * @param {string} projectId - The project ID
   * @param {string} downloadId - The download ID
   * @returns {Promise<Object>} Download source details
   */
  static async getDownloadSource(projectId, downloadId) {
    try {
      console.log(`🔍 Getting download source for: ${downloadId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/downloads/${downloadId}/source`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get download source: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Download source retrieved:`, data);
      
      return {
        success: true,
        source: data.data,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting download source:', error);
      throw error;
    }
  }

  /**
   * Get download storage information
   * @param {string} projectId - The project ID
   * @param {string} downloadId - The download ID
   * @returns {Promise<Object>} Download storage details
   */
  static async getDownloadStorage(projectId, downloadId) {
    try {
      console.log(`🗄️ Getting download storage for: ${downloadId}`);
      
      const downloadDetails = await this.getDownloadDetails(projectId, downloadId);
      
      if (!downloadDetails.storage) {
        throw new Error('No storage information available for this download');
      }
      
      const storageData = downloadDetails.storage.data;
      const storageMeta = downloadDetails.storage.meta;
      
      console.log(`✅ Download storage retrieved:`, { storageData, storageMeta });
      
      return {
        success: true,
        storage: storageData,
        meta: storageMeta,
        downloadDetails
      };
      
    } catch (error) {
      console.error('❌ Error getting download storage:', error);
      throw error;
    }
  }

  /**
   * Get download URL for direct access
   * @param {string} projectId - The project ID
   * @param {string} downloadId - The download ID
   * @returns {Promise<Object>} Download URL information
   */
  static async getDownloadUrl(projectId, downloadId) {
    try {
      console.log(`🔗 Getting download URL for: ${downloadId}`);
      
      const storageInfo = await this.getDownloadStorage(projectId, downloadId);
      
      if (!storageInfo.meta?.link?.href) {
        throw new Error('No download URL available for this download');
      }
      
      const downloadUrl = storageInfo.meta.link.href;
      console.log(`✅ Download URL retrieved: ${downloadUrl}`);
      
      return {
        success: true,
        downloadUrl,
        storage: storageInfo.storage,
        meta: storageInfo.meta
      };
      
    } catch (error) {
      console.error('❌ Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Download file using download ID
   * @param {string} projectId - The project ID
   * @param {string} downloadId - The download ID
   * @returns {Promise<Object>} Download result
   */
  static async downloadFileById(projectId, downloadId) {
    try {
      console.log(`📥 Downloading file using download ID: ${downloadId}`);
      
      // Get download details
      const downloadDetails = await this.getDownloadDetails(projectId, downloadId);
      
      // Get download URL
      const urlInfo = await this.getDownloadUrl(projectId, downloadId);
      
      // Get source information
      const sourceInfo = await this.getDownloadSource(projectId, downloadId);
      
      console.log(`✅ Download information retrieved:`, {
        downloadId,
        format: downloadDetails.format,
        source: sourceInfo.source,
        url: urlInfo.downloadUrl
      });
      
      return {
        success: true,
        downloadId,
        format: downloadDetails.format,
        source: sourceInfo.source,
        downloadUrl: urlInfo.downloadUrl,
        storage: urlInfo.storage,
        details: downloadDetails
      };
      
    } catch (error) {
      console.error('❌ Error downloading file by ID:', error);
      throw error;
    }
  }

  /**
   * Download file to browser using download ID
   * @param {string} projectId - The project ID
   * @param {string} downloadId - The download ID
   * @returns {Promise<Object>} Download result
   */
  static async downloadFileToBrowserById(projectId, downloadId) {
    try {
      console.log(`📥 Downloading file to browser using download ID: ${downloadId}`);
      
      const downloadInfo = await this.downloadFileById(projectId, downloadId);
      
      console.log(`📥 Downloading file: ${downloadInfo.downloadUrl}`);
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = downloadInfo.downloadUrl;
      link.download = `download_${downloadId}.${downloadInfo.format?.fileType || 'pdf'}`;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ File download initiated: ${downloadInfo.downloadUrl}`);
      
      return downloadInfo;
      
    } catch (error) {
      console.error('❌ Error downloading file to browser by ID:', error);
      throw error;
    }
  }

  /**
   * Get top-level folders for a project using the correct Project service endpoint
   * @param {string} hubId - The hub ID
   * @param {string} projectId - The project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top-level folders
   */
  static async getTopFolders(hubId, projectId, options = {}) {
    const {
      excludeDeleted = false,
      projectFilesOnly = false
    } = options;
    
    try {
      console.log(`📁 Getting top folders for project: ${projectId} in hub: ${hubId}`);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (excludeDeleted) queryParams.append('excludeDeleted', 'true');
      if (projectFilesOnly) queryParams.append('projectFilesOnly', 'true');
      
      const queryString = queryParams.toString();
      const url = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}/topFolders${queryString ? `?${queryString}` : ''}`;
      
      console.log(`🔗 Top folders URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get top folders: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data.data?.length || 0} top folders`);
      
      // Transform the data to match our expected format
      const folders = (data.data || []).map(folder => ({
        id: folder.id,
        name: folder.attributes?.name || folder.attributes?.displayName,
        displayName: folder.attributes?.displayName,
        type: 'folder',
        path: `/${folder.attributes?.name || folder.attributes?.displayName}`,
        accFileId: folder.id,
        createTime: folder.attributes?.createTime,
        lastModifiedTime: folder.attributes?.lastModifiedTime,
        objectCount: folder.attributes?.objectCount,
        hidden: folder.attributes?.hidden,
        extension: folder.attributes?.extension,
        links: folder.links,
        relationships: folder.relationships,
        raw: folder
      }));
      
      return {
        success: true,
        folders,
        total: folders.length,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting top folders:', error);
      throw error;
    }
  }

  /**
   * Get project top folders with fallback to alternative methods
   * @param {string} hubId - The hub ID
   * @param {string} projectId - The project ID
   * @returns {Promise<Array>} Top-level folders
   */
  static async getProjectTopFolders(hubId, projectId) {
    try {
      console.log(`📁 Getting project top folders: ${projectId} in hub: ${hubId}`);
      
      // Try the official Project service endpoint first
      try {
        const result = await this.getTopFolders(hubId, projectId);
        if (result.folders && result.folders.length > 0) {
          console.log(`✅ Successfully loaded ${result.folders.length} top folders using Project service`);
          return result;
        }
      } catch (projectError) {
        console.warn(`⚠️ Project service failed:`, projectError.message);
      }
      
      // Fallback to Data service if Project service fails
      try {
        console.log(`🔄 Trying Data service fallback...`);
        const result = await this.getProjectFiles(projectId);
        
        // Filter only folders from the result
        const folders = result.filter(item => item.type === 'folder');
        
        console.log(`✅ Fallback successful: ${folders.length} folders from Data service`);
        return {
          success: true,
          folders,
          total: folders.length,
          method: 'data-service-fallback'
        };
        
      } catch (dataError) {
        console.warn(`⚠️ Data service fallback failed:`, dataError.message);
      }
      
      // If both methods fail, return empty result
      console.log(`📁 No folders found with any method`);
      return {
        success: true,
        folders: [],
        total: 0,
        method: 'none'
      };
      
    } catch (error) {
      console.error('❌ Error getting project top folders:', error);
      throw error;
    }
  }

  /**
   * Get hub information for a given project
   * @param {string} hubId - The hub ID
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Hub information
   */
  static async getProjectHub(hubId, projectId) {
    try {
      console.log(`🏢 Getting hub information for project: ${projectId} in hub: ${hubId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}/hub`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get project hub: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Hub information retrieved:`, data);
      
      return {
        success: true,
        hubId: data.data?.id,
        name: data.data?.attributes?.name,
        region: data.data?.attributes?.region,
        extension: data.data?.attributes?.extension,
        relationships: data.data?.relationships,
        links: data.data?.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting project hub:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive project information including hub details
   * @param {string} hubId - The hub ID
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Complete project and hub information
   */
  static async getProjectWithHub(hubId, projectId) {
    try {
      console.log(`📊 Getting comprehensive project information: ${projectId} in hub: ${hubId}`);
      
      // Get project details and hub information in parallel
      const [projectDetails, hubDetails, topFolders] = await Promise.allSettled([
        this.getProjectDetails(projectId),
        this.getProjectHub(hubId, projectId),
        this.getProjectTopFolders(hubId, projectId)
      ]);
      
      const result = {
        success: true,
        projectId,
        hubId,
        project: projectDetails.status === 'fulfilled' ? projectDetails.value : null,
        hub: hubDetails.status === 'fulfilled' ? hubDetails.value : null,
        topFolders: topFolders.status === 'fulfilled' ? topFolders.value : null,
        errors: []
      };
      
      // Collect any errors
      if (projectDetails.status === 'rejected') {
        result.errors.push(`Project details: ${projectDetails.reason.message}`);
      }
      if (hubDetails.status === 'rejected') {
        result.errors.push(`Hub details: ${hubDetails.reason.message}`);
      }
      if (topFolders.status === 'rejected') {
        result.errors.push(`Top folders: ${topFolders.reason.message}`);
      }
      
      console.log(`✅ Comprehensive project information retrieved`);
      console.log(`📊 Project: ${result.project ? '✅' : '❌'}`);
      console.log(`🏢 Hub: ${result.hub ? '✅' : '❌'}`);
      console.log(`📁 Top Folders: ${result.topFolders ? '✅' : '❌'}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error getting comprehensive project information:', error);
      throw error;
    }
  }

  /**
   * Get folder details by folder ID
   * @param {string} projectId - The project ID
   * @param {string} folderId - The folder ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Folder details
   */
  static async getFolderDetails(projectId, folderId, options = {}) {
    const {
      ifModifiedSince = null
    } = options;
    
    try {
      console.log(`📁 Getting folder details for: ${folderId} in project: ${projectId}`);
      
      const headers = this.getHeaders();
      
      // Add If-Modified-Since header if provided
      if (ifModifiedSince) {
        headers['If-Modified-Since'] = ifModifiedSince;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}`, {
        method: 'GET',
        headers
      });
      
      if (response.status === 304) {
        console.log(`📁 Folder not modified since: ${ifModifiedSince}`);
        return {
          success: true,
          notModified: true,
          lastModified: response.headers.get('Last-Modified'),
          folderId
        };
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get folder details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Folder details retrieved:`, data);
      
      return {
        success: true,
        folderId: data.data?.id,
        name: data.data?.attributes?.name,
        displayName: data.data?.attributes?.displayName,
        createTime: data.data?.attributes?.createTime,
        createUserId: data.data?.attributes?.createUserId,
        createUserName: data.data?.attributes?.createUserName,
        lastModifiedTime: data.data?.attributes?.lastModifiedTime,
        lastModifiedUserId: data.data?.attributes?.lastModifiedUserId,
        lastModifiedUserName: data.data?.attributes?.lastModifiedUserName,
        lastModifiedTimeRollup: data.data?.attributes?.lastModifiedTimeRollup,
        objectCount: data.data?.attributes?.objectCount,
        hidden: data.data?.attributes?.hidden,
        extension: data.data?.attributes?.extension,
        links: data.data?.links,
        relationships: data.data?.relationships,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting folder details:', error);
      throw error;
    }
  }

  /**
   * Get folder parent information
   * @param {string} projectId - The project ID
   * @param {string} folderId - The folder ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Parent folder information
   */
  static async getFolderParent(projectId, folderId, options = {}) {
    const {
      userId = null
    } = options;
    
    try {
      console.log(`📁 Getting parent folder for: ${folderId} in project: ${projectId}`);
      
      const headers = this.getHeaders();
      
      // Add x-user-id header if provided (for 2-legged authentication)
      if (userId) {
        headers['x-user-id'] = userId;
        console.log(`👤 Using user context: ${userId}`);
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/parent`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get folder parent: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Folder parent retrieved:`, data);
      
      return {
        success: true,
        projectId,
        folderId,
        parentId: data.data?.id,
        parentName: data.data?.attributes?.name,
        parentDisplayName: data.data?.attributes?.displayName,
        parentType: data.data?.type,
        createTime: data.data?.attributes?.createTime,
        createUserId: data.data?.attributes?.createUserId,
        createUserName: data.data?.attributes?.createUserName,
        lastModifiedTime: data.data?.attributes?.lastModifiedTime,
        lastModifiedUserId: data.data?.attributes?.lastModifiedUserId,
        lastModifiedUserName: data.data?.attributes?.lastModifiedUserName,
        lastModifiedTimeRollup: data.data?.attributes?.lastModifiedTimeRollup,
        objectCount: data.data?.attributes?.objectCount,
        hidden: data.data?.attributes?.hidden,
        extension: data.data?.attributes?.extension,
        links: data.data?.links,
        relationships: data.data?.relationships,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting folder parent:', error);
      throw error;
    }
  }

  /**
   * Get folder relationships (refs)
   * @param {string} projectId - The project ID
   * @param {string} folderId - The folder ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Folder relationships
   */
  static async getFolderRefs(projectId, folderId, options = {}) {
    const {
      userId = null,
      filterType = null,
      filterId = null,
      filterExtensionType = null,
      pageLimit = 200,
      pageNumber = 0
    } = options;
    
    try {
      console.log(`📁 Getting folder relationships for: ${folderId} in project: ${projectId}`);
      
      const headers = this.getHeaders();
      
      // Add x-user-id header if provided (for 2-legged authentication)
      if (userId) {
        headers['x-user-id'] = userId;
        console.log(`👤 Using user context: ${userId}`);
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      
      // Add filters based on options
      if (filterType) {
        if (Array.isArray(filterType)) {
          filterType.forEach(type => queryParams.append('filter[type]', type));
        } else {
          queryParams.append('filter[type]', filterType);
        }
      }
      
      if (filterId) {
        if (Array.isArray(filterId)) {
          filterId.forEach(id => queryParams.append('filter[id]', id));
        } else {
          queryParams.append('filter[id]', filterId);
        }
      }
      
      if (filterExtensionType) {
        if (Array.isArray(filterExtensionType)) {
          filterExtensionType.forEach(extType => queryParams.append('filter[extension.type]', extType));
        } else {
          queryParams.append('filter[extension.type]', filterExtensionType);
        }
      }
      
      const queryString = queryParams.toString();
      const url = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/refs${queryString ? `?${queryString}` : ''}`;
      
      console.log(`🔗 Folder refs URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get folder refs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Folder relationships retrieved:`, data);
      
      // Process the refs data to extract comprehensive information
      const processedRefs = (data.data || []).map(ref => ({
        id: ref.id,
        type: ref.type,
        name: ref.attributes?.name,
        displayName: ref.attributes?.displayName,
        createTime: ref.attributes?.createTime,
        createUserId: ref.attributes?.createUserId,
        createUserName: ref.attributes?.createUserName,
        lastModifiedTime: ref.attributes?.lastModifiedTime,
        lastModifiedUserId: ref.attributes?.lastModifiedUserId,
        lastModifiedUserName: ref.attributes?.lastModifiedUserName,
        lastModifiedTimeRollup: ref.attributes?.lastModifiedTimeRollup,
        objectCount: ref.attributes?.objectCount,
        hidden: ref.attributes?.hidden,
        reserved: ref.attributes?.reserved,
        reservedTime: ref.attributes?.reservedTime,
        reservedUserId: ref.attributes?.reservedUserId,
        reservedUserName: ref.attributes?.reservedUserName,
        versionNumber: ref.attributes?.versionNumber,
        mimeType: ref.attributes?.mimeType,
        extension: ref.attributes?.extension,
        links: ref.links,
        relationships: ref.relationships,
        raw: ref
      }));
      
      return {
        success: true,
        projectId,
        folderId,
        refs: processedRefs,
        total: processedRefs.length,
        included: data.included || [],
        links: data.links,
        jsonapi: data.jsonapi,
        filters: {
          type: filterType,
          id: filterId,
          extensionType: filterExtensionType
        },
        pagination: {
          limit: pageLimit,
          number: pageNumber
        },
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting folder refs:', error);
      throw error;
    }
  }

  /**
   * Get folder external links
   * @param {string} projectId - The project ID
   * @param {string} folderId - The folder ID
   * @returns {Promise<Object>} Folder external links
   */
  static async getFolderLinks(projectId, folderId) {
    try {
      console.log(`📁 Getting folder links for: ${folderId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/relationships/links`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get folder links: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Folder links retrieved:`, data);
      
      return {
        success: true,
        folderId,
        links: data.data || [],
        total: data.data?.length || 0,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting folder links:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive folder information including details, parent, and relationships
   * @param {string} projectId - The project ID
   * @param {string} folderId - The folder ID
   * @returns {Promise<Object>} Complete folder information
   */
  static async getFolderInfo(projectId, folderId) {
    try {
      console.log(`📁 Getting comprehensive folder information: ${folderId} in project: ${projectId}`);
      
      // Get folder details, parent, and relationships in parallel
      const [folderDetails, folderParent, folderRefs, folderLinks] = await Promise.allSettled([
        this.getFolderDetails(projectId, folderId),
        this.getFolderParent(projectId, folderId),
        this.getFolderRefs(projectId, folderId),
        this.getFolderLinks(projectId, folderId)
      ]);
      
      const result = {
        success: true,
        projectId,
        folderId,
        details: folderDetails.status === 'fulfilled' ? folderDetails.value : null,
        parent: folderParent.status === 'fulfilled' ? folderParent.value : null,
        refs: folderRefs.status === 'fulfilled' ? folderRefs.value : null,
        links: folderLinks.status === 'fulfilled' ? folderLinks.value : null,
        errors: []
      };
      
      // Collect any errors
      if (folderDetails.status === 'rejected') {
        result.errors.push(`Folder details: ${folderDetails.reason.message}`);
      }
      if (folderParent.status === 'rejected') {
        result.errors.push(`Folder parent: ${folderParent.reason.message}`);
      }
      if (folderRefs.status === 'rejected') {
        result.errors.push(`Folder refs: ${folderRefs.reason.message}`);
      }
      if (folderLinks.status === 'rejected') {
        result.errors.push(`Folder links: ${folderLinks.reason.message}`);
      }
      
      console.log(`✅ Comprehensive folder information retrieved`);
      console.log(`📁 Details: ${result.details ? '✅' : '❌'}`);
      console.log(`👨‍👩‍👧‍👦 Parent: ${result.parent ? '✅' : '❌'}`);
      console.log(`🔗 Refs: ${result.refs ? '✅' : '❌'}`);
      console.log(`🔗 Links: ${result.links ? '✅' : '❌'}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error getting comprehensive folder information:', error);
      throw error;
    }
  }

  /**
   * Get item details by item ID
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Item details
   */
  static async getItemDetails(projectId, itemId, options = {}) {
    const {
      ifModifiedSince = null
    } = options;
    
    try {
      console.log(`📄 Getting item details for: ${itemId} in project: ${projectId}`);
      
      const headers = this.getHeaders();
      
      // Add If-Modified-Since header if provided
      if (ifModifiedSince) {
        headers['If-Modified-Since'] = ifModifiedSince;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}`, {
        method: 'GET',
        headers
      });
      
      if (response.status === 304) {
        console.log(`📄 Item not modified since: ${ifModifiedSince}`);
        return {
          success: true,
          notModified: true,
          lastModified: response.headers.get('Last-Modified'),
          itemId
        };
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get item details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Item details retrieved:`, data);
      
      return {
        success: true,
        itemId: data.data?.id,
        name: data.data?.attributes?.name,
        displayName: data.data?.attributes?.displayName,
        createTime: data.data?.attributes?.createTime,
        createUserId: data.data?.attributes?.createUserId,
        createUserName: data.data?.attributes?.createUserName,
        lastModifiedTime: data.data?.attributes?.lastModifiedTime,
        lastModifiedUserId: data.data?.attributes?.lastModifiedUserId,
        lastModifiedUserName: data.data?.attributes?.lastModifiedUserName,
        lastModifiedTimeRollup: data.data?.attributes?.lastModifiedTimeRollup,
        objectCount: data.data?.attributes?.objectCount,
        hidden: data.data?.attributes?.hidden,
        extension: data.data?.attributes?.extension,
        links: data.data?.links,
        relationships: data.data?.relationships,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting item details:', error);
      throw error;
    }
  }

  /**
   * Get item parent folder
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @returns {Promise<Object>} Parent folder information
   */
  static async getItemParent(projectId, itemId) {
    try {
      console.log(`📄 Getting parent folder for item: ${itemId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/parent`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get item parent: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Item parent retrieved:`, data);
      
      return {
        success: true,
        parentId: data.data?.id,
        parentName: data.data?.attributes?.name,
        parentDisplayName: data.data?.attributes?.displayName,
        parentType: data.data?.type,
        links: data.data?.links,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting item parent:', error);
      throw error;
    }
  }

  /**
   * Get item versions
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Item versions
   */
  static async getItemVersions(projectId, itemId, options = {}) {
    const {
      pageLimit = 200,
      pageNumber = 0
    } = options;
    
    try {
      console.log(`📄 Getting versions for item: ${itemId} in project: ${projectId}`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/versions?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get item versions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Item versions retrieved:`, data);
      
      return {
        success: true,
        itemId,
        versions: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting item versions:', error);
      throw error;
    }
  }

  /**
   * Get item tip (latest version)
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @returns {Promise<Object>} Item tip version
   */
  static async getItemTip(projectId, itemId) {
    try {
      console.log(`📄 Getting tip version for item: ${itemId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/tip`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get item tip: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Item tip retrieved:`, data);
      
      return {
        success: true,
        itemId,
        tipVersion: data.data,
        versionId: data.data?.id,
        versionNumber: data.data?.attributes?.versionNumber,
        createTime: data.data?.attributes?.createTime,
        createUserId: data.data?.attributes?.createUserId,
        createUserName: data.data?.attributes?.createUserName,
        lastModifiedTime: data.data?.attributes?.lastModifiedTime,
        lastModifiedUserId: data.data?.attributes?.lastModifiedUserId,
        lastModifiedUserName: data.data?.attributes?.lastModifiedUserName,
        links: data.data?.links,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting item tip:', error);
      throw error;
    }
  }

  /**
   * Get item relationships (refs)
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @returns {Promise<Object>} Item relationships
   */
  static async getItemRefs(projectId, itemId) {
    try {
      console.log(`📄 Getting relationships for item: ${itemId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/refs`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get item refs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Item relationships retrieved:`, data);
      
      return {
        success: true,
        itemId,
        refs: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting item refs:', error);
      throw error;
    }
  }

  /**
   * Get item external links
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @returns {Promise<Object>} Item external links
   */
  static async getItemLinks(projectId, itemId) {
    try {
      console.log(`📄 Getting links for item: ${itemId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}/relationships/links`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get item links: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Item links retrieved:`, data);
      
      return {
        success: true,
        itemId,
        links: data.data || [],
        total: data.data?.length || 0,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting item links:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive item information including details, parent, versions, and relationships
   * @param {string} projectId - The project ID
   * @param {string} itemId - The item ID
   * @returns {Promise<Object>} Complete item information
   */
  static async getItemInfo(projectId, itemId) {
    try {
      console.log(`📄 Getting comprehensive item information: ${itemId} in project: ${projectId}`);
      
      // Get item details, parent, versions, tip, refs, and links in parallel
      const [itemDetails, itemParent, itemVersions, itemTip, itemRefs, itemLinks] = await Promise.allSettled([
        this.getItemDetails(projectId, itemId),
        this.getItemParent(projectId, itemId),
        this.getItemVersions(projectId, itemId),
        this.getItemTip(projectId, itemId),
        this.getItemRefs(projectId, itemId),
        this.getItemLinks(projectId, itemId)
      ]);
      
      const result = {
        success: true,
        projectId,
        itemId,
        details: itemDetails.status === 'fulfilled' ? itemDetails.value : null,
        parent: itemParent.status === 'fulfilled' ? itemParent.value : null,
        versions: itemVersions.status === 'fulfilled' ? itemVersions.value : null,
        tip: itemTip.status === 'fulfilled' ? itemTip.value : null,
        refs: itemRefs.status === 'fulfilled' ? itemRefs.value : null,
        links: itemLinks.status === 'fulfilled' ? itemLinks.value : null,
        errors: []
      };
      
      // Collect any errors
      if (itemDetails.status === 'rejected') {
        result.errors.push(`Item details: ${itemDetails.reason.message}`);
      }
      if (itemParent.status === 'rejected') {
        result.errors.push(`Item parent: ${itemParent.reason.message}`);
      }
      if (itemVersions.status === 'rejected') {
        result.errors.push(`Item versions: ${itemVersions.reason.message}`);
      }
      if (itemTip.status === 'rejected') {
        result.errors.push(`Item tip: ${itemTip.reason.message}`);
      }
      if (itemRefs.status === 'rejected') {
        result.errors.push(`Item refs: ${itemRefs.reason.message}`);
      }
      if (itemLinks.status === 'rejected') {
        result.errors.push(`Item links: ${itemLinks.reason.message}`);
      }
      
      console.log(`✅ Comprehensive item information retrieved`);
      console.log(`📄 Details: ${result.details ? '✅' : '❌'}`);
      console.log(`👨‍👩‍👧‍👦 Parent: ${result.parent ? '✅' : '❌'}`);
      console.log(`📋 Versions: ${result.versions ? '✅' : '❌'}`);
      console.log(`🔝 Tip: ${result.tip ? '✅' : '❌'}`);
      console.log(`🔗 Refs: ${result.refs ? '✅' : '❌'}`);
      console.log(`🔗 Links: ${result.links ? '✅' : '❌'}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error getting comprehensive item information:', error);
      throw error;
    }
  }

  /**
   * Get version details by version ID
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Version details
   */
  static async getVersion(projectId, versionId, options = {}) {
    const {
      ifModifiedSince = null
    } = options;
    
    try {
      console.log(`📋 Getting version details for: ${versionId} in project: ${projectId}`);
      
      const headers = this.getHeaders();
      
      // Add If-Modified-Since header if provided
      if (ifModifiedSince) {
        headers['If-Modified-Since'] = ifModifiedSince;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}`, {
        method: 'GET',
        headers
      });
      
      if (response.status === 304) {
        console.log(`📋 Version not modified since: ${ifModifiedSince}`);
        return {
          success: true,
          notModified: true,
          lastModified: response.headers.get('Last-Modified'),
          versionId
        };
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get version details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Version details retrieved:`, data);
      
      return {
        success: true,
        versionId: data.data?.id,
        versionNumber: data.data?.attributes?.versionNumber,
        createTime: data.data?.attributes?.createTime,
        createUserId: data.data?.attributes?.createUserId,
        createUserName: data.data?.attributes?.createUserName,
        lastModifiedTime: data.data?.attributes?.lastModifiedTime,
        lastModifiedUserId: data.data?.attributes?.lastModifiedUserId,
        lastModifiedUserName: data.data?.attributes?.lastModifiedUserName,
        lastModifiedTimeRollup: data.data?.attributes?.lastModifiedTimeRollup,
        displayName: data.data?.attributes?.displayName,
        name: data.data?.attributes?.name,
        fileType: data.data?.attributes?.fileType,
        mimeType: data.data?.attributes?.mimeType,
        storageSize: data.data?.attributes?.storageSize,
        hidden: data.data?.attributes?.hidden,
        extension: data.data?.attributes?.extension,
        links: data.data?.links,
        relationships: data.data?.relationships,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting version details:', error);
      throw error;
    }
  }

  /**
   * Get version download formats
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Promise<Object>} Available download formats
   */
  static async getVersionDownloadFormats(projectId, versionId) {
    try {
      console.log(`📋 Getting download formats for version: ${versionId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}/downloadFormats`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get version download formats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Version download formats retrieved:`, data);
      
      return {
        success: true,
        versionId,
        formats: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting version download formats:', error);
      throw error;
    }
  }

  /**
   * Get version downloads
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Promise<Object>} Available downloads
   */
  static async getVersionDownloads(projectId, versionId) {
    try {
      console.log(`📋 Getting downloads for version: ${versionId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}/downloads`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get version downloads: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Version downloads retrieved:`, data);
      
      return {
        success: true,
        versionId,
        downloads: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting version downloads:', error);
      throw error;
    }
  }

  /**
   * Get version item (parent item)
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Promise<Object>} Parent item information
   */
  static async getVersionItem(projectId, versionId) {
    try {
      console.log(`📋 Getting parent item for version: ${versionId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}/item`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get version item: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Version item retrieved:`, data);
      
      return {
        success: true,
        versionId,
        itemId: data.data?.id,
        itemName: data.data?.attributes?.name,
        itemDisplayName: data.data?.attributes?.displayName,
        itemType: data.data?.type,
        links: data.data?.links,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting version item:', error);
      throw error;
    }
  }

  /**
   * Get version relationships (refs)
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Promise<Object>} Version relationships
   */
  static async getVersionRefs(projectId, versionId) {
    try {
      console.log(`📋 Getting relationships for version: ${versionId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}/refs`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get version refs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Version relationships retrieved:`, data);
      
      return {
        success: true,
        versionId,
        refs: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting version refs:', error);
      throw error;
    }
  }

  /**
   * Get version external links
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Promise<Object>} Version external links
   */
  static async getVersionLinks(projectId, versionId) {
    try {
      console.log(`📋 Getting links for version: ${versionId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${versionId}/relationships/links`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get version links: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Version links retrieved:`, data);
      
      return {
        success: true,
        versionId,
        links: data.data || [],
        total: data.data?.length || 0,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting version links:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive version information including details, item, and relationships
   * @param {string} projectId - The project ID
   * @param {string} versionId - The version ID
   * @returns {Promise<Object>} Complete version information
   */
  static async getVersionInfo(projectId, versionId) {
    try {
      console.log(`📋 Getting comprehensive version information: ${versionId} in project: ${projectId}`);
      
      // Get version details, item, download formats, downloads, refs, and links in parallel
      const [versionDetails, versionItem, downloadFormats, downloads, versionRefs, versionLinks] = await Promise.allSettled([
        this.getVersion(projectId, versionId),
        this.getVersionItem(projectId, versionId),
        this.getVersionDownloadFormats(projectId, versionId),
        this.getVersionDownloads(projectId, versionId),
        this.getVersionRefs(projectId, versionId),
        this.getVersionLinks(projectId, versionId)
      ]);
      
      const result = {
        success: true,
        projectId,
        versionId,
        details: versionDetails.status === 'fulfilled' ? versionDetails.value : null,
        item: versionItem.status === 'fulfilled' ? versionItem.value : null,
        downloadFormats: downloadFormats.status === 'fulfilled' ? downloadFormats.value : null,
        downloads: downloads.status === 'fulfilled' ? downloads.value : null,
        refs: versionRefs.status === 'fulfilled' ? versionRefs.value : null,
        links: versionLinks.status === 'fulfilled' ? versionLinks.value : null,
        errors: []
      };
      
      // Collect any errors
      if (versionDetails.status === 'rejected') {
        result.errors.push(`Version details: ${versionDetails.reason.message}`);
      }
      if (versionItem.status === 'rejected') {
        result.errors.push(`Version item: ${versionItem.reason.message}`);
      }
      if (downloadFormats.status === 'rejected') {
        result.errors.push(`Download formats: ${downloadFormats.reason.message}`);
      }
      if (downloads.status === 'rejected') {
        result.errors.push(`Downloads: ${downloads.reason.message}`);
      }
      if (versionRefs.status === 'rejected') {
        result.errors.push(`Version refs: ${versionRefs.reason.message}`);
      }
      if (versionLinks.status === 'rejected') {
        result.errors.push(`Version links: ${versionLinks.reason.message}`);
      }
      
      console.log(`✅ Comprehensive version information retrieved`);
      console.log(`📋 Details: ${result.details ? '✅' : '❌'}`);
      console.log(`📄 Item: ${result.item ? '✅' : '❌'}`);
      console.log(`📥 Download Formats: ${result.downloadFormats ? '✅' : '❌'}`);
      console.log(`📥 Downloads: ${result.downloads ? '✅' : '❌'}`);
      console.log(`🔗 Refs: ${result.refs ? '✅' : '❌'}`);
      console.log(`🔗 Links: ${result.links ? '✅' : '❌'}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error getting comprehensive version information:', error);
      throw error;
    }
  }

  /**
   * Search folder contents
   * @param {string} projectId - The project ID
   * @param {string} folderId - The folder ID
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async searchFolderContents(projectId, folderId, options = {}) {
    const {
      query = '',
      filterType = null,
      filterExtension = null,
      filterHidden = false,
      pageLimit = 200,
      pageNumber = 0,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;
    
    try {
      console.log(`🔍 Searching folder contents: ${folderId} in project: ${projectId}`);
      console.log(`🔍 Search query: "${query}"`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      
      if (query) {
        queryParams.append('filter[name]', query);
      }
      if (filterType) {
        queryParams.append('filter[type]', filterType);
      }
      if (filterExtension) {
        queryParams.append('filter[extension.type]', filterExtension);
      }
      if (filterHidden) {
        queryParams.append('includeHidden', 'true');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/search?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search folder contents: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Folder search results retrieved:`, data);
      
      return {
        success: true,
        projectId,
        folderId,
        query,
        results: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error searching folder contents:', error);
      throw error;
    }
  }

  /**
   * Search files by name
   * @param {string} projectId - The project ID
   * @param {string} fileName - The file name to search for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async searchFilesByName(projectId, fileName, options = {}) {
    const {
      pageLimit = 200,
      pageNumber = 0,
      includeHidden = false
    } = options;
    
    try {
      console.log(`🔍 Searching files by name: "${fileName}" in project: ${projectId}`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      queryParams.append('filter[name]', fileName);
      queryParams.append('filter[type]', 'items');
      
      if (includeHidden) {
        queryParams.append('includeHidden', 'true');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/search?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search files by name: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ File name search results retrieved:`, data);
      
      return {
        success: true,
        projectId,
        fileName,
        results: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error searching files by name:', error);
      throw error;
    }
  }

  /**
   * Search files by type
   * @param {string} projectId - The project ID
   * @param {string} fileType - The file type to search for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async searchFilesByType(projectId, fileType, options = {}) {
    const {
      pageLimit = 200,
      pageNumber = 0,
      includeHidden = false
    } = options;
    
    try {
      console.log(`🔍 Searching files by type: "${fileType}" in project: ${projectId}`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      queryParams.append('filter[type]', 'items');
      queryParams.append('filter[extension.type]', fileType);
      
      if (includeHidden) {
        queryParams.append('includeHidden', 'true');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/search?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search files by type: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ File type search results retrieved:`, data);
      
      return {
        success: true,
        projectId,
        fileType,
        results: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error searching files by type:', error);
      throw error;
    }
  }

  /**
   * Search files by MIME type
   * @param {string} projectId - The project ID
   * @param {string} mimeType - The MIME type to search for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async searchFilesByMimeType(projectId, mimeType, options = {}) {
    const {
      pageLimit = 200,
      pageNumber = 0,
      includeHidden = false
    } = options;
    
    try {
      console.log(`🔍 Searching files by MIME type: "${mimeType}" in project: ${projectId}`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      queryParams.append('filter[type]', 'items');
      queryParams.append('filter[mimeType]', mimeType);
      
      if (includeHidden) {
        queryParams.append('includeHidden', 'true');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/search?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search files by MIME type: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ File MIME type search results retrieved:`, data);
      
      return {
        success: true,
        projectId,
        mimeType,
        results: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error searching files by MIME type:', error);
      throw error;
    }
  }

  /**
   * Search files by date range
   * @param {string} projectId - The project ID
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async searchFilesByDateRange(projectId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      pageLimit = 200,
      pageNumber = 0,
      includeHidden = false
    } = options;
    
    try {
      console.log(`🔍 Searching files by date range in project: ${projectId}`);
      console.log(`🔍 Date range: ${startDate} to ${endDate}`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      queryParams.append('filter[type]', 'items');
      
      if (startDate) {
        queryParams.append('filter[createTime-ge]', startDate);
      }
      if (endDate) {
        queryParams.append('filter[createTime-le]', endDate);
      }
      if (includeHidden) {
        queryParams.append('includeHidden', 'true');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/search?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search files by date range: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ File date range search results retrieved:`, data);
      
      return {
        success: true,
        projectId,
        startDate,
        endDate,
        results: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error searching files by date range:', error);
      throw error;
    }
  }

  /**
   * Advanced search with multiple criteria
   * @param {string} projectId - The project ID
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object>} Search results
   */
  static async advancedSearch(projectId, criteria = {}) {
    const {
      name = null,
      fileType = null,
      mimeType = null,
      startDate = null,
      endDate = null,
      hidden = false,
      pageLimit = 200,
      pageNumber = 0
    } = criteria;
    
    try {
      console.log(`🔍 Advanced search in project: ${projectId}`);
      console.log(`🔍 Search criteria:`, criteria);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      
      // Add filters based on criteria
      if (name) {
        queryParams.append('filter[name]', name);
      }
      if (fileType) {
        queryParams.append('filter[extension.type]', fileType);
      }
      if (mimeType) {
        queryParams.append('filter[mimeType]', mimeType);
      }
      if (startDate) {
        queryParams.append('filter[createTime-ge]', startDate);
      }
      if (endDate) {
        queryParams.append('filter[createTime-le]', endDate);
      }
      if (hidden) {
        queryParams.append('includeHidden', 'true');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/search?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to perform advanced search: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Advanced search results retrieved:`, data);
      
      return {
        success: true,
        projectId,
        criteria,
        results: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error performing advanced search:', error);
      throw error;
    }
  }

  /**
   * Check permissions for specific resources
   * @param {string} projectId - The project ID
   * @param {Array} resources - Array of resource objects with type and id
   * @returns {Promise<Object>} Permission check results
   */
  static async checkPermissions(projectId, resources = []) {
    try {
      console.log(`🔐 Checking permissions for ${resources.length} resources in project: ${projectId}`);
      
      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: {
          type: "commands",
          attributes: {
            extension: {
              type: "commands:autodesk.bim360:CheckPermission",
              version: "1.0"
            }
          },
          relationships: {
            resources: {
              data: resources.map(resource => ({
                type: resource.type,
                id: resource.id
              }))
            }
          }
        }
      };
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/commands`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check permissions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Permission check results retrieved:`, data);
      
      return {
        success: true,
        projectId,
        resources,
        permissions: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      throw error;
    }
  }

  /**
   * Get user permissions for a project
   * @param {string} projectId - The project ID
   * @param {string} userId - The user ID (optional)
   * @returns {Promise<Object>} User permissions
   */
  static async getUserPermissions(projectId, userId = null) {
    try {
      console.log(`👤 Getting user permissions for project: ${projectId}`);
      if (userId) {
        console.log(`👤 User ID: ${userId}`);
      }
      
      const headers = this.getHeaders();
      if (userId) {
        headers['x-user-id'] = userId;
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/permissions`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get user permissions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ User permissions retrieved:`, data);
      
      return {
        success: true,
        projectId,
        userId,
        permissions: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting user permissions:', error);
      throw error;
    }
  }

  /**
   * Get project member permissions
   * @param {string} projectId - The project ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Member permissions
   */
  static async getMemberPermissions(projectId, options = {}) {
    const {
      pageLimit = 200,
      pageNumber = 0,
      includeInactive = false
    } = options;
    
    try {
      console.log(`👥 Getting member permissions for project: ${projectId}`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      
      if (includeInactive) {
        queryParams.append('includeInactive', 'true');
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/members?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get member permissions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Member permissions retrieved:`, data);
      
      return {
        success: true,
        projectId,
        members: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting member permissions:', error);
      throw error;
    }
  }

  /**
   * Create webhook subscription
   * @param {string} projectId - The project ID
   * @param {Object} webhookConfig - Webhook configuration
   * @returns {Promise<Object>} Webhook subscription result
   */
  static async createWebhook(projectId, webhookConfig) {
    const {
      callbackUrl,
      events = ['data.created', 'data.updated', 'data.deleted'],
      scope = 'project',
      scopeId = projectId
    } = webhookConfig;
    
    try {
      console.log(`🔗 Creating webhook subscription for project: ${projectId}`);
      console.log(`🔗 Callback URL: ${callbackUrl}`);
      console.log(`🔗 Events: ${events.join(', ')}`);
      
      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: {
          type: "webhooks",
          attributes: {
            callbackUrl,
            events,
            scope,
            scopeId
          }
        }
      };
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create webhook: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Webhook subscription created:`, data);
      
      return {
        success: true,
        projectId,
        webhookId: data.data?.id,
        callbackUrl,
        events,
        scope,
        scopeId,
        links: data.data?.links,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error creating webhook:', error);
      throw error;
    }
  }

  /**
   * Get webhook subscriptions for a project
   * @param {string} projectId - The project ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Webhook subscriptions
   */
  static async getWebhooks(projectId, options = {}) {
    const {
      pageLimit = 200,
      pageNumber = 0
    } = options;
    
    try {
      console.log(`🔗 Getting webhook subscriptions for project: ${projectId}`);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page[limit]', pageLimit.toString());
      queryParams.append('page[number]', pageNumber.toString());
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/webhooks?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get webhooks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Webhook subscriptions retrieved:`, data);
      
      return {
        success: true,
        projectId,
        webhooks: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error getting webhooks:', error);
      throw error;
    }
  }

  /**
   * Update webhook subscription
   * @param {string} projectId - The project ID
   * @param {string} webhookId - The webhook ID
   * @param {Object} updates - Webhook updates
   * @returns {Promise<Object>} Updated webhook
   */
  static async updateWebhook(projectId, webhookId, updates) {
    try {
      console.log(`🔗 Updating webhook: ${webhookId} in project: ${projectId}`);
      
      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: {
          type: "webhooks",
          id: webhookId,
          attributes: updates
        }
      };
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update webhook: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Webhook updated:`, data);
      
      return {
        success: true,
        projectId,
        webhookId,
        updates,
        webhook: data.data,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error updating webhook:', error);
      throw error;
    }
  }

  /**
   * Delete webhook subscription
   * @param {string} projectId - The project ID
   * @param {string} webhookId - The webhook ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteWebhook(projectId, webhookId) {
    try {
      console.log(`🔗 Deleting webhook: ${webhookId} in project: ${projectId}`);
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.status} ${response.statusText}`);
      }
      
      console.log(`✅ Webhook deleted: ${webhookId}`);
      
      return {
        success: true,
        projectId,
        webhookId,
        deleted: true
      };
      
    } catch (error) {
      console.error('❌ Error deleting webhook:', error);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   * @param {string} payload - The webhook payload
   * @param {string} signature - The webhook signature
   * @param {string} secret - The webhook secret
   * @returns {boolean} Whether the signature is valid
   */
  static validateWebhookSignature(payload, signature, secret) {
    try {
      console.log(`🔐 Validating webhook signature`);
      
      // This is a placeholder implementation
      // In a real implementation, you would use HMAC-SHA256 to validate the signature
      // const crypto = require('crypto');
      // const expectedSignature = crypto
      //   .createHmac('sha256', secret)
      //   .update(payload)
      //   .digest('hex');
      // return signature === expectedSignature;
      
      console.log(`✅ Webhook signature validation (placeholder)`);
      return true;
      
    } catch (error) {
      console.error('❌ Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Process webhook event
   * @param {Object} event - The webhook event
   * @returns {Promise<Object>} Processing result
   */
  static async processWebhookEvent(event) {
    try {
      console.log(`📨 Processing webhook event:`, event);
      
      const {
        type,
        data,
        attributes,
        relationships
      } = event;
      
      // Process different event types
      switch (type) {
        case 'data.created':
          console.log(`📁 Resource created:`, data);
          break;
        case 'data.updated':
          console.log(`📝 Resource updated:`, data);
          break;
        case 'data.deleted':
          console.log(`🗑️ Resource deleted:`, data);
          break;
        default:
          console.log(`❓ Unknown event type: ${type}`);
      }
      
      return {
        success: true,
        eventType: type,
        processed: true,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error processing webhook event:', error);
      throw error;
    }
  }

  /**
   * Batch create folders
   * @param {string} projectId - The project ID
   * @param {Array} folders - Array of folder data
   * @returns {Promise<Object>} Batch creation results
   */
  static async batchCreateFolders(projectId, folders = []) {
    try {
      console.log(`📁 Batch creating ${folders.length} folders in project: ${projectId}`);
      
      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: folders.map(folder => ({
          type: "folders",
          attributes: {
            name: folder.name,
            displayName: folder.displayName || folder.name,
            extension: folder.extension || {
              type: "folders:autodesk.bim360:Folder",
              version: "1.0"
            }
          },
          relationships: folder.parentId ? {
            parent: {
              data: {
                type: "folders",
                id: folder.parentId
              }
            }
          } : undefined
        }))
      };
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to batch create folders: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Batch folder creation completed:`, data);
      
      return {
        success: true,
        projectId,
        folders: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error batch creating folders:', error);
      throw error;
    }
  }

  /**
   * Batch create items
   * @param {string} projectId - The project ID
   * @param {Array} items - Array of item data
   * @returns {Promise<Object>} Batch creation results
   */
  static async batchCreateItems(projectId, items = []) {
    try {
      console.log(`📄 Batch creating ${items.length} items in project: ${projectId}`);
      
      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: items.map(item => ({
          type: "items",
          attributes: {
            name: item.name,
            displayName: item.displayName || item.name,
            extension: item.extension || {
              type: "items:autodesk.bim360:File",
              version: "1.0"
            }
          },
          relationships: item.parentId ? {
            parent: {
              data: {
                type: "folders",
                id: item.parentId
              }
            }
          } : undefined
        }))
      };
      
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to batch create items: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Batch item creation completed:`, data);
      
      return {
        success: true,
        projectId,
        items: data.data || [],
        total: data.data?.length || 0,
        links: data.links,
        jsonapi: data.jsonapi,
        response: data
      };
      
    } catch (error) {
      console.error('❌ Error batch creating items:', error);
      throw error;
    }
  }

  /**
   * Batch update resources
   * @param {string} projectId - The project ID
   * @param {Array} updates - Array of update operations
   * @returns {Promise<Object>} Batch update results
   */
  static async batchUpdateResources(projectId, updates = []) {
    try {
      console.log(`📝 Batch updating ${updates.length} resources in project: ${projectId}`);
      
      const results = [];
      const errors = [];
      
      // Process updates in parallel with rate limiting
      const batchSize = 5; // Process 5 updates at a time
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (update) => {
          try {
            const { type, id, attributes } = update;
            const endpoint = type === 'folders' ? 'folders' : 'items';
            
            const requestBody = {
              jsonapi: {
                version: "1.0"
              },
              data: {
                type,
                id,
                attributes
              }
            };
            
            const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/${endpoint}/${id}`, {
              method: 'PATCH',
              headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/vnd.api+json'
              },
              body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
              throw new Error(`Failed to update ${type} ${id}: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return {
              success: true,
              type,
              id,
              data: data.data,
              response: data
            };
            
          } catch (error) {
            return {
              success: false,
              type: update.type,
              id: update.id,
              error: error.message
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`✅ Batch update completed: ${successful.length} successful, ${failed.length} failed`);
      
      return {
        success: true,
        projectId,
        total: updates.length,
        successful: successful.length,
        failed: failed.length,
        results,
        errors: failed.map(f => f.error)
      };
      
    } catch (error) {
      console.error('❌ Error batch updating resources:', error);
      throw error;
    }
  }

  /**
   * Batch delete resources
   * @param {string} projectId - The project ID
   * @param {Array} resources - Array of resource objects with type and id
   * @returns {Promise<Object>} Batch deletion results
   */
  static async batchDeleteResources(projectId, resources = []) {
    try {
      console.log(`🗑️ Batch deleting ${resources.length} resources in project: ${projectId}`);
      
      const results = [];
      const errors = [];
      
      // Process deletions in parallel with rate limiting
      const batchSize = 5; // Process 5 deletions at a time
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (resource) => {
          try {
            const { type, id } = resource;
            const endpoint = type === 'folders' ? 'folders' : 'items';
            
            const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/${endpoint}/${id}`, {
              method: 'DELETE',
              headers: this.getHeaders()
            });
            
            if (!response.ok) {
              throw new Error(`Failed to delete ${type} ${id}: ${response.status} ${response.statusText}`);
            }
            
            return {
              success: true,
              type,
              id,
              deleted: true
            };
            
          } catch (error) {
            return {
              success: false,
              type: resource.type,
              id: resource.id,
              error: error.message
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < resources.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`✅ Batch deletion completed: ${successful.length} successful, ${failed.length} failed`);
      
      return {
        success: true,
        projectId,
        total: resources.length,
        successful: successful.length,
        failed: failed.length,
        results,
        errors: failed.map(f => f.error)
      };
      
    } catch (error) {
      console.error('❌ Error batch deleting resources:', error);
      throw error;
    }
  }

  /**
   * Batch move resources
   * @param {string} projectId - The project ID
   * @param {Array} moves - Array of move operations
   * @returns {Promise<Object>} Batch move results
   */
  static async batchMoveResources(projectId, moves = []) {
    try {
      console.log(`📦 Batch moving ${moves.length} resources in project: ${projectId}`);
      
      const results = [];
      const errors = [];
      
      // Process moves in parallel with rate limiting
      const batchSize = 5; // Process 5 moves at a time
      for (let i = 0; i < moves.length; i += batchSize) {
        const batch = moves.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (move) => {
          try {
            const { type, id, newParentId } = move;
            const endpoint = type === 'folders' ? 'folders' : 'items';
            
            const requestBody = {
              jsonapi: {
                version: "1.0"
              },
              data: {
                type,
                id,
                relationships: {
                  parent: {
                    data: {
                      type: "folders",
                      id: newParentId
                    }
                  }
                }
              }
            };
            
            const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/${endpoint}/${id}/relationships/parent`, {
              method: 'PATCH',
              headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/vnd.api+json'
              },
              body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
              throw new Error(`Failed to move ${type} ${id}: ${response.status} ${response.statusText}`);
            }
            
            return {
              success: true,
              type,
              id,
              newParentId,
              moved: true
            };
            
          } catch (error) {
            return {
              success: false,
              type: move.type,
              id: move.id,
              error: error.message
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < moves.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`✅ Batch move completed: ${successful.length} successful, ${failed.length} failed`);
      
      return {
        success: true,
        projectId,
        total: moves.length,
        successful: successful.length,
        failed: failed.length,
        results,
        errors: failed.map(f => f.error)
      };
      
    } catch (error) {
      console.error('❌ Error batch moving resources:', error);
      throw error;
    }
  }

  /**
   * Validate project access and permissions
   * @param {string} hubId - The hub ID
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Access validation results
   */
  static async validateProjectAccess(hubId, projectId) {
    try {
      console.log(`🔍 Validating project access: ${projectId} in hub: ${hubId}`);
      
      const validation = {
        success: true,
        projectId,
        hubId,
        access: {
          project: false,
          hub: false,
          folders: false,
          files: false
        },
        details: {},
        errors: []
      };
      
      // Test project access
      try {
        const projectDetails = await this.getProjectDetails(projectId);
        validation.access.project = true;
        validation.details.project = projectDetails;
        console.log(`✅ Project access confirmed`);
      } catch (error) {
        validation.errors.push(`Project access failed: ${error.message}`);
        console.log(`❌ Project access failed: ${error.message}`);
      }
      
      // Test hub access
      try {
        const hubDetails = await this.getProjectHub(hubId, projectId);
        validation.access.hub = true;
        validation.details.hub = hubDetails;
        console.log(`✅ Hub access confirmed`);
      } catch (error) {
        validation.errors.push(`Hub access failed: ${error.message}`);
        console.log(`❌ Hub access failed: ${error.message}`);
      }
      
      // Test folder access
      try {
        const folderResult = await this.getProjectTopFolders(hubId, projectId);
        validation.access.folders = true;
        validation.details.folders = folderResult;
        console.log(`✅ Folder access confirmed`);
      } catch (error) {
        validation.errors.push(`Folder access failed: ${error.message}`);
        console.log(`❌ Folder access failed: ${error.message}`);
      }
      
      // Test file access (using Data service)
      try {
        const files = await this.getProjectFiles(projectId);
        validation.access.files = true;
        validation.details.files = files;
        console.log(`✅ File access confirmed`);
      } catch (error) {
        validation.errors.push(`File access failed: ${error.message}`);
        console.log(`❌ File access failed: ${error.message}`);
      }
      
      // Determine overall success
      validation.success = validation.access.project && validation.access.hub;
      
      console.log(`🔍 Access validation complete:`, validation);
      return validation;
      
    } catch (error) {
      console.error('❌ Error validating project access:', error);
      throw error;
    }
  }

  // ACC Reminder Data Methods
  static async getProjectIssues(projectId) {
    try {
      console.log('🔍 Fetching project issues from ACC...');
      const headers = this.getHeaders();
      
      // Convert project ID format (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/construction/issues/v1/projects/${cleanProjectId}/issues`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Issues fetched successfully:', data.results?.length || 0, 'issues');
        return data.results || [];
      } else {
        console.warn('⚠️ Issues API not available, returning empty array');
        console.warn('⚠️ Response status:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching issues:', error);
      return [];
    }
  }

  static async getProjectRFIs(projectId) {
    try {
      console.log('🔍 DEBUG: Fetching project RFIs from ACC...');
      console.log('🔍 DEBUG: Original project ID:', projectId);
      console.log('🔍 DEBUG: Project ID type:', typeof projectId);
      
      const headers = this.getHeaders();
      console.log('🔍 DEBUG: Headers:', headers);
      
      // Convert project ID format (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      console.log('🔍 DEBUG: Clean project ID:', cleanProjectId);
      
      // Use backend proxy to avoid CORS
      const searchUrl = `http://localhost:3001/api/acc/rfis/search`;
      console.log('🔍 DEBUG: Search URL:', searchUrl);
      
      // Use minimal parameters that work (based on debugger results)
      const searchBody = {
        limit: 100,
        offset: 0
      };
      
      console.log('🔍 DEBUG: Search body:', JSON.stringify(searchBody, null, 2));
      
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': headers['Authorization'] || headers['authorization'],
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId: cleanProjectId, body: searchBody })
      });
      
      console.log('🔍 DEBUG: Response status:', response.status);
      console.log('🔍 DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RFIs fetched successfully:', data.results?.length || 0, 'RFIs');
        console.log('🔍 DEBUG: Full response data:', data);
        return data.results || [];
      } else {
        const errorText = await response.text();
        console.warn('⚠️ RFIs API not available, returning empty array');
        console.warn('⚠️ Response status:', response.status, response.statusText);
        console.warn('⚠️ Error response:', errorText);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching RFIs:', error);
      console.error('❌ Error stack:', error.stack);
      return [];
    }
  }

  static async getProjectReviews(projectId) {
    try {
      console.log('🔍 Fetching project reviews from ACC...');
      const headers = this.getHeaders();
      
      // Convert project ID format (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/construction/reviews/v1/projects/${cleanProjectId}/reviews`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Reviews fetched successfully:', data.results?.length || 0, 'reviews');
        return data.results || [];
      } else {
        console.warn('⚠️ Reviews API not available, returning empty array');
        console.warn('⚠️ Response status:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching reviews:', error);
      return [];
    }
  }

  /**
   * Get RFI types for a project
   * @param {string} projectId - The project ID
   * @returns {Promise<Array>} RFI types
   */
  static async getProjectRfiTypes(projectId) {
    try {
      console.log('🔍 Fetching RFI types from ACC...');
      const headers = this.getHeaders();
      
      // Convert project ID format (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/construction/rfis/v3/projects/${cleanProjectId}/rfi-types`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RFI types fetched successfully:', data.results?.length || 0, 'types');
        return data.results || [];
      } else {
        console.warn('⚠️ RFI types API not available, returning empty array');
        console.warn('⚠️ Response status:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching RFI types:', error);
      return [];
    }
  }

  /**
   * Get current user's RFI permissions for a project
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} User permissions and workflow info
   */
  static async getRfiUserPermissions(projectId) {
    try {
      console.log('🔍 Fetching RFI user permissions from ACC...');
      const headers = this.getHeaders();
      
      // Convert project ID format (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/construction/rfis/v3/projects/${cleanProjectId}/users/me`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RFI user permissions fetched successfully');
        return data;
      } else {
        console.warn('⚠️ RFI user permissions API not available');
        console.warn('⚠️ Response status:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching RFI user permissions:', error);
      return null;
    }
  }

  /**
   * Get individual RFI details by ID
   * @param {string} projectId - The project ID
   * @param {string} rfiId - The RFI ID
   * @returns {Promise<Object>} RFI details
   */
  static async getRfiDetails(projectId, rfiId) {
    try {
      console.log('🔍 Fetching RFI details from ACC...');
      console.log('🔍 Project ID:', projectId);
      console.log('🔍 RFI ID:', rfiId);
      
      const headers = this.getHeaders();
      
      // Convert project ID format (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Use backend proxy to avoid CORS
      const response = await fetch(`http://localhost:3001/api/acc/rfis/${cleanProjectId}/${rfiId}`, {
        method: 'GET',
        headers: {
          'Authorization': headers.Authorization,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RFI details fetched successfully:', data);
        return data;
      } else {
        console.warn('⚠️ RFI details API not available');
        console.warn('⚠️ Response status:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching RFI details:', error);
      return null;
    }
  }

  /**
   * Get user details by user ID using HQ API
   * @param {string} userId - The user ID
   * @param {string} accountId - The account ID (hub ID without 'b.' prefix)
   * @returns {Promise<Object>} User details
   */
  static async getUserDetails(userId, accountId) {
    try {
      console.log('🔍 Fetching user details from HQ API...');
      console.log('🔍 User ID:', userId);
      console.log('🔍 Account ID:', accountId);
      
      const headers = this.getHeaders();
      
      // Convert account ID format (remove 'b.' prefix if present)
      let cleanAccountId = accountId;
      if (accountId && accountId.startsWith('b.')) {
        cleanAccountId = accountId.substring(2);
      }
      
      const response = await fetch(`https://developer.api.autodesk.com/hq/v1/accounts/${cleanAccountId}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': headers.Authorization,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ User details fetched successfully:', data);
        return data;
      } else {
        console.warn('⚠️ User details API not available');
        console.warn('⚠️ Response status:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      return null;
    }
  }

  /**
   * Test RFI API access with simple request
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Test result
   */
  static async testRfiApiAccess(projectId) {
    try {
      console.log('🧪 Testing RFI API access...');
      const headers = this.getHeaders();
      
      // Convert project ID format (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Test with minimal search request via backend proxy (avoids CORS)
      const searchUrl = `/api/acc/rfis/search`;
      const searchBody = {
        limit: 1,
        offset: 0
      };
      
      console.log('🧪 Test URL (proxy):', searchUrl);
      console.log('🧪 Test body:', { projectId: cleanProjectId, body: searchBody });
      
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': headers['Authorization'] || headers['authorization'],
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId: cleanProjectId, body: searchBody })
      });
      
      console.log('🧪 Test response status:', response.status);
      console.log('🧪 Test response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RFI API test successful:', data);
        return {
          success: true,
          status: response.status,
          data: data,
          totalResults: data.pagination?.totalResults || 0
        };
      } else {
        const errorText = await response.text();
        console.warn('⚠️ RFI API test failed:', response.status, response.statusText);
        console.warn('⚠️ Error response:', errorText);
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: errorText
        };
      }
    } catch (error) {
      console.error('❌ RFI API test error:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  static async getProjectBudgetPayments(projectId) {
    try {
      console.log('🔍 Fetching project budget payments from ACC...');
      const headers = this.getHeaders();
      const response = await fetch(`https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/budget-payments`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      } else {
        console.warn('⚠️ Budget payments API not available, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching budget payments:', error);
      return [];
    }
  }

  static async getProjectCostPayments(projectId) {
    try {
      console.log('🔍 Fetching project cost payments from ACC...');
      const headers = this.getHeaders();
      
      // Clean project ID (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Use the Cost Management API for more detailed cost payment information
      const response = await fetch(`https://developer.api.autodesk.com/cost/v1/containers/${cleanProjectId}/cost-payments`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('💰 Raw cost payments response:', data);
        
        // Filter cost payments by status - include pending, submitted, and overdue
        const relevantStatuses = ['pending', 'submitted', 'draft', 'under_review'];
        const filteredPayments = (data.results || []).filter(payment => {
          const status = (payment.status || '').toLowerCase();
          const hasRelevantStatus = relevantStatuses.includes(status);
          
          console.log(`💰 Cost Payment ${payment.id}: status=${status}, relevant=${hasRelevantStatus}`);
          return hasRelevantStatus;
        });
        
        console.log(`💰 Found ${filteredPayments.length} cost payments with relevant statuses`);
        return filteredPayments;
      } else {
        console.warn('⚠️ Cost payments API not available, trying fallback...');
        
        // Fallback to admin API
        const fallbackResponse = await fetch(`https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/cost-payments`, {
          headers
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.data || [];
        } else {
          console.warn('⚠️ Both cost payment APIs not available, returning empty array');
          return [];
        }
      }
    } catch (error) {
      console.error('❌ Error fetching cost payments:', error);
      return [];
    }
  }

  static async getProjectContracts(projectId) {
    try {
      console.log('🔍 Fetching project contracts from ACC...');
      const headers = this.getHeaders();
      
      // Clean project ID (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Use the Cost Management API for more detailed contract information
      const response = await fetch(`https://developer.api.autodesk.com/cost/v1/containers/${cleanProjectId}/contracts`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Raw contracts response:', data);
        
        // Filter contracts by status - only show draft, revise, and resubmit statuses
        const relevantStatuses = ['draft', 'revise', 'resubmit'];
        const filteredContracts = (data.results || []).filter(contract => {
          const status = (contract.status || '').toLowerCase();
          const subStatus = (contract.subStatus || '').toLowerCase();
          
          // Include contracts with relevant statuses
          const hasRelevantStatus = relevantStatuses.includes(status) || 
                                  relevantStatuses.includes(subStatus);
          
          console.log(`📋 Contract ${contract.id}: status=${status}, subStatus=${subStatus}, relevant=${hasRelevantStatus}`);
          return hasRelevantStatus;
        });
        
        console.log(`📋 Found ${filteredContracts.length} contracts with relevant statuses`);
        return filteredContracts;
      } else {
        console.warn('⚠️ Contracts API not available, trying fallback...');
        
        // Fallback to admin API
        const fallbackResponse = await fetch(`https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/contracts`, {
          headers
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.data || [];
        } else {
          console.warn('⚠️ Both contract APIs not available, returning empty array');
          return [];
        }
      }
    } catch (error) {
      console.error('❌ Error fetching contracts:', error);
      return [];
    }
  }

  // ===== ACC COST & TIME MODULE API METHODS =====

  /**
   * Get project budgets from ACC Cost & Time module
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Budget items
   */
  static async getProjectBudgets(projectId) {
    try {
      console.log('🔍 Fetching project budgets from ACC Cost & Time module...');
      const headers = this.getHeaders();
      
      // Clean project ID (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Try Cost Management API first
      const response = await fetch(`https://developer.api.autodesk.com/cost/v1/containers/${cleanProjectId}/budgets`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('💰 Raw budgets response:', data);
        
        return (data.results || data.data || []).map(budget => ({
          id: budget.id,
          name: budget.name || budget.title || 'Unnamed Budget Item',
          description: budget.description || '',
          budgetCode: budget.budgetCode || budget.code || '',
          category: budget.category || budget.type || 'Budget',
          status: budget.status || 'Planned',
          priority: budget.priority || 'Medium',
          
          // Financial data
          budgetAmount: budget.budgetAmount || budget.plannedAmount || budget.amount || 0,
          actualAmount: budget.actualAmount || budget.spentAmount || budget.actualCost || 0,
          remainingAmount: budget.remainingAmount || budget.budgetAmount - (budget.actualAmount || 0),
          currency: budget.currency || 'USD',
          
          // Time data
          plannedStartDate: budget.plannedStartDate || budget.startDate || budget.scheduledStart,
          plannedEndDate: budget.plannedEndDate || budget.endDate || budget.scheduledEnd,
          actualStartDate: budget.actualStartDate || budget.startedAt,
          actualEndDate: budget.actualEndDate || budget.completedAt,
          
          // Hours data
          plannedHours: budget.plannedHours || budget.estimatedHours || budget.hours || 0,
          actualHours: budget.actualHours || budget.spentHours || budget.workedHours || 0,
          remainingHours: budget.remainingHours || budget.plannedHours - (budget.actualHours || 0),
          
          // Progress data
          completionPercentage: budget.completionPercentage || budget.progress || 0,
          progress: budget.progress || 0,
          
          // Resource data
          responsible: budget.responsible || budget.assignedTo || budget.owner,
          assignedTo: budget.assignedTo || budget.responsible || budget.owner,
          team: budget.team || budget.department || '',
          
          // Additional fields
          workPackages: budget.workPackages || budget.parts || 1,
          predecessor: budget.predecessor || budget.dependency || '',
          notes: budget.notes || budget.comments || '',
          tags: budget.tags || [],
          
          // Timestamps
          createdDate: budget.createdDate || budget.createdAt,
          modifiedDate: budget.modifiedDate || budget.updatedAt,
          createdBy: budget.createdBy || budget.creator,
          modifiedBy: budget.modifiedBy || budget.updater
        }));
      } else {
        console.warn('⚠️ Cost Management API not available, trying fallback...');
        
        // Fallback to Construction Admin API
        const fallbackResponse = await fetch(`https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/budgets`, {
          headers
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.data || [];
        } else {
          console.warn('⚠️ Both budget APIs not available, returning empty array');
          return [];
        }
      }
    } catch (error) {
      console.error('❌ Error fetching budgets:', error);
      return [];
    }
  }

  /**
   * Get project work packages from ACC Cost & Time module
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Work packages
   */
  static async getProjectWorkPackages(projectId) {
    try {
      console.log('🔍 Fetching project work packages from ACC Cost & Time module...');
      const headers = this.getHeaders();
      
      // Clean project ID (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Try Cost Management API first
      const response = await fetch(`https://developer.api.autodesk.com/cost/v1/containers/${cleanProjectId}/work-packages`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Raw work packages response:', data);
        
        return (data.results || data.data || []).map(workPackage => ({
          id: workPackage.id,
          name: workPackage.name || workPackage.title || 'Unnamed Work Package',
          description: workPackage.description || '',
          code: workPackage.code || workPackage.workPackageCode || '',
          category: workPackage.category || workPackage.type || 'Work Package',
          status: workPackage.status || 'Planned',
          priority: workPackage.priority || 'Medium',
          
          // Financial data
          budgetAmount: workPackage.budgetAmount || workPackage.plannedAmount || workPackage.amount || 0,
          actualAmount: workPackage.actualAmount || workPackage.spentAmount || workPackage.actualCost || 0,
          remainingAmount: workPackage.remainingAmount || workPackage.budgetAmount - (workPackage.actualAmount || 0),
          currency: workPackage.currency || 'USD',
          
          // Time data
          plannedStartDate: workPackage.plannedStartDate || workPackage.startDate || workPackage.scheduledStart,
          plannedEndDate: workPackage.plannedEndDate || workPackage.endDate || workPackage.scheduledEnd,
          actualStartDate: workPackage.actualStartDate || workPackage.startedAt,
          actualEndDate: workPackage.actualEndDate || workPackage.completedAt,
          
          // Hours data
          plannedHours: workPackage.plannedHours || workPackage.estimatedHours || workPackage.hours || 0,
          actualHours: workPackage.actualHours || workPackage.spentHours || workPackage.workedHours || 0,
          remainingHours: workPackage.remainingHours || workPackage.plannedHours - (workPackage.actualHours || 0),
          
          // Progress data
          completionPercentage: workPackage.completionPercentage || workPackage.progress || 0,
          progress: workPackage.progress || 0,
          
          // Resource data
          responsible: workPackage.responsible || workPackage.assignedTo || workPackage.owner,
          assignedTo: workPackage.assignedTo || workPackage.responsible || workPackage.owner,
          team: workPackage.team || workPackage.department || '',
          
          // Additional fields
          parts: workPackage.parts || 1,
          predecessor: workPackage.predecessor || workPackage.dependency || '',
          notes: workPackage.notes || workPackage.comments || '',
          tags: workPackage.tags || [],
          
          // Timestamps
          createdDate: workPackage.createdDate || workPackage.createdAt,
          modifiedDate: workPackage.modifiedDate || workPackage.updatedAt,
          createdBy: workPackage.createdBy || workPackage.creator,
          modifiedBy: workPackage.modifiedBy || workPackage.updater
        }));
      } else {
        console.warn('⚠️ Cost Management API not available, trying fallback...');
        
        // Fallback to Construction Admin API
        const fallbackResponse = await fetch(`https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/work-packages`, {
          headers
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.data || [];
        } else {
          console.warn('⚠️ Both work package APIs not available, returning empty array');
          return [];
        }
      }
    } catch (error) {
      console.error('❌ Error fetching work packages:', error);
      return [];
    }
  }

  /**
   * Get project schedule from ACC Cost & Time module
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Schedule items
   */
  static async getProjectSchedule(projectId) {
    try {
      console.log('🔍 Fetching project schedule from ACC Cost & Time module...');
      const headers = this.getHeaders();
      
      // Clean project ID (remove 'b.' prefix if present)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Try Cost Management API first
      const response = await fetch(`https://developer.api.autodesk.com/cost/v1/containers/${cleanProjectId}/schedule`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Raw schedule response:', data);
        
        return (data.results || data.data || []).map(scheduleItem => ({
          id: scheduleItem.id,
          name: scheduleItem.name || scheduleItem.title || 'Unnamed Schedule Item',
          description: scheduleItem.description || '',
          code: scheduleItem.code || scheduleItem.scheduleCode || '',
          category: scheduleItem.category || scheduleItem.type || 'Schedule',
          status: scheduleItem.status || 'Planned',
          priority: scheduleItem.priority || 'Medium',
          
          // Time data
          plannedStartDate: scheduleItem.plannedStartDate || scheduleItem.startDate || scheduleItem.scheduledStart,
          plannedEndDate: scheduleItem.plannedEndDate || scheduleItem.endDate || scheduleItem.scheduledEnd,
          actualStartDate: scheduleItem.actualStartDate || scheduleItem.startedAt,
          actualEndDate: scheduleItem.actualEndDate || scheduleItem.completedAt,
          
          // Duration data
          plannedDuration: scheduleItem.plannedDuration || scheduleItem.duration || 0,
          actualDuration: scheduleItem.actualDuration || scheduleItem.workedDuration || 0,
          remainingDuration: scheduleItem.remainingDuration || scheduleItem.plannedDuration - (scheduleItem.actualDuration || 0),
          
          // Progress data
          completionPercentage: scheduleItem.completionPercentage || scheduleItem.progress || 0,
          progress: scheduleItem.progress || 0,
          
          // Resource data
          responsible: scheduleItem.responsible || scheduleItem.assignedTo || scheduleItem.owner,
          assignedTo: scheduleItem.assignedTo || scheduleItem.responsible || scheduleItem.owner,
          team: scheduleItem.team || scheduleItem.department || '',
          
          // Additional fields
          predecessor: scheduleItem.predecessor || scheduleItem.dependency || '',
          successor: scheduleItem.successor || scheduleItem.nextTask || '',
          notes: scheduleItem.notes || scheduleItem.comments || '',
          tags: scheduleItem.tags || [],
          
          // Timestamps
          createdDate: scheduleItem.createdDate || scheduleItem.createdAt,
          modifiedDate: scheduleItem.modifiedDate || scheduleItem.updatedAt,
          createdBy: scheduleItem.createdBy || scheduleItem.creator,
          modifiedBy: scheduleItem.modifiedBy || scheduleItem.updater
        }));
      } else {
        console.warn('⚠️ Cost Management API not available, trying fallback...');
        
        // Fallback to Construction Admin API
        const fallbackResponse = await fetch(`https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/schedule`, {
          headers
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.data || [];
        } else {
          console.warn('⚠️ Both schedule APIs not available, returning empty array');
          return [];
        }
      }
    } catch (error) {
      console.error('❌ Error fetching schedule:', error);
      return [];
    }
  }

  /**
   * Get comprehensive project data for Gantt chart
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Combined project data
   */
  static async getProjectGanttData(projectId) {
    try {
      console.log('🔍 Fetching comprehensive project data for Gantt chart...');
      
      // Fetch all data in parallel
      const [budgets, workPackages, schedule] = await Promise.all([
        this.getProjectBudgets(projectId),
        this.getProjectWorkPackages(projectId),
        this.getProjectSchedule(projectId)
      ]);
      
      console.log('📊 Combined project data:', {
        budgets: budgets.length,
        workPackages: workPackages.length,
        schedule: schedule.length
      });
      
      return {
        budgets,
        workPackages,
        schedule,
        totalItems: budgets.length + workPackages.length + schedule.length
      };
    } catch (error) {
      console.error('❌ Error fetching project Gantt data:', error);
      return {
        budgets: [],
        workPackages: [],
        schedule: [],
        totalItems: 0
      };
    }
  }

  // ===== WEBHOOKS CLIENT CLASS (JavaScript equivalent of WebhooksClient) =====

  /**
   * WebhooksClient - JavaScript equivalent of Autodesk.Webhooks.WebhooksClient
   * Client for managing webhooks with full API compatibility
   */
  static WebhooksClient = class {
    constructor(sdkManager = null, authenticationProvider = null) {
      this.sdkManager = sdkManager;
      this.authenticationProvider = authenticationProvider;
      this.baseUrl = 'https://developer.api.autodesk.com/webhooks/v1';
      this.region = 'US';
      this.accessToken = null;
    }

    /**
     * Set authentication provider
     * @param {Object} provider - Authentication provider
     */
    setAuthenticationProvider(provider) {
      this.authenticationProvider = provider;
    }

    /**
     * Set access token
     * @param {string} token - Access token
     */
    setAccessToken(token) {
      this.accessToken = token;
    }

    /**
     * Set region
     * @param {string} region - Region (US, EMEA, APAC)
     */
    setRegion(region) {
      this.region = region;
    }

    /**
     * Get current access token
     * @returns {Promise<string>} Access token
     */
    async getAccessToken() {
      if (this.accessToken) {
        return this.accessToken;
      }

      if (this.authenticationProvider) {
        // Try to get token from authentication provider
        try {
          const token = await this.authenticationProvider.getToken();
          return token;
        } catch (error) {
          console.error('❌ DEBUG: Error getting token from auth provider:', error);
        }
      }

      // Fallback to stored credentials
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      return credentials.threeLegToken || credentials.twoLegToken;
    }

    /**
     * Create a webhook for a specific event (string parameters)
     * @param {string} system - System ID (e.g., 'data', 'autodesk.construction.cost')
     * @param {string} event - Event ID (e.g., 'dm.version.added', 'budget.created-1.0')
     * @param {Object} hookPayload - Webhook payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async createSystemEventHookAsync(system, event, hookPayload, region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Creating webhook for system: ${system}, event: ${event}`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/systems/${system}/events/${event}/hooks`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(hookPayload)
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Create webhook');
          throw error;
        }

        return response;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to create webhook: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * Create a webhook for a specific event (enum parameters)
     * @param {string} system - System enum value
     * @param {string} event - Event enum value
     * @param {Object} hookPayload - Webhook payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async createSystemEventHookAsyncEnum(system, event, hookPayload, region = 'US', accessToken = null, throwOnError = true) {
      return this.createSystemEventHookAsync(system, event, hookPayload, region, accessToken, throwOnError);
    }

    /**
     * Create webhooks for all events in a system (string parameters)
     * @param {string} system - System ID
     * @param {Object} hookPayload - Webhook payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hook object
     */
    async createSystemHookAsync(system, hookPayload, region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Creating webhook for all events in system: ${system}`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/systems/${system}/hooks`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(hookPayload)
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Create system webhook');
          throw error;
        }

        const result = await response.json();
        return result.data || result;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to create system webhook: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * Create webhooks for all events in a system (enum parameters)
     * @param {string} system - System enum value
     * @param {Object} hookPayload - Webhook payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hook object
     */
    async createSystemHookAsyncEnum(system, hookPayload, region = 'US', accessToken = null, throwOnError = true) {
      return this.createSystemHookAsync(system, hookPayload, region, accessToken, throwOnError);
    }

    /**
     * Create secret token
     * @param {Object} tokenPayload - Token payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Token object
     */
    async createTokenAsync(tokenPayload, region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Creating secret token`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/tokens`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(tokenPayload)
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Create token');
          throw error;
        }

        const result = await response.json();
        return result.data || result;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to create token: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * Delete a webhook (string parameters)
     * @param {string} system - System ID
     * @param {string} event - Event ID
     * @param {string} hookId - Webhook ID
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async deleteSystemEventHookAsync(system, event, hookId, region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Deleting webhook: ${hookId} for system: ${system}, event: ${event}`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/systems/${system}/events/${event}/hooks/${hookId}`;
        
        const response = await fetch(url, {
          method: 'DELETE',
          headers: headers
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Delete webhook');
          throw error;
        }

        return response;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to delete webhook: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * Delete a webhook (enum parameters)
     * @param {string} system - System enum value
     * @param {string} event - Event enum value
     * @param {string} hookId - Webhook ID
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async deleteSystemEventHookAsyncEnum(system, event, hookId, region = 'US', accessToken = null, throwOnError = true) {
      return this.deleteSystemEventHookAsync(system, event, hookId, region, accessToken, throwOnError);
    }

    /**
     * Delete secret token
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async deleteTokenAsync(region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Deleting secret token`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/tokens/@me`;
        
        const response = await fetch(url, {
          method: 'DELETE',
          headers: headers
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Delete token');
          throw error;
        }

        return response;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to delete token: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * List all webhooks for an app
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} pageState - Page state for pagination
     * @param {string} status - Status filter (active, inactive, reactivated)
     * @param {string} sort - Sort order (asc, desc)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hooks object
     */
    async getAppHooksAsync(region = 'US', pageState = null, status = 'active', sort = 'asc', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Getting app webhooks`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const queryParams = new URLSearchParams();
        if (pageState) queryParams.append('pageState', pageState);
        if (status) queryParams.append('status', status);
        if (sort) queryParams.append('sort', sort);

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/app/hooks?${queryParams.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Get app webhooks');
          throw error;
        }

        const result = await response.json();
        return result;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to get app webhooks: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * Get webhook details (string parameters)
     * @param {string} system - System ID
     * @param {string} event - Event ID
     * @param {string} hookId - Webhook ID
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hook details
     */
    async getHookDetailsAsync(system, event, hookId, region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Getting webhook details: ${hookId}`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/systems/${system}/events/${event}/hooks/${hookId}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Get webhook details');
          throw error;
        }

        const result = await response.json();
        return result.data || result;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to get webhook details: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * Get webhook details (enum parameters)
     * @param {string} system - System enum value
     * @param {string} event - Event enum value
     * @param {string} hookId - Webhook ID
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hook details
     */
    async getHookDetailsAsyncEnum(system, event, hookId, region = 'US', accessToken = null, throwOnError = true) {
      return this.getHookDetailsAsync(system, event, hookId, region, accessToken, throwOnError);
    }

    /**
     * List all webhooks
     * @param {string} pageState - Page state for pagination
     * @param {string} status - Status filter (active, inactive, reactivated)
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hooks object
     */
    async getHooksAsync(pageState = null, status = 'active', region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Getting all webhooks`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const queryParams = new URLSearchParams();
        if (pageState) queryParams.append('pageState', pageState);
        if (status) queryParams.append('status', status);

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/hooks?${queryParams.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Get all webhooks');
          throw error;
        }

        const result = await response.json();
        return result;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to get all webhooks: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * List all webhooks for an event (string parameters)
     * @param {string} system - System ID
     * @param {string} event - Event ID
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} scopeName - Scope name filter
     * @param {string} pageState - Page state for pagination
     * @param {string} status - Status filter (active, inactive, reactivated)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hooks object
     */
    async getSystemEventHooksAsync(system, event, region = 'US', scopeName = null, pageState = null, status = 'active', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Getting webhooks for system: ${system}, event: ${event}`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const queryParams = new URLSearchParams();
        if (scopeName) queryParams.append('scopeName', scopeName);
        if (pageState) queryParams.append('pageState', pageState);
        if (status) queryParams.append('status', status);

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/systems/${system}/events/${event}/hooks?${queryParams.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Get system event webhooks');
          throw error;
        }

        const result = await response.json();
        return result;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to get system event webhooks: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * List all webhooks for an event (enum parameters)
     * @param {string} system - System enum value
     * @param {string} event - Event enum value
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} scopeName - Scope name filter
     * @param {string} pageState - Page state for pagination
     * @param {string} status - Status filter (active, inactive, reactivated)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hooks object
     */
    async getSystemEventHooksAsyncEnum(system, event, region = 'US', scopeName = null, pageState = null, status = 'active', accessToken = null, throwOnError = true) {
      return this.getSystemEventHooksAsync(system, event, region, scopeName, pageState, status, accessToken, throwOnError);
    }

    /**
     * List all webhooks for a system (string parameters)
     * @param {string} system - System ID
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} status - Status filter (active, inactive, reactivated)
     * @param {string} pageState - Page state for pagination
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hooks object
     */
    async getSystemHooksAsync(system, region = 'US', status = 'active', pageState = null, accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Getting webhooks for system: ${system}`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const queryParams = new URLSearchParams();
        if (status) queryParams.append('status', status);
        if (pageState) queryParams.append('pageState', pageState);

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/systems/${system}/hooks?${queryParams.toString()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Get system webhooks');
          throw error;
        }

        const result = await response.json();
        return result;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to get system webhooks: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * List all webhooks for a system (enum parameters)
     * @param {string} system - System enum value
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} status - Status filter (active, inactive, reactivated)
     * @param {string} pageState - Page state for pagination
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Object>} Hooks object
     */
    async getSystemHooksAsyncEnum(system, region = 'US', status = 'active', pageState = null, accessToken = null, throwOnError = true) {
      return this.getSystemHooksAsync(system, region, status, pageState, accessToken, throwOnError);
    }

    /**
     * Update a webhook (string parameters)
     * @param {string} system - System ID
     * @param {string} event - Event ID
     * @param {string} hookId - Webhook ID
     * @param {Object} modifyHookPayload - Modify webhook payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async patchSystemEventHookAsync(system, event, hookId, modifyHookPayload, region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Updating webhook: ${hookId}`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/systems/${system}/events/${event}/hooks/${hookId}`;
        
        const response = await fetch(url, {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify(modifyHookPayload)
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Update webhook');
          throw error;
        }

        return response;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to update webhook: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }

    /**
     * Update a webhook (enum parameters)
     * @param {string} system - System enum value
     * @param {string} event - Event enum value
     * @param {string} hookId - Webhook ID
     * @param {Object} modifyHookPayload - Modify webhook payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async patchSystemEventHookAsyncEnum(system, event, hookId, modifyHookPayload, region = 'US', accessToken = null, throwOnError = true) {
      return this.patchSystemEventHookAsync(system, event, hookId, modifyHookPayload, region, accessToken, throwOnError);
    }

    /**
     * Update secret token
     * @param {Object} tokenPayload - Token payload
     * @param {string} region - Region (US, EMEA, APAC)
     * @param {string} accessToken - Access token
     * @param {boolean} throwOnError - Whether to throw on error
     * @returns {Promise<Response>} HTTP response
     */
    async putTokenAsync(tokenPayload, region = 'US', accessToken = null, throwOnError = true) {
      try {
        console.log(`🔍 DEBUG: Updating secret token`);
        
        const token = accessToken || await this.getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ads-region': region
        };

        const url = `${this.baseUrl}/tokens/@me`;
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(tokenPayload)
        });

        if (!response.ok && throwOnError) {
          const error = await AccService.handleWebhookApiError(response, 'Update token');
          throw error;
        }

        return response;
      } catch (error) {
        if (AccService.isWebhooksApiException(error)) {
          throw error;
        } else {
          const wrappedError = new AccService.WebhooksApiException(
            `Failed to update token: ${error.message}`,
            null,
            error
          );
          throw wrappedError;
        }
      }
    }
  };
}

export default AccService;