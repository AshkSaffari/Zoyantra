# 🚀 Complete Setup Guide for Hubs and Projects Access

## Current Issue
You have basic OAuth permissions but need **additional scopes** and **app provisioning** to access hubs and projects.

## Required Setup Steps

### Step 1: Update OAuth Scopes ✅ (Done)
I've updated your OAuth scopes to include:
```
data:read
data:write
data:create
data:search
bucket:read
bucket:create
account:read
user-profile:read
```

### Step 2: App Provisioning in ACC Account (CRITICAL)

This is the missing piece! You need to provision your app in your ACC account:

1. **Go to ACC Account Admin:**
   - Visit: https://construction.autodesk.com
   - Log in with your Autodesk account
   - Go to **Account Admin** section

2. **Add Custom Integration:**
   - Navigate to **Settings** > **Custom Integrations**
   - Click **Add Custom Integration**

3. **Configure Integration:**
   - Select access levels:
     - ✅ **BIM 360 Account Administration**
     - ✅ **Document Management**
     - ✅ **Project Management**
   - Choose **"I'm the developer"**
   - Enter your **Client ID**: `ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo`
   - Enter **App Name**: `ZOYANTRA`

4. **Save and Confirm:**
   - Review and click **Save**

### Step 3: Create Hub/Account

After provisioning, create a hub or account:

1. **Create Data Management Hub:**
   - Go to: https://forge.autodesk.com/myapps
   - Find your OAuth app
   - Look for "Create Hub" or "Create Bucket" option

2. **Create ACC Project:**
   - In your ACC account, create a new project
   - This will make it accessible via the API

### Step 4: Test the Setup

1. **Clear browser storage**
2. **Try authentication again**
3. **Check console logs** - you should now see:
   ```
   ✅ Data Management Hubs loaded: 1
   ✅ Data Management Projects loaded: [number]
   ```

## Expected OAuth Screen

After updating scopes, you should see additional permissions:
- ✅ **User Profile** (new)
- ✅ **Account Administration** (new)
- ✅ **Project Management** (new)

## Troubleshooting

- **Still 404?** Check that app provisioning is complete
- **No hubs?** Create a hub in your OAuth app
- **No projects?** Create a project in your ACC account
- **Permission denied?** Verify user has access to the projects

## Quick Test

After setup, test in browser console:
```javascript
// Test hubs access
fetch('https://developer.api.autodesk.com/data/v1/hubs', {
  headers: {
    'Authorization': 'Bearer YOUR_3LEG_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log);
```

This should return your hub data instead of 404.

## Summary

The key missing piece is **app provisioning in your ACC account**. Without this, even with correct OAuth scopes, you can't access hubs and projects.
