// Clear OAuth State - Fix Authentication Loop
// Run this in your browser console (F12) when stuck on "Generating OAuth URL..."

console.log('🔧 Starting OAuth state cleanup...');

try {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('✅ OAuth state cleared successfully!');
    console.log('🔄 Reloading application...');
    
    // Reload the page
    window.location.reload();
    
} catch (e) {
    console.error('❌ Error clearing OAuth state:', e);
}
