# 🔧 OAuth Permission Fix Guide

## Current Problem
Your OAuth app only shows "Source Code" permission, which means it doesn't have access to:
- Data Management API (for hubs/projects)
- Construction Cloud APIs
- Account information

## Solution: Fix OAuth App Configuration

### Step 1: Check Current OAuth App
1. Go to: https://forge.autodesk.com/myapps
2. Find your app: `ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo`
3. Click "Edit" or "Configure"

### Step 2: Enable Required APIs
In the "APIs" section, make sure these are enabled:
- ✅ **Data Management API** (for hubs/projects)
- ✅ **Autodesk Construction Cloud API** (for ACC features)
- ✅ **Construction Admin API** (for account management)

### Step 3: Update OAuth Scopes
In the "Scopes" section, add these:
```
data:read
data:write
data:create
data:search
bucket:read
bucket:create
account:read
```

### Step 4: Alternative - Create New OAuth App
If you can't modify the existing app:

1. **Create New App:**
   - Name: `ZOYANTRA-ACC-Full`
   - Type: Web Application
   - Redirect URI: `http://localhost:3000/auth/callback`

2. **Enable APIs:**
   - Data Management API
   - Autodesk Construction Cloud API
   - Construction Admin API

3. **Set Scopes:**
   ```
   data:read
   data:write
   data:create
   data:search
   bucket:read
   bucket:create
   account:read
   ```

4. **Update Credentials:**
   - Copy new Client ID and Client Secret
   - Update `update-oauth-credentials.js` with new credentials
   - Run: `node update-oauth-credentials.js`

### Step 5: Test
1. Clear browser storage
2. Try OAuth flow again
3. You should now see comprehensive permissions instead of just "Source Code"

## Expected OAuth Screen
Instead of just "Source Code", you should see:
- ✅ Account information
- ✅ Project data access
- ✅ Construction Cloud features
- ✅ Data management
- ✅ And more permissions!

## Troubleshooting
- If still only "Source Code": OAuth app APIs not enabled
- If 404 errors: Wrong API endpoints or missing permissions
- If redirect issues: Check redirect URI matches exactly
