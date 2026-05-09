# DocuSign Setup Guide

## 🔧 **Step 1: Create DocuSign Developer Account**

1. Go to [DocuSign Developer Center](https://developers.docusign.com/)
2. Sign up for a free developer account
3. Verify your email address

## 🔧 **Step 2: Create Integration Key**

1. In DocuSign Developer Center, go to "Apps and Keys"
2. Click "Add App and Integration Key"
3. Fill in the details:
   - **App Name**: Zoyantra DocuSign Integration
   - **Description**: DocuSign integration for Zoyantra project
4. Click "Create"
5. **Copy the Integration Key** (this is your Client ID)
6. **Generate Secret Key** and copy it

## 🔧 **Step 3: Configure Redirect URI**

1. In your DocuSign app settings, add redirect URI:
   - `http://localhost:3000/docusign/callback`
2. Save the configuration

## 🔧 **Step 4: Set Environment Variables**

Create a `.env` file in your project root:

```env
# DocuSign Configuration
REACT_APP_DOCUSIGN_CLIENT_ID=your_integration_key_here
REACT_APP_DOCUSIGN_CLIENT_SECRET=your_secret_key_here
REACT_APP_DOCUSIGN_REDIRECT_URI=http://localhost:3000/docusign/callback
REACT_APP_DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
REACT_APP_DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com
```

## 🔧 **Step 5: Test the Connection**

1. Restart your development server: `npm start`
2. Go to the DocuSign tab in your application
3. Click "Connect to DocuSign"
4. You should be redirected to DocuSign login page
5. After login, you'll be redirected back to your app

## 🔧 **Troubleshooting**

### Error: "The client id provided is not registered with DocuSign"
- Make sure your Integration Key is correct
- Check that the redirect URI matches exactly
- Ensure the app is published in DocuSign

### Error: "Invalid redirect URI"
- Verify the redirect URI in DocuSign matches your .env file
- Make sure there are no extra spaces or characters

### Error: "Invalid client credentials"
- Double-check your Client ID and Secret
- Make sure you're using the correct environment (demo vs production)

## 🔧 **Production Setup**

For production, you'll need to:
1. Create a production DocuSign app
2. Update the base path to production URL
3. Set up proper SSL certificates
4. Update redirect URIs for your production domain

## 📝 **Important Notes**

- DocuSign demo environment is free for testing
- Production requires paid DocuSign account
- Integration keys are environment-specific
- Always use HTTPS in production
