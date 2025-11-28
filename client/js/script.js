document.addEventListener('DOMContentLoaded', () => {
    // Auth.init();

    Auth.updateNavigation();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
});
