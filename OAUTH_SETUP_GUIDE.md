# 🚀 OAuth Setup Guide for Full ACC Access

## Current Problem
Your OAuth app only has "Source Code" permission, which is why you're getting 404 errors and no hubs/projects.

## Solution: Create New OAuth App with Full Permissions

### Step 1: Create New OAuth Application
1. Go to: https://forge.autodesk.com/myapps
2. Click **"Create App"**
3. Fill in:
   - **App Name**: `ZOYANTRA-ACC-Full`
   - **Description**: `ZOYANTRA Construction Performance Management with full ACC access`
   - **App Type**: `Web Application`

### Step 2: Enable Required APIs
In the "APIs" section, enable these:
- ✅ **Data Management API** (for hubs/projects)
- ✅ **Autodesk Construction Cloud API** (for ACC features)
- ✅ **Construction Admin API** (for account management)
- ✅ **Construction Cost API** (for budget data)
- ✅ **Construction Project API** (for project details)

### Step 3: Set OAuth Scopes
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

### Step 4: Set Redirect URI
```
http://localhost:3000/auth/callback
```

### Step 5: Get New Credentials
After creating the app, you'll get:
- **Client ID** (copy this)
- **Client Secret** (copy this)

### Step 6: Update Your Application
1. Open `update-oauth-credentials.js`
2. Replace `YOUR_NEW_CLIENT_ID_HERE` with your new Client ID
3. Replace `YOUR_NEW_CLIENT_SECRET_HERE` with your new Client Secret
4. Run: `node update-oauth-credentials.js`

### Step 7: Test
1. Restart your development server: `npm start`
2. Clear browser storage/cookies
3. Try the authentication flow
4. You should now see a comprehensive OAuth screen with all ACC permissions!

## Expected Result
Instead of just "Source Code" permission, you should see:
- ✅ Account information
- ✅ Project data access
- ✅ Construction Cloud features
- ✅ Data management
- ✅ And more!

## Troubleshooting
If you still get 404 errors:
1. Make sure all APIs are enabled in your OAuth app
2. Check that scopes include `data:read` and `account:read`
3. Verify the redirect URI is exactly `http://localhost:3000/auth/callback`
4. Clear all browser data and try again
