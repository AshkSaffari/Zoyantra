# APS Application Setup Guide

Based on the [Autodesk Platform Services learning resources](https://get-started.aps.autodesk.com/learn-more/), here's a comprehensive guide to properly set up your Zoyantra application for ACC integration.

## 🔧 Required APS Configuration

### 1. Application Registration
Your application needs to be properly registered in the APS Developer Portal with the following APIs enabled:

#### **Required APIs:**
- ✅ **Data Management API** - For accessing project files and folders
- ✅ **ACC API** - For Construction Cloud specific operations
- ✅ **Authentication API** - For OAuth flows

#### **Required Scopes:**
```
data:read          # Read project data
data:write         # Write project data
account:read       # Read account information
user-profile:read  # Read user profile
```

### 2. ACC Account Provisioning
Your APS app must be provisioned in the ACC account:

1. **Account Admin Access**: You need Account Admin permissions in ACC
2. **Custom Integrations**: Go to ACC Account Admin > Custom Integrations
3. **Add Your App**: Add your APS Client ID to the account
4. **Grant Permissions**: Ensure your app has access to the required projects

### 3. API Endpoints Configuration

Based on APS documentation, here are the correct endpoints:

#### **Data Management API Endpoints:**
```javascript
// Base URL
const BASE_URL = 'https://developer.api.autodesk.com';

// Project endpoints
const PROJECT_ENDPOINTS = {
  // Get project details
  getProject: (projectId) => `/data/v1/projects/${projectId}`,
  
  // Get project folders
  getProjectFolders: (projectId) => `/data/v1/projects/${projectId}/folders`,
  
  // Get folder contents
  getFolderContents: (projectId, folderId) => `/data/v1/projects/${projectId}/folders/${folderId}/contents`,
  
  // Alternative folder endpoints
  getFolderContentsAlt: (folderId) => `/data/v1/folders/${folderId}/contents`,
  
  // Get project items
  getProjectItems: (projectId) => `/data/v1/projects/${projectId}/items`
};
```

#### **Authentication Endpoints:**
```javascript
const AUTH_ENDPOINTS = {
  // 3-legged OAuth
  authorize: 'https://developer.api.autodesk.com/authentication/v1/authorize',
  token: 'https://developer.api.autodesk.com/authentication/v1/gettoken',
  
  // 2-legged OAuth (for server-to-server)
  authenticate: 'https://developer.api.autodesk.com/authentication/v1/authenticate'
};
```

## 🚀 Implementation Updates

### 1. Enhanced API Service
Your current `AccService_old.js` needs these updates:

```javascript
// Enhanced headers for ACC API calls
static getHeaders() {
  const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
  if (!credentials.threeLegToken) {
    throw new Error('No access token available');
  }
  
  return {
    'Authorization': `Bearer ${credentials.threeLegToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.api+json',
    'x-user-id': credentials.userId || '', // For user-specific operations
    'x-ads-force': 'true' // Force refresh of cached data
  };
}
```

### 2. Proper Error Handling
Based on APS best practices:

```javascript
static async handleApiResponse(response) {
  if (response.ok) {
    return await response.json();
  }
  
  const errorData = await response.json().catch(() => ({}));
  
  switch (response.status) {
    case 401:
      throw new Error('Authentication failed. Please re-authenticate.');
    case 403:
      throw new Error('Access denied. Check your app permissions in ACC.');
    case 404:
      throw new Error('Resource not found. Verify project ID and permissions.');
    case 429:
      throw new Error('Rate limit exceeded. Please wait before retrying.');
    default:
      throw new Error(`API Error ${response.status}: ${errorData.developerMessage || 'Unknown error'}`);
  }
}
```

### 3. Project File Access Implementation
Following APS code samples:

```javascript
static async getProjectFiles(projectId, folderId = null) {
  try {
    console.log('📁 Getting project files for:', projectId, 'folder:', folderId);
    
    // Step 1: Get project details to find root folder
    if (!folderId) {
      const projectResponse = await fetch(
        `https://developer.api.autodesk.com/data/v1/projects/${projectId}`,
        { headers: AccService.getHeaders() }
      );
      
      if (!projectResponse.ok) {
        throw new Error(`Failed to get project: ${projectResponse.status}`);
      }
      
      const projectData = await projectResponse.json();
      folderId = projectData.data?.relationships?.rootFolder?.data?.id;
      
      if (!folderId) {
        throw new Error('No root folder found for project');
      }
    }
    
    // Step 2: Get folder contents
    const contentsResponse = await fetch(
      `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`,
      { headers: AccService.getHeaders() }
    );
    
    if (!contentsResponse.ok) {
      throw new Error(`Failed to get folder contents: ${contentsResponse.status}`);
    }
    
    const contentsData = await contentsResponse.json();
    
    // Step 3: Process and return files/folders
    const items = contentsData.data || [];
    const folders = items.filter(item => item.type === 'folders');
    const files = items.filter(item => item.type === 'items');
    
    return {
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.attributes?.name || 'Unknown Folder',
        type: 'folder',
        path: folder.attributes?.path || '/',
        accFileId: folder.id
      })),
      files: files.map(file => ({
        id: file.id,
        name: file.attributes?.displayName || 'Unknown File',
        type: 'file',
        size: file.attributes?.fileSize || 'Unknown',
        path: file.attributes?.path || '/',
        accFileId: file.id
      }))
    };
    
  } catch (error) {
    console.error('❌ Error getting project files:', error);
    throw error;
  }
}
```

## 🔍 Troubleshooting Guide

### Common Issues and Solutions:

#### 1. **404 Errors on Project Files**
- **Cause**: Project not accessible or wrong project ID
- **Solution**: Verify project ID and ensure app is provisioned in ACC account

#### 2. **403 Access Denied**
- **Cause**: App not provisioned in ACC account or insufficient permissions
- **Solution**: Add your Client ID to ACC Account Admin > Custom Integrations

#### 3. **401 Authentication Failed**
- **Cause**: Expired or invalid token
- **Solution**: Implement token refresh mechanism

#### 4. **Empty Folder Results**
- **Cause**: Using wrong API endpoints or missing permissions
- **Solution**: Use correct Data Management API endpoints with proper headers

## 📚 Additional Resources

Based on the [APS learning resources](https://get-started.aps.autodesk.com/learn-more/):

1. **APS Developer Portal**: For detailed API documentation
2. **APS GitHub Organization**: For code samples and SDKs
3. **APS Blog**: For latest updates and best practices
4. **APS Code Samples**: For working implementation examples

## 🎯 Next Steps

1. **Verify App Registration**: Ensure your app is properly registered in APS
2. **Check ACC Provisioning**: Verify your app is added to ACC Account Admin
3. **Test API Access**: Use the enhanced service methods to test file access
4. **Monitor Logs**: Check browser console for detailed error messages
5. **Update Permissions**: Ensure your app has the required scopes and permissions

## 🔧 Environment Variables

Make sure these are properly configured:

```bash
# APS Configuration
REACT_APP_FORGE_CLIENT_ID=your_client_id_here
REACT_APP_FORGE_CLIENT_SECRET=your_client_secret_here
REACT_APP_FORGE_CALLBACK_URL=http://localhost:3000/auth/callback

# ACC Configuration
REACT_APP_ACC_ACCOUNT_ID=your_account_id_here
REACT_APP_ACC_HUB_ID=your_hub_id_here
```

This setup guide follows the official APS documentation and best practices to ensure your Zoyantra application can properly access ACC project files and folders.
