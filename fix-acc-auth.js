// Fix ACC Authentication Issues
// Run this in your browser console to fix the ACC project browser

console.log('🔧 Fixing ACC Authentication Issues...');

// Step 1: Clear all authentication data
function clearAuthenticationData() {
    console.log('🧹 Clearing authentication data...');
    
    // Clear localStorage
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Clear any remaining ACC-related data
    const accKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('acc') || key.includes('autodesk') || key.includes('zoyantra'))) {
            accKeys.push(key);
        }
    }
    
    accKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`✅ Removed ${key}`);
    });
    
    console.log('🎉 All authentication data cleared!');
}

// Step 2: Check current authentication status
function checkAuthenticationStatus() {
    console.log('🔍 Checking authentication status...');
    
    const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
    console.log('📋 Current credentials:');
    console.log(`  - Has access token: ${!!credentials.accessToken}`);
    console.log(`  - Has refresh token: ${!!credentials.refreshToken}`);
    console.log(`  - Has three-leg token: ${!!credentials.threeLegToken}`);
    console.log(`  - Token expiry: ${credentials.expiresAt || 'Unknown'}`);
    
    if (credentials.accessToken) {
        const now = new Date();
        const expiry = new Date(credentials.expiresAt);
        const isExpired = now > expiry;
        console.log(`  - Token expired: ${isExpired}`);
    }
    
    return credentials;
}

// Step 3: Test ACC connection
async function testACCConnection() {
    console.log('🔗 Testing ACC connection...');
    
    try {
        const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
        const token = credentials.accessToken;
        
        if (!token) {
            console.log('❌ No access token found');
            return false;
        }
        
        const response = await fetch('https://developer.api.autodesk.com/project/v1/hubs', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ ACC connection successful!');
            return true;
        } else {
            console.log(`❌ ACC connection failed: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ACC connection error: ${error.message}`);
        return false;
    }
}

// Main fix function
async function fixACCAuthentication() {
    console.log('🚀 Starting ACC authentication fix...');
    
    // Step 1: Check current status
    const credentials = checkAuthenticationStatus();
    
    // Step 2: Clear authentication data
    clearAuthenticationData();
    
    // Step 3: Test connection (should fail)
    const connectionWorking = await testACCConnection();
    
    if (!connectionWorking) {
        console.log('✅ Authentication cleared successfully!');
        console.log('🔄 Please reload the page and re-authenticate with Autodesk');
        console.log('📝 After reloading, you will need to sign in again with your Autodesk account');
    } else {
        console.log('⚠️ Connection still working - authentication may not have been cleared');
    }
    
    return true;
}

// Auto-run the fix
fixACCAuthentication();

// Export functions for manual use
window.fixACCAuthentication = fixACCAuthentication;
window.clearAuthenticationData = clearAuthenticationData;
window.checkAuthenticationStatus = checkAuthenticationStatus;
window.testACCConnection = testACCConnection;

console.log('💡 You can also run these functions manually:');
console.log('  - fixACCAuthentication()');
console.log('  - clearAuthenticationData()');
console.log('  - checkAuthenticationStatus()');
console.log('  - testACCConnection()');
