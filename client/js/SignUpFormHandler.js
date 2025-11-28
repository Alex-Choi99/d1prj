/**
 * Sign-Up Form Handler Class
 */
class SignUpFormHandler extends FormHandler {
    constructor() {
        super();
        this.isSubmitting = false; // Add flag to prevent double submission
        this.initializeElements();
        this.attachEventListeners();
        this.setupRealTimeValidation();
    }

    /**
     * Initialize Form Elements
     * @returns 
     */
    initializeElements() {
        this.form = document.getElementById(Constants.ELEMENT_ID_SIGNUP_FORM);
        if (!this.form) return;

        this.inputs = {
            email: document.getElementById(Constants.ELEMENT_ID_EMAIL),
            password: document.getElementById(Constants.ELEMENT_ID_PASSWORD),
            confirmPassword: document.getElementById(Constants.ELEMENT_ID_CONFIRM_PASSWORD)
        };

        this.messages = {
            success: document.getElementById(Constants.ELEMENT_ID_SUCCESS_MESSAGE)
        };

        // Hide success message on initialization
        if (this.messages.success) this.hideMessage(this.messages.success);
    }

    /**
     * Attach Event Listeners
     * @returns 
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
     * Validate Password
     * @returns true if valid, false otherwise
     */
    validatePassword() {
        if (this.inputs.password.value.length < Constants.MIN_PASSWORD_LENGTH) {
            this.showError(Constants.ERROR_ID_PASSWORD, this.inputs.password);
            return false;
        }
        return true;
    }

    /**
     * Validate Password Confirmation
     * @returns true if valid, false otherwise
     */
    validatePasswordConfirmation() {
        if (this.inputs.password.value !== this.inputs.confirmPassword.value) {
            this.showError(Constants.ERROR_ID_CONFIRM_PASSWORD, this.inputs.confirmPassword);
            return false;
        }
        return true;
    }

    /**
     * Validate Entire Form
     * @returns returns everything that is valid
     */
    validateForm() {
        this.clearErrors();

        const validations = [
            this.validateEmailField(),
            this.validatePassword(),
            this.validatePasswordConfirmation()
        ];

        return validations.every(isValid => isValid);
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
                submitButton.textContent = 'Creating Account...';
            }

            const payload = {
                email: this.inputs.email.value,
                password: this.inputs.password.value
            };

            try {
                const response = await fetch('https://d1prj-server.onrender.com/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                // const response = await fetch('https://d1prj.onrender.com/signup', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(payload)
                // });

                const result = await response.json();

                console.log('Server response:', result); // Debug log
                console.log('Response status:', response.status); // Debug log

                if (!response.ok) {
                    if (response.status === 409) {
                        this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email, 'Email already in use');
                    } else if (response.status === 500) {
                        console.error('Server error 500:', result); // Debug
                        this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email, 'Server error. Please try again later.');
                    } else {
                        this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email, result.message || 'Sign up Failed');
                    }

                    // Re-enable button on error
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                    }
                    this.isSubmitting = false;
                    return;
                }

                console.log('Signup successful, setting session...'); // Debug log
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userEmail', payload.email);

                // Prevent any further submissions by disabling the form
                this.form.style.pointerEvents = 'none';

                this.showMessage(this.messages.success);
                this.redirectAfterDelay(Constants.PAGE_LANDING); // Changed to landing page since user is logged in
                // Don't re-enable button since we're redirecting
            }
            catch (error) {
                this.showError(Constants.ERROR_ID_EMAIL, this.inputs.email, 'Network Error');
                console.error('Sign up error:', error);

                // Re-enable button on error
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
                this.isSubmitting = false;
            }
        }
    }
}
