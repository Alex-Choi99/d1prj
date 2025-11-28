async function loadNavbar() {
    const headerElement = document.querySelector('header .container');
    if (headerElement) {
        const response = await fetch('./navbar.html');
        const html = await response.text();
        headerElement.innerHTML = html;

        Auth.init();
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', loadNavbar);