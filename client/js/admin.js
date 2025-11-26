/**
 * Admin Panel JavaScript
 */

class AdminPanel {
    constructor() {
        console.log('AdminPanel constructor called');
        this.users = [];
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
            
            // Buttons
            deleteUsersBtn: document.getElementById('deleteUsersBtn'),
            makeAdminBtn: document.getElementById('makeAdminBtn'),
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
        this.elements.initialPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.verifyInitialPassword();
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

        this.elements.refreshBtn.addEventListener('click', () => {
            this.loadUsers();
        });
    }

    /**
     * Verify initial password
     */
    async verifyInitialPassword() {
        const password = this.elements.initialPasswordInput.value;
        const email = Auth.getUserEmail();

        const submitBtn = this.elements.initialPasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        try {
            const response = await fetch(`${this.SERVER_URL}/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok && result.userType === 'admin') {
                this.hideInitialPasswordModal();
            } else {
                this.elements.initialPasswordError.textContent = 'Invalid password or not an admin';
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.elements.initialPasswordError.textContent = 'Network error. Please try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
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

            row.innerHTML = `
                <td>
                    <input type="checkbox" class="user-checkbox" data-user-id="${user.id}">
                </td>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td title="${user.password}">${user.password}</td>
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
}

// Initialize admin panel when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    Auth.init();
    console.log('Auth initialized');
    new AdminPanel();
    console.log('AdminPanel instance created');
});
