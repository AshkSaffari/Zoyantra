/**
 * Data Management API Service
 * Handles all file and folder operations for Autodesk Construction Cloud
 */

class DataManagementService {
  constructor() {
    this.baseUrl = 'https://developer.api.autodesk.com/data/v1';
    this.credentials = null;
  }

  initialize(credentials) {
    this.credentials = credentials;
  }

  getHeaders() {
    if (!this.credentials?.threeLegToken) {
      throw new Error('No access token available');
    }
    
    return {
      'Authorization': `Bearer ${this.credentials.threeLegToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Get project details
   */
  async getProject(projectId) {
    try {
      console.log('📁 Getting project details:', projectId);
      
      const url = `${this.baseUrl}/projects/${projectId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Project API Error:', response.status, errorText);
        throw new Error(`Failed to fetch project: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Project details received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error getting project:', error);
      throw error;
    }
  }

  /**
   * Get project root folder
   */
  async getProjectRootFolder(projectId) {
    try {
      console.log('📁 Getting project root folder:', projectId);
      
      const projectData = await this.getProject(projectId);
      const rootFolderId = projectData.data?.relationships?.rootFolder?.data?.id;
      
      if (!rootFolderId) {
        throw new Error('Project root folder not found');
      }
      
      console.log('✅ Root folder ID found:', rootFolderId);
      return rootFolderId;
    } catch (error) {
      console.error('❌ Error getting project root folder:', error);
      throw error;
    }
  }

  /**
   * Get folder contents
   */
  async getFolderContents(projectId, folderId) {
    try {
      console.log('📁 Getting folder contents:', projectId, folderId);
      
      const url = `${this.baseUrl}/projects/${projectId}/folders/${folderId}/contents`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Folder contents API Error:', response.status, errorText);
        throw new Error(`Failed to fetch folder contents: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Folder contents received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error getting folder contents:', error);
      throw error;
    }
  }

  /**
   * Get folder details
   */
  async getFolder(projectId, folderId) {
    try {
      console.log('📁 Getting folder details:', projectId, folderId);
      
      const url = `${this.baseUrl}/projects/${projectId}/folders/${folderId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Folder API Error:', response.status, errorText);
        throw new Error(`Failed to fetch folder: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Folder details received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error getting folder:', error);
      throw error;
    }
  }

  /**
   * Get item details
   */
  async getItem(projectId, itemId) {
    try {
      console.log('📁 Getting item details:', projectId, itemId);
      
      const url = `${this.baseUrl}/projects/${projectId}/items/${itemId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Item API Error:', response.status, errorText);
        throw new Error(`Failed to fetch item: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Item details received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error getting item:', error);
      throw error;
    }
  }

  /**
   * Get item versions
   */
  async getItemVersions(projectId, itemId) {
    try {
      console.log('📁 Getting item versions:', projectId, itemId);
      
      const url = `${this.baseUrl}/projects/${projectId}/items/${itemId}/versions`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Item versions API Error:', response.status, errorText);
        throw new Error(`Failed to fetch item versions: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Item versions received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error getting item versions:', error);
      throw error;
    }
  }

  /**
   * Download file
   */
  async downloadFile(projectId, itemId, versionId = null) {
    try {
      console.log('📁 Downloading file:', projectId, itemId, versionId);
      
      // Get the download URL
      const itemData = await this.getItem(projectId, itemId);
      const downloadUrl = itemData.data?.relationships?.download?.data?.id;
      
      if (!downloadUrl) {
        throw new Error('Download URL not found');
      }
      
      // If version is specified, get the specific version
      if (versionId) {
        const versionsData = await this.getItemVersions(projectId, itemId);
        const version = versionsData.data?.find(v => v.id === versionId);
        if (version?.relationships?.download?.data?.id) {
          return version.relationships.download.data.id;
        }
      }
      
      return downloadUrl;
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Search files
   */
  async searchFiles(projectId, query, filters = {}) {
    try {
      console.log('📁 Searching files:', projectId, query, filters);
      
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.type) {
        params.append('filter[type]', filters.type);
      }
      if (filters.extension) {
        params.append('filter[extension]', filters.extension);
      }
      if (filters.folderId) {
        params.append('filter[folderId]', filters.folderId);
      }
      
      const url = `${this.baseUrl}/projects/${projectId}/search?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Search API Error:', response.status, errorText);
        throw new Error(`Failed to search files: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Search results received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error searching files:', error);
      throw error;
    }
  }

  /**
   * Check if item is a folder
   */
  isFolderType(type) {
    const folderTypes = [
      'folders:autodesk.bim360:Folder',
      'folders:autodesk.bim360:Project',
      'folders:autodesk.bim360:ProjectFiles',
      'folders:autodesk.bim360:ProjectTb',
      'folders:autodesk.bim360:Photos',
      'folders:autodesk.bim360:Plans',
      'folders:autodesk.bim360:Correspondence',
      'folders:autodesk.bim360:Forms',
      'folders:autodesk.bim360:CostRoot',
      'folders:autodesk.bim360:ProjectAdmin',
      'folders:autodesk.bim360:ProjectTb'
    ];
    
    return folderTypes.includes(type) || type?.includes('folders:autodesk.bim360');
  }

  /**
   * Get processing status
   */
  getProcessingStatus(status) {
    switch (status) {
      case 'success':
        return 'PROCESSING_COMPLETE';
      case 'processing':
        return 'PROCESSING';
      case 'failed':
        return 'FAILED';
      case 'split':
        return 'SPLIT';
      default:
        return 'PENDING';
    }
  }

  /**
   * Process folder contents
   */
  processFolderContents(data, projectId, hubId) {
    return data.data?.map(item => ({
      id: item.id,
      name: item.attributes?.name || 'Unknown',
      type: item.type,
      projectId: projectId,
      hubId: hubId,
      children: item.relationships?.contents?.data || [],
      displayName: item.attributes?.displayName || item.attributes?.name || 'Unknown',
      createTime: item.attributes?.createTime,
      lastModifiedTime: item.attributes?.lastModifiedTime,
      isFolder: this.isFolderType(item.type),
      fileSize: item.attributes?.fileSize,
      version: item.attributes?.version,
      status: item.attributes?.status,
      processingStatus: this.getProcessingStatus(item.attributes?.status),
      downloadUrl: item.relationships?.download?.data?.id,
      viewUrl: item.relationships?.view?.data?.id
    })) || [];
  }

  /**
   * Get file icon based on type
   */
  getFileIcon(item) {
    if (item.isFolder) {
      return 'folder';
    }
    
    const name = item.name.toLowerCase();
    const extension = name.split('.').pop();
    
    const iconMap = {
      'pdf': 'file-text',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'bmp': 'image',
      'mp4': 'video',
      'avi': 'video',
      'mov': 'video',
      'mp3': 'music',
      'wav': 'music',
      'zip': 'archive',
      'rar': 'archive',
      '7z': 'archive',
      'dwg': 'layers',
      'dxf': 'layers',
      'rvt': 'building',
      'rfa': 'building',
      'nwd': 'box',
      'nwc': 'box',
      'ifc': 'globe',
      'xlsx': 'bar-chart-3',
      'xls': 'bar-chart-3',
      'docx': 'file-text',
      'doc': 'file-text',
      'txt': 'file-text'
    };
    
    return iconMap[extension] || 'file';
  }
}

export default DataManagementService;
