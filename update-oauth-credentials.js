/**
 * OAuth Credentials Update Script
 * Run this after creating your new OAuth app with full ACC permissions
 */

// Step 1: Create new OAuth app at https://forge.autodesk.com/myapps
// Step 2: Enable these APIs:
//   - Data Management API
//   - Autodesk Construction Cloud API
//   - Construction Admin API
//   - Construction Cost API
//   - Construction Project API
// Step 3: Update the credentials below
// Step 4: Run: node update-oauth-credentials.js

const fs = require('fs');
const path = require('path');

// NEW OAUTH APP CREDENTIALS (Update these after creating the app)
const NEW_CREDENTIALS = {
  clientId: 'YOUR_NEW_CLIENT_ID_HERE',
  clientSecret: 'YOUR_NEW_CLIENT_SECRET_HERE'
};

// Files to update
const filesToUpdate = [
  'src/services/AccService.js',
  'src/config/auth.js',
  'src/utils/envTest.js',
  'src/utils/oauthDebug.js'
];

// Current fallback credentials to replace
const OLD_CREDENTIALS = {
  clientId: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
  clientSecret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa'
};

console.log('🔄 Updating OAuth credentials...');

filesToUpdate.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace old credentials with new ones
      content = content.replace(
        new RegExp(OLD_CREDENTIALS.clientId, 'g'),
        NEW_CREDENTIALS.clientId
      );
      content = content.replace(
        new RegExp(OLD_CREDENTIALS.clientSecret, 'g'),
        NEW_CREDENTIALS.clientSecret
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⚠️ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log('\n🎉 OAuth credentials updated!');
console.log('📝 Next steps:');
console.log('1. Restart your development server');
console.log('2. Clear browser storage/cookies');
console.log('3. Try the authentication flow again');
console.log('4. You should now see full ACC permissions in the OAuth screen!');
