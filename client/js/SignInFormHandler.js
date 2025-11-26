/**
 * Sign-In Form Handler Class
 */
class SignInFormHandler extends FormHandler {
    constructor() {
        super();
        this.isSubmitting = false; // Add flag to prevent double submission
        this.initializeElements();
        this.attachEventListeners();
        this.loadRememberedUser();
        this.setupRealTimeValidation();
    }

    /**
     * Initialize Form Elements
     */
    initializeElements() {
        this.form = document.getElementById(Constants.ELEMENT_ID_SIGNIN_FORM);
        if (!this.form) return;

        this.inputs = {
            email: document.getElementById(Constants.ELEMENT_ID_EMAIL),
            password: document.getElementById(Constants.ELEMENT_ID_PASSWORD),
            rememberMe: document.getElementById(Constants.ELEMENT_ID_REMEMBER_ME)
        };

        this.messages = {
            success: document.getElementById(Constants.ELEMENT_ID_SUCCESS_MESSAGE),
            error: document.getElementById(Constants.ELEMENT_ID_GENERAL_ERROR)
        };

        // Hide all messages on initialization
        if (this.messages.success) this.hideMessage(this.messages.success);
        if (this.messages.error) this.hideMessage(this.messages.error);
    }

    /**
     * Attach Event Listeners
     */
    attachEventListeners() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    /**
     * Validate Email Field
     * @returns true if valid, false otherwise
     */
    validateEmailField() {
        if (!this.validateEmail(this.inputs.email.value)) {
            this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email);
            return false;
        }
        return true;
    }

    /**
     * Validate Password Field
     * @returns true if valid, false otherwise
     */
    validatePasswordField() {
        if (this.inputs.password.value.length === Constants.MIN_PASSWORD_EMPTY) {
            this.showError(Constants.ERROR_ID_PASSWORD, this.inputs.password);
            return false;
        }
        return true;
    }

    /**
     * Validate Entire Form
     * @returns true if valid, false otherwise
     */
    validateForm() {
        this.clearErrors();
        this.hideMessage(this.messages.error);

        return this.validateEmailField() && this.validatePasswordField();
    }

    /**
     * Handle Remember Me Functionality
     */
    handleRememberMe() {
        if (this.inputs.rememberMe.checked) {
            // Store only the email (never store passwords in localStorage!)
            const userData = {
                [Constants.USER_FIELD_EMAIL]: this.inputs.email.value
            };
            localStorage.setItem(Constants.STORAGE_KEY_USER, JSON.stringify(userData));
            localStorage.setItem(Constants.STORAGE_KEY_REMEMBER_ME, Constants.STORAGE_VALUE_TRUE);
        } else {
            // Clear stored data if unchecked
            localStorage.removeItem(Constants.STORAGE_KEY_USER);
            localStorage.removeItem(Constants.STORAGE_KEY_REMEMBER_ME);
        }
    }

    /**
     * Retrieve Stored User from Local Storage
     * @returns stored user object or null
     */
    getStoredUser() {
        const userData = localStorage.getItem(Constants.STORAGE_KEY_USER);
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Load Remembered User Email
     */
    loadRememberedUser() {
        if (localStorage.getItem(Constants.STORAGE_KEY_REMEMBER_ME) === Constants.STORAGE_VALUE_TRUE) {
            const storedUser = this.getStoredUser();
            if (storedUser && storedUser[Constants.USER_FIELD_EMAIL]) {
                this.inputs.email.value = storedUser[Constants.USER_FIELD_EMAIL];
                this.inputs.rememberMe.checked = true;
            }
        }
    }

    /**
     * Handle Successful Login
     */
    handleSuccessfulLogin(userData) {
        this.handleRememberMe();

        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userEmail', userData.email);
        sessionStorage.setItem('userType', userData.userType || 'user');

        this.showMessage(this.messages.success);
        this.redirectAfterDelay(Constants.PAGE_LANDING);
    }

    /**
     * Handle Failed Login
     */
    handleFailedLogin(errorMessage) {
        if (this.messages.error) {
            const errorText = this.messages.error.querySelector('p') || this.messages.error;
            errorText.textContent = errorMessage || 'Invalid email or password';
        }
        this.showMessage(this.messages.error);
    }

    /**
     * Handle Form Submission
     */
    async handleSubmit() {
        // Prevent double submission
        if (this.isSubmitting) {
            return;
        }

        if (this.validateForm()) {
            this.isSubmitting = true;

            // Disable submit button
            const submitButton = this.form.querySelector('button[type="submit"]');
            const originalButtonText = submitButton ? submitButton.textContent : '';
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Signing In...';
            }

            const payload = {
                email: this.inputs.email.value,
                password: this.inputs.password.value
            };
            try {
                const response = await fetch(`http://localhost:3001/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Send and receive cookies
                    body: JSON.stringify(payload)
                });
                // const response = await fetch('https://d1prj.onrender.com/signin', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(payload)
                // });

                const result = await response.json();
                if (!response.ok) {
                    this.handleFailedLogin(result.error || 'Sign in Error');

                    // Re-enable button on error
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                    }
                    this.isSubmitting = false;
                    return;
                }
                
                // Handle successful login
                console.log('Login successful, userType:', result.userType);
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userEmail', result.email);
                sessionStorage.setItem('userType', result.userType || 'user');
                
                this.handleRememberMe();
                this.showMessage(this.messages.success);
                
                // Redirect to home page
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, Constants.REDIRECT_DELAY);
                // Don't re-enable button since we're redirecting
            }
            catch (error) {
                console.error('Sign in error:', error);
                this.handleFailedLogin('Network Error. Please try again.');

                // Re-enable button on error
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
                this.isSubmitting = false;
            }
        }
    }

    /**
     * Load Remembered User Email
     */
    loadRememberedUser() {
        if (localStorage.getItem(Constants.STORAGE_KEY_REMEMBER_ME) === Constants.STORAGE_VALUE_TRUE) {
            const storedUser = this.getStoredUser();
            if (storedUser) {
                this.inputs.email.value = storedUser[Constants.USER_FIELD_EMAIL];
                this.inputs.rememberMe.checked = true;
            }
        }
    }
}
