# 🚀 Create New OAuth App for Hubs Access

## Current Problem
Your OAuth app (`ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo`) doesn't have access to:
- Data Management API (for hubs)
- Construction Cloud API (for ACC features)

## Solution: Create New OAuth App

### Step 1: Go to Autodesk Developer Portal
1. Visit: https://forge.autodesk.com/myapps
2. Click **"Create App"**

### Step 2: Configure New App
```
App Name: ZOYANTRA-Hubs-Access
Description: ZOYANTRA Construction Management with full hubs and projects access
App Type: Web Application
```

### Step 3: Enable Required APIs
In the "APIs" section, enable these:
- ✅ **Data Management API** (for hubs/projects)
- ✅ **Autodesk Construction Cloud API** (for ACC features)
- ✅ **Construction Admin API** (for account management)

### Step 4: Set OAuth Scopes
Add these scopes:
```
data:read
data:write
data:create
data:search
bucket:read
bucket:create
account:read
```

### Step 5: Set Redirect URI
```
http://localhost:3000/auth/callback
```

### Step 6: Get New Credentials
After creating the app, copy:
- **Client ID** (new)
- **Client Secret** (new)

### Step 7: Update Your Application
1. Open `update-oauth-credentials.js`
2. Replace `YOUR_NEW_CLIENT_ID_HERE` with your new Client ID
3. Replace `YOUR_NEW_CLIENT_SECRET_HERE` with your new Client Secret
4. Run: `node update-oauth-credentials.js`

### Step 8: Test
1. Restart your development server
2. Clear browser storage
3. Try authentication again
4. You should now see hubs loading!

## Expected Result
- ✅ No more 404 errors
- ✅ Hubs loading successfully
- ✅ Projects loading successfully
- ✅ Full ACC functionality

## Quick Test
After updating credentials, you should see in console:
```
🔍 Fetching all accessible hubs...
✅ Data Management Hubs loaded: [number] hubs
```

Instead of:
```
❌ Data Management API Error: 404
```
