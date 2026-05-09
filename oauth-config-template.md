# OAuth Configuration Template

## New OAuth App Setup

### 1. Create New OAuth Application
- Go to: https://forge.autodesk.com/myapps
- Click "Create App"
- App Name: `ZOYANTRA-ACC-Full`
- App Type: `Web Application`

### 2. Enable Required APIs
✅ **Data Management API** (for hubs/projects)
✅ **Autodesk Construction Cloud API** (for ACC features)  
✅ **Construction Admin API** (for account management)
✅ **Construction Cost API** (for budget data)
✅ **Construction Project API** (for project details)

### 3. OAuth Scopes
```
data:read
data:write
data:create
data:search
bucket:read
bucket:create
account:read
```

### 4. Redirect URI
```
http://localhost:3000/auth/callback
```

### 5. Update Environment Variables
After creating the app, update your `.env` file:

```env
REACT_APP_CLIENT_ID=your_new_client_id_here
REACT_APP_CLIENT_SECRET=your_new_client_secret_here
```

### 6. Test the New App
1. Update the credentials in your `.env` file
2. Restart your development server
3. Clear browser storage/cookies
4. Try the authentication flow again

You should now see a comprehensive authorization screen with all the ACC permissions!
