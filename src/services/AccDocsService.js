import AccService from './AccService';

/**
 * ACC Docs Service - handles folder operations and file uploads
 */
class AccDocsService {
  /**
   * Get root folders for a project
   */
  static async getRootFolders(projectId, accessToken) {
    try {
      // Data Management API needs "b." prefix for ACC projects
      const dataProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
      const url = `https://developer.api.autodesk.com/data/v1/projects/${dataProjectId}/folders`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting root folders:', error);
      throw error;
    }
  }

  /**
   * Get subfolders for a specific folder
   */
  static async getSubFolders(projectId, folderId, accessToken) {
    try {
      // Data Management API needs "b." prefix for ACC projects
      const dataProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
      const url = `https://developer.api.autodesk.com/data/v1/projects/${dataProjectId}/folders/${folderId}/contents`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Filter to only return folders
      return (data.data || []).filter(item => item.type === 'folders');
    } catch (error) {
      console.error('Error getting subfolders:', error);
      throw error;
    }
  }

  /**
   * Create a new folder
   */
  static async createFolder(projectId, parentFolderId, name, accessToken) {
    try {
      // Data Management API needs "b." prefix for ACC projects
      const dataProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
      const url = `https://developer.api.autodesk.com/data/v1/projects/${dataProjectId}/folders`;

      const body = {
        data: {
          type: "folders",
          attributes: {
            name: name,
            extension: {
              type: "folders:autodesk.acc:Folder",
              data: { hidden: false }
            }
          },
          relationships: {
            parent: {
              data: { type: "folders", id: parentFolderId }
            }
          }
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.errors?.[0]?.detail || response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Upload a file to ACC Docs
   */
  static async uploadFile(projectId, folderId, file, fileName, accessToken) {
    try {
      // Data Management API needs "b." prefix for ACC projects
      const dataProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
      
      // Step 1: Create the file item
      const createUrl = `https://developer.api.autodesk.com/data/v1/projects/${dataProjectId}/items`;
      
      const createBody = {
        data: {
          type: "items",
          attributes: {
            displayName: fileName,
            extension: {
              type: "items:autodesk.acc:File",
              version: "1.0"
            }
          },
          relationships: {
            parent: {
              data: { type: "folders", id: folderId }
            }
          }
        }
      };

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(createBody)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`Failed to create file item: ${errorData.errors?.[0]?.detail || createResponse.statusText}`);
      }

      const createData = await createResponse.json();
      const itemId = createData.data.id;

      // Step 2: Get upload URL
      const versionUrl = `https://developer.api.autodesk.com/data/v1/projects/${dataProjectId}/items/${itemId}/versions`;
      
      const versionBody = {
        data: {
          type: "versions",
          attributes: {
            name: fileName,
            extension: {
              type: "versions:autodesk.acc:File",
              version: "1.0"
            }
          },
          relationships: {
            item: {
              data: { type: "items", id: itemId }
            }
          }
        }
      };

      const versionResponse = await fetch(versionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(versionBody)
      });

      if (!versionResponse.ok) {
        const errorData = await versionResponse.json();
        throw new Error(`Failed to create file version: ${errorData.errors?.[0]?.detail || versionResponse.statusText}`);
      }

      const versionData = await versionResponse.json();
      const uploadUrl = versionData.data.relationships.storage.data.id;

      // Step 3: Upload the file content
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file content: ${uploadResponse.statusText}`);
      }

      console.log(`✅ File uploaded successfully: ${fileName}`);
      return {
        itemId: itemId,
        fileName: fileName,
        folderId: folderId
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get current user info from ACC
   */
  static async getCurrentUser(accessToken) {
    try {
      const url = 'https://developer.api.autodesk.com/userprofile/v1/users/@me';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }
}

export default AccDocsService;
