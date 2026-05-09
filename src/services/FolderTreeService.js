/**
 * FolderTreeService - Manages hierarchical folder structures for ACC projects
 * Provides folder tree navigation, file organization, and SharePoint integration
 * Includes database connectivity patterns for external software integration
 * Based on APS Database Sample: https://github.com/autodesk-platform-services/aps-db-sample
 */

class FolderTreeService {
  constructor(accService, dbConfig = null) {
    this.accService = accService;
    this.folderCache = new Map();
    this.fileCache = new Map();
    this.dbConfig = dbConfig;
    this.dbConnection = null;
    this.websocketConnection = null;
    this.customProperties = new Map();
  }

  /**
   * Get project root folder and build complete folder tree
   */
  async getProjectFolderTree(projectId, hubId) {
    try {
      console.log('🌳 Building folder tree for project:', projectId);
      
      // Get project root folder
      const rootFolder = await this.getProjectRootFolder(projectId);
      if (!rootFolder) {
        throw new Error('No root folder found for project');
      }

      // Build complete folder tree
      const folderTree = await this.buildFolderTree(projectId, rootFolder);
      
      console.log('✅ Folder tree built successfully');
      return folderTree;
      
    } catch (error) {
      console.error('❌ Error building folder tree:', error);
      throw error;
    }
  }

  /**
   * Get project root folder
   */
  async getProjectRootFolder(projectId) {
    try {
      // Normalize project id to include b. prefix for ACC projects
      const normalizedProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;

      // Use topFolders to get root folders (Project Files, Plans)
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${normalizedProjectId}/topFolders`, {
        headers: this.accService.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Project API Error: ${response.status}`);
      }

      const data = await response.json();
      const folders = data?.data || [];

      // Prefer "Project Files"; fallback to first folder
      const projectFiles = folders.find(f => (f.attributes?.name === 'Project Files') || (f.attributes?.name === 'ProjectFiles')) || folders[0];
      const rootFolderId = projectFiles?.id;
      const rootFolderName = projectFiles?.attributes?.name || 'Project Files';
      
      if (!rootFolderId) {
        throw new Error('No root folder found for project');
      }

