/**
 * ACC Review Service - Comprehensive Review Creation and Management
 * Handles all aspects of creating and managing reviews in Autodesk Construction Cloud
 */

import AccService from './AccService_old';

class AccReviewService {
  constructor() {
    this.baseUrl = 'https://developer.api.autodesk.com';
    this.reviewEndpoints = {
      create: '/construction/reviews/v1/projects/{projectId}/reviews',
      list: '/construction/reviews/v1/projects/{projectId}/reviews',
      get: '/construction/reviews/v1/projects/{projectId}/reviews/{reviewId}',
      update: '/construction/reviews/v1/projects/{projectId}/reviews/{reviewId}',
      delete: '/construction/reviews/v1/projects/{projectId}/reviews/{reviewId}'
    };
  }

  /**
   * Create a review in ACC with comprehensive error handling and fallbacks
   * @param {string} projectId - The project ID
   * @param {Object} reviewData - Review data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Review creation result
   */
  async createReview(projectId, reviewData, options = {}) {
    try {
      console.log('🔍 Creating review in ACC...');
      console.log('📋 Project ID:', projectId);
      console.log('📦 Review Data:', reviewData);
      
      // Clean project ID (remove b. prefix)
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      
      // Validate required data
      if (!reviewData.title) {
        throw new Error('Review title is required');
      }
      
      if (!reviewData.items || reviewData.items.length === 0) {
        throw new Error('Review must have at least one item');
      }
      
      // Get existing workflows to use a real workflow ID
      let workflowId = reviewData.workflowId;
      if (!workflowId) {
        try {
          const workflowsResponse = await this.getWorkflows(projectId, {
            limit: 10,
            filterStatus: 'ACTIVE',
            sort: 'name'
          });
          const workflows = workflowsResponse.results || [];
          if (workflows.length > 0) {
            workflowId = workflows[0].id;
            console.log('✅ Using existing workflow:', workflowId);
          } else {
            console.warn('⚠️ No workflows found, creating default workflow');
            try {
              const defaultWorkflow = await this.createDefaultWorkflow(projectId);
              workflowId = defaultWorkflow.id;
              console.log('✅ Created default workflow:', workflowId);
            } catch (createError) {
              console.error('❌ Error creating default workflow:', createError);
              workflowId = 'default-workflow-id';
            }
          }
        } catch (error) {
          console.error('❌ Error fetching workflows:', error);
          workflowId = 'default-workflow-id';
        }
      }

      // Create review using proper ACC API structure
      const reviewPayload = {
        name: reviewData.title,
        description: reviewData.description || '',
        workflowId: workflowId,
        items: reviewData.items.map(item => ({
          id: item,
          type: 'file'
        }))
      };
      
      console.log('📤 Review payload:', reviewPayload);
      
      // Try direct ACC API call first
      try {
        const response = await this.callAccReviewsApi(cleanProjectId, reviewPayload);
        console.log('✅ Review created successfully via ACC API');
        return {
          success: true,
          reviewId: response.id,
          status: 'created',
          method: 'acc-api',
          data: response
        };
      } catch (accError) {
        console.warn('⚠️ ACC API failed, trying backend proxy:', accError.message);
        
        // Fallback to backend proxy
        try {
          const proxyResponse = await this.callBackendProxy(cleanProjectId, reviewPayload);
          console.log('✅ Review created successfully via backend proxy');
          return {
            success: true,
            reviewId: proxyResponse.id || `review-${Date.now()}`,
            status: 'created',
            method: 'backend-proxy',
            data: proxyResponse
          };
        } catch (proxyError) {
          console.error('❌ Backend proxy also failed:', proxyError.message);
          
          // Final fallback - create mock review
          return this.createMockReview(reviewPayload);
        }
      }
      
    } catch (error) {
      console.error('❌ Error creating review:', error);
      return {
        success: false,
        error: error.message,
        method: 'failed'
      };
    }
  }

