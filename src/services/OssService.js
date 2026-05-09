/**
 * OssService - Service for Autodesk Platform Services (APS) Object Storage Service (OSS)
 * Based on https://aps.autodesk.com/en/docs/data/v2/reference/dot-net-sdk-oss/
 * Handles file upload, download, and migration operations
 */
class OssService {
  static credentials = null;
  static accessToken = null;
  static twoLegToken = null;
  static threeLegToken = null;

  static initialize(credentials) {
    OssService.credentials = credentials;
    // Use 2-legged token for bucket operations, 3-legged token for project operations
    OssService.accessToken = credentials?.twoLegToken || credentials?.threeLegToken;
    OssService.twoLegToken = credentials?.twoLegToken;
    OssService.threeLegToken = credentials?.threeLegToken;
    console.log('✅ OssService initialized with tokens:', {
      twoLeg: OssService.twoLegToken ? 'Present' : 'Missing',
      threeLeg: OssService.threeLegToken ? 'Present' : 'Missing'
    });
  }

  static getHeaders(useTwoLeg = false) {
    const token = useTwoLeg ? OssService.twoLegToken : OssService.threeLegToken;
    if (!token) {
      throw new Error(`No ${useTwoLeg ? '2-legged' : '3-legged'} access token available for OSS operations`);
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  static getBucketHeaders() {
    return OssService.getHeaders(true); // Use 2-legged token for bucket operations
  }

  static getProjectHeaders() {
    return OssService.getHeaders(false); // Use 3-legged token for project operations
  }

  /**
   * Create a storage location in OSS for file upload
   * POST /data/v1/projects/{project_id}/storage
   * @param {string} projectId - Project ID
   * @param {string} fileName - Name of the file to upload
   * @param {string} folderId - Target folder ID (optional)
   * @returns {Promise<Object>} Storage location details
   */
  static async createStorageLocation(projectId, fileName, folderId = null) {
    try {
      console.log('📦 Creating OSS storage location for:', fileName);
      
      const cleanProjectId = projectId.replace(/^b\./, '');
      const url = `https://developer.api.autodesk.com/data/v1/projects/${cleanProjectId}/storage`;
      
      const requestBody = {
        jsonapi: {
          version: "1.0"
        },
        data: {
          type: "objects",
          attributes: {
            name: fileName
          }
        }
      };

      // Add target folder relationship if provided
      if (folderId) {
        requestBody.data.relationships = {
          target: {
            data: {
              type: "folders",
              id: folderId
            }
          }
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...OssService.getProjectHeaders(),
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OSS storage creation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ OSS storage location created:', data.data.id);
      return data.data;
    } catch (error) {
      console.error('❌ Error creating OSS storage location:', error);
      throw error;
    }
  }

  /**
   * Upload file to OSS using direct upload
   * @param {File} file - File object to upload
   * @param {string} projectId - Project ID
   * @param {string} folderId - Target folder ID (optional)
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} Upload result
   */
  static async uploadFile(file, projectId, folderId = null, onProgress = null) {
    try {
      console.log('📤 Uploading file to OSS:', file.name);
      
      // Step 1: Create storage location
      const storageLocation = await OssService.createStorageLocation(projectId, file.name, folderId);
      
      // Step 2: Get upload URL from storage location
      const uploadUrl = storageLocation.links?.self?.href;
      if (!uploadUrl) {
        throw new Error('No upload URL provided by OSS');
      }

      // Step 3: Upload file directly to OSS
      const uploadResponse = await OssService.uploadToUrl(file, uploadUrl, onProgress);
      
      console.log('✅ File uploaded successfully:', file.name);
      return {
        success: true,
        objectId: storageLocation.id,
        fileName: file.name,
        size: file.size,
        uploadUrl: uploadUrl
      };
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload file to specific URL (direct upload to OSS)
   * @param {File} file - File to upload
   * @param {string} uploadUrl - OSS upload URL
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  static async uploadToUrl(file, uploadUrl, onProgress = null) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            status: xhr.status,
            response: xhr.response
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }

  /**
   * Download file from OSS
   * @param {string} objectId - Object ID in OSS
   * @param {string} projectId - Project ID
   * @returns {Promise<Blob>} File blob
   */
  static async downloadFile(objectId, projectId) {
    try {
      console.log('📥 Downloading file from OSS:', objectId);
      
      const cleanProjectId = projectId.replace(/^b\./, '');
      const url = `https://developer.api.autodesk.com/data/v1/projects/${cleanProjectId}/storage/${objectId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: OssService.getProjectHeaders()
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('✅ File downloaded successfully:', objectId);
      return blob;
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from OSS
   * @param {string} objectId - Object ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} File metadata
   */
  static async getFileMetadata(objectId, projectId) {
    try {
      console.log('📋 Getting file metadata:', objectId);
      
      const cleanProjectId = projectId.replace(/^b\./, '');
      const url = `https://developer.api.autodesk.com/data/v1/projects/${cleanProjectId}/storage/${objectId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: OssService.getProjectHeaders()
      });

      if (!response.ok) {
        throw new Error(`Metadata fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ File metadata retrieved:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Delete file from OSS
   * @param {string} objectId - Object ID to delete
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteFile(objectId, projectId) {
    try {
      console.log('🗑️ Deleting file from OSS:', objectId);
      
      const cleanProjectId = projectId.replace(/^b\./, '');
      const url = `https://developer.api.autodesk.com/data/v1/projects/${cleanProjectId}/storage/${objectId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: OssService.getProjectHeaders()
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ File deleted successfully:', objectId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Migrate files between projects using OSS
   * @param {Array} files - Array of file objects to migrate
   * @param {string} sourceProjectId - Source project ID
   * @param {string} targetProjectId - Target project ID
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Migration result
   */
  static async migrateFiles(files, sourceProjectId, targetProjectId, onProgress = null) {
    try {
      console.log('🔄 Starting file migration:', files.length, 'files');
      
      const results = {
        total: files.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`📤 Migrating file ${i + 1}/${files.length}:`, file.name);
          
          // Download from source project
          const fileBlob = await OssService.downloadFile(file.id, sourceProjectId);
          
          // Create new file object for upload
          const newFile = new File([fileBlob], file.name, { type: file.type });
          
          // Upload to target project
          await OssService.uploadFile(newFile, targetProjectId, null, (progress) => {
            if (onProgress) {
              const overallProgress = ((i + progress / 100) / files.length) * 100;
              onProgress(overallProgress);
            }
          });
          
          results.successful++;
          console.log(`✅ File migrated successfully: ${file.name}`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            fileName: file.name,
            error: error.message
          });
          console.error(`❌ Failed to migrate file: ${file.name}`, error);
        }
      }

      console.log('✅ Migration completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Error during file migration:', error);
      throw error;
    }
  }

  /**
   * Get storage usage for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Storage usage information
   */
  static async getStorageUsage(projectId) {
    try {
      console.log('📊 Getting storage usage for project:', projectId);
      
      const cleanProjectId = projectId.replace(/^b\./, '');
      const url = `https://developer.api.autodesk.com/data/v1/projects/${cleanProjectId}/storage`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: OssService.getProjectHeaders()
      });

      if (!response.ok) {
        throw new Error(`Storage usage fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Storage usage retrieved:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting storage usage:', error);
      throw error;
    }
  }

  // ===== BUCKET MANAGEMENT METHODS =====

  /**
   * Create a new bucket with specified policy
   * @param {string} bucketKey - Unique bucket identifier
   * @param {string} policyKey - Bucket policy (transient, temporary, persistent)
   * @returns {Promise<Object>} Bucket creation result
   */
  static async createBucket(bucketKey, policyKey = 'transient') {
    try {
      console.log('🪣 Creating bucket:', bucketKey, 'with policy:', policyKey);
      
      const url = 'https://developer.api.autodesk.com/oss/v2/buckets';
      const body = {
        bucketKey: bucketKey,
        policyKey: policyKey
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...OssService.getBucketHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bucket creation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Bucket created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating bucket:', error);
      throw error;
    }
  }

  /**
   * Get bucket details
   * @param {string} bucketKey - Bucket identifier
   * @returns {Promise<Object>} Bucket details
   */
  static async getBucketDetails(bucketKey) {
    try {
      console.log('🔍 Getting bucket details for:', bucketKey);
      
      const url = `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/details`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: OssService.getBucketHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bucket details fetch failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Bucket details retrieved:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting bucket details:', error);
      throw error;
    }
  }

  /**
   * List all buckets
   * @returns {Promise<Array>} List of buckets
   */
  static async listBuckets() {
    try {
      console.log('📋 Listing all buckets');
      
      const url = 'https://developer.api.autodesk.com/oss/v2/buckets';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: OssService.getBucketHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bucket listing failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Buckets listed:', data.items?.length || 0);
      return data.items || [];
    } catch (error) {
      console.error('❌ Error listing buckets:', error);
      throw error;
    }
  }

  // ===== MULTIPART UPLOAD METHODS =====

  /**
   * Initiate multipart upload with S3 signed URLs
   * @param {string} bucketKey - Bucket identifier
   * @param {string} objectKey - Object identifier
   * @param {number} parts - Number of parts to split file into
   * @returns {Promise<Object>} Upload initiation result
   */
  static async initiateMultipartUpload(bucketKey, objectKey, parts = 1) {
    try {
      console.log('🚀 Initiating multipart upload:', objectKey, 'with', parts, 'parts');
      
      const url = `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${objectKey}/signeds3upload?parts=${parts}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: OssService.getBucketHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Multipart upload initiation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Multipart upload initiated:', data);
      return data;
    } catch (error) {
      console.error('❌ Error initiating multipart upload:', error);
      throw error;
    }
  }

  /**
   * Upload file part to S3 signed URL
   * @param {string} signedUrl - S3 signed URL for upload
   * @param {Blob} filePart - File part blob
   * @param {number} partNumber - Part number
   * @returns {Promise<Object>} Upload result
   */
  static async uploadFilePart(signedUrl, filePart, partNumber) {
    try {
      console.log(`📤 Uploading file part ${partNumber} to S3`);
      
      const response = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': filePart.size.toString()
        },
        body: filePart
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`File part ${partNumber} upload failed: ${response.status} - ${errorText}`);
      }

      console.log(`✅ File part ${partNumber} uploaded successfully`);
      return {
        partNumber: partNumber,
        etag: response.headers.get('ETag'),
        success: true
      };
    } catch (error) {
      console.error(`❌ Error uploading file part ${partNumber}:`, error);
      throw error;
    }
  }

  /**
   * Complete multipart upload
   * @param {string} bucketKey - Bucket identifier
   * @param {string} objectKey - Object identifier
   * @param {string} uploadKey - Upload key from initiation
   * @param {Array} parts - Array of uploaded parts with ETags
   * @returns {Promise<Object>} Completion result
   */
  static async completeMultipartUpload(bucketKey, objectKey, uploadKey, parts) {
    try {
      console.log('✅ Completing multipart upload:', objectKey);
      
      const url = `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${objectKey}/signeds3upload`;
      const body = {
        uploadKey: uploadKey,
        parts: parts
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...OssService.getBucketHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Multipart upload completion failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Multipart upload completed:', data);
      return data;
    } catch (error) {
      console.error('❌ Error completing multipart upload:', error);
      throw error;
    }
  }

  /**
   * Upload large file using multipart upload
   * @param {string} bucketKey - Bucket identifier
   * @param {string} objectKey - Object identifier
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} Upload result
   */
  static async uploadLargeFile(bucketKey, objectKey, file, onProgress = null) {
    try {
      console.log('📁 Uploading large file:', objectKey, 'Size:', file.size);
      
      // Calculate number of parts (minimum 5MB per part)
      const minPartSize = 5 * 1024 * 1024; // 5MB
      const parts = Math.ceil(file.size / minPartSize);
      
      console.log(`📊 File will be split into ${parts} parts`);
      
      // Step 1: Initiate multipart upload
      const uploadInit = await OssService.initiateMultipartUpload(bucketKey, objectKey, parts);
      const { uploadKey, urls } = uploadInit;
      
      // Step 2: Split file and upload parts
      const uploadedParts = [];
      const chunkSize = Math.ceil(file.size / parts);
      
      for (let i = 0; i < parts; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const fileChunk = file.slice(start, end);
        
        console.log(`📤 Uploading part ${i + 1}/${parts} (${start}-${end})`);
        
        // Update progress
        if (onProgress) {
          onProgress({
            part: i + 1,
            totalParts: parts,
            progress: ((i + 1) / parts) * 100,
            status: 'uploading'
          });
        }
        
        // Upload part to S3
        const uploadResult = await OssService.uploadFilePart(urls[i], fileChunk, i + 1);
        uploadedParts.push(uploadResult);
      }
      
      // Step 3: Complete multipart upload
      console.log('🔄 Completing multipart upload...');
      const result = await OssService.completeMultipartUpload(bucketKey, objectKey, uploadKey, uploadedParts);
      
      if (onProgress) {
        onProgress({
          part: parts,
          totalParts: parts,
          progress: 100,
          status: 'completed',
          result: result
        });
      }
      
      console.log('✅ Large file upload completed:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error uploading large file:', error);
      throw error;
    }
  }

  /**
   * Smart upload method that chooses between direct upload and multipart upload
   * @param {string} bucketKey - Bucket identifier
   * @param {string} objectKey - Object identifier
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} Upload result
   */
  static async smartUpload(bucketKey, objectKey, file, onProgress = null) {
    try {
      console.log('🧠 Smart upload for file:', objectKey, 'Size:', file.size);
      
      // Use multipart upload for files larger than 10MB
      const multipartThreshold = 10 * 1024 * 1024; // 10MB
      
      if (file.size > multipartThreshold) {
        console.log('📁 Using multipart upload for large file');
        return await OssService.uploadLargeFile(bucketKey, objectKey, file, onProgress);
      } else {
        console.log('📤 Using direct upload for small file');
        // For small files, use the existing direct upload method
        return await OssService.uploadFile(file, bucketKey, null, onProgress);
      }
    } catch (error) {
      console.error('❌ Error in smart upload:', error);
      throw error;
    }
  }
}

export default OssService;
