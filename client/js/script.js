document.addEventListener('DOMContentLoaded', () => {
    Auth.init() //already handles form initialization

    Auth.updateNavigation();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
});
