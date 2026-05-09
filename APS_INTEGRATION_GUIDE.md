# APS Integration Guide for Zoyantra

This guide explains the new APS (Autodesk Platform Services) integrations implemented in your Zoyantra application based on the [official APS documentation](https://aps.autodesk.com/llms-full.txt).

## 🚀 New Features Implemented

### 1. Enhanced Issues API
- **User Profile & Permissions**: Get current user permissions for issues
- **Issue Types & Categories**: Retrieve and manage issue types with subtypes
- **Custom Attribute Definitions**: Access custom fields and their configurations
- **Attribute Mappings**: Understand which custom fields are assigned to issue categories

### 2. Real-time Webhooks
- **Event Notifications**: Receive real-time notifications for project events
- **Configurable Events**: Support for issues, RFIs, reviews, files, and models
- **Webhook Management**: Create, view, and delete webhooks
- **Testing Tools**: Built-in webhook testing capabilities

### 3. 3D Model Viewer
- **BIM Model Visualization**: View 3D models directly in the browser
- **Model Upload**: Upload and translate models for viewing
- **Interactive Controls**: Zoom, pan, rotate, and navigate models
- **Fullscreen Support**: Full-screen model viewing experience

### 4. Enhanced Data Management
- **Proper URN Handling**: Correct URN encoding/decoding for models
- **Folder Navigation**: Browse project folders and contents
- **Tip Version Support**: Get the latest version of model files

### 5. Object Storage Service (OSS)
- **File Upload**: Upload files to OSS using signed URLs
- **Bucket Management**: Create and manage OSS buckets
- **File Management**: List and manage uploaded files

## 📁 New Components

### EnhancedIssuesTab.js
Advanced issues management with:
- Custom field support
- Issue type categorization
- User permission checking
- Attribute mapping visualization

### ModelViewerTab.js
3D model viewing capabilities:
- Model selection and loading
- Interactive 3D viewer
- File upload and translation
- Viewer controls and settings

### WebhooksTab.js
Real-time notification management:
- Webhook creation and configuration
- Event selection and monitoring
- Webhook testing tools
- Status monitoring

## 🔧 Enhanced AccService Methods

### Issues API Enhancements
```javascript
// Get user permissions
await AccService.getIssueUserProfile(projectId);

// Get issue types and categories
await AccService.getIssueTypes(projectId, { include: 'subtypes' });

// Get custom attribute definitions
await AccService.getIssueAttributeDefinitions(projectId, { limit: 100 });

// Get attribute mappings
await AccService.getIssueAttributeMappings(projectId, { limit: 100 });
```

### Webhooks API
```javascript
// Create webhook
await AccService.createWebhook({
  callbackUrl: 'https://your-domain.com/webhook',
  events: ['issues.created', 'issues.updated'],
  scope: { folder: projectId }
});

// Get webhooks
await AccService.getWebhooks();

// Delete webhook
await AccService.deleteWebhook(webhookId);
```

### Data Management Enhancements
```javascript
// Get item tip version (for model viewing)
await AccService.getItemTipVersion(projectId, itemId);

// Get folder contents with proper URN handling
await AccService.getFolderContents(projectId, folderUrn);

// Get project folders
await AccService.getProjectFolders(projectId);
```

### OSS (Object Storage Service)
```javascript
// Upload file to OSS
await AccService.uploadFileToOSS(bucketKey, fileName, fileContent);

// Get OSS bucket details
await AccService.getOSSBucketDetails(bucketKey);

// Create OSS bucket
await AccService.createOSSBucket(bucketKey, 'transient');
```

### Model Derivative API
```javascript
// Translate model for viewing
await AccService.translateModel(objectId);

// Get translation status
await AccService.getTranslationStatus(objectId);
```

## 🎯 Usage Examples

### 1. Enhanced Issues Management
```javascript
import EnhancedIssuesTab from './components/EnhancedIssuesTab';

// In your main component
<EnhancedIssuesTab 
  selectedProject={selectedProject} 
  selectedHub={selectedHub} 
/>
```

### 2. 3D Model Viewer
```javascript
import ModelViewerTab from './components/ModelViewerTab';

// In your main component
<ModelViewerTab 
  selectedProject={selectedProject} 
  selectedHub={selectedHub} 
/>
```

### 3. Webhooks Management
```javascript
import WebhooksTab from './components/WebhooksTab';

// In your main component
<WebhooksTab 
  selectedProject={selectedProject} 
  selectedHub={selectedHub} 
/>
```

## 🔐 Authentication Requirements

### For Model Viewer
You'll need to include the APS Viewer SDK in your HTML:
```html
<script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"></script>
```

### For Webhooks
Ensure your webhook callback URLs are publicly accessible and can handle POST requests.

## 📊 API Rate Limits

Based on the APS documentation, be aware of rate limits:
- **Issues API**: Standard rate limits apply
- **Webhooks API**: Limited number of webhooks per account
- **Model Derivative**: Translation jobs have processing limits
- **OSS**: File size and upload frequency limits

## 🚨 Error Handling

All new methods include comprehensive error handling:
- Network errors
- Authentication failures
- Rate limit exceeded
- Invalid parameters
- Service unavailable

## 🔄 Real-time Updates

The webhook system enables real-time updates for:
- Issue creation, updates, and deletion
- RFI workflow changes
- Review status updates
- File uploads and deletions
- Model translation completion

## 📈 Performance Considerations

- **Parallel Loading**: Multiple API calls are made in parallel where possible
- **Caching**: User profiles and settings are cached locally
- **Lazy Loading**: Models are only loaded when selected
- **Error Recovery**: Graceful fallbacks for failed API calls

## 🛠️ Configuration

### Environment Variables
Ensure these are set in your environment:
```
APS_CLIENT_ID=your_client_id
APS_CLIENT_SECRET=your_client_secret
APS_BASE_URL=https://developer.api.autodesk.com
```

### Webhook Configuration
Set up your webhook endpoints to handle:
- POST requests with JSON payloads
- Event validation and processing
- Response status codes (200 for success)

## 🎉 Benefits

1. **Enhanced User Experience**: Rich 3D model viewing and real-time notifications
2. **Better Data Management**: Proper URN handling and file management
3. **Real-time Collaboration**: Webhook-based notifications keep users updated
4. **Advanced Issue Tracking**: Custom fields and categorization support
5. **Scalable Architecture**: Built on proven APS APIs with proper error handling

## 🔗 Related Documentation

- [APS Issues API](https://aps.autodesk.com/llms-full.txt#construction-issues)
- [APS Webhooks API](https://aps.autodesk.com/llms-full.txt#webhooks)
- [APS Model Derivative API](https://aps.autodesk.com/llms-full.txt#model-derivative)
- [APS Data Management API](https://aps.autodesk.com/llms-full.txt#data-management-api)
- [APS OSS API](https://aps.autodesk.com/llms-full.txt#oss)

## 📞 Support

For issues with the APS integration:
1. Check the browser console for detailed error messages
2. Verify your APS credentials and permissions
3. Ensure your webhook endpoints are accessible
4. Check the APS service status

The implementation follows the official APS documentation patterns and includes comprehensive error handling and logging for easy debugging.
