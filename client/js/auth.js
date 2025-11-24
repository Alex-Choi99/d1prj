/**
 * Authentication and Session Management
 */
class Auth {
    /**
     * Check if user is logged in
     */
    static isLoggedIn() {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    }

    /**
     * Get current user email
     */
    static getUserEmail() {
        return sessionStorage.getItem('userEmail');
    }

    /**
     * Logout user
     */
    static logout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userEmail');
        window.location.href = 'index.html';
    }

    /**
     * Update UI based on login status
     */
    static updateNavigation() {
        const navSignup = document.getElementById('navSignup');
        const navUserInfo = document.getElementById('navUserInfo');
        const navLogout = document.getElementById('navLogout');
        const userEmailSpan = document.getElementById('userEmail');

        if (this.isLoggedIn()) {
            if (navSignup) navSignup.style.display = 'none';
            if (navUserInfo) {
                navUserInfo.style.display = 'block';
                if (userEmailSpan) userEmailSpan.textContent = this.getUserEmail();
            }
            if (navLogout) navLogout.style.display = 'block';
        } else {
            if (navSignup) navSignup.style.display = 'block';
            if (navUserInfo) navUserInfo.style.display = 'none';
            if (navLogout) navLogout.style.display = 'none';
        }
    }

    /**
     * Redirect if already logged in (for signin/signup pages)
     */
    static redirectIfLoggedIn() {
        if (this.isLoggedIn()) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Require login (redirect to signin if not logged in)
     */
    static requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = 'signin.html';
        }
    }

    static init() {
        const currentPage = window.location.pathname.split('/').pop();

        // Update navigation for all pages
        this.updateNavigation();

        // Handle logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Page-specific logic
        switch (currentPage) {
            case 'signin.html':
                this.redirectIfLoggedIn();
                new SignInFormHandler();
                break; // Added missing break!

            case 'signup.html':
                this.redirectIfLoggedIn();
                new SignUpFormHandler();
                break;

            case 'cardGen.html':
                this.requireLogin();
                break;

            case 'index.html':
            case '':
                // Index page - no restrictions
                break;

            default:
                // Other pages - update navigation only
                break;
        }
    }
}
