// Emergency Auth Reset Utility
// Have your client run this in browser console to force logout and clear all session data

function emergencyAuthReset() {
  console.log('🔄 Starting emergency auth reset...');
  
  // Clear all localStorage
  console.log('🧹 Clearing localStorage...');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('session')) {
      localStorage.removeItem(key);
      console.log(`   ❌ Removed: ${key}`);
    }
  });
  
  // Clear all sessionStorage
  console.log('🧹 Clearing sessionStorage...');
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('session')) {
      sessionStorage.removeItem(key);
      console.log(`   ❌ Removed: ${key}`);
    }
  });
  
  // Clear cookies
  console.log('🧹 Clearing cookies...');
  document.cookie.split(";").forEach(function(c) { 
    const cookieName = c.replace(/^ +/, "").split('=')[0];
    if (cookieName.startsWith('sb-') || cookieName.includes('supabase') || cookieName.includes('auth')) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      console.log(`   ❌ Cleared cookie: ${cookieName}`);
    }
  });
  
  console.log('✅ Auth reset complete!');
  console.log('🔄 Redirecting to login page...');
  
  // Force redirect
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
}

// Auto-run the function
emergencyAuthReset();