      return {
        id: rootFolderId,
        name: rootFolderName,
        type: 'folder',
        path: '/',
        level: 0,
        isRoot: true,
        children: []
      };
      
    } catch (error) {
      console.error('Error getting project root folder:', error);
      throw error;
    }
  }

  /**
   * Build complete folder tree recursively
   */
  async buildFolderTree(projectId, parentFolder, level = 0) {
    try {
      // Get folder contents
      const contents = await this.getFolderContents(projectId, parentFolder.id);
      
      // Process contents and separate folders from files
      const folders = [];
      const files = [];
      
      for (const item of contents) {
        const processedItem = this.processFolderItem(item, level + 1, parentFolder.path);
        
        if (item.type === 'folders') {
          // Recursively build subfolder tree
          const subfolderTree = await this.buildFolderTree(projectId, processedItem, level + 1);
          folders.push(subfolderTree);
        } else {
          files.push(processedItem);
        }
      }

      // Update parent folder with children
      parentFolder.children = [...folders, ...files];
      parentFolder.folderCount = folders.length;
      parentFolder.fileCount = files.length;
      parentFolder.totalItems = folders.length + files.length;

      return parentFolder;
      
    } catch (error) {
      console.error('Error building folder tree:', error);
      // Return parent folder with empty children on error
      parentFolder.children = [];
      parentFolder.folderCount = 0;
      parentFolder.fileCount = 0;
      parentFolder.totalItems = 0;
      return parentFolder;
    }
  }

  /**
   * Get folder contents
   */
  async getFolderContents(projectId, folderId) {
    try {
      const cacheKey = `${projectId}-${folderId}`;
      
      // Check cache first
      if (this.folderCache.has(cacheKey)) {
        return this.folderCache.get(cacheKey);
      }

      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`, {
        headers: this.accService.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Folder API Error: ${response.status}`);
      }

      const data = await response.json();
      const contents = data.data || [];
      
      // Cache the results
      this.folderCache.set(cacheKey, contents);
      
      return contents;
      
    } catch (error) {
      console.error('Error getting folder contents:', error);
      return [];
    }
  }

  /**
   * Process folder item (file or folder)
   */
  processFolderItem(item, level, parentPath) {
    const name = item.attributes?.name || 'Unknown';
    const isFolder = item.type === 'folders';
    const path = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
    
    return {
      id: item.id,
      name: name,
      type: item.type,
      isFolder: isFolder,
      level: level,
      path: path,
      parentPath: parentPath,
      lastModified: item.attributes?.lastModifiedTime || new Date().toISOString(),
      size: item.attributes?.fileSize || 0,
      description: item.attributes?.description || '',
      processingStatus: item.attributes?.processingStatus || 'PROCESSING_COMPLETE',
      createdBy: item.attributes?.createdBy || null,
      modifiedBy: item.attributes?.modifiedBy || null,
      version: item.attributes?.version || 1,
      mimeType: item.attributes?.mimeType || null,
      // For folders
      children: isFolder ? [] : null,
      folderCount: isFolder ? 0 : null,
      fileCount: isFolder ? 0 : null,
      totalItems: isFolder ? 0 : null,
      // For files
      downloadUrl: !isFolder ? item.attributes?.downloadUrl : null,
      viewUrl: !isFolder ? item.attributes?.viewUrl : null,
      thumbnailUrl: !isFolder ? item.attributes?.thumbnailUrl : null
    };
  }

  /**
   * Get flattened folder tree for easy navigation
   */
  getFlattenedTree(folderTree, includeFiles = true) {
    const flattened = [];
    
    const traverse = (item) => {
      if (item.isFolder) {
        flattened.push(item);
        if (item.children) {
          item.children.forEach(traverse);
        }
      } else if (includeFiles) {
        flattened.push(item);
      }
    };
    
    traverse(folderTree);
    return flattened;
  }

  /**
   * Find folder by path
   */
  findFolderByPath(folderTree, targetPath) {
    if (folderTree.path === targetPath) {
      return folderTree;
    }
    
    if (folderTree.children) {
      for (const child of folderTree.children) {
        if (child.isFolder) {
          const found = this.findFolderByPath(child, targetPath);
          if (found) return found;
        }
      }
    }
    
    return null;
  }

  /**
   * Get folder breadcrumb path
   */
  getBreadcrumbPath(folderTree, targetPath) {
    const breadcrumb = [];
    
    const findPath = (item, path) => {
      if (item.path === path) {
        breadcrumb.push({
          id: item.id,
          name: item.name,
          path: item.path,
          level: item.level
        });
        return true;
      }
      
      if (item.children) {
        for (const child of item.children) {
          if (child.isFolder && findPath(child, path)) {
            breadcrumb.unshift({
              id: item.id,
              name: item.name,
              path: item.path,
              level: item.level
            });
            return true;
          }
        }
      }
      
      return false;
    };
    
    findPath(folderTree, targetPath);
    return breadcrumb;
  }

  /**
   * Search folders and files by name
   */
  searchInTree(folderTree, searchTerm, searchInFiles = true) {
    const results = [];
    const term = searchTerm.toLowerCase();
    
    const search = (item) => {
      const name = (item.name || '').toLowerCase();
      
      if (name.includes(term)) {
        results.push({
          ...item,
          matchType: name === term ? 'exact' : 'partial',
          matchScore: this.calculateMatchScore(name, term)
        });
      }
      
      if (item.children) {
        item.children.forEach(search);
      }
    };
    
    search(folderTree);
    
    // Sort by match score (exact matches first, then by relevance)
    return results.sort((a, b) => {
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
      return b.matchScore - a.matchScore;
    });
  }

  /**
   * Calculate match score for search results
   */
  calculateMatchScore(name, term) {
    if (name === term) return 100;
    if (name.startsWith(term)) return 80;
    if (name.includes(term)) return 60;
    return 40;
  }

  /**
   * Get folder statistics
   */
  getFolderStats(folderTree) {
    let totalFolders = 0;
    let totalFiles = 0;
    let totalSize = 0;
    
    const traverse = (item) => {
      if (item.isFolder) {
        totalFolders++;
        if (item.children) {
          item.children.forEach(traverse);
        }
      } else {
        totalFiles++;
        totalSize += item.size || 0;
      }
    };
    
    traverse(folderTree);
    
    return {
      totalFolders,
      totalFiles,
      totalSize,
      totalItems: totalFolders + totalFiles
    };
  }

  /**
   * Create folder tree for SharePoint integration
   */
  createSharePointFolderTree(sharePointFolders, userEmail) {
    const userPrefix = userEmail.split('@')[0] || 'user';
    
    return {
      id: 'sharepoint-root',
      name: 'SharePoint Files',
      type: 'folder',
      path: '/',
      level: 0,
      isRoot: true,
      isSharePoint: true,
      children: sharePointFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        isFolder: true,
        level: 1,
        path: `/${folder.name}`,
        parentPath: '/',
        lastModified: folder.lastModified,
        fileCount: folder.fileCount,
        isSharePoint: true,
        children: []
      }))
    };
  }

  /**
   * Create ACC folder tree for SharePoint integration
   */
  createAccFolderTree(accFolders, userEmail) {
    const userPrefix = userEmail.split('@')[0] || 'user';
    
    return {
      id: 'acc-root',
      name: 'ACC Project Files',
      type: 'folder',
      path: '/',
      level: 0,
      isRoot: true,
      isAcc: true,
      children: accFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        isFolder: true,
        level: 1,
        path: `/${folder.name}`,
        parentPath: '/',
        lastModified: folder.lastModified,
        fileCount: folder.fileCount,
        isAcc: true,
        children: []
      }))
    };
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    if (!this.dbConfig) {
      console.log('⚠️ No database configuration provided');
      return false;
    }

    try {
      console.log('🔌 Initializing database connection...');
      
      // Initialize database connection based on type
      let dbConnected = false;
      if (this.dbConfig.type === 'mongodb') {
        dbConnected = await this.initializeMongoDB();
      } else if (this.dbConfig.type === 'sql') {
        dbConnected = await this.initializeSQL();
      } else if (this.dbConfig.type === 'api') {
        await this.initializeAPIConnection();
        dbConnected = true;
      }
      
      if (!dbConnected) {
        console.warn('⚠️ Database connection failed, continuing without database features');
      }

      // Initialize WebSocket for real-time updates
      if (this.dbConfig.websocket) {
        await this.initializeWebSocket();
      }

      console.log('✅ Database connection initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize MongoDB connection
   */
  async initializeMongoDB() {
    try {
      // Use the separate database connections utility
      const { DatabaseConnections } = await import('./DatabaseConnections');
      this.dbConnection = await DatabaseConnections.connectMongoDB(this.dbConfig.connectionString);
      
      if (this.dbConnection) {
        console.log('✅ MongoDB connected');
        return true;
      } else {
        console.log('⚠️ MongoDB connection not available');
        return false;
      }
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      return false;
    }
  }

  /**
   * Initialize SQL database connection
   */
  async initializeSQL() {
    try {
      // Use the separate database connections utility
      const { DatabaseConnections } = await import('./DatabaseConnections');
      
      if (this.dbConfig.driver === 'mysql') {
        this.dbConnection = await DatabaseConnections.connectMySQL(this.dbConfig.connectionString);
      } else if (this.dbConfig.driver === 'postgresql') {
        this.dbConnection = await DatabaseConnections.connectPostgreSQL(this.dbConfig.connectionString);
      }
      
      if (this.dbConnection) {
        console.log('✅ SQL database connected');
        return true;
      } else {
        console.log('⚠️ SQL database connection not available');
        return false;
      }
    } catch (error) {
      console.error('❌ SQL database connection failed:', error);
      return false;
    }
  }

  /**
   * Initialize API-based connection
   */
  async initializeAPIConnection() {
    // API connection for external software integration
    this.dbConnection = {
      baseUrl: this.dbConfig.baseUrl,
      apiKey: this.dbConfig.apiKey,
      headers: {
        'Authorization': `Bearer ${this.dbConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log('✅ API connection initialized');
  }

  /**
   * Initialize WebSocket for real-time updates
   */
  async initializeWebSocket() {
    if (!this.dbConfig.websocket.url) return;

    this.websocketConnection = new WebSocket(this.dbConfig.websocket.url);
    
    this.websocketConnection.onopen = () => {
      console.log('✅ WebSocket connected');
    };
    
    this.websocketConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };
    
    this.websocketConnection.onclose = () => {
      console.log('⚠️ WebSocket disconnected');
    };
  }

  /**
   * Handle WebSocket messages for real-time updates
   */
  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'folder_updated':
        this.handleFolderUpdate(data.payload);
        break;
      case 'file_updated':
        this.handleFileUpdate(data.payload);
        break;
      case 'custom_property_changed':
        this.handleCustomPropertyChange(data.payload);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  /**
   * Handle folder updates from external systems
   */
  handleFolderUpdate(payload) {
    const { projectId, folderId, changes } = payload;
    const cacheKey = `${projectId}-${folderId}`;
    
    if (this.folderCache.has(cacheKey)) {
      const folder = this.folderCache.get(cacheKey);
      Object.assign(folder, changes);
      this.folderCache.set(cacheKey, folder);
    }
    
    // Notify listeners
    this.notifyListeners('folder_updated', { projectId, folderId, changes });
  }

  /**
   * Handle file updates from external systems
   */
  handleFileUpdate(payload) {
    const { projectId, fileId, changes } = payload;
    const cacheKey = `${projectId}-${fileId}`;
    
    if (this.fileCache.has(cacheKey)) {
      const file = this.fileCache.get(cacheKey);
      Object.assign(file, changes);
      this.fileCache.set(cacheKey, file);
    }
    
    // Notify listeners
    this.notifyListeners('file_updated', { projectId, fileId, changes });
  }

  /**
   * Handle custom property changes
   */
  handleCustomPropertyChange(payload) {
    const { elementId, properties } = payload;
    this.customProperties.set(elementId, properties);
    
    // Notify listeners
    this.notifyListeners('custom_property_changed', { elementId, properties });
  }

  /**
   * Get custom properties for an element
   */
  async getCustomProperties(elementId) {
    if (this.customProperties.has(elementId)) {
      return this.customProperties.get(elementId);
    }

    if (!this.dbConnection) {
      return {};
    }

    try {
      let properties = {};
      
      if (this.dbConfig.type === 'mongodb') {
        const collection = this.dbConnection.db(this.dbConfig.database).collection('properties');
        const result = await collection.findOne({ elementId });
        properties = result?.properties || {};
      } else if (this.dbConfig.type === 'api') {
        const response = await fetch(`${this.dbConnection.baseUrl}/properties/${elementId}`, {
          headers: this.dbConnection.headers
        });
        if (response.ok) {
          const data = await response.json();
          properties = data.properties || {};
        }
      }

      this.customProperties.set(elementId, properties);
      return properties;
      
    } catch (error) {
      console.error('Error getting custom properties:', error);
      return {};
    }
  }

  /**
   * Update custom properties for an element
   */
  async updateCustomProperties(elementId, properties) {
    if (!this.dbConnection) {
      console.log('⚠️ No database connection available');
      return false;
    }

    try {
      let success = false;
      
      if (this.dbConfig.type === 'mongodb') {
        const collection = this.dbConnection.db(this.dbConfig.database).collection('properties');
        await collection.updateOne(
          { elementId },
          { $set: { elementId, properties, updatedAt: new Date() } },
          { upsert: true }
        );
        success = true;
      } else if (this.dbConfig.type === 'api') {
        const response = await fetch(`${this.dbConnection.baseUrl}/properties/${elementId}`, {
          method: 'PUT',
          headers: this.dbConnection.headers,
          body: JSON.stringify({ properties })
        });
        success = response.ok;
      }

      if (success) {
        this.customProperties.set(elementId, properties);
        
        // Notify other clients via WebSocket
        if (this.websocketConnection && this.websocketConnection.readyState === WebSocket.OPEN) {
          this.websocketConnection.send(JSON.stringify({
            type: 'custom_property_changed',
            payload: { elementId, properties }
          }));
        }
      }

      return success;
      
    } catch (error) {
      console.error('Error updating custom properties:', error);
      return false;
    }
  }

  /**
   * Sync folder structure with external system
   */
  async syncWithExternalSystem(projectId, folderTree) {
    if (!this.dbConnection) {
      console.log('⚠️ No database connection available for sync');
      return false;
    }

    try {
      console.log('🔄 Syncing folder structure with external system...');
      
      const syncData = {
        projectId,
        folderTree: this.serializeFolderTree(folderTree),
        lastSync: new Date(),
        version: 1
      };

      if (this.dbConfig.type === 'mongodb') {
        const collection = this.dbConnection.db(this.dbConfig.database).collection('folder_sync');
        await collection.updateOne(
          { projectId },
          { $set: syncData },
          { upsert: true }
        );
      } else if (this.dbConfig.type === 'api') {
        await fetch(`${this.dbConnection.baseUrl}/sync/folders`, {
          method: 'POST',
          headers: this.dbConnection.headers,
          body: JSON.stringify(syncData)
        });
      }

      console.log('✅ Folder structure synced successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return false;
    }
  }

  /**
   * Serialize folder tree for database storage
   */
  serializeFolderTree(folderTree) {
    const serialize = (item) => {
      const serialized = {
        id: item.id,
        name: item.name,
        type: item.type,
        path: item.path,
        level: item.level,
        lastModified: item.lastModified,
        size: item.size,
        metadata: {
          isRoot: item.isRoot,
          isFolder: item.isFolder,
          isSharePoint: item.isSharePoint,
          isAcc: item.isAcc
        }
      };

      if (item.children && item.children.length > 0) {
        serialized.children = item.children.map(serialize);
      }

      return serialized;
    };

    return serialize(folderTree);
  }

  /**
   * Deserialize folder tree from database
   */
  deserializeFolderTree(serializedTree) {
    const deserialize = (item) => {
      const deserialized = {
        ...item,
        isRoot: item.metadata?.isRoot || false,
        isFolder: item.metadata?.isFolder || false,
        isSharePoint: item.metadata?.isSharePoint || false,
        isAcc: item.metadata?.isAcc || false,
        children: item.children ? item.children.map(deserialize) : []
      };

      delete deserialized.metadata;
      return deserialized;
    };

    return deserialize(serializedTree);
  }

  /**
   * Event listeners for real-time updates
   */
  listeners = new Map();

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.folderCache.clear();
    this.fileCache.clear();
    this.customProperties.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      folderCacheSize: this.folderCache.size,
      fileCacheSize: this.fileCache.size,
      customPropertiesSize: this.customProperties.size,
      totalCacheSize: this.folderCache.size + this.fileCache.size + this.customProperties.size
    };
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.dbConnection) {
      if (this.dbConfig.type === 'mongodb') {
        await this.dbConnection.close();
      } else if (this.dbConfig.type === 'sql') {
        await this.dbConnection.end();
      }
    }

    if (this.websocketConnection) {
      this.websocketConnection.close();
    }

    this.clearCache();
  }
}

export default FolderTreeService;
