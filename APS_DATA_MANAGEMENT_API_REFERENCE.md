# APS Data Management API Reference Guide

This guide provides a comprehensive reference for the Autodesk Platform Services (APS) Data Management API endpoints used in the Zoyantra application.

## Table of Contents
- [Hubs](#hubs)
- [Projects](#projects)
- [Folders](#folders)
- [Items](#items)
- [Versions](#versions)
- [Buckets](#buckets)
- [Objects](#objects)
- [Commands](#commands)
- [Implementation Examples](#implementation-examples)

## Hubs

Hubs are the main entry point to the Data Management API and represent a space where projects are hosted.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/hubs` | Returns a collection of accessible hubs for this member |
| `GET` | `/hubs/:hub_id` | Returns data on a specific hub_id |

### Implementation in Zoyantra
```javascript
// Get all accessible hubs
const hubs = await AccService.getHubs();

// Get specific hub details
const hubDetails = await AccService.getHubDetails(hubId);
```

## Projects

Projects contain the entry points of each individual project a hub is hosting.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/hubs/:hub_id/projects` | Returns a collection of projects for a given hub_id |
| `GET` | `/hubs/:hub_id/projects/:project_id` | Returns a project for a given project_id |
| `GET` | `/hubs/:hub_id/projects/:project_id/hub` | Returns the hub for a given project_id |
| `GET` | `/hubs/:hub_id/projects/:project_id/topFolders` | Returns the details of the highest level folders |
| `GET` | `/projects/:project_id/downloads/:download_id` | Returns the details for a specific download |
| `GET` | `/projects/:project_id/jobs/:job_id` | Returns the job_id object |
| `POST` | `/projects/:project_id/downloads` | Request the creation of a new download |
| `POST` | `/projects/:project_id/storage` | Creates a storage location in the OSS |

### Implementation in Zoyantra
```javascript
// Get projects from hub
const projects = await AccService.getProjects(hubId);

// Get project details
const projectDetails = await AccService.getProjectDetails(projectId);

// Get top folders
const topFolders = await AccService.getTopFolders(projectId);

// Create storage location
const storageLocation = await AccService.createStorageLocation(projectId);
```

## Folders

Folders are collections of resources related to a project. Every project has a root folder within which all project data is contained.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects/:project_id/folders/:folder_id` | Returns the folder by ID |
| `GET` | `/projects/:project_id/folders/:folder_id/contents` | Returns a collection of items and folders within a folder |
| `GET` | `/projects/:project_id/folders/:folder_id/parent` | Returns the parent folder (if it exists) |
| `GET` | `/projects/:project_id/folders/:folder_id/refs` | Returns resources with custom relationships |
| `GET` | `/projects/:project_id/folders/:folder_id/search` | Filters data of a folder and subfolders |
| `GET` | `/projects/:project_id/folders/:folder_id/relationships/links` | Returns a collection of links |
| `GET` | `/projects/:project_id/folders/:folder_id/relationships/refs` | Returns custom relationships |
| `PATCH` | `/projects/:project_id/folders/:folder_id` | Modifies folder names |
| `POST` | `/projects/:project_id/folders` | Creates a new folder |
| `POST` | `/projects/:project_id/folders/:folder_id/relationships/refs` | Creates a custom relationship |

### Implementation in Zoyantra
```javascript
// Get folder contents
const contents = await AccService.getProjectFiles(projectId, folderId);

// Get folder details
const folderDetails = await AccService.getFolderDetails(projectId, folderId);

// Search folder contents
const searchResults = await AccService.searchFolderContents(projectId, folderId, searchTerm);

// Create new folder
const newFolder = await AccService.createFolder(projectId, folderName, parentFolderId);
```

## Items

Items represent the data contained by a project and can have many forms. Changes to items are tracked and all versions are stored.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects/:project_id/items/:item_id` | Returns a resource item by ID |
| `GET` | `/projects/:project_id/items/:item_id/parent` | Returns the "parent" folder |
| `GET` | `/projects/:project_id/items/:item_id/refs` | Returns resources with custom relationships |
| `GET` | `/projects/:project_id/items/:item_id/relationships/links` | Returns a collection of links |
| `GET` | `/projects/:project_id/items/:item_id/relationships/refs` | Returns custom relationships |
| `GET` | `/projects/:project_id/items/:item_id/tip` | Returns the "tip" version |
| `GET` | `/projects/:project_id/items/:item_id/versions` | Returns versions for the given item |
| `PATCH` | `/projects/:project_id/items/:item_id` | Updates the properties of the item |
| `POST` | `/projects/:project_id/items` | Creates the first version of a file |
| `POST` | `/projects/:project_id/items/:item_id/relationships/refs` | Creates a custom relationship |

### Implementation in Zoyantra
```javascript
// Get item details
const itemDetails = await AccService.getItemDetails(projectId, itemId);

// Get item versions
const versions = await AccService.getItemVersions(projectId, itemId);

// Get item tip (latest version)
const tipVersion = await AccService.getItemTip(projectId, itemId);

// Download file
const downloadInfo = await AccService.downloadFile(projectId, itemId);
```

## Versions

Versions represent a specific state for an item. As the item changes, a new version is created.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects/:project_id/versions/:version_id` | Returns the version with the given version_id |
| `GET` | `/projects/:project_id/versions/:version_id/downloadFormats` | Returns supported file formats for conversion |
| `GET` | `/projects/:project_id/versions/:version_id/downloads` | Returns already available downloads |
| `GET` | `/projects/:project_id/versions/:version_id/item` | Returns the item the version is associated with |
| `GET` | `/projects/:project_id/versions/:version_id/refs` | Returns resources with custom relationships |
| `GET` | `/projects/:project_id/versions/:version_id/relationships/links` | Returns a collection of links |
| `GET` | `/projects/:project_id/versions/:version_id/relationships/refs` | Returns custom relationships |
| `PATCH` | `/projects/:project_id/versions/:version_id` | Updates the properties of the version |
| `POST` | `/projects/:project_id/versions` | Creates new versions of a file |
| `POST` | `/projects/:project_id/versions/:version_id/relationships/refs` | Creates a custom relationship |

### Implementation in Zoyantra
```javascript
// Get version details
const versionDetails = await AccService.getVersion(projectId, versionId);

// Get download formats
const downloadFormats = await AccService.getVersionDownloadFormats(projectId, versionId);

// Get available downloads
const availableDownloads = await AccService.getVersionDownloads(projectId, versionId);
```

## Buckets

Object Storage Service (OSS) buckets for file storage.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/buckets` | Creates a bucket |
| `GET` | `/buckets` | Lists buckets |
| `GET` | `/buckets/:bucketKey/details` | Gets bucket details |
| `DELETE` | `/buckets/:bucketKey` | Deletes a bucket |

### Implementation in Zoyantra
```javascript
// Create bucket with retention policy
const bucket = await AccService.createBucket(bucketKey, retentionPolicy);

// List buckets
const buckets = await AccService.getBuckets();

// Get bucket details
const bucketDetails = await AccService.getBucketDetails(bucketKey);
```

## Objects

OSS objects for file storage and retrieval.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/buckets/:bucketKey/objects` | Gets a list of objects |
| `GET` | `/buckets/:bucketKey/objects/:objectKey/details` | Gets object details |
| `POST` | `/buckets/:bucketKey/objects/:objectKey/signed` | Creates a signed URL to an object |
| `GET` | `/buckets/:bucketKey/objects/:objectKey/signeds3download` | Gets a signed URL for download from S3 |
| `POST` | `/buckets/:bucketKey/objects/batchsigneds3download` | Gets multiple signed URLs |
| `PUT` | `/buckets/:bucketKey/objects/:objectKey/copyto/:newObjectKey` | Copies an object |
| `DELETE` | `/buckets/:bucketKey/objects/:objectKey` | Deletes an object |

### Implementation in Zoyantra
```javascript
// Upload file to storage
const uploadResult = await AccService.uploadFileToStorage(bucketKey, objectKey, file);

// Get signed download URL
const signedUrl = await AccService.getSignedDownloadUrl(bucketKey, objectKey);

// Download file directly
await AccService.downloadFileToBrowser(projectId, itemId);
```

## Commands

Commands are used for performing complex operations on multiple resources.

### Available Commands

| Command | Description |
|---------|-------------|
| `CheckPermission` | Checks permissions for specified resources |
| `ListRefs` | Retrieves custom relationships between resources |
| `ListItems` | Retrieves metadata for specified items |
| `PublishModel` | Publishes C4R model to BIM 360 Docs |
| `PublishWithoutLinks` | Publishes C4R model without links |
| `GetPublishModelJob` | Verifies if C4R model needs publishing |

### Implementation in Zoyantra
```javascript
// Check permissions
const permissions = await AccService.checkPermissions(projectId, resources);

// List relationships
const relationships = await AccService.listRefs(projectId, resources);

// List items metadata
const itemsMetadata = await AccService.listItems(projectId, itemIds);

// Execute custom command
const result = await AccService.executeCommand(projectId, command, commandData);
```

## Implementation Examples

### Complete File Download Workflow

```javascript
// Step 1: Get project files
const files = await AccService.getProjectFiles(projectId);

// Step 2: Get item details
const itemDetails = await AccService.getItemDetails(projectId, itemId);

// Step 3: Get version details
const versionDetails = await AccService.getItemTip(projectId, itemId);

// Step 4: Extract storage information
const storageInfo = versionDetails.relationships.storage.data;
const objectId = storageInfo.id;

// Step 5: Parse bucket and object key
const [bucketKey, objectKey] = objectId.match(/urn:adsk\.objects:os\.object:([^\/]+)\/(.+)/).slice(1);

// Step 6: Get signed download URL
const signedUrl = await AccService.getSignedDownloadUrl(bucketKey, objectKey);

// Step 7: Download file
await AccService.downloadFileToBrowser(projectId, itemId);
```

### File Upload Workflow

```javascript
// Step 1: Create storage location
const storageLocation = await AccService.createStorageLocation(projectId);

// Step 2: Upload file to OSS
const uploadResult = await AccService.uploadFileToStorage(
  storageLocation.bucketKey, 
  storageLocation.objectKey, 
  file
);

// Step 3: Create item in project
const item = await AccService.createItem(projectId, itemData);

// Step 4: Create version
const version = await AccService.createVersion(projectId, item.id, versionData);
```

### Folder Navigation

```javascript
// Get root folder contents
const rootContents = await AccService.getProjectFiles(projectId);

// Navigate to subfolder
const subfolderContents = await AccService.getProjectFiles(projectId, folderId);

// Search within folder
const searchResults = await AccService.searchFolderContents(
  projectId, 
  folderId, 
  searchTerm
);
```

## Rate Limits

Based on official APS documentation:

| Endpoint Type | Rate Limit |
|---------------|------------|
| Hub endpoints | 50 req/min |
| Project endpoints | 50 req/min |
| Folder contents | 300 req/min |
| Item details | 300 req/min |
| Item versions | 800 req/min |
| Version info | 300 req/min |
| Commands | 300 req/min |
| OSS overall | 1000 req/min |

## Error Handling

The Zoyantra application includes comprehensive error handling for:

- **Authentication Issues**: Token validation and refresh
- **Permission Errors**: User access validation
- **Rate Limiting**: Automatic retry with backoff
- **Network Issues**: Connection timeout handling
- **API Errors**: Detailed error messages and troubleshooting

## Best Practices

1. **Use Appropriate Scopes**: Ensure OAuth scopes match required operations
2. **Handle Rate Limits**: Implement retry logic with exponential backoff
3. **Cache Results**: Store frequently accessed data locally
4. **Batch Operations**: Use batch endpoints when available
5. **Monitor Usage**: Track API calls and implement usage limits
6. **Error Recovery**: Implement graceful degradation for API failures

This reference guide provides complete coverage of the APS Data Management API as implemented in the Zoyantra application, with practical examples and best practices for each endpoint category.
