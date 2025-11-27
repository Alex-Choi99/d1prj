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
     * Get current user type
     */
    static getUserType() {
        return sessionStorage.getItem('userType') || 'user';
    }

    /**
     * Check if current user is admin
     */
    static isAdmin() {
        return this.getUserType() === 'admin';
    }

    /**
     * Logout user
     */
    static logout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userType');
        window.location.href = 'index.html';
    }

    /**
     * Update UI based on login status
     */
    static updateNavigation() {
        const navSignup = document.getElementById('navSignup');
        const navUserInfo = document.getElementById('navUserInfo');
        const navLogout = document.getElementById('navLogout');
        const navAdmin = document.getElementById('navAdmin');
        const navProfile = document.getElementById('navProfile');
        const userEmailSpan = document.getElementById('userEmail');

        if (this.isLoggedIn()) {
            if (navSignup) navSignup.style.display = 'none';
            if (navUserInfo) {
                navUserInfo.style.display = 'block';
                if (userEmailSpan) userEmailSpan.textContent = this.getUserEmail();
            }
            if (navLogout) navLogout.style.display = 'block';
            if (navAdmin) navAdmin.style.display = this.isAdmin() ? 'block' : 'none';
            if (navProfile) navProfile.style.display = this.isAdmin() ? 'none' : 'block';
        } else {
            if (navSignup) navSignup.style.display = 'block';
            if (navUserInfo) navUserInfo.style.display = 'none';
            if (navLogout) navLogout.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
            if (navProfile) navProfile.style.display = 'none';
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

    /**
     * Require admin (redirect to index if not admin)
     */
    static requireAdmin() {
        if (!this.isLoggedIn() || !this.isAdmin()) {
            window.location.href = 'index.html';
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
                console.log('Card Generation page - requiring login');
                this.requireLogin();
                break;

            case 'admin.html':
                this.requireAdmin();
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
