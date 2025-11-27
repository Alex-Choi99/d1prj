/**
 * Profile Page JavaScript
 */

class ProfilePage {
    constructor() {
        this.SERVER_URL = Constants.URL_SERVER.replace(/\/+$/, '');
        this.initializeElements();
        this.loadProfile();
    }

    /**
     * Initialize DOM Elements
     */
    initializeElements() {
        this.elements = {
            loadingMessage: document.getElementById('loadingMessage'),
            errorMessage: document.getElementById('errorMessage'),
            profileContent: document.getElementById('profileContent'),
            profileEmail: document.getElementById('profileEmail'),
            profileUserType: document.getElementById('profileUserType'),
            profileApiCalls: document.getElementById('profileApiCalls')
        };
    }

    /**
     * Load user profile
     */
    async loadProfile() {
        this.elements.loadingMessage.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
        this.elements.profileContent.style.display = 'none';

        try {
            const response = await fetch(`${this.SERVER_URL}/profile`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const profile = await response.json();
            this.displayProfile(profile);

            this.elements.loadingMessage.style.display = 'none';
            this.elements.profileContent.style.display = 'block';
        } catch (error) {
            console.error('Load profile error:', error);
            this.elements.loadingMessage.style.display = 'none';
            this.elements.errorMessage.textContent = 'Failed to load profile. Please try again.';
            this.elements.errorMessage.style.display = 'block';
        }
    }

    /**
     * Display profile data
     */
    displayProfile(profile) {
        this.elements.profileEmail.textContent = profile.email;

        const userType = profile.userType || 'user';
        const badgeClass = userType === 'admin' ? 'user-type-admin' : 'user-type-user';
        this.elements.profileUserType.textContent = userType;
        this.elements.profileUserType.className = `user-type-badge ${badgeClass}`;

        const apiCalls = profile.remaining_free_api_calls;
        this.elements.profileApiCalls.textContent = apiCalls;
        
        // Add color coding based on remaining calls
        if (apiCalls === 0) {
            this.elements.profileApiCalls.classList.add('zero');
        } else if (apiCalls <= 5) {
            this.elements.profileApiCalls.classList.add('low');
        }
    }
}

// Initialize profile page when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Auth.init();
    Auth.requireLogin();
    new ProfilePage();
});
