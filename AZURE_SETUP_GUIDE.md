# Azure AD App Registration Setup Guide for Outlook Integration

## Overview
This guide explains how to configure the redirect URI (callback URL) in Azure AD for Outlook/Office 365 integration in the Zoyantra app.

## Why is a Callback URL Required?

When users authenticate with Outlook/Office 365 through your app:
1. User clicks "Connect to Outlook" 
2. They're redirected to Microsoft login page
3. After successful login, Microsoft redirects back to your app with an authorization code
4. Your app exchanges this code for an access token
5. Your app can now send emails via Outlook

The **callback URL** is where Microsoft sends the user back after authentication.

## What Callback URL to Use

### For Local Development:
```
http://localhost:3000/outlook-callback
```

### For Production:
```
https://your-actual-domain.com/outlook-callback
```

Replace `your-actual-domain.com` with your actual production domain.

## How to Configure in Azure Portal

### Step 1: Access Azure Portal
1. Go to https://portal.azure.com
2. Sign in with your CEWA credentials

### Step 2: Navigate to App Registrations
1. Search for "Azure Active Directory" or "Entra ID"
2. Click on "App registrations" in the left menu
3. Find your app: **CEWA Outlook Integration** (or search by Client ID: `2a998440-08f4-44ee-a5dc-36b03f30eb17`)

### Step 3: Add Redirect URI
1. Click on your app in the list
2. In the left menu, click "Authentication"
3. Under "Platform configurations", click "Add a platform"
4. Select "Single-page application"
5. In the "Redirect URIs" section, add your callback URL:
   - For development: `http://localhost:3000/outlook-callback`
   - For production: `https://yourdomain.com/outlook-callback`
6. Click "Configure"

### Step 4: Add API Permissions
1. Still in your app, click "API permissions" in the left menu
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Add these Application permissions (for server-side use):
   - `Mail.Read`
   - `Mail.Send`
   - `Calendars.ReadWrite`
   - `User.Read`
5. Click "Grant admin consent" (requires admin approval)

## Current Configuration

Your app is already configured with:

**Tenant ID:** `c5852f23-3633-4f29-b386-51da53e35e23`  
**Client ID:** `2a998440-08f4-44ee-a5dc-36b03f30eb17`  
**Client Secret:** `a8291bcf-ced0-44f0-a665-3022f497a189`  
**Test Account:** `8445svc_zoyantra.testing@cewa.edu.au`

The callback URL is automatically set in your code to:
```javascript
redirectUri: `${window.location.origin}/outlook-callback`
```

This means:
- On `localhost:3000` → `http://localhost:3000/outlook-callback`
- On production → `https://yourdomain.com/outlook-callback`

## What You Need to Do

**IMPORTANT:** You must add the callback URL to Azure Portal:

1. Go to Azure Portal → App Registrations → Your App
2. Click "Authentication"
3. Under "Single-page application" platform, add:
   - `http://localhost:3000/outlook-callback`
4. Click "Save"

## Testing

Once configured, you can test the integration:
1. Start your app: `npm start`
2. Go to the Reminder Tab → Account Users
3. The app should be able to send reminder emails via Outlook

## Security Notes

⚠️ **Important:** The callback URL must match exactly what's in your app code and Azure Portal. Mismatched URLs will cause authentication to fail.

**For Production:**
- Never use `localhost` in production
- Update Azure Portal with your actual production domain
- The callback URL will be automatically set based on where your app is hosted
- When you deploy to production, just update Azure Portal with that domain

## Questions?

If you encounter issues:
1. Check the callback URL matches in both places
2. Verify API permissions are granted
3. Check the browser console for authentication errors
4. Ensure the test account credentials are correct

