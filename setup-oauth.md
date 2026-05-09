# OAuth Setup Guide for Zoyantra

## Current Issue
The OAuth token exchange is failing with error: `401 - invalid_credentials`

This means the OAuth application with Client ID `ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo` is either:
- Not properly configured in the Autodesk Developer Portal
- Not enabled for the required APIs
- Has incorrect redirect URI settings
- Has expired credentials

## Solution: Create New OAuth Application

### Step 1: Access Autodesk Developer Portal
1. Go to [https://forge.autodesk.com/myapps](https://forge.autodesk.com/myapps)
2. Sign in with your Autodesk account
3. Click "Create App"

### Step 2: Configure OAuth Application
1. **App Name**: `Zoyantra Construction Management`
2. **App Type**: Select "Web Application"
3. **Redirect URI**: `http://localhost:3000/auth/callback`
4. **APIs**: Enable the following:
   - Data Management API
   - Cost Management API
   - Construction Cloud API
   - Model Derivative API (if needed)

### Step 3: Get Credentials
After creating the app, you'll get:
- **Client ID**: Copy this value
- **Client Secret**: Copy this value

### Step 4: Update Application
Choose one of these options:

#### Option A: Environment Variables (Recommended)
Create a `.env` file in the project root:
```env
REACT_APP_CLIENT_ID=your_new_client_id_here
REACT_APP_CLIENT_SECRET=your_new_client_secret_here
REACT_APP_ACCOUNT_ID=your_account_id_here
```

#### Option B: Update Fallback Credentials
Update the fallback credentials in `src/services/AccService.js`:
```javascript
const clientId = process.env.REACT_APP_CLIENT_ID || 'your_new_client_id_here';
const clientSecret = process.env.REACT_APP_CLIENT_SECRET || 'your_new_client_secret_here';
```

### Step 5: Test OAuth Flow
1. Restart the development server
2. Clear browser cache and localStorage
3. Try the OAuth flow again

## Current Configuration Details

- **Client ID**: `ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo`
- **Redirect URI**: `http://localhost:3000/auth/callback`
- **OAuth Endpoint**: `https://developer.api.autodesk.com/authentication/v2/authorize`
- **Token Endpoint**: `https://developer.api.autodesk.com/authentication/v2/token`
- **Scopes**: `data:read data:write data:create data:search bucket:read bucket:create`

## Troubleshooting

### If OAuth URL Generation Fails
- Check that the OAuth application is configured as "Web Application"
- Verify the redirect URI matches exactly
- Ensure the required APIs are enabled

### If Token Exchange Still Fails
- Verify the Client ID and Client Secret are correct
- Check that the OAuth application is active
- Ensure the redirect URI in the OAuth app matches the one being used

### If API Calls Fail After Token Exchange
- Check that the required APIs are enabled in the OAuth application
- Verify the scopes include the necessary permissions
- Ensure the token has not expired

## Testing

You can test the OAuth configuration by:
1. Opening `oauth-debug.html` in your browser
2. Clicking "Generate OAuth URL" to test URL generation
3. Following the OAuth flow to verify token exchange

## Security Notes

- Never commit Client Secret to version control
- Use environment variables for production
- Regularly rotate Client Secret
- Monitor OAuth application usage in the Developer Portal