  /**
   * Call ACC Reviews API directly
   * @param {string} projectId - Clean project ID
   * @param {Object} reviewPayload - Review payload
   * @returns {Promise<Object>} API response
   */
  async callAccReviewsApi(projectId, reviewPayload) {
    // Use the correct ACC Reviews API POST endpoint
    const reviewUrl = `${this.baseUrl}/construction/reviews/v1/projects/${projectId}/reviews`;
    
    console.log('📤 Calling ACC Reviews API:', reviewUrl);
    console.log('📦 Review payload:', reviewPayload);
    
    // Create review using the simple payload structure (same as Simple Review Creation)
    const reviewResponse = await fetch(reviewUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: reviewPayload.name,
        workflowId: reviewPayload.workflowId,
        fileVersions: reviewPayload.fileVersions
      })
    });
    
    console.log('📡 ACC Reviews API response status:', reviewResponse.status);
    
    if (!reviewResponse.ok) {
      const errorText = await reviewResponse.text();
      console.error('❌ ACC Reviews API error:', errorText);
      throw new Error(`Review creation failed: ${reviewResponse.status} ${reviewResponse.statusText} - ${errorText}`);
    }
    
    const result = await reviewResponse.json();
    console.log('✅ ACC Reviews API success:', result);
    return result;
  }

  /**
   * Call backend proxy for review creation
   * @param {string} projectId - Clean project ID
   * @param {Object} reviewPayload - Review payload
   * @returns {Promise<Object>} Proxy response
   */
  async callBackendProxy(projectId, reviewPayload) {
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const url = `/api/acc/reviews/${cleanProjectId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend proxy failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  }

  /**
   * Create mock review as final fallback
   * @param {Object} reviewPayload - Review payload
   * @returns {Object} Mock review result
   */
  createMockReview(reviewPayload) {
    console.log('🔄 Creating mock review as fallback');
    
    const mockReview = {
      id: `mock-review-${Date.now()}`,
      title: reviewPayload.title,
      description: reviewPayload.description,
      status: reviewPayload.status,
      items: reviewPayload.items,
      createdAt: new Date().toISOString(),
      mock: true
    };
    
    return {
      success: true,
      reviewId: mockReview.id,
      status: 'created',
      method: 'mock',
      data: mockReview,
      message: 'Review created locally (ACC API unavailable)'
    };
  }

  /**
   * Get access token from credentials
   * @returns {string} Access token
   */
  getAccessToken() {
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      return credentials.threeLegToken || credentials.accessToken;
    } catch (error) {
      console.warn('⚠️ Could not get access token:', error);
      return null;
    }
  }

  /**
   * Create review for workflow step
   * @param {string} projectId - Project ID
   * @param {string} workflowId - Workflow ID
   * @param {Array} fileIds - Array of file IDs
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} Review creation result
   */
  async createWorkflowReview(projectId, workflowId, fileIds, reviewName = '') {
    try {
      console.log('🔍 Creating workflow review...');
      console.log('📋 Project ID:', projectId);
      console.log('📋 Workflow ID:', workflowId);
      console.log('📋 File IDs:', fileIds);
      console.log('📋 Review Name:', reviewName);
      
      // Validate inputs
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      if (!workflowId) {
        throw new Error('Workflow ID is required');
      }
      if (!fileIds || fileIds.length === 0) {
        throw new Error('File IDs are required');
      }
      
      // Clean project ID (remove b. prefix)
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      
      // Validate workflow ID format (should be UUID)
      if (!this.isValidUUID(workflowId)) {
        console.warn('⚠️ Workflow ID is not a valid UUID, attempting to use as-is');
      }
      
      // Convert file IDs to proper version URN format for ACC API (same as Simple Review Creation)
      const fileVersions = await Promise.all(fileIds.map(async (fileId) => {
        // Ensure file ID is in proper URN format
        let urn = fileId;
        if (!urn.startsWith('urn:')) {
          // If it's not a URN, we need to construct it properly
          urn = `urn:adsk.wipprodanz:dm.lineage:${fileId}`;
        }
        
        // Convert lineage URN to version URN using the same logic as Simple Review Creation
        if (urn.includes('dm.lineage:')) {
          console.log("🔄 Converting lineage URN to version URN:", urn);
          const versionUrn = await this.getVersionUrn(cleanProjectId, urn);
          if (versionUrn) {
            urn = versionUrn;
            console.log("✅ Converted to version URN:", urn);
          } else {
            console.warn("⚠️ Failed to get version URN, using lineage URN as fallback");
          }
        }
        
        return { urn: urn };
      }));
      
      console.log('📦 File versions for API:', fileVersions);
      
      // Create review payload using exact same format as Simple Review Creation
      const reviewPayload = {
        name: reviewName || `Review_${new Date().toISOString()}`,
        fileVersions: fileVersions,
        workflowId: workflowId
      };
      
      console.log('📤 Review payload:', reviewPayload);
      
      // Call the backend proxy (same as Simple Review Creation)
      const result = await this.callBackendProxy(cleanProjectId, reviewPayload);
      
      console.log('✅ Workflow review created successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error creating workflow review:', error);
      throw error;
    }
  }
  
  /**
   * Validate UUID format
   * @param {string} uuid - UUID string to validate
   * @returns {boolean} True if valid UUID
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Convert lineage URN to version URN (same as Simple Review Creation)
   * @param {string} projectId - Project ID
   * @param {string} lineageUrn - Lineage URN
   * @returns {Promise<string|null>} Version URN or null if failed
   */
  async getVersionUrn(projectId, lineageUrn) {
    try {
      console.log("🔍 Getting version URN for:", lineageUrn);
      const token = this.getAccessToken();

      const versionsUrl = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${encodeURIComponent(
        lineageUrn
      )}/versions`;

      const res = await fetch(versionsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error("❌ Failed to get versions:", res.status, res.statusText);
        return null;
      }

      const data = await res.json();
      console.log("📋 Versions data:", data);

      if (data.data && data.data.length > 0) {
        const latestVersion = data.data[0];
        const versionUrn = latestVersion.attributes.urn;
        console.log("✅ Latest version URN:", versionUrn);
        return versionUrn;
      } else {
        console.warn("⚠️ No versions found, using fallback");
        // Fallback: convert lineage URN to version URN format
        return lineageUrn.replace(
          "urn:adsk.wipprodanz:dm.lineage:",
          "urn:adsk.wipprodanz:fs.file:vf."
        ) + "?version=1";
      }
    } catch (err) {
      console.error("❌ getVersionUrn error:", err);
      return null;
    }
  }

  /**
   * Create review for gate approval
   * @param {string} projectId - Project ID
   * @param {string} gateId - Gate ID
   * @param {Array} fileIds - Array of file IDs
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} Review creation result
   */
  async createGateReview(projectId, gateId, fileIds, reviewName = '') {
    try {
      console.log('🔍 Creating gate review...');
      console.log('📋 Project ID:', projectId);
      console.log('📋 Gate ID:', gateId);
      console.log('📋 File IDs:', fileIds);
      console.log('📋 Review Name:', reviewName);
      
      // Validate inputs
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      if (!gateId) {
        throw new Error('Gate ID is required');
      }
      if (!fileIds || fileIds.length === 0) {
        throw new Error('File IDs are required');
      }
      
      // Clean project ID (remove b. prefix)
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      
      // Get existing workflows to use a real workflow ID
      let workflowId = 'default-gate-workflow-id';
      try {
        const workflowsResponse = await this.getWorkflows(cleanProjectId, {
          limit: 10,
          filterStatus: 'ACTIVE',
          sort: 'name'
        });
        const workflows = workflowsResponse.results || [];
        if (workflows.length > 0) {
          workflowId = workflows[0].id;
          console.log('✅ Using existing workflow for gate review:', workflowId);
        } else {
          console.warn('⚠️ No workflows found, using default workflow ID');
        }
      } catch (workflowError) {
        console.warn('⚠️ Error fetching workflows, using default workflow ID:', workflowError.message);
      }
      
      // Convert file IDs to proper version URN format for ACC API (same as Simple Review Creation)
      const fileVersions = await Promise.all(fileIds.map(async (fileId) => {
        // Ensure file ID is in proper URN format
        let urn = fileId;
        if (!urn.startsWith('urn:')) {
          // If it's not a URN, we need to construct it properly
          urn = `urn:adsk.wipprodanz:dm.lineage:${fileId}`;
        }
        
        // Convert lineage URN to version URN using the same logic as Simple Review Creation
        if (urn.includes('dm.lineage:')) {
          console.log("🔄 Converting lineage URN to version URN:", urn);
          const versionUrn = await this.getVersionUrn(cleanProjectId, urn);
          if (versionUrn) {
            urn = versionUrn;
            console.log("✅ Converted to version URN:", urn);
          } else {
            console.warn("⚠️ Failed to get version URN, using lineage URN as fallback");
          }
        }
        
        return { urn: urn };
      }));
      
      console.log('📦 File versions for API:', fileVersions);
      
      // Create review payload using exact same format as Simple Review Creation
      const reviewPayload = {
        name: reviewName || `Review_${new Date().toISOString()}`,
        fileVersions: fileVersions,
        workflowId: workflowId
      };
      
      console.log('📤 Gate review payload:', reviewPayload);
      
      // Call the backend proxy (same as Simple Review Creation)
      const result = await this.callBackendProxy(cleanProjectId, reviewPayload);
      
      console.log('✅ Gate review created successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error creating gate review:', error);
      throw error;
    }
  }

  /**
   * Get workflows for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of workflows to return (1-50, default: 50)
   * @param {number} options.offset - Index to start returning results (default: 0)
   * @param {string} options.sort - Sort field and order (e.g., 'name desc', 'status', 'updatedAt')
   * @param {boolean} options.filterInitiator - Filter by workflows initiated by current user
   * @param {string} options.filterStatus - Filter by workflow status ('ACTIVE' or 'INACTIVE')
   * @returns {Promise<Object>} Workflows list with pagination
   */
  async getWorkflows(projectId, options = {}) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/workflows`;
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.filterInitiator !== undefined) queryParams.append('filter[initiator]', options.filterInitiator);
      if (options.filterStatus) queryParams.append('filter[status]', options.filterStatus);
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get workflows: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting workflows:', error);
      return { results: [], pagination: {} };
    }
  }

  /**
   * Get a specific workflow by ID
   * @param {string} projectId - Project ID
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Workflow details
   */
  async getWorkflow(projectId, workflowId) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/workflows/${workflowId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get workflow: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting workflow:', error);
      return null;
    }
  }

  /**
   * Create a new approval workflow
   * @param {string} projectId - Project ID
   * @param {Object} workflowData - Workflow configuration
   * @param {string} workflowData.name - Workflow name (required, max 255 chars)
   * @param {string} workflowData.description - Workflow description (max 4096 chars)
   * @param {string} workflowData.notes - Custom notes (max 4096 chars)
   * @param {Object} workflowData.additionalOptions - Workflow-level settings
   * @param {Array} workflowData.additionalApprovalStatusOptions - Custom approval statuses
   * @param {Object} workflowData.copyFilesOptions - Copy files configuration (required)
   * @param {Array} workflowData.steps - Workflow steps (required)
   * @returns {Promise<Object>} Created workflow details
   */
  async createWorkflow(projectId, workflowData) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/workflows`;
      
      // Validate required fields
      if (!workflowData.name) {
        throw new Error('Workflow name is required');
      }
      if (!workflowData.copyFilesOptions) {
        throw new Error('copyFilesOptions is required');
      }
      if (!workflowData.steps || workflowData.steps.length === 0) {
        throw new Error('At least one step is required');
      }
      
      // Clean workflow data to only include ACC API accepted fields
      const cleanWorkflowData = {
        name: workflowData.name,
        description: workflowData.description || '',
        notes: workflowData.notes || '',
        additionalOptions: workflowData.additionalOptions || {},
        additionalApprovalStatusOptions: workflowData.additionalApprovalStatusOptions || [],
        copyFilesOptions: workflowData.copyFilesOptions,
        steps: workflowData.steps
      };
      
      console.log('📤 Creating workflow with data:', cleanWorkflowData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanWorkflowData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create workflow: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Workflow created successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Create a default workflow for projects without existing workflows
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Created default workflow
   */
  async createDefaultWorkflow(projectId) {
    const defaultWorkflowData = {
      name: 'Default Review Workflow',
      description: 'Default workflow for file reviews created automatically by the system',
      notes: 'This workflow was created automatically. You can modify it in the ACC interface.',
      additionalOptions: {
        allowInitiatorToEdit: true
      },
      additionalApprovalStatusOptions: [
        {
          label: 'Approved with comments',
          value: 'APPROVED'
        }
      ],
      copyFilesOptions: {
        enabled: false,
        allowOverride: false,
        condition: 'ANY',
        folderUrn: '',
        includeMarkups: false,
        disableOverrideMarkupSetting: false
      },
      steps: [
        {
          name: 'Reviewer',
          type: 'REVIEWER',
          duration: 3,
          dueDateType: 'CALENDAR_DAY',
          groupReview: {
            enabled: false,
            type: 'MINIMUM',
            min: 1
          },
          candidates: {
            users: [],
            roles: [],
            companies: []
          }
        }
      ]
    };
    
    return await this.createWorkflow(projectId, defaultWorkflowData);
  }

  /**
   * Get workflow details for a specific review
   * @param {string} projectId - Project ID
   * @param {string} reviewId - Review ID
   * @returns {Promise<Object>} Workflow details
   */
  async getReviewWorkflow(projectId, reviewId) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}/workflow`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review workflow: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting review workflow:', error);
      return null;
    }
  }

  /**
   * Get a specific review by ID
   * @param {string} projectId - Project ID
   * @param {string} reviewId - Review ID
   * @returns {Promise<Object>} Review details
   */
  async getReview(projectId, reviewId) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting review:', error);
      return null;
    }
  }

  /**
   * Get review progress for a specific review
   * @param {string} projectId - Project ID
   * @param {string} reviewId - Review ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Object>} Review progress details
   */
  async getReviewProgress(projectId, reviewId, options = {}) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}/progress`;
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review progress: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting review progress:', error);
      return { results: [], pagination: {} };
    }
  }

  /**
   * Get file versions for a specific review
   * @param {string} projectId - Project ID
   * @param {string} reviewId - Review ID
   * @param {Object} options - Query options (limit, offset, approveStatus filter)
   * @returns {Promise<Object>} File versions with approval statuses
   */
  async getReviewVersions(projectId, reviewId, options = {}) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}/versions`;
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.approveStatus) {
        // Handle multiple approval status filters
        if (Array.isArray(options.approveStatus)) {
          options.approveStatus.forEach(status => {
            queryParams.append('filter[approveStatus]', status);
          });
        } else {
          queryParams.append('filter[approveStatus]', options.approveStatus);
        }
      }
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get review versions: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting review versions:', error);
      return { results: [], pagination: {} };
    }
  }

  /**
   * Get approval statuses for a specific file version
   * @param {string} projectId - Project ID
   * @param {string} versionId - File version URN (URL-encoded)
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Object>} Approval statuses and review history
   */
  async getVersionApprovalStatuses(projectId, versionId, options = {}) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const encodedVersionId = encodeURIComponent(versionId);
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/versions/${encodedVersionId}/approval-statuses`;
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get version approval statuses: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting version approval statuses:', error);
      return { results: [], pagination: {} };
    }
  }

  /**
   * Get reviews for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Reviews list
   */
  async getProjectReviews(projectId, options = {}) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/reviews`;
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.status) queryParams.append('status', options.status);
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get reviews: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting project reviews:', error);
      return { data: [], pagination: {} };
    }
  }

  /**
   * Update review status
   * @param {string} projectId - Project ID
   * @param {string} reviewId - Review ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Update result
   */
  async updateReviewStatus(projectId, reviewId, status) {
    try {
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      const url = `${this.baseUrl}/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update review: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error updating review status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a data extraction request for automated email notifications
   * @param {string} accountId - Account ID (derived from hub ID)
   * @param {Object} requestData - Data request configuration
   * @param {string} requestData.description - Description of the data request
   * @param {boolean} requestData.isActive - Whether the request is active (default: true)
   * @param {string} requestData.scheduleInterval - Schedule interval (ONE_TIME, DAY, WEEK, MONTH, YEAR)
   * @param {number} requestData.reoccuringInterval - Number of interval units between executions
   * @param {string} requestData.effectiveFrom - Start date/time in ISO 8601 format
   * @param {string} requestData.effectiveTo - End date/time in ISO 8601 format (for recurring)
   * @param {Array} requestData.serviceGroups - Service groups to extract (e.g., ['forms', 'issues', 'reviews'])
   * @param {string} requestData.callbackUrl - Optional callback URL for job completion
   * @param {boolean} requestData.sendEmail - Send email notification on completion (default: true)
   * @param {Array} requestData.projectIdList - List of project IDs (up to 50)
   * @param {string} requestData.startDate - Start date for data extraction (ISO 8601)
   * @param {string} requestData.endDate - End date for data extraction (ISO 8601)
   * @param {string} requestData.dateRange - Date range for activities (TODAY, YESTERDAY, etc.)
   * @param {string} requestData.projectStatus - Project status filter (all, active, archived)
   * @returns {Promise<Object>} Created data request details
   */
  async createDataRequest(accountId, requestData) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/requests`;
      
      // Validate required fields
      if (!requestData.serviceGroups || requestData.serviceGroups.length === 0) {
        throw new Error('At least one service group is required');
      }
      if (!requestData.effectiveFrom) {
        throw new Error('effectiveFrom date is required');
      }
      
      // Clean request data to only include ACC API accepted fields
      const cleanRequestData = {
        description: requestData.description || 'Automated data extraction request',
        isActive: requestData.isActive !== undefined ? requestData.isActive : true,
        scheduleInterval: requestData.scheduleInterval || 'ONE_TIME',
        reoccuringInterval: requestData.reoccuringInterval || null,
        effectiveFrom: requestData.effectiveFrom,
        effectiveTo: requestData.effectiveTo || null,
        serviceGroups: requestData.serviceGroups,
        callbackUrl: requestData.callbackUrl || null,
        sendEmail: requestData.sendEmail !== undefined ? requestData.sendEmail : true,
        projectId: requestData.projectId || null,
        projectIdList: requestData.projectIdList || null,
        startDate: requestData.startDate || null,
        endDate: requestData.endDate || null,
        dateRange: requestData.dateRange || null,
        projectStatus: requestData.projectStatus || 'active'
      };
      
      console.log('📤 Creating data request with data:', cleanRequestData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanRequestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create data request: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Data request created successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error creating data request:', error);
      throw error;
    }
  }

  /**
   * Create a reminder-focused data extraction request
   * @param {string} accountId - Account ID
   * @param {Array} projectIds - List of project IDs
   * @param {string} userEmail - User email for notifications
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created data request
   */
  async createReminderDataRequest(accountId, projectIds, userEmail, options = {}) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const requestData = {
      description: `Reminder Data Extract - ${now.toISOString().split('T')[0]}`,
      isActive: true,
      scheduleInterval: 'ONE_TIME',
      reoccuringInterval: null,
      effectiveFrom: now.toISOString(),
      effectiveTo: tomorrow.toISOString(),
      serviceGroups: [
        'forms',      // For form due dates and assignments
        'issues',     // For issue tracking and assignments
        'reviews',    // For review status and assignments
        'rfis',       // For RFI tracking and assignments
        'activities', // For project activities and updates
        'admin'       // For project users and permissions
      ],
      callbackUrl: options.callbackUrl || null,
      sendEmail: true,
      projectIdList: projectIds,
      startDate: options.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      endDate: options.endDate || now.toISOString(),
      dateRange: 'PAST_7_DAYS',
      projectStatus: 'active'
    };
    
    return await this.createDataRequest(accountId, requestData);
  }

  /**
   * Create a daily reminder data extraction request
   * @param {string} accountId - Account ID
   * @param {Array} projectIds - List of project IDs
   * @param {string} userEmail - User email for notifications
   * @returns {Promise<Object>} Created data request
   */
  async createDailyReminderRequest(accountId, projectIds, userEmail) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const requestData = {
      description: `Daily Reminder Data Extract - ${userEmail}`,
      isActive: true,
      scheduleInterval: 'DAY',
      reoccuringInterval: 1,
      effectiveFrom: now.toISOString(),
      effectiveTo: nextWeek.toISOString(),
      serviceGroups: [
        'forms',
        'issues', 
        'reviews',
        'rfis',
        'activities'
      ],
      sendEmail: true,
      projectIdList: projectIds,
      dateRange: 'TODAY',
      projectStatus: 'active'
    };
    
    return await this.createDataRequest(accountId, requestData);
  }

  /**
   * Get data requests for an account
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {string} options.sort - Sort order (asc, desc)
   * @param {number} options.limit - Number of requests to return (default: 20)
   * @param {number} options.offset - Number of requests to skip (default: 0)
   * @param {string} options.sortFields - Comma-separated fields to sort by
   * @param {Object} options.filters - Filter options
   * @param {string} options.filters.projectId - Filter by project ID
   * @param {string} options.filters.createdAt - Filter by creation date range
   * @param {string} options.filters.updatedAt - Filter by update date range
   * @param {string} options.filters.scheduleInterval - Filter by schedule interval
   * @param {string} options.filters.effectiveFrom - Filter by effective from date
   * @param {string} options.filters.effectiveTo - Filter by effective to date
   * @param {boolean} options.filters.isActive - Filter by active status
   * @param {string} options.filters.startDate - Filter by start date
   * @param {string} options.filters.endDate - Filter by end date
   * @returns {Promise<Object>} Data requests with pagination
   */
  async getDataRequests(accountId, options = {}) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/requests`;
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.sortFields) queryParams.append('sortFields', options.sortFields);
      
      // Add filters
      if (options.filters) {
        Object.keys(options.filters).forEach(key => {
          if (options.filters[key] !== undefined && options.filters[key] !== null) {
            queryParams.append(`filter[${key}]`, options.filters[key]);
          }
        });
      }
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get data requests: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting data requests:', error);
      return { results: [], pagination: {} };
    }
  }

  /**
   * Get active reminder data requests for a user
   * @param {string} accountId - Account ID
   * @param {string} userEmail - User email to filter by
   * @param {Object} options - Additional query options
   * @returns {Promise<Object>} Active reminder requests
   */
  async getActiveReminderRequests(accountId, userEmail, options = {}) {
    const queryOptions = {
      sort: 'desc',
      limit: options.limit || 50,
      offset: options.offset || 0,
      sortFields: 'createdAt',
      filters: {
        isActive: true,
        ...options.filters
      }
    };
    
    const response = await this.getDataRequests(accountId, queryOptions);
    
    // Filter results to include only reminder-related requests
    if (response.results) {
      response.results = response.results.filter(request => 
        request.description && 
        (request.description.includes('Reminder') || 
         request.description.includes('reminder') ||
         request.serviceGroups?.includes('forms') ||
         request.serviceGroups?.includes('issues') ||
         request.serviceGroups?.includes('reviews'))
      );
    }
    
    return response;
  }

  /**
   * Get data requests by project
   * @param {string} accountId - Account ID
   * @param {string} projectId - Project ID to filter by
   * @param {Object} options - Additional query options
   * @returns {Promise<Object>} Data requests for the project
   */
  async getDataRequestsByProject(accountId, projectId, options = {}) {
    const queryOptions = {
      sort: 'desc',
      limit: options.limit || 20,
      offset: options.offset || 0,
      sortFields: 'createdAt',
      filters: {
        projectId: projectId,
        ...options.filters
      }
    };
    
    return await this.getDataRequests(accountId, queryOptions);
  }

  /**
   * Get a specific data request by ID
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Data request details
   */
  async getDataRequest(accountId, requestId) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/requests/${requestId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get data request: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting data request:', error);
      return null;
    }
  }

  /**
   * Get data request status and job information
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Request status with job details
   */
  async getDataRequestStatus(accountId, requestId) {
    try {
      const request = await this.getDataRequest(accountId, requestId);
      if (!request) {
        return null;
      }

      // Extract key status information
      const status = {
        id: request.id,
        description: request.description,
        isActive: request.isActive,
        status: request.isActive ? 'ACTIVE' : 'INACTIVE',
        scheduleInterval: request.scheduleInterval,
        reoccuringInterval: request.reoccuringInterval,
        effectiveFrom: request.effectiveFrom,
        effectiveTo: request.effectiveTo,
        lastQueuedAt: request.lastQueuedAt,
        serviceGroups: request.serviceGroups,
        sendEmail: request.sendEmail,
        createdBy: request.createdBy,
        createdByEmail: request.createdByEmail,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        projectIdList: request.projectIdList,
        startDate: request.startDate,
        endDate: request.endDate,
        dateRange: request.dateRange,
        projectStatus: request.projectStatus,
        callbackUrl: request.callbackUrl
      };

      // Determine next execution time
      if (request.scheduleInterval === 'ONE_TIME') {
        status.nextExecution = null;
        status.isRecurring = false;
      } else {
        status.isRecurring = true;
        if (request.lastQueuedAt) {
          const lastQueued = new Date(request.lastQueuedAt);
          const intervalMs = this.getIntervalMilliseconds(request.scheduleInterval, request.reoccuringInterval);
          status.nextExecution = new Date(lastQueued.getTime() + intervalMs).toISOString();
        } else {
          status.nextExecution = request.effectiveFrom;
        }
      }

      return status;
    } catch (error) {
      console.error('❌ Error getting data request status:', error);
      return null;
    }
  }

  /**
   * Helper method to convert schedule interval to milliseconds
   * @param {string} scheduleInterval - Schedule interval (DAY, WEEK, MONTH, YEAR)
   * @param {number} reoccuringInterval - Number of interval units
   * @returns {number} Milliseconds
   */
  getIntervalMilliseconds(scheduleInterval, reoccuringInterval) {
    const baseIntervals = {
      'DAY': 24 * 60 * 60 * 1000,      // 1 day in milliseconds
      'WEEK': 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
      'MONTH': 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      'YEAR': 365 * 24 * 60 * 60 * 1000  // 365 days in milliseconds
    };
    
    const baseInterval = baseIntervals[scheduleInterval] || baseIntervals['DAY'];
    return baseInterval * (reoccuringInterval || 1);
  }

  /**
   * Update an existing data request
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {Object} updateData - Data to update
   * @param {boolean} updateData.isActive - Active/inactive status
   * @param {string} updateData.description - Request description
   * @param {string} updateData.scheduleInterval - Schedule interval (ONE_TIME, DAY, WEEK, MONTH, YEAR)
   * @param {number} updateData.reoccuringInterval - Number of interval units
   * @param {string} updateData.effectiveFrom - Start date/time in ISO 8601 format
   * @param {string} updateData.effectiveTo - End date/time in ISO 8601 format
   * @param {Array} updateData.serviceGroups - Service groups to extract
   * @param {string} updateData.callbackUrl - Callback URL for job completion
   * @param {boolean} updateData.sendEmail - Send email notification on completion
   * @param {string} updateData.projectId - Legacy single project ID
   * @param {string} updateData.projectIdList - List of project IDs
   * @param {string} updateData.startDate - Start date for data extraction (ISO 8601)
   * @param {string} updateData.endDate - End date for data extraction (ISO 8601)
   * @returns {Promise<Object>} Updated data request details
   */
  async updateDataRequest(accountId, requestId, updateData) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/requests/${requestId}`;
      
      // Clean update data to only include fields that can be updated
      const cleanUpdateData = {};
      
      // Only include fields that are provided and valid
      if (updateData.isActive !== undefined) cleanUpdateData.isActive = updateData.isActive;
      if (updateData.description !== undefined) cleanUpdateData.description = updateData.description;
      if (updateData.scheduleInterval !== undefined) cleanUpdateData.scheduleInterval = updateData.scheduleInterval;
      if (updateData.reoccuringInterval !== undefined) cleanUpdateData.reoccuringInterval = updateData.reoccuringInterval;
      if (updateData.effectiveFrom !== undefined) cleanUpdateData.effectiveFrom = updateData.effectiveFrom;
      if (updateData.effectiveTo !== undefined) cleanUpdateData.effectiveTo = updateData.effectiveTo;
      if (updateData.serviceGroups !== undefined) cleanUpdateData.serviceGroups = updateData.serviceGroups;
      if (updateData.callbackUrl !== undefined) cleanUpdateData.callbackUrl = updateData.callbackUrl;
      if (updateData.sendEmail !== undefined) cleanUpdateData.sendEmail = updateData.sendEmail;
      if (updateData.projectId !== undefined) cleanUpdateData.projectId = updateData.projectId;
      if (updateData.projectIdList !== undefined) cleanUpdateData.projectIdList = updateData.projectIdList;
      if (updateData.startDate !== undefined) cleanUpdateData.startDate = updateData.startDate;
      if (updateData.endDate !== undefined) cleanUpdateData.endDate = updateData.endDate;
      
      console.log('📤 Updating data request with data:', cleanUpdateData);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanUpdateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update data request: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Data request updated successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error updating data request:', error);
      throw error;
    }
  }

  /**
   * Activate or deactivate a data request
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated data request
   */
  async setDataRequestActive(accountId, requestId, isActive) {
    return await this.updateDataRequest(accountId, requestId, { isActive });
  }

  /**
   * Update data request schedule
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {string} scheduleInterval - Schedule interval
   * @param {number} reoccuringInterval - Recurring interval
   * @param {string} effectiveFrom - Start date
   * @param {string} effectiveTo - End date
   * @returns {Promise<Object>} Updated data request
   */
  async updateDataRequestSchedule(accountId, requestId, scheduleInterval, reoccuringInterval, effectiveFrom, effectiveTo) {
    return await this.updateDataRequest(accountId, requestId, {
      scheduleInterval,
      reoccuringInterval,
      effectiveFrom,
      effectiveTo
    });
  }

  /**
   * Update data request service groups
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {Array} serviceGroups - Service groups to extract
   * @returns {Promise<Object>} Updated data request
   */
  async updateDataRequestServiceGroups(accountId, requestId, serviceGroups) {
    return await this.updateDataRequest(accountId, requestId, { serviceGroups });
  }

  /**
   * Update data request email settings
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {boolean} sendEmail - Send email notification
   * @param {string} callbackUrl - Callback URL
   * @returns {Promise<Object>} Updated data request
   */
  async updateDataRequestEmailSettings(accountId, requestId, sendEmail, callbackUrl) {
    return await this.updateDataRequest(accountId, requestId, { sendEmail, callbackUrl });
  }

  /**
   * Get jobs for a specific data request
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {Object} options - Query options
   * @param {string} options.sort - Sort order (asc, desc)
   * @param {number} options.limit - Number of jobs to return (default: 20)
   * @param {number} options.offset - Number of jobs to skip (default: 0)
   * @returns {Promise<Object>} Jobs with pagination
   */
  async getDataRequestJobs(accountId, requestId, options = {}) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/requests/${requestId}/jobs`;
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get data request jobs: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting data request jobs:', error);
      return { results: [], pagination: {} };
    }
  }

  /**
   * Get job execution status and history for a data request
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Job execution summary
   */
  async getDataRequestJobStatus(accountId, requestId, options = {}) {
    try {
      const jobsResponse = await this.getDataRequestJobs(accountId, requestId, {
        sort: 'desc',
        limit: options.limit || 50,
        offset: options.offset || 0
      });
      
      if (!jobsResponse.results || jobsResponse.results.length === 0) {
        return {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          runningJobs: 0,
          pendingJobs: 0,
          lastJob: null,
          nextJob: null,
          successRate: 0,
          averageExecutionTime: 0,
          jobs: []
        };
      }
      
      const jobs = jobsResponse.results;
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter(job => job.status === 'complete' && job.completionStatus === 'success').length;
      const failedJobs = jobs.filter(job => job.status === 'complete' && job.completionStatus === 'failed').length;
      const runningJobs = jobs.filter(job => job.status === 'running').length;
      const pendingJobs = jobs.filter(job => job.status === 'pending').length;
      
      // Calculate success rate
      const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      
      // Calculate average execution time
      const completedJobsWithTimes = jobs.filter(job => 
        job.status === 'complete' && 
        job.startedAt && 
        job.completedAt
      );
      
      let averageExecutionTime = 0;
      if (completedJobsWithTimes.length > 0) {
        const totalExecutionTime = completedJobsWithTimes.reduce((sum, job) => {
          const startTime = new Date(job.startedAt).getTime();
          const endTime = new Date(job.completedAt).getTime();
          return sum + (endTime - startTime);
        }, 0);
        averageExecutionTime = totalExecutionTime / completedJobsWithTimes.length;
      }
      
      // Get last and next job
      const lastJob = jobs[0]; // Most recent job (sorted desc)
      const nextJob = jobs.find(job => job.status === 'pending') || null;
      
      return {
        totalJobs,
        completedJobs,
        failedJobs,
        runningJobs,
        pendingJobs,
        lastJob,
        nextJob,
        successRate: Math.round(successRate * 100) / 100,
        averageExecutionTime: Math.round(averageExecutionTime / 1000), // Convert to seconds
        jobs: jobs.slice(0, options.limit || 10) // Return recent jobs
      };
    } catch (error) {
      console.error('❌ Error getting data request job status:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        runningJobs: 0,
        pendingJobs: 0,
        lastJob: null,
        nextJob: null,
        successRate: 0,
        averageExecutionTime: 0,
        jobs: []
      };
    }
  }

  /**
   * Get recent job executions for monitoring
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @param {number} limit - Number of recent jobs to return
   * @returns {Promise<Object>} Recent job executions
   */
  async getRecentJobExecutions(accountId, requestId, limit = 10) {
    return await this.getDataRequestJobs(accountId, requestId, {
      sort: 'desc',
      limit: limit,
      offset: 0
    });
  }

  /**
   * Get job execution statistics for a data request
   * @param {string} accountId - Account ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Job execution statistics
   */
  async getDataRequestJobStatistics(accountId, requestId) {
    try {
      const jobsResponse = await this.getDataRequestJobs(accountId, requestId, {
        sort: 'desc',
        limit: 100, // Get more jobs for better statistics
        offset: 0
      });
      
      if (!jobsResponse.results || jobsResponse.results.length === 0) {
        return {
          totalExecutions: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          averageExecutionTime: 0,
          fastestExecution: 0,
          slowestExecution: 0,
          lastExecution: null,
          executionTrend: []
        };
      }
      
      const jobs = jobsResponse.results;
      const completedJobs = jobs.filter(job => job.status === 'complete');
      const successfulJobs = completedJobs.filter(job => job.completionStatus === 'success');
      const failedJobs = completedJobs.filter(job => job.completionStatus === 'failed');
      
      // Calculate execution times
      const executionTimes = completedJobs
        .filter(job => job.startedAt && job.completedAt)
        .map(job => {
          const startTime = new Date(job.startedAt).getTime();
          const endTime = new Date(job.completedAt).getTime();
          return endTime - startTime;
        });
      
      const averageExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
        : 0;
      
      const fastestExecution = executionTimes.length > 0 ? Math.min(...executionTimes) : 0;
      const slowestExecution = executionTimes.length > 0 ? Math.max(...executionTimes) : 0;
      
      // Calculate execution trend (last 10 jobs)
      const recentJobs = jobs.slice(0, 10);
      const executionTrend = recentJobs.map(job => ({
        jobId: job.id,
        createdAt: job.createdAt,
        status: job.status,
        completionStatus: job.completionStatus,
        executionTime: job.startedAt && job.completedAt 
          ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
          : null
      }));
      
      return {
        totalExecutions: jobs.length,
        successCount: successfulJobs.length,
        failureCount: failedJobs.length,
        successRate: jobs.length > 0 ? Math.round((successfulJobs.length / jobs.length) * 10000) / 100 : 0,
        averageExecutionTime: Math.round(averageExecutionTime / 1000), // Convert to seconds
        fastestExecution: Math.round(fastestExecution / 1000), // Convert to seconds
        slowestExecution: Math.round(slowestExecution / 1000), // Convert to seconds
        lastExecution: jobs[0] || null,
        executionTrend
      };
    } catch (error) {
      console.error('❌ Error getting data request job statistics:', error);
      return {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        averageExecutionTime: 0,
        fastestExecution: 0,
        slowestExecution: 0,
        lastExecution: null,
        executionTrend: []
      };
    }
  }

  /**
   * Get all jobs for an account with advanced filtering and sorting
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {string} options.sort - Sort order (asc, desc)
   * @param {number} options.limit - Number of jobs to return (default: 20)
   * @param {number} options.offset - Number of jobs to skip (default: 0)
   * @param {string} options.projectId - Filter by specific project ID
   * @param {string} options.sortFields - Comma-separated fields to sort by
   * @param {Object} options.filters - Advanced filtering options
   * @param {string} options.filters.projectId - Filter by project ID
   * @param {string} options.filters.createdAt - Filter by creation date range
   * @param {string} options.filters.status - Filter by job status
   * @param {string} options.filters.completionStatus - Filter by completion status
   * @param {string} options.filters.startedAt - Filter by start date range
   * @param {string} options.filters.completedAt - Filter by completion date range
   * @param {string} options.filters.startDate - Filter by data start date range
   * @param {string} options.filters.endDate - Filter by data end date range
   * @returns {Promise<Object>} Jobs with pagination
   */
  async getAllAccountJobs(accountId, options = {}) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/jobs`;
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.projectId) queryParams.append('projectId', options.projectId);
      if (options.sortFields) queryParams.append('sortFields', options.sortFields);
      
      // Add filters
      if (options.filters) {
        Object.keys(options.filters).forEach(key => {
          if (options.filters[key] !== undefined && options.filters[key] !== null) {
            queryParams.append(`filter[${key}]`, options.filters[key]);
          }
        });
      }
      
      const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get account jobs: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting account jobs:', error);
      return { results: [], pagination: {} };
    }
  }

  /**
   * Get jobs for a specific project
   * @param {string} accountId - Account ID
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Project jobs with pagination
   */
  async getProjectJobs(accountId, projectId, options = {}) {
    return await this.getAllAccountJobs(accountId, {
      ...options,
      projectId: projectId
    });
  }

  /**
   * Get jobs with advanced filtering
   * @param {string} accountId - Account ID
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Job status filter
   * @param {string} filters.completionStatus - Completion status filter
   * @param {string} filters.createdAt - Creation date range filter
   * @param {string} filters.startedAt - Start date range filter
   * @param {string} filters.completedAt - Completion date range filter
   * @param {string} filters.startDate - Data start date range filter
   * @param {string} filters.endDate - Data end date range filter
   * @param {Object} options - Additional query options
   * @returns {Promise<Object>} Filtered jobs with pagination
   */
  async getFilteredJobs(accountId, filters = {}, options = {}) {
    return await this.getAllAccountJobs(accountId, {
      ...options,
      filters: filters
    });
  }

  /**
   * Get jobs by status
   * @param {string} accountId - Account ID
   * @param {string} status - Job status (complete, running, pending, failed)
   * @param {Object} options - Additional query options
   * @returns {Promise<Object>} Jobs with specified status
   */
  async getJobsByStatus(accountId, status, options = {}) {
    return await this.getFilteredJobs(accountId, { status }, options);
  }

  /**
   * Get jobs by completion status
   * @param {string} accountId - Account ID
   * @param {string} completionStatus - Completion status (success, failed)
   * @param {Object} options - Additional query options
   * @returns {Promise<Object>} Jobs with specified completion status
   */
  async getJobsByCompletionStatus(accountId, completionStatus, options = {}) {
    return await this.getFilteredJobs(accountId, { completionStatus }, options);
  }

  /**
   * Get jobs by date range
   * @param {string} accountId - Account ID
   * @param {string} startDate - Start date (ISO 8601 format)
   * @param {string} endDate - End date (ISO 8601 format)
   * @param {Object} options - Additional query options
   * @returns {Promise<Object>} Jobs within date range
   */
  async getJobsByDateRange(accountId, startDate, endDate, options = {}) {
    const dateRange = `${startDate}..${endDate}`;
    return await this.getFilteredJobs(accountId, { createdAt: dateRange }, options);
  }

  /**
   * Get recent jobs across all projects
   * @param {string} accountId - Account ID
   * @param {number} limit - Number of recent jobs to return
   * @param {Object} options - Additional query options
   * @returns {Promise<Object>} Recent jobs across all projects
   */
  async getRecentAccountJobs(accountId, limit = 20, options = {}) {
    return await this.getAllAccountJobs(accountId, {
      sort: 'desc',
      limit: limit,
      offset: 0,
      sortFields: '-createdAt',
      ...options
    });
  }

  /**
   * Get account job statistics
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Account job statistics
   */
  async getAccountJobStatistics(accountId, options = {}) {
    try {
      const jobsResponse = await this.getAllAccountJobs(accountId, {
        sort: 'desc',
        limit: 100, // Get more jobs for better statistics
        offset: 0,
        ...options
      });
      
      if (!jobsResponse.results || jobsResponse.results.length === 0) {
        return {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          runningJobs: 0,
          pendingJobs: 0,
          successRate: 0,
          averageExecutionTime: 0,
          projects: {},
          users: {},
          recentActivity: []
        };
      }
      
      const jobs = jobsResponse.results;
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter(job => job.status === 'complete' && job.completionStatus === 'success').length;
      const failedJobs = jobs.filter(job => job.status === 'complete' && job.completionStatus === 'failed').length;
      const runningJobs = jobs.filter(job => job.status === 'running').length;
      const pendingJobs = jobs.filter(job => job.status === 'pending').length;
      
      // Calculate success rate
      const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      
      // Calculate average execution time
      const completedJobsWithTimes = jobs.filter(job => 
        job.status === 'complete' && 
        job.startedAt && 
        job.completedAt
      );
      
      let averageExecutionTime = 0;
      if (completedJobsWithTimes.length > 0) {
        const totalExecutionTime = completedJobsWithTimes.reduce((sum, job) => {
          const startTime = new Date(job.startedAt).getTime();
          const endTime = new Date(job.completedAt).getTime();
          return sum + (endTime - startTime);
        }, 0);
        averageExecutionTime = totalExecutionTime / completedJobsWithTimes.length;
      }
      
      // Group by projects
      const projects = {};
      jobs.forEach(job => {
        const projectId = job.projectId || 'unknown';
        if (!projects[projectId]) {
          projects[projectId] = {
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            runningJobs: 0,
            pendingJobs: 0
          };
        }
        projects[projectId].totalJobs++;
        if (job.status === 'complete' && job.completionStatus === 'success') {
          projects[projectId].completedJobs++;
        } else if (job.status === 'complete' && job.completionStatus === 'failed') {
          projects[projectId].failedJobs++;
        } else if (job.status === 'running') {
          projects[projectId].runningJobs++;
        } else if (job.status === 'pending') {
          projects[projectId].pendingJobs++;
        }
      });
      
      // Group by users
      const users = {};
      jobs.forEach(job => {
        const userEmail = job.createdByEmail || 'unknown';
        if (!users[userEmail]) {
          users[userEmail] = {
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            runningJobs: 0,
            pendingJobs: 0
          };
        }
        users[userEmail].totalJobs++;
        if (job.status === 'complete' && job.completionStatus === 'success') {
          users[userEmail].completedJobs++;
        } else if (job.status === 'complete' && job.completionStatus === 'failed') {
          users[userEmail].failedJobs++;
        } else if (job.status === 'running') {
          users[userEmail].runningJobs++;
        } else if (job.status === 'pending') {
          users[userEmail].pendingJobs++;
        }
      });
      
      // Get recent activity (last 10 jobs)
      const recentActivity = jobs.slice(0, 10).map(job => ({
        id: job.id,
        projectId: job.projectId,
        createdBy: job.createdByEmail,
        status: job.status,
        completionStatus: job.completionStatus,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }));
      
      return {
        totalJobs,
        completedJobs,
        failedJobs,
        runningJobs,
        pendingJobs,
        successRate: Math.round(successRate * 100) / 100,
        averageExecutionTime: Math.round(averageExecutionTime / 1000), // Convert to seconds
        projects,
        users,
        recentActivity
      };
    } catch (error) {
      console.error('❌ Error getting account job statistics:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        runningJobs: 0,
        pendingJobs: 0,
        successRate: 0,
        averageExecutionTime: 0,
        projects: {},
        users: {},
        recentActivity: []
      };
    }
  }

  /**
   * Get detailed information about a specific job
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Detailed job information
   */
  async getJobDetails(accountId, jobId) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/jobs/${jobId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get job details: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting job details:', error);
      return null;
    }
  }

  /**
   * Get job execution summary with calculated metrics
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job execution summary with metrics
   */
  async getJobExecutionSummary(accountId, jobId) {
    try {
      const jobDetails = await this.getJobDetails(accountId, jobId);
      if (!jobDetails) {
        return null;
      }

      // Calculate execution metrics
      const executionMetrics = this.calculateJobExecutionMetrics(jobDetails);
      
      // Get related request information
      const requestDetails = await this.getDataRequest(accountId, jobDetails.requestId);
      
      return {
        ...jobDetails,
        executionMetrics,
        requestDetails: requestDetails || null,
        isCompleted: jobDetails.status === 'complete',
        isSuccessful: jobDetails.status === 'complete' && jobDetails.completionStatus === 'success',
        isFailed: jobDetails.status === 'complete' && jobDetails.completionStatus === 'failed',
        isRunning: jobDetails.status === 'running',
        isQueued: jobDetails.status === 'queued',
        hasStarted: jobDetails.startedAt !== null,
        hasCompleted: jobDetails.completedAt !== null,
        executionTime: executionMetrics.executionTime,
        waitTime: executionMetrics.waitTime,
        totalTime: executionMetrics.totalTime
      };
    } catch (error) {
      console.error('❌ Error getting job execution summary:', error);
      return null;
    }
  }

  /**
   * Calculate job execution metrics
   * @param {Object} jobDetails - Job details object
   * @returns {Object} Calculated execution metrics
   */
  calculateJobExecutionMetrics(jobDetails) {
    const now = new Date();
    const createdAt = new Date(jobDetails.createdAt);
    const startedAt = jobDetails.startedAt ? new Date(jobDetails.startedAt) : null;
    const completedAt = jobDetails.completedAt ? new Date(jobDetails.completedAt) : null;
    
    // Calculate wait time (time from creation to start)
    const waitTime = startedAt ? startedAt.getTime() - createdAt.getTime() : null;
    
    // Calculate execution time (time from start to completion)
    const executionTime = startedAt && completedAt ? 
      completedAt.getTime() - startedAt.getTime() : null;
    
    // Calculate total time (time from creation to completion)
    const totalTime = completedAt ? 
      completedAt.getTime() - createdAt.getTime() : null;
    
    // Calculate current progress
    let currentProgress = 0;
    if (jobDetails.status === 'complete') {
      currentProgress = 100;
    } else if (jobDetails.status === 'running') {
      // Estimate progress based on time elapsed
      if (startedAt) {
        const elapsed = now.getTime() - startedAt.getTime();
        const estimatedDuration = 30 * 60 * 1000; // 30 minutes estimated
        currentProgress = Math.min(95, Math.max(5, (elapsed / estimatedDuration) * 100));
      } else {
        currentProgress = 0;
      }
    }
    
    return {
      waitTime: waitTime ? Math.round(waitTime / 1000) : null, // Convert to seconds
      executionTime: executionTime ? Math.round(executionTime / 1000) : null, // Convert to seconds
      totalTime: totalTime ? Math.round(totalTime / 1000) : null, // Convert to seconds
      currentProgress: Math.round(currentProgress),
      isOverdue: startedAt && (now.getTime() - startedAt.getTime()) > (60 * 60 * 1000), // Over 1 hour
      estimatedCompletion: startedAt && jobDetails.status === 'running' ? 
        new Date(startedAt.getTime() + (30 * 60 * 1000)).toISOString() : null // 30 min estimate
    };
  }

  /**
   * Get job status with enhanced information
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Enhanced job status information
   */
  async getJobStatus(accountId, jobId) {
    try {
      const jobDetails = await this.getJobDetails(accountId, jobId);
      if (!jobDetails) {
        return null;
      }

      const metrics = this.calculateJobExecutionMetrics(jobDetails);
      
      return {
        id: jobDetails.id,
        requestId: jobDetails.requestId,
        accountId: jobDetails.accountId,
        projectId: jobDetails.projectId,
        status: jobDetails.status,
        completionStatus: jobDetails.completionStatus,
        progress: jobDetails.progress || metrics.currentProgress,
        createdAt: jobDetails.createdAt,
        startedAt: jobDetails.startedAt,
        completedAt: jobDetails.completedAt,
        createdBy: jobDetails.createdBy,
        createdByEmail: jobDetails.createdByEmail,
        sendEmail: jobDetails.sendEmail,
        lastDownloadedBy: jobDetails.lastDownloadedBy,
        lastDownloadedAt: jobDetails.lastDownloadedAt,
        startDate: jobDetails.startDate,
        endDate: jobDetails.endDate,
        executionMetrics: metrics,
        isCompleted: jobDetails.status === 'complete',
        isSuccessful: jobDetails.status === 'complete' && jobDetails.completionStatus === 'success',
        isFailed: jobDetails.status === 'complete' && jobDetails.completionStatus === 'failed',
        isRunning: jobDetails.status === 'running',
        isQueued: jobDetails.status === 'queued'
      };
    } catch (error) {
      console.error('❌ Error getting job status:', error);
      return null;
    }
  }

  /**
   * Monitor job progress with real-time updates
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @param {Function} onProgress - Callback function for progress updates
   * @param {number} interval - Polling interval in milliseconds (default: 5000)
   * @returns {Promise<Object>} Final job result
   */
  async monitorJobProgress(accountId, jobId, onProgress = null, interval = 5000) {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await this.getJobStatus(accountId, jobId);
          if (!jobStatus) {
            clearInterval(pollInterval);
            reject(new Error('Job not found'));
            return;
          }

          // Call progress callback if provided
          if (onProgress) {
            onProgress(jobStatus);
          }

          // Check if job is completed
          if (jobStatus.isCompleted) {
            clearInterval(pollInterval);
            resolve(jobStatus);
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, interval);

      // Set a maximum timeout (1 hour)
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Job monitoring timeout'));
      }, 60 * 60 * 1000);
    });
  }

  /**
   * Get job download information
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job download information
   */
  async getJobDownloadInfo(accountId, jobId) {
    try {
      const jobDetails = await this.getJobDetails(accountId, jobId);
      if (!jobDetails) {
        return null;
      }

      return {
        jobId: jobDetails.id,
        requestId: jobDetails.requestId,
        isCompleted: jobDetails.status === 'complete',
        isSuccessful: jobDetails.status === 'complete' && jobDetails.completionStatus === 'success',
        hasBeenDownloaded: jobDetails.lastDownloadedBy !== null,
        lastDownloadedBy: jobDetails.lastDownloadedBy,
        lastDownloadedAt: jobDetails.lastDownloadedAt,
        downloadUrl: jobDetails.isSuccessful ? 
          `${this.baseUrl}/data-connector/v1/accounts/${accountId}/jobs/${jobId}/download` : null,
        canDownload: jobDetails.status === 'complete' && jobDetails.completionStatus === 'success'
      };
    } catch (error) {
      console.error('❌ Error getting job download info:', error);
      return null;
    }
  }

  /**
   * Get data listing for a specific job
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Array of data extract files information
   */
  async getJobDataListing(accountId, jobId) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/jobs/${jobId}/data-listing`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Data extract not found - job may have failed or been cancelled');
        }
        throw new Error(`Failed to get job data listing: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error getting job data listing:', error);
      return [];
    }
  }

  /**
   * Get enhanced data listing with file analysis
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Enhanced data listing with analysis
   */
  async getJobDataListingEnhanced(accountId, jobId) {
    try {
      const dataFiles = await this.getJobDataListing(accountId, jobId);
      if (!dataFiles || dataFiles.length === 0) {
        return {
          files: [],
          totalFiles: 0,
          totalSize: 0,
          fileTypes: {},
          analysis: {
            hasData: false,
            message: 'No data files found'
          }
        };
      }

      // Analyze files
      const analysis = this.analyzeDataFiles(dataFiles);
      
      return {
        files: dataFiles,
        totalFiles: dataFiles.length,
        totalSize: analysis.totalSize,
        fileTypes: analysis.fileTypes,
        analysis: {
          hasData: true,
          totalFiles: dataFiles.length,
          totalSize: analysis.totalSize,
          averageFileSize: analysis.averageFileSize,
          largestFile: analysis.largestFile,
          smallestFile: analysis.smallestFile,
          fileTypeBreakdown: analysis.fileTypes,
          dataExtractTypes: analysis.dataExtractTypes
        }
      };
    } catch (error) {
      console.error('❌ Error getting enhanced job data listing:', error);
      return {
        files: [],
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        analysis: {
          hasData: false,
          message: 'Error retrieving data files',
          error: error.message
        }
      };
    }
  }

  /**
   * Analyze data files and extract insights
   * @param {Array} dataFiles - Array of data file objects
   * @returns {Object} Analysis results
   */
  analyzeDataFiles(dataFiles) {
    const fileTypes = {};
    const dataExtractTypes = {};
    let totalSize = 0;
    let largestFile = null;
    let smallestFile = null;

    dataFiles.forEach(file => {
      const fileSize = parseInt(file.size) || 0;
      totalSize += fileSize;

      // Track file types by extension
      const extension = file.name.split('.').pop().toLowerCase();
      if (!fileTypes[extension]) {
        fileTypes[extension] = { count: 0, totalSize: 0 };
      }
      fileTypes[extension].count++;
      fileTypes[extension].totalSize += fileSize;

      // Track data extract types by naming convention
      const dataType = this.identifyDataType(file.name);
      if (!dataExtractTypes[dataType]) {
        dataExtractTypes[dataType] = { count: 0, totalSize: 0 };
      }
      dataExtractTypes[dataType].count++;
      dataExtractTypes[dataType].totalSize += fileSize;

      // Track largest and smallest files
      if (!largestFile || fileSize > largestFile.size) {
        largestFile = { name: file.name, size: fileSize, createdAt: file.createdAt };
      }
      if (!smallestFile || fileSize < smallestFile.size) {
        smallestFile = { name: file.name, size: fileSize, createdAt: file.createdAt };
      }
    });

    return {
      totalSize,
      averageFileSize: dataFiles.length > 0 ? Math.round(totalSize / dataFiles.length) : 0,
      fileTypes,
      dataExtractTypes,
      largestFile,
      smallestFile
    };
  }

  /**
   * Identify data type from filename
   * @param {string} filename - File name
   * @returns {string} Data type category
   */
  identifyDataType(filename) {
    const name = filename.toLowerCase();
    
    if (name.includes('admin_')) return 'Administration';
    if (name.includes('companies')) return 'Companies';
    if (name.includes('users')) return 'Users';
    if (name.includes('projects')) return 'Projects';
    if (name.includes('forms')) return 'Forms';
    if (name.includes('issues')) return 'Issues';
    if (name.includes('reviews')) return 'Reviews';
    if (name.includes('rfis')) return 'RFIs';
    if (name.includes('activities')) return 'Activities';
    if (name.includes('files')) return 'Files';
    if (name.includes('versions')) return 'Versions';
    if (name.includes('workflows')) return 'Workflows';
    if (name.includes('permissions')) return 'Permissions';
    if (name.includes('roles')) return 'Roles';
    if (name.includes('invitations')) return 'Invitations';
    if (name.includes('notifications')) return 'Notifications';
    if (name.includes('logs')) return 'Logs';
    if (name.includes('audit')) return 'Audit';
    if (name.includes('reports')) return 'Reports';
    if (name.includes('exports')) return 'Exports';
    
    return 'Other';
  }

  /**
   * Get data files by type
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @param {string} dataType - Data type to filter by
   * @returns {Promise<Array>} Filtered data files
   */
  async getJobDataFilesByType(accountId, jobId, dataType) {
    try {
      const dataFiles = await this.getJobDataListing(accountId, jobId);
      return dataFiles.filter(file => {
        const fileDataType = this.identifyDataType(file.name);
        return fileDataType === dataType;
      });
    } catch (error) {
      console.error('❌ Error getting job data files by type:', error);
      return [];
    }
  }

  /**
   * Get data files by file extension
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @param {string} extension - File extension to filter by
   * @returns {Promise<Array>} Filtered data files
   */
  async getJobDataFilesByExtension(accountId, jobId, extension) {
    try {
      const dataFiles = await this.getJobDataListing(accountId, jobId);
      const targetExtension = extension.toLowerCase().replace('.', '');
      return dataFiles.filter(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        return fileExtension === targetExtension;
      });
    } catch (error) {
      console.error('❌ Error getting job data files by extension:', error);
      return [];
    }
  }

  /**
   * Get data files summary
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Data files summary
   */
  async getJobDataFilesSummary(accountId, jobId) {
    try {
      const enhancedListing = await this.getJobDataListingEnhanced(accountId, jobId);
      
      return {
        jobId: jobId,
        accountId: accountId,
        hasData: enhancedListing.analysis.hasData,
        totalFiles: enhancedListing.totalFiles,
        totalSize: enhancedListing.totalSize,
        totalSizeFormatted: this.formatFileSize(enhancedListing.totalSize),
        averageFileSize: enhancedListing.analysis.averageFileSize,
        averageFileSizeFormatted: this.formatFileSize(enhancedListing.analysis.averageFileSize),
        fileTypes: enhancedListing.fileTypes,
        dataExtractTypes: enhancedListing.analysis.dataExtractTypes,
        largestFile: enhancedListing.analysis.largestFile,
        smallestFile: enhancedListing.analysis.smallestFile,
        files: enhancedListing.files.map(file => ({
          ...file,
          sizeFormatted: this.formatFileSize(parseInt(file.size) || 0),
          extension: file.name.split('.').pop().toLowerCase(),
          dataType: this.identifyDataType(file.name)
        }))
      };
    } catch (error) {
      console.error('❌ Error getting job data files summary:', error);
      return {
        jobId: jobId,
        accountId: accountId,
        hasData: false,
        totalFiles: 0,
        totalSize: 0,
        error: error.message
      };
    }
  }

  /**
   * Format file size in human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get signed URL for downloading a specific file from a job's data extract
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @param {string} fileName - Name of the file to retrieve
   * @returns {Promise<Object>} Signed URL information
   */
  async getJobDataFileDownloadUrl(accountId, jobId, fileName) {
    try {
      const url = `${this.baseUrl}/data-connector/v1/accounts/${accountId}/jobs/${jobId}/data/${encodeURIComponent(fileName)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File '${fileName}' not found in job data extract`);
        }
        throw new Error(`Failed to get download URL: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        fileName: result.name,
        fileSize: parseInt(result.size),
        fileSizeFormatted: this.formatFileSize(parseInt(result.size)),
        signedUrl: result.signedUrl,
        expiresIn: 60, // 60 seconds as per API documentation
        expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
        downloadUrl: result.signedUrl,
        isExpired: false
      };
    } catch (error) {
      console.error('❌ Error getting job data file download URL:', error);
      return null;
    }
  }

  /**
   * Download a specific file from a job's data extract
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @param {string} fileName - Name of the file to download
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Blob>} Downloaded file as Blob
   */
  async downloadJobDataFile(accountId, jobId, fileName, onProgress = null) {
    try {
      const downloadInfo = await this.getJobDataFileDownloadUrl(accountId, jobId, fileName);
      if (!downloadInfo) {
        throw new Error('Failed to get download URL');
      }

      console.log(`📥 Downloading file: ${downloadInfo.fileName} (${downloadInfo.fileSizeFormatted})`);
      
      const response = await fetch(downloadInfo.signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        if (onProgress && total > 0) {
          const progress = (loaded / total) * 100;
          onProgress({
            loaded,
            total,
            progress: Math.round(progress),
            fileName: downloadInfo.fileName
          });
        }
      }

      const blob = new Blob(chunks);
      console.log(`✅ File downloaded successfully: ${downloadInfo.fileName}`);
      
      return blob;
    } catch (error) {
      console.error('❌ Error downloading job data file:', error);
      throw error;
    }
  }

  /**
   * Download multiple files from a job's data extract
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @param {Array} fileNames - Array of file names to download
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Object>} Downloaded files with metadata
   */
  async downloadJobDataFiles(accountId, jobId, fileNames, onProgress = null) {
    try {
      const results = {
        successful: [],
        failed: [],
        totalFiles: fileNames.length,
        totalSize: 0
      };

      for (let i = 0; i < fileNames.length; i++) {
        const fileName = fileNames[i];
        
        try {
          if (onProgress) {
            onProgress({
              currentFile: fileName,
              currentIndex: i + 1,
              totalFiles: fileNames.length,
              status: 'downloading'
            });
          }

          const blob = await this.downloadJobDataFile(accountId, jobId, fileName);
          
          results.successful.push({
            fileName,
            blob,
            size: blob.size,
            sizeFormatted: this.formatFileSize(blob.size)
          });
          
          results.totalSize += blob.size;
          
          console.log(`✅ Downloaded: ${fileName} (${this.formatFileSize(blob.size)})`);
        } catch (error) {
          console.error(`❌ Failed to download: ${fileName}`, error);
          results.failed.push({
            fileName,
            error: error.message
          });
        }
      }

      if (onProgress) {
        onProgress({
          status: 'completed',
          successful: results.successful.length,
          failed: results.failed.length,
          totalSize: this.formatFileSize(results.totalSize)
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Error downloading job data files:', error);
      throw error;
    }
  }

  /**
   * Download the complete data extract (ZIP file)
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Blob>} Complete data extract as ZIP Blob
   */
  async downloadCompleteDataExtract(accountId, jobId, onProgress = null) {
    try {
      // First, get the data listing to find the ZIP file
      const dataListing = await this.getJobDataListing(accountId, jobId);
      const zipFile = dataListing.find(file => file.name.endsWith('.zip'));
      
      if (!zipFile) {
        throw new Error('No ZIP file found in data extract');
      }

      console.log(`📦 Downloading complete data extract: ${zipFile.name} (${this.formatFileSize(parseInt(zipFile.size))})`);
      
      return await this.downloadJobDataFile(accountId, jobId, zipFile.name, onProgress);
    } catch (error) {
      console.error('❌ Error downloading complete data extract:', error);
      throw error;
    }
  }

  /**
   * Download the README file for schema information
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<string>} README file content as text
   */
  async downloadReadmeFile(accountId, jobId) {
    try {
      // First, get the data listing to find the README file
      const dataListing = await this.getJobDataListing(accountId, jobId);
      const readmeFile = dataListing.find(file => 
        file.name.toLowerCase().includes('readme') || 
        file.name.toLowerCase().includes('schema')
      );
      
      if (!readmeFile) {
        throw new Error('No README file found in data extract');
      }

      console.log(`📖 Downloading README file: ${readmeFile.name}`);
      
      const blob = await this.downloadJobDataFile(accountId, jobId, readmeFile.name);
      const text = await blob.text();
      
      return text;
    } catch (error) {
      console.error('❌ Error downloading README file:', error);
      throw error;
    }
  }

  /**
   * Get download URLs for all files in a job's data extract
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Array of download URL information
   */
  async getJobDataFilesDownloadUrls(accountId, jobId) {
    try {
      const dataListing = await this.getJobDataListing(accountId, jobId);
      const downloadUrls = [];

      for (const file of dataListing) {
        try {
          const downloadInfo = await this.getJobDataFileDownloadUrl(accountId, jobId, file.name);
          if (downloadInfo) {
            downloadUrls.push({
              ...downloadInfo,
              originalFile: file
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to get download URL for ${file.name}:`, error.message);
        }
      }

      return downloadUrls;
    } catch (error) {
      console.error('❌ Error getting job data files download URLs:', error);
      return [];
    }
  }

  /**
   * Create a download manager for a job's data extract
   * @param {string} accountId - Account ID
   * @param {string} jobId - Job ID
   * @returns {Object} Download manager with utility methods
   */
  createJobDataDownloadManager(accountId, jobId) {
    return {
      accountId,
      jobId,
      
      // Get download URL for a specific file
      getDownloadUrl: (fileName) => this.getJobDataFileDownloadUrl(accountId, jobId, fileName),
      
      // Download a specific file
      downloadFile: (fileName, onProgress) => this.downloadJobDataFile(accountId, jobId, fileName, onProgress),
      
      // Download multiple files
      downloadFiles: (fileNames, onProgress) => this.downloadJobDataFiles(accountId, jobId, fileNames, onProgress),
      
      // Download complete data extract
      downloadComplete: (onProgress) => this.downloadCompleteDataExtract(accountId, jobId, onProgress),
      
      // Download README file
      downloadReadme: () => this.downloadReadmeFile(accountId, jobId),
      
      // Get all download URLs
      getAllDownloadUrls: () => this.getJobDataFilesDownloadUrls(accountId, jobId),
      
      // Get data listing
      getDataListing: () => this.getJobDataListing(accountId, jobId),
      
      // Get enhanced data listing
      getEnhancedDataListing: () => this.getJobDataListingEnhanced(accountId, jobId),
      
      // Get data files summary
      getDataFilesSummary: () => this.getJobDataFilesSummary(accountId, jobId)
    };
  }
}

export default AccReviewService;
