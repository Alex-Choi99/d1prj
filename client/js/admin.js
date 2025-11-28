/**
 * Admin Panel JavaScript
 */

class AdminPanel {
    constructor() {
        console.log('AdminPanel constructor called');
        this.users = [];
        this.endpointStats = [];
        this.userApiUsage = [];
        this.selectedUsers = new Set();
        this.pendingAction = null;
        this.adminVerified = false;
        this.SERVER_URL = Constants.URL_SERVER.replace(/\/+$/, ''); // Remove trailing slash if any
        
        this.initializeElements();
        console.log('Elements initialized:', this.elements);
        this.showInitialPasswordModal();
        console.log('Initial password modal should be shown');
        this.attachEventListeners();
    }

    /**
     * Initialize DOM Elements
     */
    initializeElements() {
        this.elements = {
            // Modals
            initialPasswordModal: document.getElementById('initialPasswordModal'),
            initialPasswordForm: document.getElementById('initialPasswordForm'),
            initialPasswordInput: document.getElementById('initialPassword'),
            initialPasswordError: document.getElementById('initialPasswordError'),
            
            actionPasswordModal: document.getElementById('actionPasswordModal'),
            actionPasswordForm: document.getElementById('actionPasswordForm'),
            actionPasswordInput: document.getElementById('actionPassword'),
            actionPasswordError: document.getElementById('actionPasswordError'),
            actionModalMessage: document.getElementById('actionModalMessage'),
            cancelActionBtn: document.getElementById('cancelActionBtn'),
            
            // Content
            adminContent: document.getElementById('adminContent'),
            usersTableBody: document.getElementById('usersTableBody'),
            selectAllCheckbox: document.getElementById('selectAll'),
            
            // Endpoint stats elements
            endpointStatsTableBody: document.getElementById('endpointStatsTableBody'),
            endpointStatsLoading: document.getElementById('endpointStatsLoading'),
            endpointStatsError: document.getElementById('endpointStatsError'),
            
            // User API usage elements
            userApiUsageTableBody: document.getElementById('userApiUsageTableBody'),
            userApiUsageLoading: document.getElementById('userApiUsageLoading'),
            userApiUsageError: document.getElementById('userApiUsageError'),
            
            // Buttons
            deleteUsersBtn: document.getElementById('deleteUsersBtn'),
            makeAdminBtn: document.getElementById('makeAdminBtn'),
            increaseApiCallsBtn: document.getElementById('increaseApiCallsBtn'),
            refreshBtn: document.getElementById('refreshBtn'),
            
            // Messages
            loadingMessage: document.getElementById('loadingMessage'),
            errorMessage: document.getElementById('errorMessage')
        };
    }

    /**
     * Show initial password modal on first access
     */
    showInitialPasswordModal() {
        console.log('showInitialPasswordModal called');
        console.log('initialPasswordModal element:', this.elements.initialPasswordModal);
        console.log('adminContent element:', this.elements.adminContent);
        
        if (this.elements.initialPasswordModal) {
            this.elements.initialPasswordModal.style.display = 'flex';
            console.log('Modal display set to flex');
        } else {
            console.error('initialPasswordModal element not found!');
        }
        
        if (this.elements.adminContent) {
            this.elements.adminContent.style.display = 'none';
        }
    }

    /**
     * Hide initial password modal and show admin content
     */
    hideInitialPasswordModal() {
        this.elements.initialPasswordModal.style.display = 'none';
        this.elements.adminContent.style.display = 'block';
        this.adminVerified = true;
        this.loadUsers();
        this.loadEndpointStats();
        this.loadUserApiUsage();
    }

    /**
     * Show action password modal
     */
    showActionPasswordModal(message, action) {
        this.pendingAction = action;
        this.elements.actionModalMessage.textContent = message;
        this.elements.actionPasswordInput.value = '';
        this.elements.actionPasswordError.textContent = '';
        this.elements.actionPasswordModal.style.display = 'flex';
    }

    /**
     * Hide action password modal
     */
    hideActionPasswordModal() {
        this.elements.actionPasswordModal.style.display = 'none';
        this.pendingAction = null;
    }

