(function() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const userType = sessionStorage.getItem('userType');
    
    if (!isLoggedIn || userType !== 'admin') {
        window.location.replace('index.html');
    }
})();
