# Autodesk Construction Cloud (ACC) OAuth Scopes Guide

## ❌ Invalid Scopes (Not Available for ACC)

The following scopes are **NOT** available for Autodesk Construction Cloud:
- `cost:read` - Not available
- `cost:write` - Not available  
- `review:read` - Not available
- `review:write` - Not available

These scopes don't exist in the Autodesk OAuth 2.0 system for ACC.

## ✅ Valid Scopes for ACC

### **Core Data Access**
- `data:read` - Read files, documents, and project data
- `data:write` - Write files, documents, and project data
- `bucket:read` - Read storage buckets
- `bucket:create` - Create storage buckets
- `viewables:read` - Read viewable files (for 3D models, drawings)

### **Account & Project Access**
- `account:read` - Read account information (required for ACC Admin API)

## 🔍 How to Access Cost and Review Data

Since dedicated cost/review scopes don't exist, you need to use the **ACC Admin API** endpoints:

### **Cost Management Data**
Use these ACC Admin API endpoints:
- `GET /construction/admin/v1/accounts/{accountId}/projects` - Get projects with cost data
- `GET /construction/admin/v1/projects/{projectId}` - Get project details including cost information
- `GET /construction/admin/v1/projects/{projectId}/users` - Get project users for cost tracking

### **Review Data**
Use these ACC Admin API endpoints:
- `GET /construction/admin/v1/projects/{projectId}` - Get project details including review status
- `GET /construction/admin/v1/projects/{projectId}/users` - Get user roles and permissions

## 📋 Current Working Scopes

Your app now uses these **valid** scopes:
```
data:read data:write bucket:read bucket:create viewables:read account:read
```

## 🚀 What This Enables

With the valid scopes, you can:
- ✅ **Access all project data** - Including cost and budget information
- ✅ **Read/write files** - Documents, drawings, models
- ✅ **Manage storage** - Create and access buckets
- ✅ **View 3D models** - Access viewable files
- ✅ **Get account info** - Access ACC accounts and projects

## 💡 Cost and Review Functionality

Even without dedicated scopes, you can still build cost and review features by:

1. **Using ACC Admin API** - Access project data that includes cost information
2. **File-based data** - Store cost/review data in files and access via `data:read`/`data:write`
3. **Project metadata** - Use project fields to store cost and review information

## 🔧 Next Steps

1. **Test the OAuth flow** - It should now work without the invalid scope error
2. **Use ACC Admin API** - Access cost and review data through the official endpoints
3. **Build your features** - Implement cost/review functionality using the available APIs

The OAuth flow should now work perfectly! 🎉
