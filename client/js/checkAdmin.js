(function() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userType = sessionStorage.getItem('userType');
    
    // Debug logging
    console.log('Admin Check Debug:');
    console.log('- isLoggedIn:', isLoggedIn);
    console.log('- userType:', userType);
    console.log('- userType === "admin":', userType === 'admin');
    
    if (!isLoggedIn || userType !== 'admin') {
        console.log('Access denied. Redirecting to index.html');
        window.location.replace('index.html');
    } else {
        console.log('Admin access granted');
    }
})();