    /**
     * Attach Event Listeners
     */
    attachEventListeners() {
        // Initial password form
        this.elements.initialPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Initial password form submitted');
            await this.verifyInitialPassword();
        });

        // Action password form
        this.elements.actionPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.executeAction();
        });

        // Cancel action
        this.elements.cancelActionBtn.addEventListener('click', () => {
            this.hideActionPasswordModal();
        });

        // Select all checkbox
        this.elements.selectAllCheckbox.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Action buttons
        this.elements.deleteUsersBtn.addEventListener('click', () => {
            this.initiateDeleteUsers();
        });

        this.elements.makeAdminBtn.addEventListener('click', () => {
            this.initiateMakeAdmin();
        });

        this.elements.increaseApiCallsBtn.addEventListener('click', () => {
            this.initiateIncreaseApiCalls();
        });

        this.elements.refreshBtn.addEventListener('click', () => {
            this.loadUsers();
            this.loadEndpointStats();
            this.loadUserApiUsage();
        });
    }

    /**
     * Verify initial password
     */
    async verifyInitialPassword() {
        console.log('verifyInitialPassword called');
        const password = this.elements.initialPasswordInput.value;
        const email = Auth.getUserEmail();
        
        console.log('Email:', email, 'Password length:', password.length);

        const submitBtn = this.elements.initialPasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        try {
            console.log('Fetching:', `${this.SERVER_URL}/signin`);
            const response = await fetch(`${this.SERVER_URL}/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();
            console.log('Response status:', response.status, 'Result:', result);

            if (response.ok && result.userType === 'admin') {
                console.log('Admin verified, updating session storage');
                // Update session storage to ensure Auth knows user is verified
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userEmail', result.email || email);
                sessionStorage.setItem('userType', result.userType);
                
                console.log('Calling hideInitialPasswordModal');
                this.hideInitialPasswordModal();
                console.log('Modal hidden, content should be visible');
            } else {
                console.log('Verification failed - not admin or wrong password');
                this.elements.initialPasswordError.textContent = 'Invalid password or not an admin';
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.elements.initialPasswordError.textContent = 'Network error. Please try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            console.log('verifyInitialPassword completed');
        }
    }

    /**
     * Load users from server
     */
    async loadUsers() {
        this.elements.loadingMessage.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
        this.elements.usersTableBody.innerHTML = '';

        try {
            const response = await fetch(`${this.SERVER_URL}/admin/users`);
            const result = await response.json();

            if (response.ok) {
                this.users = result.users;
                this.renderUsers();
                this.elements.loadingMessage.style.display = 'none';
            } else {
                throw new Error(result.error || 'Failed to load users');
            }
        } catch (error) {
            console.error('Load users error:', error);
            this.elements.loadingMessage.style.display = 'none';
            this.elements.errorMessage.textContent = 'Failed to load users. Please try again.';
            this.elements.errorMessage.style.display = 'block';
        }
    }

    /**
     * Render users table
     */
    renderUsers() {
        this.elements.usersTableBody.innerHTML = '';
        this.selectedUsers.clear();
        this.updateActionButtons();

        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.userId = user.id;

            const userType = user.userType || 'user';
            const badgeClass = userType === 'admin' ? 'user-type-admin' : 'user-type-user';
            const apiCalls = user.remaining_free_api_calls !== undefined ? user.remaining_free_api_calls : 'N/A';

            row.innerHTML = `
                <td>
                    <input type="checkbox" class="user-checkbox" data-user-id="${user.id}">
                </td>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>${apiCalls}</td>
                <td>
                    <span class="user-type-badge ${badgeClass}">${userType}</span>
                </td>
            `;

            // Add checkbox event listener
            const checkbox = row.querySelector('.user-checkbox');
            checkbox.addEventListener('change', (e) => {
                this.toggleUserSelection(user.id, e.target.checked);
            });

            this.elements.usersTableBody.appendChild(row);
        });
    }

    /**
     * Toggle select all
     */
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const userId = parseInt(checkbox.dataset.userId);
            if (checked) {
                this.selectedUsers.add(userId);
            } else {
                this.selectedUsers.delete(userId);
            }
        });
        this.updateActionButtons();
    }

    /**
     * Toggle user selection
     */
    toggleUserSelection(userId, checked) {
        if (checked) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }
        this.updateActionButtons();
    }

    /**
     * Update action buttons state
     */
    updateActionButtons() {
        const hasSelection = this.selectedUsers.size > 0;
        this.elements.deleteUsersBtn.disabled = !hasSelection;
        this.elements.makeAdminBtn.disabled = !hasSelection;
        this.elements.increaseApiCallsBtn.disabled = !hasSelection;
    }

    /**
     * Initiate delete users
     */
    initiateDeleteUsers() {
        if (this.selectedUsers.size === 0) return;

        const count = this.selectedUsers.size;
        const message = `Are you sure you want to delete ${count} user${count > 1 ? 's' : ''}? Enter your password to confirm.`;
        this.showActionPasswordModal(message, 'delete');
    }

    /**
     * Initiate make admin
     */
    initiateMakeAdmin() {
        if (this.selectedUsers.size === 0) return;

        const count = this.selectedUsers.size;
        const message = `Are you sure you want to make ${count} user${count > 1 ? 's' : ''} admin? Enter your password to confirm.`;
        this.showActionPasswordModal(message, 'makeAdmin');
    }

    /**
     * Initiate increase API calls
     */
    initiateIncreaseApiCalls() {
        if (this.selectedUsers.size === 0) return;

        const amount = prompt('Enter the number of API calls to add:', '10');
        if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
            alert('Invalid amount');
            return;
        }

        this.apiCallsIncrement = parseInt(amount);
        const count = this.selectedUsers.size;
        const message = `Add ${amount} API calls to ${count} user${count > 1 ? 's' : ''}? Enter your password to confirm.`;
        this.showActionPasswordModal(message, 'increaseApiCalls');
    }

    /**
     * Execute the pending action
     */
    async executeAction() {
        if (!this.pendingAction) return;

        const password = this.elements.actionPasswordInput.value;
        const email = Auth.getUserEmail();

        if (this.pendingAction === 'delete') {
            await this.deleteUsers(email, password);
        } else if (this.pendingAction === 'makeAdmin') {
            await this.makeUsersAdmin(email, password);
        } else if (this.pendingAction === 'increaseApiCalls') {
            await this.increaseUsersApiCalls(email, password, this.apiCallsIncrement);
        }
    }

    /**
     * Delete selected users
     */
    async deleteUsers(adminEmail, adminPassword) {
        this.elements.actionPasswordError.textContent = '';

        try {
            const userIds = Array.from(this.selectedUsers);
            const promises = userIds.map(userId => 
                fetch(`${this.SERVER_URL}/admin/users`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, adminEmail, adminPassword })
                })
            );

            const results = await Promise.all(promises);
            const allSuccessful = results.every(res => res.ok);

            if (allSuccessful) {
                this.hideActionPasswordModal();
                await this.loadUsers();
            } else {
                const firstError = await results.find(res => !res.ok).json();
                this.elements.actionPasswordError.textContent = firstError.error || 'Failed to delete users';
            }
        } catch (error) {
            console.error('Delete users error:', error);
            this.elements.actionPasswordError.textContent = 'Network error. Please try again.';
        }
    }

    /**
     * Make selected users admin
     */
    async makeUsersAdmin(adminEmail, adminPassword) {
        this.elements.actionPasswordError.textContent = '';

        try {
            const userIds = Array.from(this.selectedUsers);
            const promises = userIds.map(userId => 
                fetch(`${this.SERVER_URL}/admin/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, userType: 'admin', adminEmail, adminPassword })
                })
            );

            const results = await Promise.all(promises);
            const allSuccessful = results.every(res => res.ok);

            if (allSuccessful) {
                this.hideActionPasswordModal();
                await this.loadUsers();
            } else {
                const firstError = await results.find(res => !res.ok).json();
                this.elements.actionPasswordError.textContent = firstError.error || 'Failed to update users';
            }
        } catch (error) {
            console.error('Make admin error:', error);
            this.elements.actionPasswordError.textContent = 'Network error. Please try again.';
        }
    }

    /**
     * Increase API calls for selected users
     */
    async increaseUsersApiCalls(adminEmail, adminPassword, increment) {
        this.elements.actionPasswordError.textContent = '';

        try {
            const userIds = Array.from(this.selectedUsers);
            const promises = userIds.map(userId => 
                fetch(`${this.SERVER_URL}/admin/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, apiCallsIncrement: increment, adminEmail, adminPassword })
                })
            );

            const results = await Promise.all(promises);
            const allSuccessful = results.every(res => res.ok);

            if (allSuccessful) {
                this.hideActionPasswordModal();
                await this.loadUsers();
            } else {
                const firstError = await results.find(res => !res.ok).json();
                this.elements.actionPasswordError.textContent = firstError.error || 'Failed to increase API calls';
            }
        } catch (error) {
            console.error('Increase API calls error:', error);
            this.elements.actionPasswordError.textContent = 'Network error. Please try again.';
        }
    }

    /**
     * Load endpoint statistics
     */
    async loadEndpointStats() {
        if (this.elements.endpointStatsLoading) {
            this.elements.endpointStatsLoading.style.display = 'block';
        }
        if (this.elements.endpointStatsError) {
            this.elements.endpointStatsError.style.display = 'none';
        }
        if (this.elements.endpointStatsTableBody) {
            this.elements.endpointStatsTableBody.innerHTML = '';
        }

        try {
            const response = await fetch(`${this.SERVER_URL}/admin/endpoint-stats`);
            const result = await response.json();

            if (response.ok) {
                this.endpointStats = result.stats;
                this.renderEndpointStats();
                if (this.elements.endpointStatsLoading) {
                    this.elements.endpointStatsLoading.style.display = 'none';
                }
            } else {
                throw new Error(result.error || 'Failed to load endpoint stats');
            }
        } catch (error) {
            console.error('Load endpoint stats error:', error);
            if (this.elements.endpointStatsLoading) {
                this.elements.endpointStatsLoading.style.display = 'none';
            }
            if (this.elements.endpointStatsError) {
                this.elements.endpointStatsError.textContent = 'Failed to load endpoint statistics.';
                this.elements.endpointStatsError.style.display = 'block';
            }
        }
    }

    /**
     * Render endpoint statistics table
     */
    renderEndpointStats() {
        if (!this.elements.endpointStatsTableBody) return;
        
        this.elements.endpointStatsTableBody.innerHTML = '';

        if (this.endpointStats.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center;">No endpoint data available yet</td>';
            this.elements.endpointStatsTableBody.appendChild(row);
            return;
        }

        this.endpointStats.forEach(stat => {
            const row = document.createElement('tr');
            const avgResponseTime = stat.avg_response_time ? Math.round(stat.avg_response_time) : 'N/A';
            const lastRequest = stat.last_request ? new Date(stat.last_request).toLocaleString() : 'N/A';
            
            row.innerHTML = `
                <td><span class="method-badge method-${stat.method.toLowerCase()}">${stat.method}</span></td>
                <td><code>${stat.endpoint}</code></td>
                <td>${stat.request_count}</td>
                <td>${avgResponseTime} ms</td>
                <td>${lastRequest}</td>
            `;
            this.elements.endpointStatsTableBody.appendChild(row);
        });
    }

    /**
     * Load user API usage
     */
    async loadUserApiUsage() {
        if (this.elements.userApiUsageLoading) {
            this.elements.userApiUsageLoading.style.display = 'block';
        }
        if (this.elements.userApiUsageError) {
            this.elements.userApiUsageError.style.display = 'none';
        }
        if (this.elements.userApiUsageTableBody) {
            this.elements.userApiUsageTableBody.innerHTML = '';
        }

        try {
            const response = await fetch(`${this.SERVER_URL}/admin/user-api-usage`);
            const result = await response.json();

            if (response.ok) {
                this.userApiUsage = result.users;
                this.renderUserApiUsage();
                if (this.elements.userApiUsageLoading) {
                    this.elements.userApiUsageLoading.style.display = 'none';
                }
            } else {
                throw new Error(result.error || 'Failed to load user API usage');
            }
        } catch (error) {
            console.error('Load user API usage error:', error);
            if (this.elements.userApiUsageLoading) {
                this.elements.userApiUsageLoading.style.display = 'none';
            }
            if (this.elements.userApiUsageError) {
                this.elements.userApiUsageError.textContent = 'Failed to load user API usage.';
                this.elements.userApiUsageError.style.display = 'block';
            }
        }
    }

    /**
     * Render user API usage table
     */
    renderUserApiUsage() {
        if (!this.elements.userApiUsageTableBody) return;
        
        this.elements.userApiUsageTableBody.innerHTML = '';

        if (this.userApiUsage.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center;">No user API usage data available</td>';
            this.elements.userApiUsageTableBody.appendChild(row);
            return;
        }

        this.userApiUsage.forEach(user => {
            const row = document.createElement('tr');
            const userType = user.userType || 'user';
            const badgeClass = userType === 'admin' ? 'user-type-admin' : 'user-type-user';
            const apiKey = user.api_key && user.api_key !== 'N/A' 
                ? `<code class="api-key">${user.api_key.substring(0, 16)}...${user.api_key.substring(user.api_key.length - 8)}</code>` 
                : '<span class="no-key">No Key</span>';
            
            row.innerHTML = `
                <td>${user.user_id}</td>
                <td>${user.email}</td>
                <td><span class="user-type-badge ${badgeClass}">${userType}</span></td>
                <td>${apiKey}</td>
                <td>${user.total_requests}</td>
                <td>${user.remaining_free_api_calls}</td>
            `;
            this.elements.userApiUsageTableBody.appendChild(row);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Auth.init();
    new AdminPanel();
});
