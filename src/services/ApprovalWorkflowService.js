/**
 * ApprovalWorkflowService - Manages ACC project approval workflows
 */
import AccService from './AccService';

class ApprovalWorkflowService {
  constructor() {
    this.accService = AccService;
  }

  /**
   * Initialize the service with credentials
   */
  initialize(credentials) {
    AccService.initialize(credentials);
  }

  /**
   * Get approval workflows for a project
   */
  async getProjectApprovalWorkflows(projectId) {
    try {
      console.log('🔍 Getting approval workflows for project:', projectId);
      
      // Try to get workflows from ACC Construction Admin API
      const workflows = await this.getAccApprovalWorkflows(projectId);
      
      if (workflows && workflows.length > 0) {
        console.log('✅ ACC approval workflows loaded:', workflows.length);
        return workflows;
      }
      
      // No fallback - return empty array
      console.log('⚠️ No ACC workflows found');
      return [];
      
    } catch (error) {
      console.error('❌ Error getting approval workflows:', error);
      return [];
    }
  }

  /**
   * Get ACC approval workflows
   */
  async getAccApprovalWorkflows(projectId) {
    try {
      const token = this.accService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      // Try ACC Construction Admin API for approval workflows
      const url = `https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/approval-workflows`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ ACC approval workflows API response:', data);
        
        // Process ACC workflows data
        const workflows = (data.data || []).map(workflow => ({
          id: workflow.id,
          name: workflow.attributes?.name || workflow.attributes?.displayName || 'Unnamed Workflow',
          description: workflow.attributes?.description || 'No description available',
          status: workflow.attributes?.status || 'active',
          steps: workflow.attributes?.steps || [],
          createdBy: workflow.attributes?.createdBy || 'Unknown',
          createdAt: workflow.attributes?.createdAt || new Date().toISOString(),
          updatedAt: workflow.attributes?.updatedAt || new Date().toISOString()
        }));
        
        return workflows;
      } else {
        console.log('⚠️ ACC approval workflows API not available:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Error calling ACC approval workflows API:', error);
      return [];
    }
  }


  /**
   * Get workflow by ID
   */
  async getWorkflowById(projectId, workflowId) {
    try {
      const workflows = await this.getProjectApprovalWorkflows(projectId);
      return workflows.find(w => w.id === workflowId);
    } catch (error) {
      console.error('❌ Error getting workflow by ID:', error);
      return null;
    }
  }

  /**
   * Create a new approval workflow
   */
  async createWorkflow(projectId, workflowData) {
    try {
      console.log('🔍 Creating approval workflow for project:', projectId);
      
      const token = this.accService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const url = `https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/approval-workflows`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'approval-workflows',
            attributes: workflowData
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Approval workflow created:', data);
        return data.data;
      } else {
        throw new Error(`Failed to create workflow: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error creating approval workflow:', error);
      throw error;
    }
  }

  /**
   * Update an approval workflow
   */
  async updateWorkflow(projectId, workflowId, updates) {
    try {
      console.log('🔍 Updating approval workflow:', workflowId);
      
      const token = this.accService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const url = `https://developer.api.autodesk.com/construction/admin/v1/projects/${projectId}/approval-workflows/${workflowId}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'approval-workflows',
            id: workflowId,
            attributes: updates
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Approval workflow updated:', data);
        return data.data;
      } else {
        throw new Error(`Failed to update workflow: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error updating approval workflow:', error);
      throw error;
    }
  }
}

export default new ApprovalWorkflowService();
