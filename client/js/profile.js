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
            const url = `${this.SERVER_URL}/profile`;
            console.log('=== PROFILE LOAD DEBUG ===');
            console.log('1. Fetching from URL:', url);
            console.log('2. SERVER_URL:', this.SERVER_URL);
            console.log('3. Constants.URL_SERVER:', Constants.URL_SERVER);
            console.log('4. Document cookies:', document.cookie);
            
            const response = await fetch(url, {
                credentials: 'include'
            });

            console.log('5. Response status:', response.status);
            console.log('6. Response statusText:', response.statusText);
            console.log('7. Response headers:', {
                'content-type': response.headers.get('content-type'),
                'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
                'access-control-allow-origin': response.headers.get('access-control-allow-origin')
            });

            const responseText = await response.text();
            console.log('8. Response text:', responseText);

            if (!response.ok) {
                throw new Error(`Failed to load profile: ${response.status} ${response.statusText} - ${responseText}`);
            }

            const profile = JSON.parse(responseText);
            console.log('9. Parsed profile:', profile);
            
            this.displayProfile(profile);

            this.elements.loadingMessage.style.display = 'none';
            this.elements.profileContent.style.display = 'block';
        } catch (error) {
            console.error('Load profile error:', error);
            console.error('Error stack:', error.stack);
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
