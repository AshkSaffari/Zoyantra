# Environment Variables Setup Guide

## 🔧 **Fix AUTH-001 Error - Environment Variables**

Your application is getting the AUTH-001 error because the environment variables are not set up correctly. Here's how to fix it:

### **Step 1: Create .env File**

Create a file named `.env` in your project root directory (same level as `package.json`) with these contents:

```env
REACT_APP_CLIENT_ID=ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo
REACT_APP_CLIENT_SECRET=fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa
REACT_APP_ACCOUNT_ID=ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2
```

### **Step 2: Restart Development Server**

After creating the `.env` file:

1. **Stop your development server** (Ctrl+C)
2. **Start it again** with `npm start` or `yarn start`
3. **Clear your browser cache** (Ctrl+Shift+R)

### **Step 3: Enable API Products in APS Portal**

1. Go to [https://developer.autodesk.com/](https://developer.autodesk.com/)
2. Sign in and go to "My Apps"
3. Select your application
4. Go to "API Products" section
5. Enable these APIs:
   - ✅ **Data Management API**
   - ✅ **Model Derivative API**
   - ✅ **Object Storage Service (OSS)**
   - ✅ **Webhooks API** (optional)
   - ✅ **Cost Management API** (optional)

### **Step 4: Save and Wait**

1. **Save** the changes in APS Portal
2. **Wait 5-10 minutes** for changes to propagate
3. **Test authentication** again

## ✅ **Expected Results**

After following these steps:
- No AUTH-001 error
- Authentication redirects to Autodesk successfully
- OAuth flow completes without errors
- All tabs load properly

## 🚨 **If Still Not Working**

1. **Check .env file location** - Must be in project root
2. **Verify no extra spaces** around the = signs
3. **Restart development server** after creating .env
4. **Clear browser cache** completely
5. **Test in incognito mode**

The main issue was that your environment variables weren't being loaded properly. The `.env` file will fix this issue.
